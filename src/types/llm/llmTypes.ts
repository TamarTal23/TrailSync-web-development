export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface LLMResponse {
  success: boolean;
  response: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LLMClientConfig {
  apiKey: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
}

export interface LLMQueryResponse {
  titleKeywords: string[];
  descriptionKeywords?: string[];
  daysRange?: {
    min?: number;
    max?: number;
  };
  maxPrice?: number;
  location?: {
    country: string;
    city?: string;
  };
  searchType: 'title' | 'decription' | 'days' | 'price' | 'location' | 'combined' | 'semantic';
  confidence: number;
  reasoning?: string;
}
