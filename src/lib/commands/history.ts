import type { ResultGroupType } from "@/components/cmd-palette/types";

export interface HistoryEntry {
  id: string;
  label: string;
  description?: string;
  group: ResultGroupType;
  icon?: string;
}

export interface HistoryStorage {
  load(): Promise<string | null>;
  save(data: string): Promise<void>;
}

const MAX_ENTRIES = 20;
const STORAGE_KEY = "agentclaw:cmd-history";

let entries: HistoryEntry[] = [];
let storage: HistoryStorage | null = null;

export async function initHistory(store?: HistoryStorage): Promise<void> {
  storage = store ?? null;
  if (storage) {
    const raw = await storage.load();
    if (raw) {
      entries = JSON.parse(raw);
    }
  }
}

export function addHistoryEntry(entry: HistoryEntry): void {
  entries = entries.filter((e) => e.id !== entry.id);
  entries.unshift(entry);
  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(0, MAX_ENTRIES);
  }
  storage?.save(JSON.stringify(entries));
}

export function getRecentItems(limit?: number): HistoryEntry[] {
  const result = limit ? entries.slice(0, limit) : [...entries];
  return result;
}

export function clearHistory(): void {
  entries = [];
  storage?.save("[]");
}
