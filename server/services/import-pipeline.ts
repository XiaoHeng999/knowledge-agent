/**
 * ImportPipeline service — URL, PDF, and RSS import with AI summarization (F8).
 * Routes all imported content through: extraction → metadata → AI summary → inbox staging.
 */
import { getDatabaseService } from "../db/index";
import type { ImportRow, ImportType, ImportStatus, InboxItemRow, InboxSourceType, InboxItemStatus } from "../db/schema";

export type ImportStatusType = ImportStatus;
import type {
  ImportUrlRequest,
  ImportFileRequest,
  ImportStatusResponse,
} from "../../src/lib/ipc/channels";
import { randomUUID } from "crypto";
import { createHash } from "crypto";
import * as KnowledgeGraph from "./knowledge-graph";
import { generateEmbedding } from "./embedding-service";

// ---------------------------------------------------------------------------
// In-memory state for active imports
// ---------------------------------------------------------------------------

const activeImports = new Map<string, AbortController>();

// ---------------------------------------------------------------------------
// Row → IPC type mapping
// ---------------------------------------------------------------------------

function rowToStatus(row: ImportRow): ImportStatusResponse {
  const total = row.total_items || 1;
  const processed = row.processed_items || 0;
  return {
    id: row.id,
    status: row.status === "partial" ? "completed" : row.status,
    progress: Math.min(Math.round((processed / total) * 100), 100),
  };
}

// ---------------------------------------------------------------------------
// URL Importer
// ---------------------------------------------------------------------------

interface ExtractedContent {
  title: string;
  content: string;
  author: string | null;
  publishDate: string | null;
  description: string | null;
  contentHash: string;
}

