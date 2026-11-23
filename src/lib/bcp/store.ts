/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSyncExternalStore } from "react";
import { type Db, type Rec, type TableName, type WizardState, tableDef } from "./schema";
import { demoDb, emptyDb } from "./seed";
import { localStorageAdapter, type StorageAdapter } from "./adapter";

const LEGACY_STORAGE_KEY = "bcp-prototype-db-v2";
const scopedStorageKey = (scope: string) => `continuity-compass-db-v3:${scope}`;
export let adapter: StorageAdapter = localStorageAdapter(scopedStorageKey("anonymous"));
let storageScope = "anonymous";
let auditUser = "Plan Coordinator";
/** Audit attribution: the signed-in account's name/email replaces the generic default. */
export function setAuditUser(name: string | null | undefined) { auditUser = name?.trim() || "Plan Coordinator"; }
export const getAuditUser = () => auditUser;

/** Select persistence namespace for signed-in user/workspace. Never auto-import legacy shared data. */
export function setStorageScope(scope: string | null | undefined) {
  const next = scope?.trim() || "anonymous";
  if (next === storageScope) return;
  storageScope = next;
  adapter = localStorageAdapter(scopedStorageKey(next));
  loaded = false;
  db = SERVER;
  load();
  subs.forEach((fn) => fn());
}
export const getStorageScope = () => storageScope;
export const legacySharedDataExists = () => typeof window !== "undefined" && localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
const SERVER = emptyDb();
let db: Db = SERVER;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = adapter.load();
  // Older saves predate the mode flag and always started from the sample set, so treat them as demo.
  if (stored) db = { ...emptyDb(), ...stored, mode: stored.mode ?? "demo" };
}
function commit(next: Db) {
  db = next.mode === "empty" && recordCountRaw(next) > 0 ? { ...next, mode: "user" } : next;
  adapter.save(db);
  subs.forEach((f) => f());
}
const recordCountRaw = (d: Db) => Object.entries(d).filter(([k, v]) => k !== "audit_log" && Array.isArray(v)).reduce((n, [, v]) => n + (v as unknown[]).length, 0);
const uid = (p: string) => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function useDb(): Db {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => { load(); return db; },
    () => SERVER,
  );
}
export const getDb = () => { load(); return db; };

export function titleOf(table: TableName, r?: Rec) {
  if (!r) return "—";
  return String(r[tableDef(table).title] ?? r.id);
}

function audit(d: Db, table: TableName, id: string, action: "create" | "update" | "delete", summary: string) {
  return [{ id: uid("au"), table, record_id: id, action, at: new Date().toISOString(), user: auditUser, summary }, ...d.audit_log];
}

export function createRec(table: TableName, data: Record<string, any>): Rec {
  const d = getDb();
  const rec: Rec = { ...data, id: uid(table.slice(0, 3)) };
  commit({ ...d, [table]: [...d[table], rec], audit_log: audit(d, table, rec.id, "create", `Created ${tableDef(table).singular} "${titleOf(table, rec)}"`) });
  return rec;
}
export function updateRec(table: TableName, id: string, patch: Record<string, any>, summary?: string) {
  const d = getDb();
  const old = d[table].find((r) => r.id === id);
  if (!old) return;
  const changed = Object.keys(patch).filter((k) => String(old[k] ?? "") !== String(patch[k] ?? ""));
  if (!changed.length) return;
  const show = (v: unknown) => (v === "" || v === null || v === undefined ? "—" : String(v).length > 40 ? `${String(v).slice(0, 40)}…` : String(v));
  const labels = changed.map((k) => `${tableDef(table).fields.find((f) => f.key === k)?.label ?? k}: ${show(old[k])} → ${show(patch[k])}`);
  commit({ ...d, [table]: d[table].map((r) => (r.id === id ? { ...r, ...patch } : r)), audit_log: audit(d, table, id, "update", summary ?? `Changed ${labels.join("; ")}`) });
}
export function deleteRec(table: TableName, id: string) {
  const d = getDb();
  const old = d[table].find((r) => r.id === id);
  commit({ ...d, [table]: d[table].filter((r) => r.id !== id), audit_log: audit(d, table, id, "delete", `Deleted ${tableDef(table).singular} "${titleOf(table, old)}"`) });
}
/** Replace everything with the fictional training dataset (caller must confirm first). */
export function loadDemoData() { commit(demoDb()); }
/** Delete all locally stored records and start from a clean environment (caller must confirm first). */
export function clearAllData() { commit(emptyDb()); }
export const recordCount = recordCountRaw;
/** Persist guided-workflow progress alongside the data (not audited: it holds pointers and drafts, not BCP records). */
export function saveWizard(w: WizardState | null) { const d = getDb(); commit({ ...d, wizard: w ? { ...w, updated_at: new Date().toISOString() } : null }); }
/** Re-read from the adapter, as a page refresh would. Optionally swap the adapter (tests / future SQLite). */
export function reloadFromStorage(next?: StorageAdapter) { if (next) adapter = next; loaded = false; db = SERVER; load(); subs.forEach((f) => f()); }
export function exportBackup() {
  const blob = new Blob([JSON.stringify(getDb(), null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `continuity-compass-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
}
export function importDb(next: Db) { commit(next); }