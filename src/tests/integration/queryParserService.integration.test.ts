import queryParserService from '../../services/queryParser';
import { expect, test, describe } from '@jest/globals';
import { QueryValidationError } from '../../types/search/errors';

describe('QueryParserService Integration Tests', () => {
  describe('Title / Keyword Queries', () => {
    test('should parse a simple title keyword query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery('beach camping trip');

      expect(result.titleKeywords).toBeDefined();
      expect(result.titleKeywords.length).toBeGreaterThan(0);
      expect(result.titleKeywords).toEqual(expect.arrayContaining(['beach']));
      expect(result.searchType).toBe('title');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);

    test('should parse a multi-keyword activity query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'hiking and snorkeling adventure'
      );

      expect(result.titleKeywords.length).toBeGreaterThan(1);
      expect(result.titleKeywords).toEqual(expect.arrayContaining(['hiking']));
      expect(result.searchType).toBe('title');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Days Range Queries', () => {
    test('should parse a single day count query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery('5 day hiking trip');

      expect(result.daysRange).toBeDefined();
      expect(result.daysRange).toEqual({ min: 5, max: 5 });
      expect(result.searchType).toMatch(/days|combined/);
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);

    test('should parse a day range query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery(
        '3 to 7 day beach vacation'
      );

      expect(result.daysRange).toBeDefined();
      expect(result.daysRange).toEqual({ min: 3, max: 7 });
      expect(result.searchType).toBe('combined');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Price Queries', () => {
    test('should parse a max price query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery('trips under $500');

      expect(result.maxPrice).toBeDefined();
      expect(result.maxPrice).toBeLessThanOrEqual(500);
      expect(result.searchType).toMatch(/price|combined/);
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);

    test('should parse a combined price and keyword query', async () => {
      const result = await queryParserService.parseNaturalLanguagePostQuery(
        'luxury safari under $2000'
      );

      expect(result.titleKeywords).toEqual(expect.arrayContaining(['safari']));
      expect(result.maxPrice).toBeDefined();
      expect(result.maxPrice).toBeLessThanOrEqual(2000);
      expect(result.searchType).toBe('combined');
      expect(result.confidence).toBeGreaterThan(0);
    }, 15000);
  });

  describe('Resilience and Fallback', () => {
    test('should handle concurrent requests without errors', async () => {
      const queries = [
        'beach trips in Bali',
        '7 day safari under $1500',
        'hiking adventure in New Zealand',
      ];

      const results = await Promise.all(
        queries.map((query) => queryParserService.parseNaturalLanguagePostQuery(query))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.titleKeywords).toBeDefined();
        expect(result.titleKeywords.length).toBeGreaterThan(0);
        expect(result.searchType).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    }, 45000);
  });

  describe('Performance', () => {
    test('should complete parsing within 15 seconds', async () => {
      const start = Date.now();

      await queryParserService.parseNaturalLanguagePostQuery(
        '5 day hiking trip in Nepal under $1000'
      );

      expect(Date.now() - start).toBeLessThan(15000);
    }, 20000);
  });

  describe('Error Handling', () => {
    test('should reject an empty query with QueryValidationError', async () => {
      await expect(queryParserService.parseNaturalLanguagePostQuery('')).rejects.toThrow(
        QueryValidationError
      );
    });

    test('should reject a query exceeding 500 characters with QueryValidationError', async () => {
      await expect(
        queryParserService.parseNaturalLanguagePostQuery('a'.repeat(501))
      ).rejects.toThrow(QueryValidationError);
    });
  });
});
