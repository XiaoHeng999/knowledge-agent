import type { Migration } from "./types";
import migration001 from "./001_initial_schema";
import migration002 from "./002_skill_executions";
import migration003 from "./003_message_status";
import migration004 from "./004_research_over_budget";

const allMigrations: Migration[] = [migration001, migration002, migration003, migration004];

export function loadMigrations(): Migration[] {
  return allMigrations.sort((a, b) => a.version - b.version);
}

export type { Migration } from "./types";
export { MigrationRunner } from "./runner";
