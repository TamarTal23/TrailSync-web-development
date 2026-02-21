import { LLMParsingError, LLMServiceError } from '../types/llm/errors/errors';
import { LLMQueryResponse } from '../types/llm/llmTypes';
import { QueryParsingError, QueryValidationError } from '../types/search/errors';
import { ParsedPostQuery, QueryParsingOptions } from '../types/search/searchTypes';
import { SYSTEM_PROMPT } from '../utilities/queryParser';
import llmClient from './llmClient';

class QueryParserService {
  private readonly systemPrompt = SYSTEM_PROMPT;

  async parseNaturalLanguagePostQuery(
    query: string,
    queryParsingOptions: QueryParsingOptions = {}
  ): Promise<ParsedPostQuery> {
    try {
      this.validateQuery(query);

      const prompt = this.buildPrompt(query);

      const { response, success } = await llmClient.generateResponse(prompt, {
        temperature: 0.1,
        max_tokens: 500,
      });

      if (!success || !response) {
        throw new QueryParsingError('LLM service returned invalid response', query);
      }

      const parsedResponse = this.parseLLMResponse(response);

      const finalResult = this.applyParsingOptions(parsedResponse, query, queryParsingOptions);

      return finalResult;
    } catch (error) {
      if (error instanceof QueryParsingError) {
        throw error;
      }

      if (error instanceof LLMParsingError) {
        throw new QueryParsingError(error.message, query, error);
      }

      const shouldFallback =
        error instanceof LLMServiceError ||
        (error instanceof Error &&
          (error.message.includes('LLM service unavailable') ||
            error.message.includes('LLM service error')));

      if (shouldFallback && queryParsingOptions.fallbackToKeywords !== false) {
        console.warn('LLM parsing failed, falling back to keyword extraction:', error.message);
        return this.fallbackKeywordParsing(query);
      }

      if (error instanceof LLMServiceError) {
        throw new QueryParsingError(`LLM service error: ${error.message}`, query, error);
      }

      throw new QueryParsingError(
        `Unexpected error during query parsing: ${error instanceof Error ? error.message : 'Unknown'}`,
        query,
        error instanceof Error ? error : undefined
      );
    }
  }

  private validateQuery(query: string): void {
    if (!query || typeof query !== 'string') {
      throw new QueryValidationError('Query must be a non-empty string');
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length === 0) {
      throw new QueryValidationError('Query cannot be empty', query);
    }

    if (trimmedQuery.length > 500) {
      throw new QueryValidationError('Query too long (max 500 characters)', query);
    }
  }

  private parseLLMResponse(response: string): LLMQueryResponse {
    try {
      const parsed = JSON.parse(response.trim());

      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Response is not a valid object');
      }

      return parsed as LLMQueryResponse;
    } catch (error) {
      throw new LLMParsingError(
        `Failed to parse LLM JSON response: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  validateParsedQuery(
    parsedQueryResponse: ParsedPostQuery,
    queryParsingOptions?: QueryParsingOptions
  ): boolean {
    try {
      const {
        titleKeywords,
        searchType,
        confidence,
        descriptionKeywords,
        daysRange,
        maxPrice,
        location,
      } = parsedQueryResponse;

      const { maxKeywords } = queryParsingOptions || {};

      if (!titleKeywords || !Array.isArray(titleKeywords)) {
        return false;
      }

      if (
        !titleKeywords.every((k) => typeof k === 'string') ||
        (maxKeywords && titleKeywords.length > maxKeywords)
      ) {
        return false;
      }

      if (
        !searchType ||
        !['title', 'decription', 'days', 'price', 'location', 'combined', 'semantic'].includes(
          searchType
        )
      ) {
        return false;
      }

      if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
        return false;
      }

      if (descriptionKeywords) {
        if (
          descriptionKeywords &&
          (!Array.isArray(descriptionKeywords) ||
            !descriptionKeywords.every((k) => typeof k === 'string') ||
            (maxKeywords && descriptionKeywords.length > maxKeywords))
        ) {
          return false;
        }
      }

      if (daysRange) {
        const { min, max } = daysRange;

        if (min !== undefined && (typeof min !== 'number' || min < 1 || min > 365)) {
          return false;
        }

        if (max !== undefined && (typeof max !== 'number' || max < 1 || max > 365)) {
          return false;
        }

        if (min !== undefined && max !== undefined && min > max) {
          return false;
        }
      }

      if (maxPrice !== undefined) {
        if (typeof maxPrice !== 'number' || maxPrice <= 0 || maxPrice > 1_000_000) {
          return false;
        }
      }

      if (location) {
        if (
          typeof location.country !== 'string' ||
          (location.city !== undefined && typeof location.city !== 'string')
        ) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private applyParsingOptions(
    llmResponse: LLMQueryResponse,
    originalQuery: string,
    queryParsingOptions: QueryParsingOptions
  ): ParsedPostQuery {
    let titleKeywords = llmResponse.titleKeywords || [];

    if (queryParsingOptions.maxKeywords && titleKeywords.length > queryParsingOptions.maxKeywords) {
      titleKeywords = titleKeywords.slice(0, queryParsingOptions.maxKeywords);
    }

    titleKeywords = titleKeywords
      .filter((keyword) => keyword && keyword.trim().length > 0)
      .map((keyword) => keyword.trim());

    let descriptionKeywords = llmResponse.descriptionKeywords
      ?.filter((keyword) => keyword && keyword.trim().length > 0)
      .map((keyword) => keyword.trim());

    const result: ParsedPostQuery = {
      ...llmResponse,
      titleKeywords,
      descriptionKeywords: descriptionKeywords?.length ? descriptionKeywords : undefined,
      searchType: llmResponse.searchType || 'title',
      confidence: Math.max(0, Math.min(1, llmResponse.confidence ?? 0.5)),
    };

    if (!this.validateParsedQuery(result, queryParsingOptions)) {
      throw new QueryValidationError('Parsed query failed validation', originalQuery);
    }

    return result;
  }

  private buildPrompt(query: string): string {
    return `${this.systemPrompt}

Parse this travel post search query:
"${query.trim()}"

Respond with JSON only:`;
  }

  private fallbackKeywordParsing(query: string): ParsedPostQuery {
    const trimmedQuery = query.trim().toLowerCase();

    /* Simple keyword extraction  - get all "words" from the query,
     filter out short/common words, and take the top 5 as title keywords*/
    const titleKeywords = trimmedQuery
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)
      .slice(0, 5);

    const descriptionKeywords: string[] =
      trimmedQuery
        .match(/\b(hiking|beach|snorkeling|museum|ski|safari|food|nightlife|diving|romantic)\b/g)
        ?.map((w) => w.trim()) || [];

    let daysRange: { min?: number; max?: number } | undefined;

    //regex to find patterns like "5 day", "3-7 day", "7 to 10 day"
    const daysMatch = trimmedQuery.match(/(\d+)\s*(?:-|to)?\s*(\d+)?\s*day/);

    if (daysMatch) {
      const min = parseInt(daysMatch[1]);
      const max = daysMatch[2] ? parseInt(daysMatch[2]) : min;

      daysRange = { min, max };
    }

    const result: ParsedPostQuery = {
      titleKeywords,
      descriptionKeywords: descriptionKeywords ?? undefined,
      daysRange,
      searchType: daysRange ? 'combined' : 'title',
      confidence: 0.3,
    };

    return result;
  }
}

export default new QueryParserService();
