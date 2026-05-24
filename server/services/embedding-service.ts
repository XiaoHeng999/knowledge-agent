/**
 * Embedding service — generates vector embeddings for text content.
 *
 * Architecture: strategy pattern with a pluggable EmbeddingProvider.
 * Default implementation uses a deterministic hash-based approach suitable
 * for offline/local use. Production deployments swap in API-backed providers
 * (e.g. OpenAI text-embedding-ada-002).
 */
import { createHash } from "crypto";

export const EMBEDDING_DIMENSION = 1536;

export interface EmbeddingProvider {
  /** Generate an embedding vector for the given text. */
  embed(text: string): Promise<number[]>;
  readonly name: string;
}

// ---------------------------------------------------------------------------
// Deterministic hash-based embedding (offline fallback)
// ---------------------------------------------------------------------------

class HashEmbeddingProvider implements EmbeddingProvider {
  readonly name = "hash-embedding";

  async embed(text: string): Promise<number[]> {
    const vector = new Float32Array(EMBEDDING_DIMENSION);
    const normalized = text.toLowerCase().trim();

    // Generate multiple hash windows to fill the vector dimensions
    for (let window = 0; window < Math.ceil(EMBEDDING_DIMENSION / 64); window++) {
      const input = `${normalized}::window:${window}`;
      const hash = createHash("sha256").update(input).digest();

      for (let i = 0; i < hash.length && (window * 64 + i * 2) < EMBEDDING_DIMENSION; i++) {
        const idx = window * 64 + i * 2;
        if (idx < EMBEDDING_DIMENSION) {
          vector[idx] = ((hash[i] & 0xff) / 128.0) - 1.0;
        }
        if (idx + 1 < EMBEDDING_DIMENSION) {
          vector[idx + 1] = (((hash[i] >> 4) & 0x0f) / 8.0) - 1.0;
        }
      }
    }

    // L2-normalize
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm) || 1;

    const result: number[] = new Array(EMBEDDING_DIMENSION);
    for (let i = 0; i < vector.length; i++) {
      result[i] = vector[i] / norm;
    }
    return result;
  }
}

// ---------------------------------------------------------------------------
// Singleton service
// ---------------------------------------------------------------------------

let currentProvider: EmbeddingProvider = new HashEmbeddingProvider();

export function getEmbeddingProvider(): EmbeddingProvider {
  return currentProvider;
}

export function setEmbeddingProvider(provider: EmbeddingProvider): void {
  currentProvider = provider;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  return currentProvider.embed(text);
}
