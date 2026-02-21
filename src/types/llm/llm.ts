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
