'use client';

import type { PaletteResultItem as ResultItemType } from './types';

interface ResultItemProps {
  item: ResultItemType;
  isSelected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function ResultItem({
  item,
  isSelected,
  onMouseEnter,
  onClick,
}: ResultItemProps) {
  return (
    <li
      id={item.id}
      role="option"
      aria-selected={isSelected}
      className={`cmd-palette__item ${isSelected ? 'cmd-palette__item--selected' : ''}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      {item.icon && <span className="cmd-palette__item-icon" aria-hidden="true">{item.icon}</span>}
      <span className="cmd-palette__item-label">{item.label}</span>
      {item.description && (
        <span className="cmd-palette__item-desc">{item.description}</span>
      )}
    </li>
  );
}

interface ShowMoreItemProps {
  count: number;
  groupLabel: string;
  isSelected: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}

export function ShowMoreItem({
  count,
  groupLabel,
  isSelected,
  onMouseEnter,
  onClick,
}: ShowMoreItemProps) {
  return (
    <li
      role="option"
      aria-selected={isSelected}
      className={`cmd-palette__item cmd-palette__item--more ${isSelected ? 'cmd-palette__item--selected' : ''}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      Show {count} more {groupLabel}...
    </li>
  );
}
