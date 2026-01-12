// ============================================
// Save System - IndexedDB Access
// ============================================

import { openDB, type IDBPDatabase } from 'idb';
import type { WorldSaveData } from '@shared/types';

const DB_NAME = 'petivolution';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

let dbPromise: Promise<IDBPDatabase> | null = null;

async function getDB(): Promise<IDBPDatabase> {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

export interface SaveEntry {
    id: string;
    name: string;
    data: WorldSaveData;
    createdAt: number;
    updatedAt: number;
}

/**
 * Save Game State
 */
export async function saveGame(id: string, name: string, data: WorldSaveData): Promise<void> {
    const db = await getDB();
    const entry: SaveEntry = {
        id,
        name,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    };

    const existing = await db.get(STORE_NAME, id);
    if (existing) {
        entry.createdAt = existing.createdAt;
    }

    await db.put(STORE_NAME, entry);
}

/**
 * Load Save
 */
export async function loadGame(id: string): Promise<WorldSaveData | null> {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, id);
    return entry?.data ?? null;
}

/**
 * Get All Saves
 */
export async function listSaves(): Promise<Array<{ id: string; name: string; updatedAt: number }>> {
    const db = await getDB();
    const all = await db.getAll(STORE_NAME);
    return all.map(entry => ({
        id: entry.id,
        name: entry.name,
        updatedAt: entry.updatedAt,
    })).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Delete Save
 */
export async function deleteSave(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
}

/**
 * Auto Save ID
 */
export const AUTO_SAVE_ID = 'autosave';

/**
 * Get Auto Save
 */
export async function getAutoSave(): Promise<WorldSaveData | null> {
    return loadGame(AUTO_SAVE_ID);
}

/**
 * Save Auto Save
 */
export async function saveAutoSave(data: WorldSaveData): Promise<void> {
    await saveGame(AUTO_SAVE_ID, 'Auto Save', data);
}
