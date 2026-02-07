import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { OcrExtractedData, QwenApiResponse } from './dto/ocr-response.dto';
import axios from 'axios';

const EXTRACTION_PROMPT = `この商品パッケージの画像から以下の情報を抽出し、JSON形式で返してください。
テキストは画像に書かれている通りそのまま抽出してください（翻訳不要）。

{
  "product_name": "商品名",
  "brand": "ブランド名またはメーカー名",
  "ingredients_raw": "原材料名（ラベルに記載されている通り）",
  "allergens": ["アレルギー物質1", "アレルギー物質2"],
  "nutrition_per_100g": {
    "calories": 数値,
    "protein": 数値,
    "fat": 数値,
    "carbs": 数値,
    "sodium": 数値
  },
  "storage_instructions": "保存方法",
  "preparation_instructions": "調理方法",
  "is_vegetarian": true/false,
  "is_vegan": true/false,
  "is_halal": true/false,
  "is_gluten_free": true/false,
  "category": "frozen/fresh/beverage/condiment/snack/prepared/ingredient/other"
}

注意：
- 情報が見つからない場合はnullを返してください
- アレルギー物質は「特定原材料」と「特定原材料に準ずるもの」を含めてください
- 動物性原料（肉、魚、卵、乳製品）が含まれる場合、is_vegetarianはfalse
- JSONのみを返してください。説明文は不要です。`;

@Injectable()
export class QwenVisionService {
  private readonly logger = new Logger(QwenVisionService.name);
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Default to international Singapore endpoint
    this.apiUrl =
      this.configService.get<string>('QWEN_API_URL') ||
      'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions';
    this.logger.log(`Qwen API URL: ${this.apiUrl}`);
  }

  async extractProductData(imageUrl: string): Promise<{
    extractedData: OcrExtractedData;
    rawResponse: QwenApiResponse;
  }> {
    const apiKey = this.configService.get<string>('QWEN_API_KEY');
    const model = this.configService.get<string>('QWEN_MODEL') || 'qwen-vl-ocr';

    if (!apiKey) {
      throw new Error('QWEN_API_KEY is not configured');
    }

    this.logger.log(`Calling Qwen Vision API with model: ${model}`);

    // Download image and convert to base64 (Qwen international can't access external URLs)
    const base64Image = await this.downloadImageAsBase64(imageUrl);
    this.logger.log(`Image converted to base64 (length: ${base64Image.length})`);

    const requestBody = {
      model,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: base64Image },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<QwenApiResponse>(this.apiUrl, requestBody, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      const rawResponse = response.data;
      const content = rawResponse.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Qwen API');
      }

      // Parse JSON from response (handle markdown code blocks)
      const extractedData = this.parseJsonResponse(content);

      this.logger.log('Successfully extracted product data');

      return { extractedData, rawResponse };
    } catch (error) {
      // Log detailed error information
      if (error.response) {
        this.logger.error(
          `Qwen API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
        );
      } else {
        this.logger.error(`Qwen API error: ${error.message}`);
      }
      throw error;
    }
  }

  private async downloadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const buffer = Buffer.from(response.data);
      const base64 = buffer.toString('base64');

      // Detect content type from response or URL
      const contentType =
        response.headers['content-type'] || this.getContentTypeFromUrl(imageUrl);

      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      this.logger.error(`Failed to download image: ${error.message}`);
      throw new Error(`Failed to download image from URL: ${error.message}`);
    }
  }

  private getContentTypeFromUrl(url: string): string {
    const ext = url.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  private parseJsonResponse(content: string): OcrExtractedData {
    // Remove markdown code blocks if present
    let jsonString = content.trim();

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
      const parsed = JSON.parse(jsonString);

      // Ensure defaults for boolean fields
      return {
        product_name: parsed.product_name || null,
        brand: parsed.brand || null,
        ingredients_raw: parsed.ingredients_raw || null,
        allergens: Array.isArray(parsed.allergens) ? parsed.allergens : [],
        nutrition_per_100g: parsed.nutrition_per_100g || null,
        storage_instructions: parsed.storage_instructions || null,
        preparation_instructions: parsed.preparation_instructions || null,
        is_vegetarian: parsed.is_vegetarian === true,
        is_vegan: parsed.is_vegan === true,
        is_halal: parsed.is_halal === true,
        is_gluten_free: parsed.is_gluten_free === true,
        category: parsed.category || null,
      };
    } catch (error) {
      this.logger.error(`Failed to parse JSON: ${jsonString}`);
      throw new Error(`Failed to parse OCR response as JSON: ${error.message}`);
    }
  }
}
