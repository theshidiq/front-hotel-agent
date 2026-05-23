import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { ExtractedCourse, MenuCourseCategory, VALID_CATEGORIES } from './dto/menu-scan-response.dto';

const MENU_EXTRACTION_PROMPT = `You are an expert at reading handwritten Japanese kaiseki restaurant menus.

Look at this handwritten Japanese menu image carefully. Read ALL text visible — including:
- The menu title (e.g. 夏の献立 一般, 令和八年 春メニュー, 夏の献立)
- The season and year if written (e.g. 令和八年、夏)
- Every course header (e.g. 先付、前菜、椀盛り、造里、焼物 etc.)
- The dish details written below each course header

Japanese menus are typically written RIGHT TO LEFT in vertical columns. The rightmost column is usually the title/season. Each column after that is one course.

Extract everything and return ONLY this JSON (no explanation, no markdown):

{
  "menu_title": "Full title as written, e.g. 令和八年 夏の献立 一般",
  "courses": [
    {
      "name": "Course header kanji exactly as written, e.g. 先付",
      "reading": "Hiragana reading, e.g. さきづけ",
      "description": "All dish detail text written below the course header, line by line",
      "category": "one of: appetizer / main / side / dessert / beverage / special / other",
      "sort_order": 1
    }
  ]
}

Category guide (infer from cooking role and position, not exact name match):
- appetizer: 先付、前菜、小鉢、前酒
- main: 主肴、焼物、揚物、煮物、蒸物、造里、刺身、鍋物、土瓶蒸
- side: 酢の物、酢物、和え物、食事、止椀、炊合せ
- dessert: 甘味、水物
- special: 特選、お薦め
- other: anything else

Rules:
- Count EVERY column — do not skip any, even if the handwriting is unclear or faint
- Preserve kanji exactly as handwritten — do not normalize or correct
- For unclear characters make your best guess and still include the course
- sort_order follows the written order (right-to-left for vertical text)
- null for any field you cannot read
- Return ONLY the JSON object, nothing else`;

interface RawCourse {
  name?: string;
  reading?: string | null;
  description?: string | null;
  category?: string | null;
  sort_order?: number | null;
}

interface ClaudeMenuResponse {
  menu_title?: string | null;
  courses?: RawCourse[];
}

@Injectable()
export class ClaudeVisionService {
  private readonly logger = new Logger(ClaudeVisionService.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY is not configured');
    }
    this.client = new Anthropic({ apiKey: apiKey || '' });
  }

  async extractMenuCourses(
    buffer: Buffer,
    mimeType: string,
  ): Promise<{
    menu_title: string | null;
    courses: ExtractedCourse[];
    raw_response: string;
  }> {
    const model =
      this.configService.get<string>('CLAUDE_MODEL') || 'claude-sonnet-4-5';

    this.logger.log(`Calling Claude Vision API with model: ${model}`);

    const base64 = buffer.toString('base64');

    // Validate mime type for Anthropic SDK
    const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type SupportedMime = typeof supportedMimeTypes[number];
    const safeMimeType: SupportedMime = supportedMimeTypes.includes(mimeType as SupportedMime)
      ? (mimeType as SupportedMime)
      : 'image/jpeg';

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 8096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: safeMimeType,
                  data: base64,
                },
              },
              {
                type: 'text',
                text: MENU_EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      });

      const rawText =
        response.content[0]?.type === 'text' ? response.content[0].text : '';

      if (!rawText) {
        throw new Error('Empty response from Claude API');
      }

      this.logger.log('Received response from Claude Vision API');
      const { menu_title, courses } = this.parseJsonResponse(rawText);

      return { menu_title, courses, raw_response: rawText };
    } catch (error) {
      this.logger.error(`Claude Vision API error: ${error.message}`);
      throw error;
    }
  }

  private parseJsonResponse(content: string): {
    menu_title: string | null;
    courses: ExtractedCourse[];
  } {
    let jsonString = content.trim();

    // Strip markdown code blocks if present
    if (jsonString.startsWith('```json')) {
      jsonString = jsonString.slice(7);
    } else if (jsonString.startsWith('```')) {
      jsonString = jsonString.slice(3);
    }
    if (jsonString.endsWith('```')) {
      jsonString = jsonString.slice(0, -3);
    }
    jsonString = jsonString.trim();

    try {
      const parsed: ClaudeMenuResponse = JSON.parse(jsonString);

      const courses: ExtractedCourse[] = (parsed.courses || [])
        .filter((c) => c.name && typeof c.name === 'string')
        .map((c, idx) => ({
          name: c.name!,
          reading: c.reading || null,
          description: c.description || null,
          category: this.resolveCategory(c.category),
          sort_order: typeof c.sort_order === 'number' ? c.sort_order : idx + 1,
        }));

      return {
        menu_title: parsed.menu_title || null,
        courses,
      };
    } catch (error) {
      this.logger.error(`Failed to parse Claude JSON response: ${jsonString.slice(0, 200)}`);
      throw new Error(`Failed to parse Claude OCR response as JSON: ${error.message}`);
    }
  }

  private resolveCategory(raw: string | null | undefined): MenuCourseCategory {
    if (raw && VALID_CATEGORIES.includes(raw as MenuCourseCategory)) {
      return raw as MenuCourseCategory;
    }
    return 'other';
  }
}
