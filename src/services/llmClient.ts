import dotenv from 'dotenv';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { LLMClientConfig, LLMOptions, LLMResponse } from '../types/llm/llmTypes';
import {
  LLMAuthenticationError,
  LLMServiceError,
  LLMTimeoutError,
} from '../types/llm/errors/errors';

dotenv.config();

class LLMClient {
  private genAI: GoogleGenerativeAI;
  private config: LLMClientConfig;

  constructor() {
    this.config = {
      apiKey: process.env.GEMINI_API_KEY!,
      defaultModel: process.env.GEMINI_MODEL || 'gemini-flash-latest',
      timeout: Number(process.env.GEMINI_TIMEOUT || 30000),
      maxRetries: Number(process.env.GEMINI_MAX_RETRIES || 3),
    };

    if (!this.config.apiKey) {
      throw new Error('GEMINI_API_KEY is missing');
    }

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
  }

  async generateResponse(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    const modelId = options?.model || this.config.defaultModel;
    const model = this.genAI.getGenerativeModel({ model: modelId });

    const generationConfig = {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.max_tokens ?? 2000,
      topP: options?.top_p || 0.9,
    };

    const response = await this.makeRequest(model, prompt.trim(), generationConfig);

    return response;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.generateResponse('Hello', { max_tokens: 5 });

      return { success: true, message: 'Gemini connection successful' };
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
    model: GenerativeModel,
    prompt: string,
    config: any
  ): Promise<LLMResponse> {
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const result = await model.generateContent(
          {
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: config,
          },
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        const response = await result.response;

        return {
          success: true,
          response: response.text(),
          usage: response.usageMetadata,
        };
      } catch (error: any) {
        clearTimeout(timeoutId);

        const errorMessage = error?.message || '';

        if (errorMessage.includes('API_KEY_INVALID') || errorMessage.includes('401')) {
          throw new LLMAuthenticationError('Invalid Gemini API key');
        }

        if (
          (errorMessage.includes('429') || errorMessage.includes('500')) &&
          attempt < this.config.maxRetries
        ) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (error.name === 'AbortError' || error.message?.includes('deadline')) {
          throw new LLMTimeoutError('Gemini request timeout');
        }

        throw new LLMServiceError(errorMessage || 'Unexpected Gemini error', error?.status, error);
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
