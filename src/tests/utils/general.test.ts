import { describe, expect, test } from '@jest/globals';
import { buildFilterQuery, buildFiltersFromParsedQuery } from '../../utilities/general';

describe('general utils', () => {
  describe('buildFiltersFromParsedQuery', () => {
    test('should return empty structures when no fields are provided', () => {
      const { strictFilter, keywordConditions } = buildFiltersFromParsedQuery({});
      expect(strictFilter).toEqual({});
      expect(keywordConditions).toEqual([]);
    });

    test('should build keywordConditions from titleKeywords', () => {
      const { keywordConditions } = buildFiltersFromParsedQuery({ titleKeywords: ['beach'] });
      expect(keywordConditions).toContainEqual({ title: { $regex: 'beach', $options: 'i' } });
    });

    test('should build keywordConditions from descriptionKeywords', () => {
      const { keywordConditions } = buildFiltersFromParsedQuery({
        descriptionKeywords: ['snorkeling'],
      });
      expect(keywordConditions).toContainEqual({
        description: { $regex: 'snorkeling', $options: 'i' },
      });
    });

    test('should build strictFilter.numberOfDays from full daysRange', () => {
      const { strictFilter } = buildFiltersFromParsedQuery({ daysRange: { min: 3, max: 7 } });
      expect(strictFilter.numberOfDays).toEqual({ $gte: 3, $lte: 7 });
    });

    test('should build strictFilter.price from maxPrice', () => {
      const { strictFilter } = buildFiltersFromParsedQuery({ maxPrice: 500 });
      expect(strictFilter.price).toEqual({ $lte: 500 });
    });

    test('should build location in strictFilter', () => {
      const { strictFilter } = buildFiltersFromParsedQuery({
        location: { country: 'Japan', city: 'Tokyo' },
      });
      // Use dot notation if your function sets keys like strictFilter['location.country']
      expect(strictFilter['location.country']).toEqual({ $regex: 'Japan', $options: 'i' });
      expect(strictFilter['location.city']).toEqual({ $regex: 'Tokyo', $options: 'i' });
    });
  });

  describe('buildFilterQuery', () => {
    test('should return empty filter for empty query params', () => {
      const result = buildFilterQuery({});
      expect(result).toEqual({});
    });

    test('should build filter from minDays and maxDays', () => {
      const result = buildFilterQuery({ minDays: 3, maxDays: 7 });
      expect(result.numberOfDays).toEqual({ $gte: 3, $lte: 7 });
    });

    test('should build filter from maxPrice', () => {
      const result = buildFilterQuery({ maxPrice: 1000 });
      expect(result.price).toEqual({ $lte: 1000 });
    });

    test('should build filter from city and country', () => {
      const result = buildFilterQuery({ city: 'Tokyo', country: 'Japan' });
      expect(result['location.city']).toEqual({ $regex: '^tokyo$', $options: 'i' });
      expect(result['location.country']).toEqual({ $regex: '^japan$', $options: 'i' });
    });

    test('should pass through unhandled query params', () => {
      const result = buildFilterQuery({ title: 'beach' });
      expect(result.title).toBe('beach');
    });

    test('should not include handled param keys in output', () => {
      const result = buildFilterQuery({ minDays: 3, maxDays: 7, maxPrice: 500 });
      expect(result).not.toHaveProperty('minDays');
      expect(result).not.toHaveProperty('maxDays');
      expect(result).not.toHaveProperty('maxPrice');
    });
  });
});
