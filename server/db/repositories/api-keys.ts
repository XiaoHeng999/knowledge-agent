import type { BetterSqlite3Database } from "../connection";
import type { ApiKeyRow } from "../schema";
import { BaseRepository } from "./base";
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const secret = process.env.AGENTCLAW_ENCRYPTION_KEY ?? "agentclaw-default-encryption-key-min-32ch";
  return Buffer.from(secret.padEnd(KEY_LENGTH, "0").slice(0, KEY_LENGTH), "utf-8");
}

export class ApiKeysRepository extends BaseRepository<ApiKeyRow> {
  private encKey: Buffer;

  constructor(db: BetterSqlite3Database) {
    super(db, "api_keys");
    this.encKey = getEncryptionKey();
  }

  createEncrypted(provider: string, apiKey: string): ApiKeyRow {
    const encrypted = this.encrypt(apiKey);
    const keyHint = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "****";

    return this.create({
      provider,
      encrypted_key: encrypted,
      key_hint: keyHint,
      is_valid: null,
      last_validated_at: null,
    } as unknown as Partial<ApiKeyRow> & Record<string, unknown>) as ApiKeyRow;
  }

  decryptKey(row: ApiKeyRow): string {
    return this.decrypt(row.encrypted_key);
  }

  findByProvider(provider: string): ApiKeyRow | null {
    return this.db
      .prepare("SELECT * FROM api_keys WHERE provider = ?")
      .get(provider) as ApiKeyRow | null;
  }

  setValid(provider: string, isValid: boolean): void {
    this.db
      .prepare(
        "UPDATE api_keys SET is_valid = ?, last_validated_at = datetime('now'), updated_at = datetime('now') WHERE provider = ?",
      )
      .run(isValid ? 1 : 0, provider);
  }

  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.encKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf-8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString("base64");
  }

  private decrypt(ciphertext: string): string {
    const buf = Buffer.from(ciphertext, "base64");
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.encKey, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final("utf-8");
  }
}
