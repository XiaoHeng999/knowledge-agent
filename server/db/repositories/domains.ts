import type { BetterSqlite3Database } from "../connection";
import type { DomainRow } from "../schema";
import { BaseRepository } from "./base";

export class DomainsRepository extends BaseRepository<DomainRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "domains");
  }

  findByName(name: string): DomainRow | null {
    return this.db.prepare("SELECT * FROM domains WHERE name = ?").get(name) as DomainRow | null;
  }

  listAll(): DomainRow[] {
    return this.db.prepare("SELECT * FROM domains ORDER BY updated_at DESC").all() as DomainRow[];
  }
}
