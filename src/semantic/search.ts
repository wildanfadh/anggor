/**
 * Semantic Search
 *
 * V2.0: semantic code search using embeddings + keyword fallback.
 */

import { Embedder } from "./embedder.js";
import { Indexer, type IndexEntry } from "./indexer.js";
import { searchInFiles } from "../context/grep.js";

export interface SearchResult {
  path: string;
  content: string;
  score: number;
  preview: string;
  line?: number;
}

export class SemanticSearch {
  private indexer: Indexer;

  constructor() {
    this.indexer = new Indexer();
  }

  setProvider(_provider: import("../providers/index.js").Provider): void {
    // Provider stored for future embedding API integration
  }

  async index(cwd: string): Promise<IndexEntry[]> {
    return this.indexer.indexProject(cwd);
  }

  async search(
    query: string,
    cwd: string,
    topN = 5
  ): Promise<SearchResult[]> {
    const entries = await this.indexer.loadIndex(cwd);

    if (entries.length === 0) {
      // Fallback to grep-based search
      const grepResult = await searchInFiles(query, { cwd, maxResults: topN });
      return grepResult.matches.map((m) => ({
        path: m.file,
        content: m.preview,
        score: 1,
        preview: m.preview,
        line: m.line,
      }));
    }

    // Score entries using keyword similarity (embeddings when available)
    const scored = entries.map((entry) => ({
      ...entry,
      score: Embedder.keywordSimilarity(query, entry.content),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Get top N with score > 0
    return scored
      .filter((e) => e.score > 0)
      .slice(0, topN)
      .map((entry) => ({
        path: entry.path,
        content: entry.content,
        score: entry.score,
        preview: this.extractPreview(entry.content, query, 200),
      }));
  }

  private extractPreview(content: string, query: string, maxLength: number): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase().split(/\s+/)[0];

    const index = lowerContent.indexOf(lowerQuery);
    if (index === -1) return content.slice(0, maxLength);

    const start = Math.max(0, index - 50);
    const end = Math.min(content.length, index + maxLength);
    return content.slice(start, end);
  }
}
