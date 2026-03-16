import { describe, expect, test } from '@jest/globals';
import { buildFilterQuery, buildFiltersFromParsedQuery } from '../../utilities/general';

describe('general utils', () => {
  describe('buildFiltersFromParsedQuery', () => {
    test('should return empty filter when no fields are provided', () => {
      const result = buildFiltersFromParsedQuery({});
      expect(result).toEqual({});
    });

    test('should build $or filter from titleKeywords', () => {
      const result = buildFiltersFromParsedQuery({ titleKeywords: ['beach'] });
      expect(result.$or).toEqual([{ title: { $regex: 'beach', $options: 'i' } }]);
    });

    test('should build $or filter from descriptionKeywords', () => {
      const result = buildFiltersFromParsedQuery({ descriptionKeywords: ['snorkeling'] });
      expect(result.$or).toEqual([{ description: { $regex: 'snorkeling', $options: 'i' } }]);
    });

    test('should combine titleKeywords and descriptionKeywords in $or', () => {
      const result = buildFiltersFromParsedQuery({
        titleKeywords: ['beach'],
        descriptionKeywords: ['snorkeling'],
      });
      expect(result.$or).toHaveLength(2);
    });

    test('should skip daysRange if not provided', () => {
      const result = buildFiltersFromParsedQuery({ titleKeywords: ['beach'] });
      expect(result).not.toHaveProperty('numberOfDays');
    });

    test('should build numberOfDays filter from daysRange min', () => {
      const result = buildFiltersFromParsedQuery({ daysRange: { min: 3 } });
      expect(result.numberOfDays).toEqual({ $gte: 3 });
    });

    test('should build numberOfDays filter from daysRange max', () => {
      const result = buildFiltersFromParsedQuery({ daysRange: { max: 7 } });
      expect(result.numberOfDays).toEqual({ $lte: 7 });
    });

    test('should build numberOfDays filter from full daysRange', () => {
      const result = buildFiltersFromParsedQuery({ daysRange: { min: 3, max: 7 } });
      expect(result.numberOfDays).toEqual({ $gte: 3, $lte: 7 });
    });

    test('should build price filter from maxPrice', () => {
      const result = buildFiltersFromParsedQuery({ maxPrice: 500 });
      expect(result.price).toEqual({ $lte: 500 });
    });

    test('should skip location if not provided', () => {
      const result = buildFiltersFromParsedQuery({ maxPrice: 500 });
      expect(result).not.toHaveProperty('location.city');
      expect(result).not.toHaveProperty('location.country');
    });

    test('should build location.country filter', () => {
      const result = buildFiltersFromParsedQuery({ location: { country: 'Japan' } });
      expect(result['location.country']).toEqual({ $regex: '^japan$', $options: 'i' });
    });

    test('should build location.city and location.country filter', () => {
      const result = buildFiltersFromParsedQuery({
        location: { country: 'Japan', city: 'Tokyo' },
      });
      expect(result['location.country']).toEqual({ $regex: '^japan$', $options: 'i' });
      expect(result['location.city']).toEqual({ $regex: '^tokyo$', $options: 'i' });
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
