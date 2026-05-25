/**
 * PDF_TEXT_EXTRACT task handler.
 * Extracts text content from PDF files using pdf-parse.
 */
import type { PdfExtractPayload, PdfExtractResult } from "../types";

interface TaskContext {
  signal: AbortSignal;
  reportProgress: (progress: number, message?: string) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_PAGES = 500;

export async function handlePdfTextExtract(
  payload: PdfExtractPayload,
  ctx: TaskContext,
): Promise<PdfExtractResult> {
  const fs = await import("fs");

  // Check file exists
  if (!fs.existsSync(payload.filePath)) {
    throw new Error(`File not found: ${payload.filePath}`);
  }

  // Check file size
  const stats = fs.statSync(payload.filePath);
  if (stats.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large (${(stats.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB. Consider splitting the file.`,
    );
  }

  if (ctx.signal.aborted) throw new Error("Cancelled");

  ctx.reportProgress(0.1, "Loading PDF...");

  const pdfParse = (await import("pdf-parse")).default as unknown as (
    data: Buffer,
  ) => Promise<{ text: string; numpages: number; info?: { Title?: string; Author?: string; CreationDate?: string } }>;

  const dataBuffer = fs.readFileSync(payload.filePath);

  if (ctx.signal.aborted) throw new Error("Cancelled");

  ctx.reportProgress(0.3, "Extracting text...");

  const pdfData = await pdfParse(dataBuffer);

  if (!pdfData.text?.trim()) {
    throw new Error(
      "This appears to be a scanned document. Text extraction is not available for image-based PDFs.",
    );
  }

  if (ctx.signal.aborted) throw new Error("Cancelled");

  const title =
    pdfData.info?.Title ||
    pdfData.text.split("\n").find((l: string) => l.trim().length > 5)?.trim() ||
    `PDF Document (${pdfData.numpages} pages)`;

  const metadata: PdfExtractResult["metadata"] = {};
  if (pdfData.info?.Title) metadata.title = pdfData.info.Title;
  if (pdfData.info?.Author) metadata.author = pdfData.info.Author;
  if (pdfData.info?.CreationDate) {
    metadata.createdAt = pdfData.info.CreationDate;
  }

  ctx.reportProgress(1.0, `Extracted ${pdfData.numpages} pages`);

  return {
    text: pdfData.text,
    pageCount: pdfData.numpages,
    extractedPages: Math.min(pdfData.numpages, payload.maxPages || MAX_PAGES),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}
