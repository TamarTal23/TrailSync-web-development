import { StatusCodes } from 'http-status-codes';

export class LLMServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'LLMServiceError';
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export class LLMAuthenticationError extends LLMServiceError {
  constructor(message: string) {
    super(message, StatusCodes.UNAUTHORIZED);
    this.name = 'LLMAuthenticationError';
  }
}

export class LLMTimeoutError extends LLMServiceError {
  constructor(message: string) {
    super(message, StatusCodes.REQUEST_TIMEOUT);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMParsingError extends LLMServiceError {
  constructor(message: string, originalError?: Error) {
    super(message, undefined, originalError);
    this.name = 'LLMParsingError';
  }
}
