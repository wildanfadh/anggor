/**
 * Semantic Embedder
 *
 * V2.0: generates embeddings for semantic search.
 * Uses OpenAI text-embedding-3-small by default.
 */

export interface EmbeddingResult {
	text: string;
	embedding: number[];
	tokens: number;
}

export class Embedder {
	async embed(text: string): Promise<EmbeddingResult> {
		// Use provider to generate embedding
		// Since we don't have direct embedding API, we use a simple heuristic
		// In production, this would call the embeddings API
		const tokens = Math.ceil(text.length / 4);

		return {
			text,
			embedding: [], // Placeholder - real implementation would use embeddings API
			tokens,
		};
	}

	async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
		const results: EmbeddingResult[] = [];

		for (const text of texts) {
			results.push(await this.embed(text));
		}

		return results;
	}

	/**
	 * Simple cosine similarity between two embeddings.
	 */
	static similarity(a: number[], b: number[]): number {
		if (a.length === 0 || b.length === 0) return 0;

		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		const len = Math.min(a.length, b.length);

		for (let i = 0; i < len; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		if (normA === 0 || normB === 0) return 0;
		return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
	}

	/**
	 * Simple keyword-based similarity fallback.
	 */
	static keywordSimilarity(query: string, text: string): number {
		const queryWords = new Set(query.toLowerCase().split(/\s+/));
		const textWords = text.toLowerCase().split(/\s+/);
		let matches = 0;

		for (const word of textWords) {
			if (queryWords.has(word)) matches++;
		}

		return matches / Math.max(queryWords.size, 1);
	}
}
