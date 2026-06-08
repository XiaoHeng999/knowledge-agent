import type { Migration } from "./types";
import migration001 from "./001_initial_schema";
import migration002 from "./002_skill_executions";

const allMigrations: Migration[] = [migration001, migration002];

export function loadMigrations(): Migration[] {
  return allMigrations.sort((a, b) => a.version - b.version);
}

export type { Migration } from "./types";
export { MigrationRunner } from "./runner";
