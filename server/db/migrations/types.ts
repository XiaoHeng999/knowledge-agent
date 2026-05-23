import type { BetterSqlite3Database } from "../connection";

export interface Migration {
  version: number;
  description: string;
  dependencies?: number[];
  up(db: BetterSqlite3Database): void;
  down(db: BetterSqlite3Database): void;
}
