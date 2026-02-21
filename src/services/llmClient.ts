import OpenAI from 'openai';
import { LLMClientConfig, LLMOptions, LLMResponse } from '../types/llm/llm';
import {
  LLMAuthenticationError,
  LLMServiceError,
  LLMTimeoutError,
} from '../types/llm/errors/errors';

class LLMClient {
  private client: OpenAI;
  private config: LLMClientConfig;

  constructor() {
    this.config = {
      apiKey: process.env.OPENAI_API_KEY!,
      defaultModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      timeout: Number(process.env.OPENAI_TIMEOUT || 30000),
      maxRetries: Number(process.env.OPENAI_MAX_RETRIES || 3),
    };

    if (!this.config.apiKey) {
      throw new Error('OPENAI_API_KEY is missing');
    }

    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      timeout: this.config.timeout,
    });
  }

  async generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const payload: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      model: options?.model || this.config.defaultModel,
      messages: [{ role: 'user', content: prompt.trim() }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 500,
      stream: false,
      top_p: options?.top_p || 0.9,
    };

    return this.makeRequest(payload);
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.generateResponse('Hello', { max_tokens: 5 });

      return { success: true, message: 'OpenAI connection successful' };
    } catch (err) {
      return { success: false, message: (err as Error).message };
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.generateResponse('ping', { max_tokens: 5 });

      return true;
    } catch {
      return false;
    }
  }

  private async makeRequest(
    payload: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ): Promise<LLMResponse> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.client.chat.completions.create(payload);

        return {
          success: true,
          response: response.choices[0].message.content || '',
          usage: response.usage,
        };
      } catch (error: any) {
        if (error?.status === 401) {
          throw new LLMAuthenticationError('Invalid OpenAI API key');
        }

        if (error?.status >= 500 && attempt < this.config.maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (error.code === 'timeout') {
          throw new LLMTimeoutError('OpenAI request timeout');
        }

        throw new LLMServiceError(
          error?.message || 'Unexpected OpenAI error',
          error?.status,
          error
        );
      }
    }

    throw new LLMServiceError('Max retries exceeded');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getConfig(): Omit<LLMClientConfig, 'apiKey'> {
    return {
      defaultModel: this.config.defaultModel,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    };
  }
}

export default new LLMClient();
