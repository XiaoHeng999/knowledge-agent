import type { Migration } from "./types";

const migration: Migration = {
  version: 3,
  description: "Add status column to messages table for incomplete tracking",

  up(db) {
    // Guard: migration 001 may already include this column
    const cols = db.pragma("table_info(messages)") as { name: string }[];
    if (cols.some((c) => c.name === "status")) return;

    db.exec(`
      ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'complete'
        CHECK (status IN ('complete', 'incomplete'));
    `);
  },

  down(db) {
    db.exec(`
      -- SQLite doesn't support DROP COLUMN before 3.35.0;
      -- recreate the table without the status column if needed.
      CREATE TABLE messages_backup AS SELECT * FROM messages;
      DROP TABLE messages;
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        parent_id TEXT,
        role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        model_id TEXT,
        token_count INTEGER,
        cost_usd REAL,
        metadata TEXT,
        branch_index INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (parent_id) REFERENCES messages(id) ON DELETE CASCADE
      );
      INSERT INTO messages SELECT id, conversation_id, parent_id, role, content, model_id, token_count, cost_usd, metadata, branch_index, created_at FROM messages_backup;
      DROP TABLE messages_backup;
    `);
  },
};

export default migration;
