import { omit } from "lodash";

export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);

export const buildFilterQuery = (queryParams: Record<string, any>): Record<string, any> => {
  const filter: Record<string, any> = {};

  if (queryParams.minDays) {
    const minDays = parseInt(queryParams.minDays as string);
    if (!isNaN(minDays)) {
      filter.numberOfDays = { ...filter.numberOfDays, $gte: minDays };
    }
  }

  if (queryParams.maxDays) {
    const maxDays = parseInt(queryParams.maxDays as string);
    if (!isNaN(maxDays)) {
      filter.numberOfDays = { ...filter.numberOfDays, $lte: maxDays };
    }
  }

  if (queryParams.maxPrice) {
    const maxPrice = parseInt(queryParams.maxPrice as string);
    if (!isNaN(maxPrice)) {
      filter.price = { $lte: maxPrice };
    }
  }

  if (queryParams.city) {
    filter['location.city'] = queryParams.city;
  }

  if (queryParams.country) {
    filter['location.country'] = queryParams.country;
  }

  const handledParams = ['minDays', 'maxDays', 'maxPrice', 'city', 'country'];

 const otherParams = omit(queryParams, handledParams);

  return { ...filter, ...otherParams };
};
