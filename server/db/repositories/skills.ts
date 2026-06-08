import type { BetterSqlite3Database } from "../connection";
import { BaseRepository } from "./base";
import type { SkillRow, SkillExecutionRow } from "../schema";

export class SkillsRepository extends BaseRepository<SkillRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "skills");
  }

  findByDomain(domainId: string): SkillRow[] {
    const sql = `SELECT * FROM skills WHERE domain_id = ? ORDER BY name ASC`;
    return this.db.prepare(sql).all(domainId) as SkillRow[];
  }

  findBuiltins(): SkillRow[] {
    const sql = `SELECT * FROM skills WHERE skill_type = 'builtin' ORDER BY name ASC`;
    return this.db.prepare(sql).all() as SkillRow[];
  }

  findByName(name: string, domainId?: string): SkillRow | null {
    if (domainId) {
      const sql = `SELECT * FROM skills WHERE name = ? AND (domain_id = ? OR domain_id IS NULL) LIMIT 1`;
      return (this.db.prepare(sql).get(name, domainId) as SkillRow | undefined) ?? null;
    }
    const sql = `SELECT * FROM skills WHERE name = ? LIMIT 1`;
    return (this.db.prepare(sql).get(name) as SkillRow | undefined) ?? null;
  }

  findEnabled(domainId?: string): SkillRow[] {
    if (domainId) {
      const sql = `SELECT * FROM skills WHERE is_enabled = 1 AND (domain_id = ? OR domain_id IS NULL) ORDER BY name ASC`;
      return this.db.prepare(sql).all(domainId) as SkillRow[];
    }
    const sql = `SELECT * FROM skills WHERE is_enabled = 1 ORDER BY name ASC`;
    return this.db.prepare(sql).all() as SkillRow[];
  }

  setEnabled(id: string, enabled: boolean): boolean {
    const sql = `UPDATE skills SET is_enabled = ?, updated_at = ? WHERE id = ?`;
    const now = new Date().toISOString();
    const result = this.db.prepare(sql).run(enabled ? 1 : 0, now, id);
    return result.changes > 0;
  }

  incrementExecution(id: string, success: boolean): void {
    const sql = success
      ? `UPDATE skills SET execution_count = execution_count + 1, success_count = success_count + 1, updated_at = ? WHERE id = ?`
      : `UPDATE skills SET execution_count = execution_count + 1, updated_at = ? WHERE id = ?`;
    const now = new Date().toISOString();
    this.db.prepare(sql).run(now, id);
  }

  updateRating(id: string, rating: number): void {
    const sql = `UPDATE skills SET avg_user_rating = ? WHERE id = ?`;
    this.db.prepare(sql).run(rating, id);
  }

  upsertByFilePath(filePath: string, data: Omit<SkillRow, "id" | "created_at" | "updated_at" | "execution_count" | "success_count" | "avg_user_rating">): SkillRow {
    const existing = this.db.prepare(`SELECT * FROM skills WHERE file_path = ?`).get(filePath) as SkillRow | undefined;
    if (existing) {
      const updated = this.update(existing.id, {
        name: data.name,
        description: data.description,
        skill_type: data.skill_type,
        domain_id: data.domain_id,
        config: data.config,
        is_enabled: data.is_enabled,
      });
      return updated ?? existing;
    }
    return this.create({
      ...data,
      file_path: filePath,
      execution_count: 0,
      success_count: 0,
      avg_user_rating: null,
    } as Record<string, unknown>);
  }

  deleteByFilePath(filePath: string): boolean {
    const sql = `DELETE FROM skills WHERE file_path = ?`;
    const result = this.db.prepare(sql).run(filePath);
    return result.changes > 0;
  }

  insertExecution(data: Omit<SkillExecutionRow, "created_at">): void {
    const sql = `INSERT INTO skill_executions (id, skill_id, domain_id, status, started_at, completed_at, cost_usd, error_message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`;
    this.db.prepare(sql).run(
      data.id, data.skill_id, data.domain_id, data.status,
      data.started_at, data.completed_at, data.cost_usd, data.error_message,
    );
  }

  getAvgExecutionTimeMs(skillId: string): number | null {
    const sql = `SELECT AVG((julianday(completed_at) - julianday(started_at)) * 86400000) AS avg_ms FROM skill_executions WHERE skill_id = ? AND status = 'completed' AND completed_at IS NOT NULL`;
    const row = this.db.prepare(sql).get(skillId) as { avg_ms: number | null } | undefined;
    if (!row || row.avg_ms === null) return null;
    return Math.round(row.avg_ms);
  }

  getAvgCostUsd(skillId: string): number | null {
    const sql = `SELECT AVG(cost_usd) AS avg_cost FROM skill_executions WHERE skill_id = ? AND status = 'completed' AND cost_usd > 0`;
    const row = this.db.prepare(sql).get(skillId) as { avg_cost: number | null } | undefined;
    if (!row || row.avg_cost === null) return null;
    return Math.round(row.avg_cost * 1e6) / 1e6;
  }
}
