/**
 * EMBEDDING_GENERATION + BATCH_EMBEDDINGS task handler.
 * Generates vector embeddings using the configured provider (hash-based offline by default).
 */
import { createHash } from "crypto";
import type {
  EmbeddingPayload,
  EmbeddingResult,
  BatchEmbeddingPayload,
  BatchEmbeddingResult,
  WorkerTaskType,
  WorkerHandlerContext,
} from "../types";

const EMBEDDING_DIMENSION = 1536;

function generateHashEmbedding(text: string): { vector: number[]; tokenCount: number } {
  const vector = new Float32Array(EMBEDDING_DIMENSION);
  const normalized = text.toLowerCase().trim();

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

  // Estimate token count (rough: 1 token ≈ 4 chars)
  const tokenCount = Math.ceil(text.length / 4);

  return { vector: result, tokenCount };
}

export async function handleEmbeddingGeneration(
  payload: EmbeddingPayload,
  ctx: WorkerHandlerContext,
): Promise<EmbeddingResult> {
  if (ctx.signal.aborted) throw new Error("Cancelled");

  const { vector, tokenCount } = generateHashEmbedding(payload.text);

  ctx.reportProgress(1.0, "Embedding generated");
  return { vector, dimensions: EMBEDDING_DIMENSION, tokenCount };
}

export async function handleBatchEmbeddings(
  payload: BatchEmbeddingPayload,
  ctx: WorkerHandlerContext,
): Promise<BatchEmbeddingResult> {
  const results: BatchEmbeddingResult["results"] = [];
  const total = payload.items.length;
  let totalTokens = 0;

  for (let i = 0; i < total; i++) {
    if (ctx.signal.aborted) throw new Error("Cancelled");

    const item = payload.items[i];
    const { vector, tokenCount } = generateHashEmbedding(item.text);
    totalTokens += tokenCount;

    results.push({
      nodeId: item.nodeId,
      vector,
      dimensions: EMBEDDING_DIMENSION,
      tokenCount,
    });

    ctx.reportProgress((i + 1) / total, `Processing batch... ${i + 1}/${total} chunks`);
  }

  return { results, totalTokens };
}

export function estimateEmbeddingMemory(items: number): number {
  return 10 + items * 0.5; // ~10MB base + 0.5MB per chunk
}
