import type { Migration } from "./types";
import migration001 from "./001_initial_schema";

const allMigrations: Migration[] = [migration001];

export function loadMigrations(): Migration[] {
  return allMigrations.sort((a, b) => a.version - b.version);
}

export type { Migration } from "./types";
export { MigrationRunner } from "./runner";
