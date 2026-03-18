import { omit } from 'lodash';
import { ParsedPostQuery } from '../types/search/searchTypes';

export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);

export const buildFiltersFromParsedQuery = (parsedQuery: Partial<ParsedPostQuery>) => {
  const { titleKeywords, descriptionKeywords, daysRange, location, maxPrice } = parsedQuery;

  const strictFilter: any = {};
  const keywordConditions: any[] = [];

  if (location?.country) {
    strictFilter['location.country'] = { $regex: `^${location.country.toLowerCase()}$`, $options: 'i' };
  }

  if (location?.city) {
    strictFilter['location.city'] = { $regex: `^${location.city.toLowerCase()}$`, $options: 'i' };
  }

  if (daysRange && (daysRange.min !== undefined || daysRange.max !== undefined)) {
    strictFilter.numberOfDays = {};
    if (daysRange.min) strictFilter.numberOfDays.$gte = daysRange.min;
    if (daysRange.max) strictFilter.numberOfDays.$lte = daysRange.max;
  }

  if (maxPrice) {
    strictFilter.price = { $lte: maxPrice };
  }

  titleKeywords?.forEach((w) => keywordConditions.push({ title: { $regex: w, $options: 'i' } }));
  descriptionKeywords?.forEach((word) =>
    keywordConditions.push({ description: { $regex: word, $options: 'i' } })
  );

  return { strictFilter, keywordConditions };
};

export const buildFilterQuery = (queryParams: Record<string, any>): Record<string, any> => {
  const { strictFilter, keywordConditions } = buildFiltersFromParsedQuery({
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

  const mongoFilter: Record<string, any> = { ...strictFilter };

  if (keywordConditions.length > 0) {
    mongoFilter.$or = keywordConditions;
  }

  const handledParams = ['minDays', 'maxDays', 'maxPrice', 'city', 'country'];
  const otherParams = omit(queryParams, handledParams);

  return { ...mongoFilter, ...otherParams };
};
