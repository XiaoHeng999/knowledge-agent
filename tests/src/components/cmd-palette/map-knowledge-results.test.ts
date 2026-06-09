import { describe, it, expect, vi } from 'vitest';
import { mapKnowledgeResults } from '@/components/cmd-palette/map-knowledge-results';
import type { KnowledgeSearchResult } from '@/lib/ipc/channels';

const makeNode = (overrides: Partial<{ id: string; title: string; content: string }> = {}) => ({
  id: overrides.id ?? 'node-1',
  domainId: 'domain-1',
  title: overrides.title ?? 'Test Node',
  type: 'concept',
  content: overrides.content ?? 'Some content here',
  comprehensionLevel: 0.8,
  sources: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
});

const makeResult = (overrides: Partial<{ id: string; title: string; content: string; score: number }> = {}): KnowledgeSearchResult => ({
  node: makeNode(overrides),
  score: overrides.score ?? 0.95,
  matchType: 'hybrid',
});

describe('mapKnowledgeResults', () => {
  it('maps search results to palette items with correct id, label, group', () => {
    const navigate = vi.fn();
    const results = [makeResult({ id: 'n1', title: 'React Hooks' }), makeResult({ id: 'n2', title: 'Zustand Store' })];

    const items = mapKnowledgeResults(results, navigate);

    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ id: 'knowledge-n1', label: 'React Hooks', group: 'knowledge' });
    expect(items[1]).toMatchObject({ id: 'knowledge-n2', label: 'Zustand Store', group: 'knowledge' });
  });

  it('action navigates to /domain?id=<nodeId>', () => {
    const navigate = vi.fn();
    const items = mapKnowledgeResults([makeResult({ id: 'abc123' })], navigate);

    items[0].action();

    expect(navigate).toHaveBeenCalledWith('/domain?id=abc123');
  });

  it('truncates description to 120 characters', () => {
    const longContent = 'A'.repeat(200);
    const items = mapKnowledgeResults([makeResult({ content: longContent })], vi.fn());

    expect(items[0].description).toHaveLength(120);
    expect(items[0].description).toBe('A'.repeat(117) + '...');
  });

  it('returns empty array for empty results', () => {
    const items = mapKnowledgeResults([], vi.fn());
    expect(items).toEqual([]);
  });
});
