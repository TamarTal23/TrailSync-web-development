/* eslint-disable no-undef */
import queryParserService from '../../services/queryParser';
import llmClient from '../../services/llmClient';
import { QueryParsingError, QueryValidationError } from '../../types/search/errors';

// Mock the LLM client
jest.mock('../../services/llmClient', () => ({
  __esModule: true,
  default: {
    generateResponse: jest.fn(),
  },
}));

const mockLLMClient = llmClient as jest.Mocked<typeof llmClient>;

// afterAll(async () => {
//   jest.clearAllMocks();
// });

describe('QueryParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseNaturalLanguagePostQuery', () => {
    test('parse simple title query successfully', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['Paris'],
          searchType: 'title',
          confidence: 0.95,
          reasoning: 'Simple title search for Paris travel posts',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery('Paris');

      expect(result).toMatchObject({
        titleKeywords: ['Paris'],
        searchType: 'title',
        confidence: 0.95,
      });

      expect(mockLLMClient.generateResponse).toHaveBeenCalledWith(
        expect.stringContaining('Paris'),
        expect.objectContaining({
          temperature: 0.1,
          max_tokens: 2000,
        })
      );
    });

    test('parse combined query with days range', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['beach', 'vacation'],
          daysRange: { min: 7, max: 14 },
          searchType: 'combined',
          confidence: 0.88,
          reasoning: 'Title keywords with days range filter',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'beach vacation 7-14 days'
      );

      expect(result).toMatchObject({
        titleKeywords: ['beach', 'vacation'],
        daysRange: { min: 7, max: 14 },
        searchType: 'combined',
        confidence: 0.88,
      });
    });

    test('parse query with location filter', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['hiking'],
          location: { country: 'Japan', city: 'Kyoto' },
          searchType: 'combined',
          confidence: 0.92,
          reasoning: 'Hiking posts in Kyoto, Japan',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result =
        await queryParserService.parseNaturalLanguagePostQuery('hiking in Kyoto Japan');

      expect(result).toMatchObject({
        titleKeywords: ['hiking'],
        location: { country: 'Japan', city: 'Kyoto' },
        searchType: 'combined',
        confidence: 0.92,
      });
    });

    test('parse query with max price filter', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['Europe', 'budget'],
          maxPrice: 1000,
          searchType: 'combined',
          confidence: 0.85,
          reasoning: 'Budget Europe travel under $1000',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'budget Europe trip under 1000'
      );

      expect(result).toMatchObject({
        titleKeywords: expect.arrayContaining(['Europe', 'budget']),
        maxPrice: 1000,
        searchType: 'combined',
        confidence: 0.85,
      });
    });

    test('parse query with description keywords', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['Thailand'],
          descriptionKeywords: ['snorkeling', 'diving', 'beach'],
          searchType: 'combined',
          confidence: 0.9,
          reasoning: 'Thailand water activities search',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'Thailand snorkeling diving beach'
      );

      expect(result).toMatchObject({
        titleKeywords: ['Thailand'],
        descriptionKeywords: expect.arrayContaining(['snorkeling', 'diving', 'beach']),
        searchType: 'combined',
        confidence: 0.9,
      });
    });

    test('apply maxKeywords option and slice titleKeywords', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['beach', 'hiking', 'camping', 'safari', 'skiing'],
          searchType: 'title',
          confidence: 0.8,
          reasoning: 'Multiple activity keywords',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'beach hiking camping safari skiing trips',
        { maxKeywords: 3 }
      );

      expect(result.titleKeywords).toHaveLength(3);
      expect(result.titleKeywords).toEqual(['beach', 'hiking', 'camping']);
    });

    test('fallback to keyword parsing when LLM throws an error', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await queryParserService.parseNaturalLanguagePostQuery('beach hiking 5 days');

      expect(result.titleKeywords).toContain('beach');
      expect(result.titleKeywords).toContain('hiking');
      expect(result.daysRange).toEqual({ min: 5, max: 5 });
      expect(result.searchType).toBe('combined');
      expect(result.confidence).toBe(0.3);
    });

    test('fallback and detect day range pattern "3-7 days"', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await queryParserService.parseNaturalLanguagePostQuery('Europe trip 3-7 days');

      expect(result.daysRange).toEqual({ min: 3, max: 7 });
      expect(result.searchType).toBe('combined');
      expect(result.confidence).toBe(0.3);
    });

    test('fallback and extract activity description keywords', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new Error('LLM service unavailable'));

      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'romantic beach snorkeling getaway'
      );

      expect(result.descriptionKeywords).toEqual(
        expect.arrayContaining(['romantic', 'beach', 'snorkeling'])
      );
      expect(result.confidence).toBe(0.3);
    });

    test('throw QueryValidationError for empty query', async () => {
      await expect(queryParserService.parseNaturalLanguagePostQuery('')).rejects.toThrow(
        QueryValidationError
      );

      await expect(queryParserService.parseNaturalLanguagePostQuery('   ')).rejects.toThrow(
        QueryValidationError
      );
    });

    test('throw QueryValidationError for query exceeding 500 characters', async () => {
      const longQuery = 'a'.repeat(501);

      await expect(queryParserService.parseNaturalLanguagePostQuery(longQuery)).rejects.toThrow(
        QueryValidationError
      );
    });

    test('throw QueryParsingError for invalid LLM JSON response', async () => {
      const mockLLMResponse = {
        success: true,
        response: 'this is not valid json {{{',
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      await expect(queryParserService.parseNaturalLanguagePostQuery('Paris trip')).rejects.toThrow(
        QueryParsingError
      );
    });

    test('throw QueryParsingError when LLM returns success: false', async () => {
      const mockLLMResponse = {
        success: false,
        response: '',
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      await expect(queryParserService.parseNaturalLanguagePostQuery('Paris trip')).rejects.toThrow(
        QueryParsingError
      );
    });

    test('throw QueryParsingError when fallbackToKeywords is false and LLM fails', async () => {
      mockLLMClient.generateResponse.mockRejectedValue(new Error('LLM service error'));

      await expect(
        queryParserService.parseNaturalLanguagePostQuery('Paris trip', {
          fallbackToKeywords: false,
        })
      ).rejects.toThrow(QueryParsingError);
    });

    test('trim whitespace from keywords in LLM response', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['  Paris  ', ' adventure ', 'travel'],
          searchType: 'title',
          confidence: 0.9,
          reasoning: 'Keywords with extra whitespace',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery('Paris adventure');

      expect(result.titleKeywords).toEqual(['Paris', 'adventure', 'travel']);
    });

    test('clamp confidence value to [0, 1] range', async () => {
      const mockLLMResponse = {
        success: true,
        response: JSON.stringify({
          titleKeywords: ['Tokyo'],
          searchType: 'title',
          confidence: 1.5, // Out of range
          reasoning: 'Confidence out of range',
        }),
      };

      mockLLMClient.generateResponse.mockResolvedValue(mockLLMResponse);

      const result = await queryParserService.parseNaturalLanguagePostQuery('Tokyo');

      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateParsedQuery', () => {
    test('validate a correct title query', () => {
      const validQuery = {
        titleKeywords: ['Paris'],
        searchType: 'title' as const,
        confidence: 0.95,
      };

      expect(queryParserService.validateParsedQuery(validQuery)).toBe(true);
    });

    test('validate a correct combined query with all fields', () => {
      const validQuery = {
        titleKeywords: ['beach'],
        descriptionKeywords: ['snorkeling', 'diving'],
        daysRange: { min: 5, max: 10 },
        maxPrice: 2000,
        location: { country: 'Thailand', city: 'Phuket' },
        searchType: 'combined' as const,
        confidence: 0.9,
      };

      expect(queryParserService.validateParsedQuery(validQuery)).toBe(true);
    });

    test('reject query with invalid searchType', () => {
      const invalidQuery = {
        titleKeywords: ['Paris'],
        searchType: 'invalid_type' as any,
        confidence: 0.9,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject query with confidence > 1', () => {
      const invalidQuery = {
        titleKeywords: ['Paris'],
        searchType: 'title' as const,
        confidence: 1.5,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject query with confidence < 0', () => {
      const invalidQuery = {
        titleKeywords: ['Paris'],
        searchType: 'title' as const,
        confidence: -0.1,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject query with invalid daysRange where min > max', () => {
      const invalidQuery = {
        titleKeywords: ['beach'],
        daysRange: { min: 14, max: 7 },
        searchType: 'combined' as const,
        confidence: 0.8,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('validate query with a valid daysRange', () => {
      const validQuery = {
        titleKeywords: ['hiking'],
        daysRange: { min: 3, max: 7 },
        searchType: 'combined' as const,
        confidence: 0.85,
      };

      expect(queryParserService.validateParsedQuery(validQuery)).toBe(true);
    });

    test('reject query where titleKeywords is not an array', () => {
      const invalidQuery = {
        titleKeywords: 'Paris' as any,
        searchType: 'title' as const,
        confidence: 0.9,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject query where titleKeywords contains non-strings', () => {
      const invalidQuery = {
        titleKeywords: ['Paris', 123, true] as any,
        searchType: 'title' as const,
        confidence: 0.9,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject query when titleKeywords exceeds maxKeywords option', () => {
      const query = {
        titleKeywords: ['Paris', 'beach', 'hiking'],
        searchType: 'title' as const,
        confidence: 0.9,
      };

      expect(queryParserService.validateParsedQuery(query, { maxKeywords: 2 })).toBe(false);
    });

    test('validate location with only country field', () => {
      const validQuery = {
        titleKeywords: ['adventure'],
        location: { country: 'New Zealand' },
        searchType: 'location' as const,
        confidence: 0.88,
      };

      expect(queryParserService.validateParsedQuery(validQuery)).toBe(true);
    });

    test('reject location where country is not a string', () => {
      const invalidQuery = {
        titleKeywords: ['adventure'],
        location: { country: 42 as any },
        searchType: 'location' as const,
        confidence: 0.88,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('reject location where city is not a string', () => {
      const invalidQuery = {
        titleKeywords: ['adventure'],
        location: { country: 'Japan', city: 999 as any },
        searchType: 'location' as const,
        confidence: 0.88,
      };

      expect(queryParserService.validateParsedQuery(invalidQuery)).toBe(false);
    });

    test('return false and not throw on completely invalid input', () => {
      expect(queryParserService.validateParsedQuery(null as any)).toBe(false);
      expect(queryParserService.validateParsedQuery(undefined as any)).toBe(false);
    });
  });
});
