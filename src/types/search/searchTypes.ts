import { LLMQueryResponse } from '../llm/llmTypes';

export interface QueryParsingOptions {
  maxKeywords?: number;
  fallbackToKeywords?: boolean;
}

export interface ParsedPostQuery extends LLMQueryResponse {}