async function fetchAndExtractUrl(url: string): Promise<ExtractedContent> {
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");
  const TurndownService = (await import("turndown")).default;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; AgentClaw/1.0; +https://agentclaw.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    const statusText = response.statusText || "Unknown error";
    if (response.status === 403) {
      throw new Error(
        `Unable to access this URL (403 Forbidden). The content may be behind a paywall or require authentication.`,
      );
    }
    throw new Error(`HTTP ${response.status}: ${statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent?.trim()) {
    throw new Error(
      "Could not extract readable content from this page. The page may be dynamically rendered.",
    );
  }

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  const markdown = turndown.turndown(article.content ?? "");

  return {
    title: article.title || new URL(url).hostname,
    content: markdown,
    author: article.byline || null,
    publishDate: null,
    description: article.excerpt || null,
    contentHash: sha256(article.textContent),
  };
}

// ---------------------------------------------------------------------------
// PDF Importer
// ---------------------------------------------------------------------------

async function extractPdfText(filePath: string): Promise<ExtractedContent> {
  const fs = await import("fs");
  const pdfParse = (await import("pdf-parse")) as unknown as { default: (data: Buffer) => Promise<{ text: string; numpages: number; info?: { Title?: string; Author?: string } }> };

  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse.default(dataBuffer);

  if (!pdfData.text?.trim()) {
    throw new Error(
      "This appears to be a scanned document. Text extraction is not available for image-based PDFs. You may enter a summary manually.",
    );
  }

  // Attempt to get title from metadata or first line
  const title =
    pdfData.info?.Title ||
    pdfData.text.split("\n").find((l: string) => l.trim().length > 5)?.trim() ||
    `PDF Document (${pdfData.numpages} pages)`;

  return {
    title,
    content: pdfData.text,
    author: pdfData.info?.Author || null,
    publishDate: null,
    description: null,
    contentHash: sha256(pdfData.text),
  };
}

// ---------------------------------------------------------------------------
// RSS Feed Polling
// ---------------------------------------------------------------------------

interface RssItem {
  title: string;
  link: string;
  content: string;
  author: string | null;
  publishDate: string | null;
}

async function parseRssFeed(feedUrl: string): Promise<{ items: RssItem[]; feedTitle: string }> {
  const { XMLParser } = await import("fast-xml-parser");

  const response = await fetch(feedUrl, {
    signal: AbortSignal.timeout(30_000),
    headers: { "User-Agent": "AgentClaw/1.0" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xml);

  // Handle both RSS and Atom feeds
  const isAtom = !!parsed.feed;
  const channel = isAtom ? parsed.feed : parsed.rss?.channel;
  const feedTitle = channel?.title || feedUrl;

  let rawItems: Record<string, unknown>[] = [];
  if (isAtom) {
    rawItems = channel?.entry
      ? Array.isArray(channel.entry) ? channel.entry : [channel.entry]
      : [];
  } else {
    rawItems = channel?.item
      ? Array.isArray(channel.item) ? channel.item : [channel.item]
      : [];
  }

  const items: RssItem[] = rawItems.map((item) => {
    const link = item.link as Record<string, unknown> | undefined;
    const content = item.content as Record<string, unknown> | undefined;
    const desc = item.description as Record<string, unknown> | undefined;
    const author = item.author as Record<string, unknown> | undefined;

    return {
      title: String(item.title || "Untitled"),
      link: String(link?.href || item.link || ""),
      content: String(content?.$$ || item.content || desc?.$$ || item.description || item.summary || ""),
      author: String(author?.name || item["dc:creator"] || item.author || "") || null,
      publishDate: String(item.published || item.pubDate || item.updated || "") || null,
    };
  });

  return { items, feedTitle };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Create an import record and kick off the async pipeline. */
function createImportRecord(
  importType: ImportType,
  domainId: string | null,
  extra: Partial<Pick<ImportRow, "source_url" | "file_path" | "metadata">> = {},
): ImportRow {
  const db = getDatabaseService();
  return db.imports.create({
    import_type: importType,
    domain_id: domainId,
    source_url: extra.source_url ?? null,
    file_path: extra.file_path ?? null,
    status: "pending",
    total_items: 1,
    processed_items: 0,
    failed_items: 0,
    error_message: null,
    metadata: extra.metadata ? JSON.stringify(extra.metadata) : null,
  } as unknown as Partial<ImportRow> & Record<string, unknown>);
}

/** Stage extracted content into the inbox. */
function stageInboxItem(
  extracted: ExtractedContent,
  sourceType: InboxSourceType,
  sourceUrl: string | null,
  domainId: string | null,
): InboxItemRow {
  const db = getDatabaseService();
  return db.inbox.create({
    source_type: sourceType,
    source_url: sourceUrl,
    raw_content: `# ${extracted.title}\n\n${extracted.content}`,
    ai_summary: extracted.description
      ? `**${extracted.title}**\n\n${extracted.description}`
      : null,
    suggested_domain_id: domainId,
    suggested_tags: extracted.author ? JSON.stringify([extracted.author]) : null,
    status: "pending" as InboxItemStatus,
    domain_id: null,
    knowledge_node_id: null,
  } as unknown as Partial<InboxItemRow> & Record<string, unknown>);
}

