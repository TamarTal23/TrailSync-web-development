import Post, { PostType } from '../model/postModel';
import { ParsedPostQuery } from '../types/search/searchTypes';
import { buildFiltersFromParsedQuery } from '../utilities/general';
import queryParserService from './queryParser';

export interface SearchParams {
  query: string;
}

class PostSearchService {
  async search(params: SearchParams): Promise<PostType[]> {
    try {
      const parsedQuery = await this.parseQuery(params.query);

      const posts = await this.searchDatabase(parsedQuery);

      return posts;
    } catch (error) {
      console.error('Posts search error:', error);
      throw error;
    }
  }

  private async parseQuery(query: string): Promise<ParsedPostQuery> {
    try {
      const parsedPostQuery = await queryParserService.parseNaturalLanguagePostQuery(query, {
        fallbackToKeywords: true,
        maxKeywords: 5,
      });

      return parsedPostQuery;
    } catch (error) {
      console.error('Query parsing failed, using fallback:', error);

      return {
        titleKeywords: [query.trim()],
        searchType: 'title',
        confidence: 0.2,
      };
    }
  }

  private async searchDatabase(parsedQuery: ParsedPostQuery): Promise<PostType[]> {
    const filters = buildFiltersFromParsedQuery(parsedQuery);

    let query = Post.find(filters)
      .populate({
        path: 'sender',
        select: 'username email profilePicture',
      })
      .populate({
        path: 'comments',
      })
      .sort({ updatedAt: -1 });

    return await query;
  }
}

export default new PostSearchService();
