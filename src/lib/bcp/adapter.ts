import type { Db } from "./schema";

/**
 * Persistence boundary. The UI only talks to store.ts; store.ts only talks to an adapter.
 * Swap this for a SQLite (e.g. sql.js / Tauri / Electron) or PostgreSQL-backed adapter
 * that maps each Db table onto the identically named table in db/schema.sql.
 */
export interface StorageAdapter {
  name: string;
  load(): Db | null;
  save(db: Db): void;
}

export const localStorageAdapter = (key: string): StorageAdapter => ({
  name: "Browser local storage",
  load() {
    if (typeof window === "undefined") return null;
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as Db) : null; } catch { return null; }
  },
  save(db) {
    try { localStorage.setItem(key, JSON.stringify(db)); } catch { /* quota exceeded */ }
  },
});