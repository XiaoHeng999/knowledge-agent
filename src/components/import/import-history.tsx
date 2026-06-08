'use client';

import { useEffect, useCallback, useState } from "react";
import { useImportStore } from "../../stores/import-store";

interface ImportHistoryProps {
  domainId?: string;
}

export function ImportHistory({ domainId }: ImportHistoryProps) {
  const { history, historyTotal, loading, fetchHistory, retryImport, cancelImport } =
    useImportStore();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory(domainId);
  }, [domainId, fetchHistory]);

  const handleRetry = useCallback(
    async (id: string) => {
      setRetryingId(id);
      await retryImport(id);
      setRetryingId(null);
      fetchHistory(domainId);
    },
    [retryImport, fetchHistory, domainId],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      await cancelImport(id);
      fetchHistory(domainId);
    },
    [cancelImport, fetchHistory, domainId],
  );

  if (loading && history.length === 0) {
    return <div style={emptyStyle}>Loading import history...</div>;
  }

  if (history.length === 0) {
    return <div style={emptyStyle}>No imports yet.</div>;
  }

  return (
    <div>
      <div style={headerRowStyle}>
        <span style={countStyle}>
          {historyTotal} import{historyTotal !== 1 ? "s" : ""}
        </span>
      </div>
      <div style={listStyle}>
        {history.map((item) => (
          <div key={item.id} style={itemStyle}>
            <div style={statusDotStyle(item.status)} />
            <div style={itemContentStyle}>
              <span style={statusTextStyle}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </span>
              {item.progress > 0 && item.progress < 100 && (
                <span style={progressTextStyle}>{item.progress}%</span>
              )}
            </div>
            <div style={actionsStyle}>
              {(item.status === "failed" || item.status === "partial") && (
                <button
                  style={actionBtnStyle}
                  onClick={() => handleRetry(item.id)}
                  disabled={retryingId === item.id}
                >
                  {retryingId === item.id ? "Retrying..." : "Retry"}
                </button>
              )}
              {(item.status === "pending" || item.status === "processing") && (
                <button style={actionBtnStyle} onClick={() => handleCancel(item.id)}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const emptyStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "32px 16px",
  color: "var(--text-secondary)",
  fontSize: 13,
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const countStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
};

const listStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
};

const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  fontSize: 13,
};

const statusDotStyle = (status: string): React.CSSProperties => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  flexShrink: 0,
  background:
    status === "completed"
      ? "#22c55e"
      : status === "partial"
        ? "#f59e0b"
        : status === "failed"
          ? "#ef4444"
          : status === "processing"
            ? "var(--accent)"
            : "var(--text-secondary)",
});

const itemContentStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  gap: 8,
  alignItems: "center",
};

const statusTextStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  fontWeight: 500,
};

const progressTextStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: 12,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
};

const actionBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  fontSize: 12,
  borderRadius: 4,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  cursor: "pointer",
};