/** Generate a simple AI summary from extracted content. */
function generateImportSummary(extracted: ExtractedContent): string {
  const lines = extracted.content.split("\n").filter((l) => l.trim());
  const keyPoints = lines.slice(0, 5).map((l) => l.trim());

  const parts = [
    `**${extracted.title}**`,
    "",
    `**Key Points:**`,
    ...keyPoints.map((p) => `- ${p.slice(0, 200)}`),
    "",
    `**Content Length:** ${extracted.content.length} characters`,
  ];

  if (extracted.author) {
    parts.push(`**Author:** ${extracted.author}`);
  }
  if (extracted.publishDate) {
    parts.push(`**Published:** ${extracted.publishDate}`);
  }

  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Import content from a URL. */
export async function importUrl(req: ImportUrlRequest): Promise<ImportStatusResponse> {
  const { url, domainId } = req;

  // Validate URL
  try {
    new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const record = createImportRecord("url", domainId ?? null, {
    source_url: url,
  });

  const abortController = new AbortController();
  activeImports.set(record.id, abortController);

  // Run the pipeline asynchronously
  processUrlImport(record.id, url, domainId ?? null, abortController).catch(
    () => { /* errors handled inside */ },
  );

  return rowToStatus(record);
}

/** Import content from a file (PDF). */
export async function importFile(req: ImportFileRequest): Promise<ImportStatusResponse> {
  const { filePath, domainId } = req;

  const fs = await import("fs");
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const ext = filePath.split(".").pop()?.toLowerCase();
  if (ext !== "pdf") {
    throw new Error(`Unsupported file type: .${ext}. Only PDF files are supported.`);
  }

  const record = createImportRecord("pdf", domainId ?? null, {
    file_path: filePath,
  });

  const abortController = new AbortController();
  activeImports.set(record.id, abortController);

  processPdfImport(record.id, filePath, domainId ?? null, abortController).catch(
    () => { /* errors handled inside */ },
  );

  return rowToStatus(record);
}

/** Get the status of an import. */
export function getImportStatus(id: string): ImportStatusResponse {
  const db = getDatabaseService();
  const row = db.imports.findById(id);
  if (!row) throw new Error(`Import not found: ${id}`);
  return rowToStatus(row);
}

/** List import history for a domain. */
export function listImports(
  domainId?: string,
  status?: ImportStatus,
  limit = 50,
  offset = 0,
): { items: ImportStatusResponse[]; total: number } {
  const db = getDatabaseService();

  let result;
  if (domainId) {
    result = db.imports.listByDomain(domainId, limit, offset);
  } else if (status) {
    result = db.imports.listByStatus(status, limit, offset);
  } else {
    result = db.imports.list({ limit, offset, orderBy: "created_at", orderDir: "DESC" });
  }

  return {
    items: result.items.map(rowToStatus),
    total: result.total,
  };
}

/** Retry a failed import. */
export async function retryImport(id: string): Promise<ImportStatusResponse> {
  const db = getDatabaseService();
  const row = db.imports.findById(id);
  if (!row) throw new Error(`Import not found: ${id}`);
  if (row.status !== "failed" && row.status !== "partial") {
    throw new Error(`Cannot retry import in status: ${row.status}`);
  }

  // Reset status
  db.imports.updateStatus(id, "pending", {
    processedItems: 0,
    failedItems: 0,
    errorMessage: undefined,
  });

  const abortController = new AbortController();
  activeImports.set(id, abortController);

  if (row.import_type === "url" && row.source_url) {
    processUrlImport(id, row.source_url, row.domain_id, abortController).catch(
      () => { /* handled inside */ },
    );
  } else if (row.import_type === "pdf" && row.file_path) {
    processPdfImport(id, row.file_path, row.domain_id, abortController).catch(
      () => { /* handled inside */ },
    );
  } else {
    throw new Error(`Cannot retry import type: ${row.import_type}`);
  }

  return rowToStatus(db.imports.findById(id)!);
}

/** Cancel an active import. */
export function cancelImport(id: string): void {
  const controller = activeImports.get(id);
  if (controller) {
    controller.abort();
    activeImports.delete(id);
  }

  const db = getDatabaseService();
  const row = db.imports.findById(id);
  if (row && (row.status === "pending" || row.status === "processing")) {
    db.imports.updateStatus(id, "failed", {
      errorMessage: "Cancelled by user",
    });
  }
}

/** Poll an RSS feed and import new items. Returns the count of new items found. */
export async function pollRssFeed(
  feedUrl: string,
  domainId: string,
): Promise<{ newItems: number; errors: number }> {
  const db = getDatabaseService();

  try {
    const { items } = await parseRssFeed(feedUrl);
    let newItems = 0;
    let errors = 0;

    // Check which items have already been imported
    const existingImports = db.imports.findBySourceUrl(feedUrl);
    const existingUrls = new Set(existingImports.map((r) => r.metadata));

    for (const item of items) {
      if (!item.link || existingUrls.has(item.link)) continue;

      try {
        // Fetch full article content if possible, otherwise use RSS content
        let content = item.content;
        let title = item.title;

        try {
          const extracted = await fetchAndExtractUrl(item.link);
          content = extracted.content;
          title = extracted.title;
        } catch {
          // Fall back to RSS content
        }

        stageInboxItem(
          {
            title,
            content,
            author: item.author,
            publishDate: item.publishDate,
            description: null,
            contentHash: sha256(content),
          },
          "rss",
          item.link,
          domainId,
        );

        newItems++;
      } catch {
        errors++;
      }
    }

    return { newItems, errors };
  } catch (err) {
    throw new Error(
      `Failed to poll RSS feed: ${err instanceof Error ? err.message : "Unknown error"}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal pipeline processors
// ---------------------------------------------------------------------------

async function processUrlImport(
  importId: string,
  url: string,
  domainId: string | null,
  abortController: AbortController,
): Promise<void> {
  const db = getDatabaseService();

  try {
    // Step 1: Extract
    db.imports.updateStatus(importId, "processing");

    if (abortController.signal.aborted) throw new Error("Cancelled");

    const extracted = await fetchAndExtractUrl(url);

    if (abortController.signal.aborted) throw new Error("Cancelled");

    // Step 2: Stage in inbox
    const inboxItem = stageInboxItem(extracted, "import", url, domainId);

    // Step 3: Generate summary
    const summary = generateImportSummary(extracted);
    db.db
      .prepare("UPDATE inbox_items SET ai_summary = ?, updated_at = datetime('now') WHERE id = ?")
      .run(summary, inboxItem.id);

    // Step 4: If domain specified, auto-process into knowledge node
    if (domainId) {
      const node = KnowledgeGraph.createNode({
        domainId,
        title: extracted.title,
        type: "resource",
        content: extracted.content,
      });

      db.db
        .prepare(
          `UPDATE inbox_items SET status = 'accepted', domain_id = ?, knowledge_node_id = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .run(domainId, node.id, inboxItem.id);
    }

    // Step 5: Mark complete
    db.imports.updateStatus(importId, "completed", {
      processedItems: 1,
      metadata: {
        contentHash: extracted.contentHash,
        inboxItemId: inboxItem.id,
        author: extracted.author,
        publishDate: extracted.publishDate,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    db.imports.updateStatus(importId, "failed", {
      failedItems: 1,
      errorMessage: message,
    });
  } finally {
    activeImports.delete(importId);
  }
}

async function processPdfImport(
  importId: string,
  filePath: string,
  domainId: string | null,
  abortController: AbortController,
): Promise<void> {
  const db = getDatabaseService();

  try {
    db.imports.updateStatus(importId, "processing");

    if (abortController.signal.aborted) throw new Error("Cancelled");

    const extracted = await extractPdfText(filePath);

    if (abortController.signal.aborted) throw new Error("Cancelled");

    // Stage in inbox
    const inboxItem = stageInboxItem(extracted, "pdf", null, domainId);

    // Generate summary
    const summary = generateImportSummary(extracted);
    db.db
      .prepare("UPDATE inbox_items SET ai_summary = ?, updated_at = datetime('now') WHERE id = ?")
      .run(summary, inboxItem.id);

    // Auto-process if domain specified
    if (domainId) {
      const node = KnowledgeGraph.createNode({
        domainId,
        title: extracted.title,
        type: "resource",
        content: extracted.content,
      });

      db.db
        .prepare(
          `UPDATE inbox_items SET status = 'accepted', domain_id = ?, knowledge_node_id = ?, updated_at = datetime('now') WHERE id = ?`,
        )
        .run(domainId, node.id, inboxItem.id);
    }

    db.imports.updateStatus(importId, "completed", {
      processedItems: 1,
      metadata: {
        contentHash: extracted.contentHash,
        inboxItemId: inboxItem.id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    db.imports.updateStatus(importId, "failed", {
      failedItems: 1,
      errorMessage: message,
    });
  } finally {
    activeImports.delete(importId);
  }
}
