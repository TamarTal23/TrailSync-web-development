export class QueryParsingError extends Error {
  constructor(
    message: string,
    public originalQuery?: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'QueryParsingError';
  }
}

export class QueryValidationError extends QueryParsingError {
  constructor(message: string, originalQuery?: string) {
    super(message, originalQuery);
    this.name = 'QueryValidationError';
  }
}
