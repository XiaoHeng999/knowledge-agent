import type { FuzzyMatch } from './types';

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  const lower = query.toLowerCase();
  const targetLower = target.toLowerCase();

  if (targetLower === lower) {
    return { matchType: 'exact', score: 100, matchedIndices: Array.from({ length: query.length }, (_, i) => i) };
  }

  if (targetLower.startsWith(lower)) {
    return { matchType: 'prefix', score: 80, matchedIndices: Array.from({ length: query.length }, (_, i) => i) };
  }

  // Word boundary match
  const words = targetLower.split(/[\s\-_/.]+/);
  const wordStarts = words.map((_, i) =>
    words.slice(0, i).reduce((sum, w) => sum + w.length + 1, 0),
  );

  const wbMatchedIndices: number[] = [];
  let qi = 0;
  for (const start of wordStarts) {
    if (qi >= lower.length) break;
    if (targetLower[start] === lower[qi]) {
      wbMatchedIndices.push(start);
      qi++;
    }
  }
  if (qi === lower.length) {
    return { matchType: 'word-boundary', score: 60, matchedIndices: wbMatchedIndices };
  }

  // Fuzzy match — characters in order
  const matchedIndices: number[] = [];
  let targetIdx = 0;
  for (let i = 0; i < lower.length; i++) {
    while (targetIdx < targetLower.length && targetLower[targetIdx] !== lower[i]) {
      targetIdx++;
    }
    if (targetIdx >= targetLower.length) return null;
    matchedIndices.push(targetIdx);
    targetIdx++;
  }

  const contiguous = matchedIndices.reduce(
    (count, idx, i) => (i > 0 && idx === matchedIndices[i - 1] + 1 ? count + 1 : count),
    0,
  );
  const score = 30 + (contiguous / Math.max(query.length - 1, 1)) * 20;

  return { matchType: 'fuzzy', score, matchedIndices };
}
