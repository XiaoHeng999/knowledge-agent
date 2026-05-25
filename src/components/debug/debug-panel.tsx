'use client';

import { useState } from 'react';
import { useLogStore, useErrorStore } from '@/lib/error/error-recovery';
import type { LogEntry } from '@/lib/error/error-recovery';

type TabId = 'logs' | 'errors' | 'metrics';

export function DebugPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('logs');
  const entries = useLogStore((s) => s.entries);
  const debugMode = useLogStore((s) => s.debugMode);
  const setDebugMode = useLogStore((s) => s.setDebugMode);
  const clearLogs = useLogStore((s) => s.clearLogs);
  const errors = useErrorStore((s) => s.errors);
  const clearAllErrors = useErrorStore((s) => s.clearAll);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'logs', label: 'Logs', count: entries.length },
    { id: 'errors', label: 'Errors', count: errors.filter((e) => !e.dismissed).length },
    { id: 'metrics', label: 'Metrics' },
  ];

  return (
    <div className="debug-panel" role="dialog" aria-label="Debug panel">
      <div className="debug-panel__header">
        <span className="debug-panel__title">Debug</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 12 }}>
            <input
              type="checkbox"
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
            />
            Verbose
          </label>
          <button className="debug-panel__close" onClick={clearLogs} type="button" title="Clear logs">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="debug-panel__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`debug-panel__tab ${activeTab === tab.id ? 'debug-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>
      <div className="debug-panel__content">
        {activeTab === 'logs' && <LogsTab entries={entries} />}
        {activeTab === 'errors' && <ErrorsTab errors={errors} onClear={clearAllErrors} />}
        {activeTab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  );
}

function LogsTab({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) {
    return <div style={{ color: 'var(--text-tertiary)', padding: 8 }}>No log entries. Enable verbose mode for debug logs.</div>;
  }

  return (
    <>
      {entries.slice(-100).map((entry) => (
        <div key={entry.id} className="debug-panel__log-entry">
          <span className={`debug-panel__log-level debug-panel__log-level--${entry.level}`}>
            {entry.level.toUpperCase().slice(0, 4)}
          </span>
          <span className="debug-panel__log-time">
            {new Date(entry.timestamp).toLocaleTimeString()}
          </span>
          <span className="debug-panel__log-msg">{entry.message}</span>
        </div>
      ))}
    </>
  );
}

function ErrorsTab({ errors, onClear }: { errors: Array<{ id: string; code: string; message: string; timestamp: number; dismissed: boolean }>; onClear: () => void }) {
  const active = errors.filter((e) => !e.dismissed);

  if (active.length === 0) {
    return <div style={{ color: 'var(--text-tertiary)', padding: 8 }}>No active errors.</div>;
  }

  return (
    <>
      <div style={{ padding: '4px 0', textAlign: 'right' }}>
        <button onClick={onClear} type="button" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12 }}>
          Clear all
        </button>
      </div>
      {active.map((err) => (
        <div key={err.id} className="debug-panel__log-entry">
          <span className="debug-panel__log-level debug-panel__log-level--error">ERR</span>
          <span className="debug-panel__log-time">{new Date(err.timestamp).toLocaleTimeString()}</span>
          <span className="debug-panel__log-msg">
            [{err.code}] {err.message}
          </span>
        </div>
      ))}
    </>
  );
}

function MetricsTab() {
  const [metrics] = useState(() => ({
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
    memory: typeof performance !== 'undefined' && 'memory' in performance
      ? `${Math.round((performance as unknown as { memory: { usedJSHeapSize: number } }).memory.usedJSHeapSize / 1024 / 1024)}MB`
      : 'N/A',
    timestamp: new Date().toISOString(),
  }));

  const items = [
    { label: 'Platform', value: metrics.userAgent.split(' ').slice(-2).join(' ') },
    { label: 'Heap Used', value: metrics.memory },
    { label: 'Time', value: metrics.timestamp },
  ];

  return (
    <>
      {items.map((item) => (
        <div key={item.label} className="debug-panel__metric">
          <span className="debug-panel__metric-label">{item.label}</span>
          <span className="debug-panel__metric-value">{item.value}</span>
        </div>
      ))}
    </>
  );
}
