'use client';

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

interface DropdownItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  detail?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItem[];
  onSelect: (id: string) => void;
  align?: 'left' | 'right';
  width?: number;
  className?: string;
}

export function Dropdown({
  trigger,
  items,
  onSelect,
  align = 'left',
  width,
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setHighlightedIndex(-1);
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, close]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const enabledItems = items.filter((i) => !i.disabled);

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev + 1;
            return next >= enabledItems.length ? 0 : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) => {
            const next = prev - 1;
            return next < 0 ? enabledItems.length - 1 : next;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < enabledItems.length) {
            onSelect(enabledItems[highlightedIndex].id);
            close();
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
      }
    },
    [items, highlightedIndex, onSelect, close],
  );

  const enabledItems = items.filter((i) => !i.disabled);
  const highlightedId =
    highlightedIndex >= 0 && highlightedIndex < enabledItems.length
      ? enabledItems[highlightedIndex].id
      : null;

  return (
    <div
      ref={containerRef}
      className={`ui-dropdown ${className}`}
      onKeyDown={handleKeyDown}
    >
      <button
        className="ui-dropdown__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        type="button"
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={listRef}
          className={`ui-dropdown__menu ui-dropdown__menu--${align}`}
          style={width ? { width: `${width}px` } : undefined}
          role="listbox"
        >
          {items.map((item) => (
            <button
              key={item.id}
              className={`ui-dropdown__item ${
                item.id === highlightedId ? 'ui-dropdown__item--highlighted' : ''
              } ${item.danger ? 'ui-dropdown__item--danger' : ''}`}
              role="option"
              aria-selected={item.id === highlightedId}
              aria-disabled={item.disabled}
              onClick={() => {
                if (!item.disabled) {
                  onSelect(item.id);
                  close();
                }
              }}
              disabled={item.disabled}
              type="button"
            >
              {item.icon && (
                <span className="ui-dropdown__item-icon" aria-hidden="true">
                  {item.icon}
                </span>
              )}
              <span className="ui-dropdown__item-label">{item.label}</span>
              {item.detail && (
                <span className="ui-dropdown__item-detail">{item.detail}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
