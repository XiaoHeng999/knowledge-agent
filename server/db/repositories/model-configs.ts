import type { BetterSqlite3Database } from "../connection";
import type { ModelConfigRow } from "../schema";
import { BaseRepository } from "./base";

export class ModelConfigsRepository extends BaseRepository<ModelConfigRow> {
  constructor(db: BetterSqlite3Database) {
    super(db, "model_configs");
  }

  findByProvider(provider: string): ModelConfigRow[] {
    return this.db
      .prepare("SELECT * FROM model_configs WHERE provider = ?")
      .all(provider) as ModelConfigRow[];
  }

  listActive(): ModelConfigRow[] {
    return this.db
      .prepare("SELECT * FROM model_configs WHERE is_active = 1 ORDER BY provider, display_name")
      .all() as ModelConfigRow[];
  }

  findByProviderAndModel(provider: string, modelId: string): ModelConfigRow | null {
    return this.db
      .prepare("SELECT * FROM model_configs WHERE provider = ? AND model_id = ?")
      .get(provider, modelId) as ModelConfigRow | null;
  }
}
