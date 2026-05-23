import type { Migration } from "./types";

const migration: Migration = {
  version: 1,
  description: "Create initial schema with 15 tables, FTS5, and triggers",

  up(db) {
    db.exec(`
      -- 1. domains
      CREATE TABLE IF NOT EXISTS domains (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT NOT NULL DEFAULT '#7aa2f7',
        icon TEXT,
        config_path TEXT NOT NULL,
        default_expert_model TEXT,
        default_research_model TEXT,
        default_summary_model TEXT,
        research_schedule TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_domains_name ON domains(name);

      -- 2. knowledge_nodes
      CREATE TABLE IF NOT EXISTS knowledge_nodes (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        node_type TEXT NOT NULL DEFAULT 'concept'
          CHECK (node_type IN ('concept','technology','person','event','decision','resource','question')),
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active','archived','draft','deprecated')),
        comprehension_score INTEGER NOT NULL DEFAULT 0
          CHECK (comprehension_score BETWEEN 0 AND 5),
        frontmatter TEXT,
        source_ids TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_domain ON knowledge_nodes(domain_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_type ON knowledge_nodes(node_type);
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_status ON knowledge_nodes(status);
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_comprehension ON knowledge_nodes(comprehension_score);
      CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_updated ON knowledge_nodes(updated_at);

      -- 3. knowledge_edges
      CREATE TABLE IF NOT EXISTS knowledge_edges (
        id TEXT PRIMARY KEY,
        source_node_id TEXT NOT NULL,
        target_node_id TEXT NOT NULL,
        edge_type TEXT NOT NULL DEFAULT 'related'
          CHECK (edge_type IN ('related','depends_on','derived_from','contradicts','supports','part_of','precedes')),
        weight REAL NOT NULL DEFAULT 0.5
          CHECK (weight BETWEEN 0.0 AND 1.0),
        description TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (source_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        FOREIGN KEY (target_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
        UNIQUE (source_node_id, target_node_id, edge_type)
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON knowledge_edges(source_node_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON knowledge_edges(target_node_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_edges_type ON knowledge_edges(edge_type);

      -- 4. conversations
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        title TEXT,
        model_id TEXT,
        session_type TEXT NOT NULL DEFAULT 'expert'
          CHECK (session_type IN ('expert','research','import')),
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active','archived')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_conversations_domain ON conversations(domain_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at);

      -- 5. messages
      CREATE TABLE IF NOT EXISTS messages (
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
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);

      -- 6. inbox_items
      CREATE TABLE IF NOT EXISTS inbox_items (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL
          CHECK (source_type IN ('url','pdf','note','rss','import')),
        source_url TEXT,
        raw_content TEXT,
        ai_summary TEXT,
        suggested_domain_id TEXT,
        suggested_tags TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','accepted','rejected','processing')),
        domain_id TEXT,
        knowledge_node_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (suggested_domain_id) REFERENCES domains(id),
        FOREIGN KEY (domain_id) REFERENCES domains(id)
      );
      CREATE INDEX IF NOT EXISTS idx_inbox_items_status ON inbox_items(status);
      CREATE INDEX IF NOT EXISTS idx_inbox_items_type ON inbox_items(source_type);
      CREATE INDEX IF NOT EXISTS idx_inbox_items_created ON inbox_items(created_at);

      -- 7. imports
      CREATE TABLE IF NOT EXISTS imports (
        id TEXT PRIMARY KEY,
        domain_id TEXT,
        import_type TEXT NOT NULL
          CHECK (import_type IN ('url','pdf','rss','batch')),
        source_url TEXT,
        file_path TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','processing','completed','failed','partial')),
        total_items INTEGER DEFAULT 0,
        processed_items INTEGER DEFAULT 0,
        failed_items INTEGER DEFAULT 0,
        error_message TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_imports_status ON imports(status);
      CREATE INDEX IF NOT EXISTS idx_imports_domain ON imports(domain_id);
      CREATE INDEX IF NOT EXISTS idx_imports_type ON imports(import_type);

      -- 8. research_runs
      CREATE TABLE IF NOT EXISTS research_runs (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        trigger_type TEXT NOT NULL
          CHECK (trigger_type IN ('scheduled','manual','slash_command')),
        model_id TEXT,
        status TEXT NOT NULL DEFAULT 'running'
          CHECK (status IN ('running','completed','failed','cancelled')),
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
      CREATE INDEX IF NOT EXISTS idx_research_runs_domain ON research_runs(domain_id);
      CREATE INDEX IF NOT EXISTS idx_research_runs_status ON research_runs(status);
      CREATE INDEX IF NOT EXISTS idx_research_runs_started ON research_runs(started_at);

      -- 9. predictions
      CREATE TABLE IF NOT EXISTS predictions (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        content TEXT NOT NULL,
        confidence REAL NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0),
        predicted_date TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending','confirmed','refuted','expired')),
        actual_outcome TEXT,
        source_node_ids TEXT,
        reasoning TEXT,
        verified_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_predictions_domain ON predictions(domain_id);
      CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
      CREATE INDEX IF NOT EXISTS idx_predictions_date ON predictions(predicted_date);

      -- 10. decisions
      CREATE TABLE IF NOT EXISTS decisions (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        title TEXT NOT NULL,
        decision_number INTEGER NOT NULL,
        context TEXT NOT NULL,
        decision_text TEXT NOT NULL,
        rationale TEXT,
        expected_outcome TEXT,
        status TEXT NOT NULL DEFAULT 'proposed'
          CHECK (status IN ('proposed','accepted','deprecated','superseded')),
        superseded_by TEXT,
        source_node_ids TEXT,
        file_path TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE,
        UNIQUE (domain_id, decision_number)
      );
      CREATE INDEX IF NOT EXISTS idx_decisions_domain ON decisions(domain_id);
      CREATE INDEX IF NOT EXISTS idx_decisions_number ON decisions(decision_number);
      CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);

      -- 11. framework_results
      CREATE TABLE IF NOT EXISTS framework_results (
        id TEXT PRIMARY KEY,
        domain_id TEXT NOT NULL,
        framework_type TEXT NOT NULL
          CHECK (framework_type IN ('trl','competitive_landscape','hype_cycle','custom')),
        title TEXT NOT NULL,
        analysis_data TEXT NOT NULL,
        source_node_ids TEXT,
        knowledge_node_ids TEXT,
        model_id TEXT,
        cost_usd REAL DEFAULT 0.0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_framework_results_domain ON framework_results(domain_id);
      CREATE INDEX IF NOT EXISTS idx_framework_results_type ON framework_results(framework_type);

      -- 12. skills
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        domain_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        skill_type TEXT NOT NULL DEFAULT 'custom'
          CHECK (skill_type IN ('builtin','custom','domain')),
        file_path TEXT,
        config TEXT,
        is_enabled INTEGER NOT NULL DEFAULT 1,
        execution_count INTEGER DEFAULT 0,
        success_count INTEGER DEFAULT 0,
        avg_user_rating REAL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (domain_id) REFERENCES domains(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_skills_domain ON skills(domain_id);
      CREATE INDEX IF NOT EXISTS idx_skills_type ON skills(skill_type);
      CREATE INDEX IF NOT EXISTS idx_skills_enabled ON skills(is_enabled);

      -- 13. model_configs
      CREATE TABLE IF NOT EXISTS model_configs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL
          CHECK (provider IN ('anthropic','openai','deepseek','google','groq','ollama','openrouter','xai','mistral')),
        model_id TEXT NOT NULL,
        display_name TEXT NOT NULL,
        api_base_url TEXT,
        is_local INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        cost_per_million_input REAL,
        cost_per_million_output REAL,
        max_context_tokens INTEGER,
        capabilities TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (provider, model_id)
      );
      CREATE INDEX IF NOT EXISTS idx_model_configs_provider ON model_configs(provider);
      CREATE INDEX IF NOT EXISTS idx_model_configs_active ON model_configs(is_active);

      -- 14. settings
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- 15. api_keys
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        encrypted_key TEXT NOT NULL,
        key_hint TEXT,
        is_valid INTEGER DEFAULT NULL,
        last_validated_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (provider)
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_provider ON api_keys(provider);

      -- FTS5 full-text search
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_knowledge USING fts5(
        title,
        content,
        summary,
        content='knowledge_nodes',
        content_rowid='rowid',
        tokenize='porter unicode61'
      );

      CREATE TRIGGER IF NOT EXISTS fts_knowledge_ai AFTER INSERT ON knowledge_nodes BEGIN
        INSERT INTO fts_knowledge(rowid, title, content, summary)
          VALUES (new.rowid, new.title, new.content, new.summary);
      END;

      CREATE TRIGGER IF NOT EXISTS fts_knowledge_ad AFTER DELETE ON knowledge_nodes BEGIN
        INSERT INTO fts_knowledge(fts_knowledge, rowid, title, content, summary)
          VALUES ('delete', old.rowid, old.title, old.content, old.summary);
      END;

      CREATE TRIGGER IF NOT EXISTS fts_knowledge_au AFTER UPDATE ON knowledge_nodes BEGIN
        INSERT INTO fts_knowledge(fts_knowledge, rowid, title, content, summary)
          VALUES ('delete', old.rowid, old.title, old.content, old.summary);
        INSERT INTO fts_knowledge(rowid, title, content, summary)
          VALUES (new.rowid, new.title, new.content, new.summary);
      END;

      -- Default settings
      INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', '"tokyo-night"');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_completed', 'false');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('debug_mode', 'false');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('default_provider', 'null');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('language', '"en"');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('min_window_width', '1024');
      INSERT OR IGNORE INTO settings (key, value) VALUES ('min_window_height', '768');
    `);
  },

  down(db) {
    db.exec(`
      DROP TRIGGER IF EXISTS fts_knowledge_au;
      DROP TRIGGER IF EXISTS fts_knowledge_ad;
      DROP TRIGGER IF EXISTS fts_knowledge_ai;
      DROP TABLE IF EXISTS fts_knowledge;
      DROP TABLE IF EXISTS api_keys;
      DROP TABLE IF EXISTS settings;
      DROP TABLE IF EXISTS model_configs;
      DROP TABLE IF EXISTS skills;
      DROP TABLE IF EXISTS framework_results;
      DROP TABLE IF EXISTS decisions;
      DROP TABLE IF EXISTS predictions;
      DROP TABLE IF EXISTS research_runs;
      DROP TABLE IF EXISTS imports;
      DROP TABLE IF EXISTS inbox_items;
      DROP TABLE IF EXISTS messages;
      DROP TABLE IF EXISTS conversations;
      DROP TABLE IF EXISTS knowledge_edges;
      DROP TABLE IF EXISTS knowledge_nodes;
      DROP TABLE IF EXISTS domains;
    `);
  },
};

export default migration;
