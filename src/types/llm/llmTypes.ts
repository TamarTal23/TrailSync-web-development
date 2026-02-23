import { UsageMetadata } from '@google/generative-ai';

export interface LLMOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
}

export interface LLMResponse {
  success: boolean;
  response: string;
  usage?: UsageMetadata;
}

export interface LLMClientConfig {
  apiKey: string;
  defaultModel: string;
  timeout: number;
  maxRetries: number;
}

type searchTypes = 'title' | 'decription' | 'days' | 'price' | 'location' | 'combined' | 'semantic';

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
  searchType: searchTypes;
  confidence: number;
  reasoning?: string;
}
