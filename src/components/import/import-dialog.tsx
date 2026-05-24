'use client';

import { useState, useCallback, useRef, useEffect } from "react";
import { useImportStore } from "../../stores/import-store";

type ImportTab = "url" | "file" | "rss";

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  domainId?: string;
}

export function ImportDialog({ open, onClose, domainId }: ImportDialogProps) {
  const [tab, setTab] = useState<ImportTab>("url");
  const [urlInput, setUrlInput] = useState("");
  const [rssUrlInput, setRssUrlInput] = useState("");
  const [filePathInput, setFilePathInput] = useState("");
  const [rssResult, setRssResult] = useState<{ newItems: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { loading, error, activeImport, importUrl, importFile, pollRssFeed, clearError } =
    useImportStore();

  const reset = useCallback(() => {
    setUrlInput("");
    setRssUrlInput("");
    setFilePathInput("");
    setRssResult(null);
    clearError();
  }, [clearError]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Poll for status updates while import is active
  useEffect(() => {
    if (!activeImport || activeImport.status === "completed" || activeImport.status === "failed") {
      return;
    }
    const interval = setInterval(() => {
      useImportStore.getState().fetchStatus(activeImport.id);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeImport?.id, activeImport?.status]);

  const handleImportUrl = useCallback(async () => {
    if (!urlInput.trim()) return;
    const result = await importUrl(urlInput.trim(), domainId);
    if (result?.status === "completed") {
      setTimeout(handleClose, 1500);
    }
  }, [urlInput, domainId, importUrl, handleClose]);

  const handleImportFile = useCallback(async () => {
    if (!filePathInput.trim()) return;
    const result = await importFile(filePathInput.trim(), domainId);
    if (result?.status === "completed") {
      setTimeout(handleClose, 1500);
    }
  }, [filePathInput, domainId, importFile, handleClose]);

  const handleFilePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFilePathInput(file.path);
    }
  }, []);

  const handlePollRss = useCallback(async () => {
    if (!rssUrlInput.trim() || !domainId) return;
    const result = await pollRssFeed(rssUrlInput.trim(), domainId);
    setRssResult(result);
  }, [rssUrlInput, domainId, pollRssFeed]);

  if (!open) return null;

  const tabs: { key: ImportTab; label: string }[] = [
    { key: "url", label: "URL" },
    { key: "file", label: "PDF" },
    { key: "rss", label: "RSS" },
  ];

  const progressPercent = activeImport?.progress ?? 0;
  const isDone = activeImport?.status === "completed";
  const isFailed = activeImport?.status === "failed";

  return (
    <div style={overlayStyle} onClick={handleClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <h2 style={titleStyle}>Import Content</h2>
          <button style={closeBtnStyle} onClick={handleClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          {tabs.map((t) => (
            <button
              key={t.key}
              style={{
                ...tabStyle,
                ...(tab === t.key ? activeTabStyle : {}),
              }}
              onClick={() => {
                setTab(t.key);
                reset();
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* URL Tab */}
          {tab === "url" && (
            <div>
              <label style={labelStyle}>Paste a URL to import</label>
              <div style={inputRowStyle}>
                <input
                  style={inputStyle}
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImportUrl()}
                  disabled={loading}
                />
                <button
                  style={{ ...btnPrimaryStyle, opacity: loading ? 0.6 : 1 }}
                  onClick={handleImportUrl}
                  disabled={loading || !urlInput.trim()}
                >
                  {loading ? "Importing..." : "Import"}
                </button>
              </div>
            </div>
          )}

          {/* PDF Tab */}
          {tab === "file" && (
            <div>
              <label style={labelStyle}>Import a PDF file</label>
              <div style={inputRowStyle}>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="Select a PDF file..."
                  value={filePathInput}
                  onChange={(e) => setFilePathInput(e.target.value)}
                  disabled={loading}
                  readOnly
                />
                <button style={btnSecondaryStyle} onClick={handleFilePick}>
                  Browse
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
              </div>
              <button
                style={{
                  ...btnPrimaryStyle,
                  width: "100%",
                  marginTop: 12,
                  opacity: loading ? 0.6 : 1,
                }}
                onClick={handleImportFile}
                disabled={loading || !filePathInput.trim()}
              >
                {loading ? "Importing..." : "Import PDF"}
              </button>
            </div>
          )}

          {/* RSS Tab */}
          {tab === "rss" && (
            <div>
              <label style={labelStyle}>Poll an RSS feed</label>
              {!domainId && (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 8px" }}>
                  Select a domain to import RSS items into.
                </p>
              )}
              <div style={inputRowStyle}>
                <input
                  style={inputStyle}
                  type="url"
                  placeholder="https://blog.example.com/feed.xml"
                  value={rssUrlInput}
                  onChange={(e) => setRssUrlInput(e.target.value)}
                  disabled={loading}
                />
                <button
                  style={{ ...btnPrimaryStyle, opacity: loading ? 0.6 : 1 }}
                  onClick={handlePollRss}
                  disabled={loading || !rssUrlInput.trim() || !domainId}
                >
                  {loading ? "Polling..." : "Poll"}
                </button>
              </div>
              {rssResult && (
                <div style={rssResultStyle}>
                  Found {rssResult.newItems} new item{rssResult.newItems !== 1 ? "s" : ""}
                  {rssResult.errors > 0 && ` (${rssResult.errors} error${rssResult.errors !== 1 ? "s" : ""})`}
                  {" "}— added to inbox.
                </div>
              )}
            </div>
          )}

          {/* Progress */}
          {activeImport && loading && (
            <div style={progressContainerStyle}>
              <div style={progressTrackStyle}>
                <div
                  style={{
                    ...progressFillStyle,
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
              <span style={progressTextStyle}>
                {activeImport.status === "processing"
                  ? `Processing... ${progressPercent}%`
                  : activeImport.status === "pending"
                    ? "Queued..."
                    : ""}
              </span>
            </div>
          )}

          {/* Success */}
          {isDone && (
            <div style={successStyle}>Import completed successfully.</div>
          )}

          {/* Error */}
          {error && (
            <div style={errorStyle}>
              <span>{error}</span>
              {isFailed && activeImport && (
                <button
                  style={retryBtnStyle}
                  onClick={() => useImportStore.getState().retryImport(activeImport.id)}
                >
                  Retry
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline styles (following existing project pattern)
// ---------------------------------------------------------------------------

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const dialogStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  borderRadius: 12,
  width: 480,
  maxWidth: "90vw",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
  border: "1px solid var(--border)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 20px",
  borderBottom: "1px solid var(--border)",
};

const titleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
  color: "var(--text-primary)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  fontSize: 20,
  cursor: "pointer",
  color: "var(--text-secondary)",
  padding: "0 4px",
  lineHeight: 1,
};

const tabsStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid var(--border)",
  padding: "0 20px",
};

const tabStyle: React.CSSProperties = {
  padding: "10px 16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-secondary)",
  borderBottom: "2px solid transparent",
  marginBottom: -1,
};

const activeTabStyle: React.CSSProperties = {
  color: "var(--text-primary)",
  borderBottomColor: "var(--accent)",
};

const contentStyle: React.CSSProperties = {
  padding: 20,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-secondary)",
  marginBottom: 8,
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 12px",
  fontSize: 13,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  outline: "none",
};

const btnPrimaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const btnSecondaryStyle: React.CSSProperties = {
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--bg-secondary)",
  color: "var(--text-primary)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const progressContainerStyle: React.CSSProperties = {
  marginTop: 16,
};

const progressTrackStyle: React.CSSProperties = {
  height: 4,
  borderRadius: 2,
  background: "var(--bg-secondary)",
  overflow: "hidden",
};

const progressFillStyle: React.CSSProperties = {
  height: "100%",
  borderRadius: 2,
  background: "var(--accent)",
  transition: "width 0.3s ease",
};

const progressTextStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  marginTop: 4,
  display: "block",
};

const successStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "8px 12px",
  borderRadius: 6,
  background: "rgba(34, 197, 94, 0.1)",
  color: "#16a34a",
  fontSize: 13,
};

const errorStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "8px 12px",
  borderRadius: 6,
  background: "rgba(239, 68, 68, 0.1)",
  color: "#dc2626",
  fontSize: 13,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const retryBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  fontSize: 12,
  borderRadius: 4,
  border: "1px solid #dc2626",
  background: "transparent",
  color: "#dc2626",
  cursor: "pointer",
};

const rssResultStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "8px 12px",
  borderRadius: 6,
  background: "rgba(34, 197, 94, 0.1)",
  color: "#16a34a",
  fontSize: 13,
};
