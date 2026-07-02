import Dexie, { Table } from "dexie";

type StorageScope = "local" | "session";

interface StorageRecord {
  key: string;
  value: string;
  updatedAt: number;
}

class CoordinatechStorageDB extends Dexie {
  localStore!: Table<StorageRecord, string>;
  sessionStore!: Table<StorageRecord, string>;

  constructor() {
    super("coordinatech_storage_db");
    this.version(1).stores({
      localStore: "&key, updatedAt",
      sessionStore: "&key, updatedAt",
    });
  }
}

let dbInstance: CoordinatechStorageDB | null = null;

function getDb(): CoordinatechStorageDB | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!dbInstance) {
    dbInstance = new CoordinatechStorageDB();
  }

  return dbInstance;
}

function getTable(scope: StorageScope): Table<StorageRecord, string> | null {
  const db = getDb();
  if (!db) {
    return null;
  }

  return scope === "session" ? db.sessionStore : db.localStore;
}

function getLegacyStorage(scope: StorageScope): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  return scope === "session" ? window.sessionStorage : window.localStorage;
}

async function readRaw(scope: StorageScope, key: string): Promise<string | null> {
  const table = getTable(scope);
  if (!table) {
    return null;
  }

  const stored = await table.get(key);
  if (stored) {
    return stored.value;
  }

  // Lazy migration from legacy storage.
  const legacyStorage = getLegacyStorage(scope);
  const legacyRaw = legacyStorage?.getItem(key) ?? null;
  if (legacyRaw !== null) {
    await table.put({ key, value: legacyRaw, updatedAt: Date.now() });
    legacyStorage?.removeItem(key);
    return legacyRaw;
  }

  return null;
}

async function writeRaw(scope: StorageScope, key: string, value: string): Promise<void> {
  const table = getTable(scope);
  if (!table) {
    return;
  }

  await table.put({ key, value, updatedAt: Date.now() });
}

export async function getStoredJSON<T>(key: string, scope: StorageScope = "local"): Promise<T | null> {
  const raw = await readRaw(scope, key);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setStoredJSON<T>(key: string, value: T, scope: StorageScope = "local"): Promise<void> {
  await writeRaw(scope, key, JSON.stringify(value));
}

export async function removeStoredKey(key: string, scope: StorageScope = "local"): Promise<void> {
  const table = getTable(scope);
  if (!table) {
    return;
  }

  await table.delete(key);

  // Cleanup legacy key too in case something still wrote there.
  const legacyStorage = getLegacyStorage(scope);
  legacyStorage?.removeItem(key);
}
