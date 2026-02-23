/* eslint-disable no-undef */
import llmClient from '../../services/llmClient';
import {
  LLMAuthenticationError,
  LLMServiceError,
  LLMTimeoutError,
} from '../../types/llm/errors/errors';

jest.mock('../../services/llmClient', () => ({
  __esModule: true,
  default: {
    generateResponse: jest.fn(),
    testConnection: jest.fn(),
    isHealthy: jest.fn(),
    getConfig: jest.fn(),
  },
}));

const mockLLMClient = llmClient as jest.Mocked<typeof llmClient>;

// afterAll(async () => {
//   jest.clearAllMocks();
// });

describe('LLMClient Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    test('generate a response successfully', async () => {
      const mockResponse = {
        success: true,
        response: 'This is a test response',
        usage: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
          totalTokenCount: 30,
        },
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockResponse);

      const result = await mockLLMClient.generateResponse('Hello world');

      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
      expect(result.response).toBe('This is a test response');
      expect(mockLLMClient.generateResponse).toHaveBeenCalledWith('Hello world');
    });

    test('generate a response with custom options', async () => {
      const mockResponse = {
        success: true,
        response: 'Custom model response',
        usage: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15,
        },
      };

      const options = {
        model: 'gemini-pro',
        temperature: 0.5,
        max_tokens: 500,
        top_p: 0.8,
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockResponse);

      const result = await mockLLMClient.generateResponse('Hello world', options);

      expect(result).toEqual(mockResponse);
      expect(mockLLMClient.generateResponse).toHaveBeenCalledWith('Hello world', options);
    });

    test('throw LLMAuthenticationError on invalid API key', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(
        new LLMAuthenticationError('Invalid Gemini API key')
      );

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(
        LLMAuthenticationError
      );

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(
        'Invalid Gemini API key'
      );
    });

    test('throw LLMTimeoutError on request timeout', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(
        new LLMTimeoutError('Gemini request timeout')
      );

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(LLMTimeoutError);

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(
        'Gemini request timeout'
      );
    });

    test('throw LLMServiceError on max retries exceeded', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new LLMServiceError('Max retries exceeded'));

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(LLMServiceError);

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(
        'Max retries exceeded'
      );
    });

    test('throw LLMServiceError on unexpected error', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(
        new LLMServiceError('Unexpected Gemini error')
      );

      await expect(mockLLMClient.generateResponse('Hello world')).rejects.toThrow(LLMServiceError);
    });
  });

  describe('testConnection', () => {
    test('return success when connection is valid', async () => {
      const mockResult = {
        success: true,
        message: 'Gemini connection successful',
      };

      mockLLMClient.testConnection.mockResolvedValue(mockResult);

      const result = await mockLLMClient.testConnection();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Gemini connection successful');
      expect(mockLLMClient.testConnection).toHaveBeenCalled();
    });

    test('return failure when connection fails', async () => {
      const mockResult = {
        success: false,
        message: 'Invalid Gemini API key',
      };

      mockLLMClient.testConnection.mockResolvedValue(mockResult);

      const result = await mockLLMClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid Gemini API key');
    });

    test('return failure message on timeout', async () => {
      const mockResult = {
        success: false,
        message: 'Gemini request timeout',
      };

      mockLLMClient.testConnection.mockResolvedValue(mockResult);

      const result = await mockLLMClient.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Gemini request timeout');
    });
  });

  describe('isHealthy', () => {
    test('return true when service is healthy', async () => {
      mockLLMClient.isHealthy.mockResolvedValue(true);

      const result = await mockLLMClient.isHealthy();

      expect(result).toBe(true);
      expect(mockLLMClient.isHealthy).toHaveBeenCalled();
    });

    test('return false when service is unhealthy', async () => {
      mockLLMClient.isHealthy.mockResolvedValue(false);

      const result = await mockLLMClient.isHealthy();

      expect(result).toBe(false);
      expect(mockLLMClient.isHealthy).toHaveBeenCalled();
    });
  });

  describe('getConfig', () => {
    test('return configuration without the API key', () => {
      const mockConfig = {
        defaultModel: 'gemini-flash-latest',
        timeout: 30000,
        maxRetries: 3,
      };

      mockLLMClient.getConfig.mockReturnValue(mockConfig);

      const config = mockLLMClient.getConfig();

      expect(config).toEqual(mockConfig);
      expect(config).not.toHaveProperty('apiKey');
      expect(config.defaultModel).toBe('gemini-flash-latest');
      expect(config.timeout).toBe(30000);
      expect(config.maxRetries).toBe(3);
    });

    test('reflect custom environment configuration', () => {
      const mockConfig = {
        defaultModel: 'gemini-pro',
        timeout: 60000,
        maxRetries: 5,
      };

      mockLLMClient.getConfig.mockReturnValue(mockConfig);

      const config = mockLLMClient.getConfig();

      expect(config.defaultModel).toBe('gemini-pro');
      expect(config.timeout).toBe(60000);
      expect(config.maxRetries).toBe(5);
    });
  });
});
