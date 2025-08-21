import { MemStorage, type IStorage } from "./storage";
import { DrizzleStorage } from "./storage.drizzle";

let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (storageInstance) {
    return storageInstance;
  }

  if (process.env.DATABASE_URL) {
    console.log("[storage] Using DrizzleStorage with PostgreSQL database");
    storageInstance = new DrizzleStorage();
  } else {
    console.log("[storage] Using MemStorage (in-memory storage)");
    storageInstance = new MemStorage();
  }

  return storageInstance;
}

export function resetStorage(): void {
  storageInstance = null;
}