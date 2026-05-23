import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ExtractedCourse, MenuCourseCategory, VALID_CATEGORIES } from './dto/menu-scan-response.dto';

const SYSTEM_PROMPT = `You are an expert Japanese Kaiseki menu transcriber. Your task is to extract handwritten menu details into a structured JSON format.

CRITICAL RULES FOR TRANSCRIPTION:
1. The input image has course headers on the RIGHT and dish details on the LEFT (vertical Japanese, right-to-left column order).
2. Read top-to-bottom within each column, then move to the next column to the left.
3. IGNORE dashes (一) when they appear as bullet points/separators before a dish name — they are NOT part of the dish.
4. If a circle symbol (○) appears, represent it exactly as a circle character "○" (placeholder for undecided items).
5. Do not normalize or correct the Japanese — transcribe the kanji exactly as written, even if rare or archaic.
6. Count EVERY column. Do not skip any course, even if handwriting is unclear.
7. The menu title is usually at the bottom-left of the page (e.g. 令和八年 夏の献立 一般).
8. Output the result as a strictly formatted JSON object — no markdown, no explanations.`;

const USER_PROMPT = `Analyze this handwritten Japanese kaiseki menu image. Extract all data into a JSON object with this exact structure:

{
  "menu_title": "The full title, usually at the bottom (e.g. 令和八年 夏の献立 一般)",
  "courses": [
    {
      "name": "Course header kanji exactly as written (e.g. 食前酒, 前菜, 椀物, 強肴)",
      "reading": "Hiragana reading of the course name (e.g. しょくぜんしゅ)",
      "description": "Dish details / ingredients written below or next to the course header. REMOVE leading 一 dashes — they are separators, not content. Preserve ○ circles as-is.",
      "category": "one of: appetizer / main / side / dessert / beverage / special / other",
      "sort_order": 1
    }
  ]
}

Category guide (infer from cooking role, not exact name match):
- beverage: 食前酒
- appetizer: 前菜、小鉢
- main: 強肴、本日の肉料理、焼き物、揚物、煮物、蒸物、造里、刺身、鍋物、土瓶蒸
- side: 酢の物、和え物、椀物、椀変り、止椀、炊合せ、温物、冷鉢
- dessert: 甘味、水物
- other: 食事、香物、汁物

Return ONLY the JSON object. No markdown fences, no commentary.`;

interface RawCourse {
  name?: string;
  reading?: string | null;
  description?: string | null;
  category?: string | null;
  sort_order?: number | null;
}

interface GeminiMenuResponse {
  menu_title?: string | null;
  courses?: RawCourse[];
}

@Injectable()
export class GeminiVisionService {
  private readonly logger = new Logger(GeminiVisionService.name);

  constructor(private readonly configService: ConfigService) {}

  async extractMenuCourses(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{
    menu_title: string | null;
    courses: ExtractedCourse[];
    raw_response: string;
  }> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in .env');
    }

    const model =
      this.configService.get<string>('GEMINI_MODEL') || 'gemini-3.1-flash-lite';

    this.logger.log(`Calling Gemini Vision API with model: ${model} (key length: ${apiKey.length})`);

    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const safeMimeType = supportedMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

    const base64 = buffer.toString('base64');

    // Construct client fresh per request so env updates are picked up immediately
    const client = new GoogleGenAI({ apiKey });

    try {
      const response = await client.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: safeMimeType,
                  data: base64,
                },
              },
              { text: USER_PROMPT },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 32768,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const rawText = response.text ?? '';

      if (!rawText) {
        throw new Error('Empty response from Gemini API');
      }

      this.logger.log('Received response from Gemini Vision API');
      const { menu_title, courses } = this.parseJsonResponse(rawText);

      return { menu_title, courses, raw_response: rawText };
    } catch (error) {
      this.logger.error(`Gemini Vision API error: ${error.message}`);
      throw error;
    }
  }

  private parseJsonResponse(content: string): {
    menu_title: string | null;
    courses: ExtractedCourse[];
  } {
    let jsonString = content.trim();

    // Strip markdown code blocks if present (gemini sometimes wraps despite the rule)
    if (jsonString.startsWith('```json')) jsonString = jsonString.slice(7);
    else if (jsonString.startsWith('```')) jsonString = jsonString.slice(3);
    if (jsonString.endsWith('```')) jsonString = jsonString.slice(0, -3);
    jsonString = jsonString.trim();

    try {
      const parsed: GeminiMenuResponse = JSON.parse(jsonString);

      const courses: ExtractedCourse[] = (parsed.courses || [])
        .filter((c) => c.name && typeof c.name === 'string')
        .map((c, idx) => ({
          name: c.name!,
          reading: c.reading || null,
          description: this.cleanDescription(c.description),
          category: this.resolveCategory(c.category),
          sort_order: typeof c.sort_order === 'number' ? c.sort_order : idx + 1,
        }));

      return {
        menu_title: parsed.menu_title || null,
        courses,
      };
    } catch (error) {
      this.logger.error(`Failed to parse Gemini JSON response: ${jsonString.slice(0, 200)}`);
      throw new Error(`Failed to parse Gemini OCR response as JSON: ${error.message}`);
    }
  }

  /** Strip leading 一 dash separators that slip through (defensive cleaning). */
  private cleanDescription(raw: string | null | undefined): string | null {
    if (!raw) return null;
    // Remove leading 一 (with optional whitespace) and 一 + bullets
    return raw
      .replace(/^[一\s・、]+/, '')
      .replace(/^一$/g, '')
      .trim() || null;
  }

  private resolveCategory(raw: string | null | undefined): MenuCourseCategory {
    if (raw && VALID_CATEGORIES.includes(raw as MenuCourseCategory)) {
      return raw as MenuCourseCategory;
    }
    return 'other';
  }
}
