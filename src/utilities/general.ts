import { omit } from 'lodash';
import { ParsedPostQuery } from '../types/search/searchTypes';

export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildFiltersFromParsedQuery = (parsedQuery: Partial<ParsedPostQuery>) => {
  const { titleKeywords, descriptionKeywords, daysRange, location, maxPrice } = parsedQuery;
  const filter: Record<string, any> = {};

  if (titleKeywords?.length) {
    filter.$or = [
      ...(filter.$or || []),
      ...titleKeywords.map((keyWord) => ({
        title: { $regex: keyWord, $options: 'i' },
      })),
    ];
  }

  if (descriptionKeywords?.length) {
    filter.$or = [
      ...(filter.$or || []),
      ...descriptionKeywords.map((keyWord) => ({
        description: { $regex: keyWord, $options: 'i' },
      })),
    ];
  }

  if (location?.city) {
    filter.$or = [
      ...(filter.$or || []),
      { 'location.city': { $regex: location.city, $options: 'i' } },
    ];
  }

  if (location?.country) {
    filter.$or = [
      ...(filter.$or || []),
      { 'location.country': { $regex: location.country, $options: 'i' } },
    ];
  }

  if (daysRange?.min) {
    filter.numberOfDays = { ...filter.numberOfDays, $gte: daysRange.min };
  }

  if (daysRange?.max) {
    filter.numberOfDays = { ...filter.numberOfDays, $lte: daysRange.max };
  }

  if (maxPrice) {
    filter.price = { $lte: maxPrice };
  }

  if (location?.city) {
    const normalizedCity = location.city.toLowerCase().trim();
    
    filter['location.city'] = {
      $regex: `^${escapeRegExp(normalizedCity)}$`,
      $options: 'i',
    };
  }

  if (location?.country) {
    const normalizedCountry = location.country.toLowerCase().trim();

    filter['location.country'] = {
      $regex: `^${escapeRegExp(normalizedCountry)}$`,
      $options: 'i',
    };
  }

  return filter;
};

export const buildFilterQuery = (queryParams: Record<string, any>): Record<string, any> => {
  const filter = buildFiltersFromParsedQuery({
    daysRange: {
      min: queryParams.minDays,
      max: queryParams.maxDays,
    },
    maxPrice: queryParams.maxPrice,
    location: {
      city: queryParams.city,
      country: queryParams.country,
    },
  });

  const handledParams = ['minDays', 'maxDays', 'maxPrice', 'city', 'country'];

  const otherParams = omit(queryParams, handledParams);

  return { ...filter, ...otherParams };
};
