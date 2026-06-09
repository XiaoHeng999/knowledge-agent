import type { KnowledgeSearchResult } from '@/lib/ipc/channels';
import type { PaletteResultItem } from './types';

const MAX_DESC = 120;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + '...';
}

export function mapKnowledgeResults(
  results: KnowledgeSearchResult[],
  navigate: (path: string) => void,
): PaletteResultItem[] {
  return results.map((r) => ({
    id: `knowledge-${r.node.id}`,
    label: r.node.title,
    description: truncate(r.node.content, MAX_DESC) || undefined,
    group: 'knowledge' as const,
    action: () => {
      navigate(`/domain?id=${r.node.id}`);
    },
  }));
}
