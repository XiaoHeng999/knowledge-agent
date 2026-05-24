import type { BetterSqlite3Database } from "../connection";
import type { ImportRow, ImportStatus } from "../schema";
import { BaseRepository, type ListResult } from "./base";

export class ImportsRepository extends BaseRepository<ImportRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "imports");
  }

  listByDomain(
    domainId: string,
    limit = 50,
    offset = 0,
  ): ListResult<ImportRow> {
    return this.list({
      where: "domain_id = ?",
      params: [domainId],
      limit,
      offset,
      orderBy: "created_at",
      orderDir: "DESC",
    });
  }

  listByStatus(
    status: ImportStatus,
    limit = 50,
    offset = 0,
  ): ListResult<ImportRow> {
    return this.list({
      where: "status = ?",
      params: [status],
      limit,
      offset,
      orderBy: "created_at",
      orderDir: "DESC",
    });
  }

  updateStatus(
    id: string,
    status: ImportStatus,
    extra?: {
      processedItems?: number;
      failedItems?: number;
      errorMessage?: string;
      metadata?: Record<string, unknown>;
    },
  ): ImportRow | null {
    const sets: string[] = ["status = ?", "updated_at = datetime('now')"];
    const params: unknown[] = [status];

    if (extra?.processedItems !== undefined) {
      sets.push("processed_items = ?");
      params.push(extra.processedItems);
    }
    if (extra?.failedItems !== undefined) {
      sets.push("failed_items = ?");
      params.push(extra.failedItems);
    }
    if (extra?.errorMessage !== undefined) {
      sets.push("error_message = ?");
      params.push(extra.errorMessage);
    }
    if (extra?.metadata !== undefined) {
      sets.push("metadata = ?");
      params.push(JSON.stringify(extra.metadata));
    }

    params.push(id);
    this.db
      .prepare(`UPDATE imports SET ${sets.join(", ")} WHERE id = ?`)
      .run(...params);
    return this.findById(id);
  }

  /** Find imports by source URL to detect duplicates for RSS. */
  findBySourceUrl(sourceUrl: string): ImportRow[] {
    return this.db
      .prepare("SELECT * FROM imports WHERE source_url = ? ORDER BY created_at DESC")
      .all(sourceUrl) as ImportRow[];
  }
}
