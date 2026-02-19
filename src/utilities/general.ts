export const handleCreateRes = <T>(result: T) => (Array.isArray(result) ? result[0] : result);

/**
 * Builds a MongoDB filter query from specific query parameters.
 * Supports: minDays, maxDays, maxPrice, city, country
 */
export const buildFilterQuery = (queryParams: Record<string, any>): Record<string, any> => {
  const filter: Record<string, any> = {};

  // Handle minDays - numberOfDays >= minDays
  if (queryParams.minDays) {
    const minDays = parseInt(queryParams.minDays as string);
    if (!isNaN(minDays)) {
      filter.numberOfDays = { ...filter.numberOfDays, $gte: minDays };
    }
  }

  // Handle maxDays - numberOfDays <= maxDays
  if (queryParams.maxDays) {
    const maxDays = parseInt(queryParams.maxDays as string);
    if (!isNaN(maxDays)) {
      filter.numberOfDays = { ...filter.numberOfDays, $lte: maxDays };
    }
  }

  // Handle maxPrice - price <= maxPrice
  if (queryParams.maxPrice) {
    const maxPrice = parseInt(queryParams.maxPrice as string);
    if (!isNaN(maxPrice)) {
      filter.price = { $lte: maxPrice };
    }
  }

  // Handle city - exact match
  if (queryParams.city) {
    filter['location.city'] = queryParams.city;
  }

  // Handle country - exact match
  if (queryParams.country) {
    filter['location.country'] = queryParams.country;
  }

  // Pass through any other filters as exact matches
  const handledParams = ['minDays', 'maxDays', 'maxPrice', 'city', 'country'];
  for (const [key, value] of Object.entries(queryParams)) {
    if (!handledParams.includes(key)) {
      filter[key] = value;
    }
  }

  return filter;
};
