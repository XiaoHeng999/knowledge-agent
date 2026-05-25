'use client';

import type { ResultGroup as ResultGroupType, PaletteResultItem } from './types';
import { ResultGroup } from './result-group';
import { PaletteEmptyState } from './empty-state';

interface ResultListProps {
  groups: ResultGroupType[];
  expandedGroups: Set<string>;
  selectedId: string | null;
  onSelectItem: (item: PaletteResultItem) => void;
  onHoverItem: (id: string) => void;
  onToggleExpand: (groupType: string) => void;
}

export function ResultList({
  groups,
  expandedGroups,
  selectedId,
  onSelectItem,
  onHoverItem,
  onToggleExpand,
}: ResultListProps) {
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);

  if (totalItems === 0) {
    return <PaletteEmptyState />;
  }

  return (
    <ul className="cmd-palette__results" role="listbox" aria-label="Search results">
      {groups.map((group) => (
        <ResultGroup
          key={group.type}
          group={group}
          expandedGroups={expandedGroups}
          selectedId={selectedId}
          onSelectItem={onSelectItem}
          onHoverItem={onHoverItem}
          onToggleExpand={onToggleExpand}
        />
      ))}
    </ul>
  );
}
