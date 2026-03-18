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
    const { strictFilter, keywordConditions } = buildFiltersFromParsedQuery(parsedQuery);

    let finalFilter = { ...strictFilter };

    if (keywordConditions.length > 0) {
      finalFilter.$or = keywordConditions;
    }

    let posts = await Post.find(finalFilter)
      .populate({ path: 'sender', select: 'username email profilePicture' })
      .populate({ path: 'comments' })
      .sort({ updatedAt: -1 });

    if (posts.length === 0 && keywordConditions.length > 0 && Object.keys(strictFilter).length > 0) {
      console.log('Relaxing search: ignoring keywords, keeping strict filters.');

      posts = await Post.find(strictFilter)
        .populate({ path: 'sender', select: 'username email profilePicture' })
        .populate({ path: 'comments' })
        .sort({ updatedAt: -1 });
    }

    return posts;
  }
}

export default new PostSearchService();
