'use client';

export function PaletteEmptyState() {
  return (
    <div className="cmd-palette__empty">
      <p className="cmd-palette__empty-title">No results found</p>
      <p className="cmd-palette__empty-hint">
        Try a different search term or use <kbd>/</kbd> to browse slash commands.
      </p>
    </div>
  );
}
