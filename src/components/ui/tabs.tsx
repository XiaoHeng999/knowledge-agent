'use client';

import { useState, useCallback, type ReactNode } from 'react';

interface TabItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  content: ReactNode;
}

interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function Tabs({
  items,
  defaultTab,
  activeTab: controlledActive,
  onTabChange,
  className = '',
}: TabsProps) {
  const [internalActive, setInternalActive] = useState(
    defaultTab ?? items[0]?.id ?? '',
  );

  const activeTab = controlledActive ?? internalActive;

  const handleTabClick = useCallback(
    (tabId: string) => {
      if (!controlledActive) {
        setInternalActive(tabId);
      }
      onTabChange?.(tabId);
    },
    [controlledActive, onTabChange],
  );

  const activeItem = items.find((item) => item.id === activeTab);

  return (
    <div className={`ui-tabs ${className}`}>
      <div className="ui-tabs__list" role="tablist">
        {items.map((item) => (
          <button
            key={item.id}
            className={`ui-tabs__tab ${
              item.id === activeTab ? 'ui-tabs__tab--active' : ''
            }`}
            role="tab"
            aria-selected={item.id === activeTab}
            aria-controls={`ui-tabs-panel-${item.id}`}
            id={`ui-tabs-tab-${item.id}`}
            onClick={() => handleTabClick(item.id)}
            disabled={item.disabled}
            type="button"
          >
            {item.icon && (
              <span className="ui-tabs__tab-icon" aria-hidden="true">
                {item.icon}
              </span>
            )}
            <span className="ui-tabs__tab-label">{item.label}</span>
          </button>
        ))}
      </div>
      <div
        className="ui-tabs__panel"
        role="tabpanel"
        id={`ui-tabs-panel-${activeTab}`}
        aria-labelledby={`ui-tabs-tab-${activeTab}`}
      >
        {activeItem?.content}
      </div>
    </div>
  );
}
