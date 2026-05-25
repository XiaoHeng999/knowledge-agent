'use client';

import type { ResultGroup as ResultGroupType, PaletteResultItem } from './types';
import { ResultItem, ShowMoreItem } from './result-item';

interface ResultGroupProps {
  group: ResultGroupType;
  expandedGroups: Set<string>;
  selectedId: string | null;
  onSelectItem: (item: PaletteResultItem) => void;
  onHoverItem: (id: string) => void;
  onToggleExpand: (groupType: string) => void;
}

export function ResultGroup({
  group,
  expandedGroups,
  selectedId,
  onSelectItem,
  onHoverItem,
  onToggleExpand,
}: ResultGroupProps) {
  if (group.items.length === 0) return null;

  const isExpanded = expandedGroups.has(group.type);
  const visibleItems = isExpanded ? group.items : group.items.slice(0, 5);
  const overflow = group.total - 5;

  const allItems: Array<
    | { type: 'item'; data: PaletteResultItem; id: string }
    | { type: 'more'; id: string; count: number; groupLabel: string }
  > = visibleItems.map((item) => ({
    type: 'item' as const,
    data: item,
    id: item.id,
  }));

  if (overflow > 0 && !isExpanded) {
    allItems.push({
      type: 'more',
      id: `${group.type}-show-more`,
      count: overflow,
      groupLabel: group.type,
    });
  }

  return (
    <li role="group" className="cmd-palette__group">
      <div className="cmd-palette__group-header" aria-hidden="true">
        <span className="cmd-palette__group-icon">{group.icon}</span>
        {group.label}
      </div>
      <ul role="listbox" className="cmd-palette__group-items">
        {allItems.map((entry) =>
          entry.type === 'item' ? (
            <ResultItem
              key={entry.id}
              item={entry.data}
              isSelected={selectedId === entry.id}
              onMouseEnter={() => onHoverItem(entry.id)}
              onClick={() => onSelectItem(entry.data)}
            />
          ) : (
            <ShowMoreItem
              key={entry.id}
              count={entry.count}
              groupLabel={entry.groupLabel}
              isSelected={selectedId === entry.id}
              onMouseEnter={() => onHoverItem(entry.id)}
              onClick={() => onToggleExpand(group.type)}
            />
          ),
        )}
      </ul>
    </li>
  );
}
