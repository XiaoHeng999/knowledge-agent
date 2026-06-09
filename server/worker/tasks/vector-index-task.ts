/**
 * VECTOR_INDEX_BUILD task handler.
 * Generates embeddings for a batch of nodes (provided as payload) and returns
 * the vectors so the main process can upsert them into the vector index.
 */
import { createHash } from "crypto";
import type { VectorIndexPayload, VectorIndexResult, WorkerHandlerContext, VectorIndexTaskPayload, VectorIndexTaskResult } from "../types";

const EMBEDDING_DIMENSION = 1536;

function generateHashEmbedding(text: string): number[] {
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

export async function handleVectorIndexBuild(
  payload: VectorIndexTaskPayload,
  ctx: WorkerHandlerContext,
): Promise<VectorIndexTaskResult> {
  const startTime = Date.now();
  const nodes = payload.nodes;
  const total = nodes.length;
  const vectors: Array<{ nodeId: string; vector: number[] }> = [];

  for (let i = 0; i < total; i++) {
    if (ctx.signal.aborted) throw new Error("Cancelled");

    const node = nodes[i];
    const text = [node.title, node.content, node.summary].filter(Boolean).join(" ");
    if (!text.trim()) continue;

    const vector = generateHashEmbedding(text);
    vectors.push({ nodeId: node.id, vector });

    // Report progress: 0.0→0.3 loading, 0.3→0.9 embedding, 0.9→1.0 done
    const progress = 0.3 + (i / total) * 0.6;
    ctx.reportProgress(progress, `Building index... ${i + 1}/${total}`);
  }

  const buildTimeMs = Date.now() - startTime;
  ctx.reportProgress(1.0, `Index build complete (${vectors.length} vectors)`);

  return {
    indexedCount: vectors.length,
    totalVectors: vectors.length,
    buildTimeMs,
    vectors,
  };
}
