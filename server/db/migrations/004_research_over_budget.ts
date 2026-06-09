import type { Migration } from "./types";

const migration: Migration = {
  version: 4,
  description: "Add over_budget status to research_runs CHECK constraint",

  up(db) {
    // SQLite doesn't support ALTER CONSTRAINT — recreate the table
    db.exec(`
      CREATE TABLE research_runs_new (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled','manual','slash_command')),
        model_id TEXT,
        status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled','over_budget')),
        query TEXT,
        findings_summary TEXT,
        knowledge_nodes_created INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0,
        token_count INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );

      INSERT INTO research_runs_new SELECT * FROM research_runs;

      DROP TABLE research_runs;

      ALTER TABLE research_runs_new RENAME TO research_runs;
    `);

    // Recreate indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_research_runs_domain ON research_runs(domain_id);
      CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);
      CREATE INDEX IF NOT EXISTS idx_research_runs_started ON research_runs(started_at);
    `);
  },

  down(db) {
    db.exec(`
      CREATE TABLE research_runs_new (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL CHECK (trigger_type IN ('scheduled','manual','slash_command')),
        model_id TEXT,
        status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','completed','failed','cancelled')),
        query TEXT,
        findings_summary TEXT,
        knowledge_nodes_created INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0.0,
        token_count INTEGER DEFAULT 0,
        error_message TEXT,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );

      INSERT INTO research_runs_new
        SELECT id, domain_id, trigger_type, model_id,
          CASE WHEN status = 'over_budget' THEN 'completed' ELSE status END,
          query, findings_summary, knowledge_nodes_created, cost_usd, token_count,
          error_message, started_at, completed_at, created_at
        FROM research_runs;

      DROP TABLE research_runs;

      ALTER TABLE research_runs_new RENAME TO research_runs;
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_research_runs_domain ON research_runs(domain_id);
      CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);
      CREATE INDEX IF NOT EXISTS idx_research_runs_started ON research_runs(started_at);
    `);
  },
};

export default migration;
