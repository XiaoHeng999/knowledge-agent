import type { BetterSqlite3Database } from "./connection";
import { createConnection, closeConnection, getConnection, backupDatabase } from "./connection";
import { MigrationRunner, loadMigrations } from "./migrations";
import { DomainsRepository } from "./repositories/domains";
import { KnowledgeNodesRepository } from "./repositories/knowledge-nodes";
import { KnowledgeEdgesRepository } from "./repositories/knowledge-edges";
import { InboxItemRepository } from "./repositories/inbox-items";
import { PredictionRepository } from "./repositories/predictions";
import { ModelConfigsRepository } from "./repositories/model-configs";
import { ApiKeysRepository } from "./repositories/api-keys";
import { InboxRepository } from "./repositories/inbox";
import { DecisionRecordsRepository } from "./repositories/decision-records";
import { ConversationsRepository } from "./repositories/conversations";
import { MessagesRepository } from "./repositories/messages";
import { ResearchRunsRepository } from "./repositories/research-runs";
import { ImportsRepository } from "./repositories/imports";
import { FrameworkResultsRepository } from "./repositories/framework-results";
import { SkillsRepository } from "./repositories/skills";
import { VectorIndex } from "./vector";

export interface DatabaseService {
  db: BetterSqlite3Database;
  migrations: MigrationRunner;
  domains: DomainsRepository;
  knowledgeNodes: KnowledgeNodesRepository;
  knowledgeEdges: KnowledgeEdgesRepository;
  inboxItems: InboxItemRepository;
  predictions: PredictionRepository;
  modelConfigs: ModelConfigsRepository;
  apiKeys: ApiKeysRepository;
  inbox: InboxRepository;
  decisionRecords: DecisionRecordsRepository;
  conversations: ConversationsRepository;
  messages: MessagesRepository;
  researchRuns: ResearchRunsRepository;
  imports: ImportsRepository;
  frameworkResults: FrameworkResultsRepository;
  skills: SkillsRepository;
  vectorIndex: VectorIndex;
}

let service: DatabaseService | null = null;

export function initializeDatabase(dbPath?: string): DatabaseService {
  if (service) return service;

  const db = createConnection(dbPath);
  const migrations = new MigrationRunner(db);
  const allMigrations = loadMigrations();

  const result = migrations.run(allMigrations);
  if (result.applied > 0) {
    console.log(`[DB] Applied ${result.applied} migrations. Current version: ${result.currentVersion}`);
  } else {
    console.log(`[DB] Schema up to date. Version: ${result.currentVersion}`);
  }

  service = {
    db,
    migrations,
    domains: new DomainsRepository(db),
    knowledgeNodes: new KnowledgeNodesRepository(db),
    knowledgeEdges: new KnowledgeEdgesRepository(db),
    inboxItems: new InboxItemRepository(db),
    predictions: new PredictionRepository(db),
    modelConfigs: new ModelConfigsRepository(db),
    apiKeys: new ApiKeysRepository(db),
    inbox: new InboxRepository(db),
    decisionRecords: new DecisionRecordsRepository(db),
    conversations: new ConversationsRepository(db),
    messages: new MessagesRepository(db),
    researchRuns: new ResearchRunsRepository(db),
    imports: new ImportsRepository(db),
    frameworkResults: new FrameworkResultsRepository(db),
    skills: new SkillsRepository(db),
    vectorIndex: new VectorIndex(db),
  };

  return service;
}

export function getDatabaseService(): DatabaseService {
  if (!service) {
    throw new Error("Database not initialized. Call initializeDatabase() first.");
  }
  return service;
}

export function shutdownDatabase(): void {
  closeConnection();
  service = null;
}

export { backupDatabase, getConnection };
