export interface NutritionInfo {
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  sodium?: number;
}

export interface OcrExtractedData {
  product_name: string | null;
  brand: string | null;
  ingredients_raw: string | null;
  allergens: string[];
  nutrition_per_100g: NutritionInfo | null;
  storage_instructions: string | null;
  preparation_instructions: string | null;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_halal: boolean;
  is_gluten_free: boolean;
  category:
    | 'frozen'
    | 'fresh'
    | 'beverage'
    | 'condiment'
    | 'snack'
    | 'prepared'
    | 'ingredient'
    | 'other'
    | null;
}

export interface QwenApiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
