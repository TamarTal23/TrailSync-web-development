import { omit } from 'lodash';
import { ParsedPostQuery } from '../types/search/searchTypes';

export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);

export const buildFiltersFromParsedQuery = (parsedQuery: Partial<ParsedPostQuery>) => {
  const { titleKeywords, descriptionKeywords, daysRange, location, maxPrice } = parsedQuery;
  const filter: Record<string, any> = {};

  if (titleKeywords?.length) {
    filter.$or = [
      ...(filter.$or || []),
      ...titleKeywords.map((keyWord) => ({ title: { $regex: keyWord, $options: 'i' } })),
    ];
  }

  if (descriptionKeywords?.length) {
    filter.$or = [
      ...(filter.$or || []),
      ...descriptionKeywords.map((kw) => ({ description: { $regex: kw, $options: 'i' } })),
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
    filter['location.city'] = location.city;
  }

  if (location?.country) {
    filter['location.country'] = location.country;
  }

  return filter;
};

export const buildFilterQuery = (queryParams: Record<string, any>): Record<string, any> => {
  // const filter: Record<string, any> = {};

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

  // if (queryParams.minDays) {
  //   const minDays = parseInt(queryParams.minDays as string);
  //   if (!isNaN(minDays)) {
  //     filter.numberOfDays = { ...filter.numberOfDays, $gte: minDays };
  //   }
  // }

  // if (queryParams.maxDays) {
  //   const maxDays = parseInt(queryParams.maxDays as string);
  //   if (!isNaN(maxDays)) {
  //     filter.numberOfDays = { ...filter.numberOfDays, $lte: maxDays };
  //   }
  // }

  // if (queryParams.maxPrice) {
  //   const maxPrice = parseInt(queryParams.maxPrice as string);
  //   if (!isNaN(maxPrice)) {
  //     filter.price = { $lte: maxPrice };
  //   }
  // }

  // if (queryParams.city) {
  //   filter['location.city'] = queryParams.city;
  // }

  // if (queryParams.country) {
  //   filter['location.country'] = queryParams.country;
  // }

  const handledParams = ['minDays', 'maxDays', 'maxPrice', 'city', 'country'];

  const otherParams = omit(queryParams, handledParams);

  return { ...filter, ...otherParams };
};
