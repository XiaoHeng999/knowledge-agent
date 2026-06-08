import type { Migration } from "./types";

const migration: Migration = {
  version: 2,
  description: "Add skill_executions table for per-execution tracking",

  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS skill_executions (
        id TEXT PRIMARY KEY,
        skill_id TEXT NOT NULL,
        domain_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
        started_at TEXT NOT NULL,
        completed_at TEXT,
        cost_usd REAL DEFAULT 0.0,
        error_message TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skill_executions_skill ON skill_executions(skill_id);
      CREATE INDEX IF NOT EXISTS idx_skill_executions_status ON skill_executions(status);
      CREATE INDEX IF NOT EXISTS idx_skill_executions_created ON skill_executions(created_at);
    `);
  },

  down(db) {
    db.exec(`
      DROP TABLE IF EXISTS skill_executions;
    `);
  },
};

export default migration;
