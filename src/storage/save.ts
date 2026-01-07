// ============================================
// 存档系统 - IndexedDB 存取
// ============================================

import { openDB, type IDBPDatabase } from 'idb';
import type { SaveFileV1 } from '@shared/types';

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
    data: SaveFileV1;
    createdAt: number;
    updatedAt: number;
}

/**
 * 保存游戏状态
 */
export async function saveGame(id: string, name: string, data: SaveFileV1): Promise<void> {
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
 * 加载存档
 */
export async function loadGame(id: string): Promise<SaveFileV1 | null> {
    const db = await getDB();
    const entry = await db.get(STORE_NAME, id);
    return entry?.data ?? null;
}

/**
 * 获取所有存档列表
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
 * 删除存档
 */
export async function deleteSave(id: string): Promise<void> {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
}

/**
 * 自动存档ID
 */
export const AUTO_SAVE_ID = 'autosave';

/**
 * 获取自动存档
 */
export async function getAutoSave(): Promise<SaveFileV1 | null> {
    return loadGame(AUTO_SAVE_ID);
}

/**
 * 保存自动存档
 */
export async function saveAutoSave(data: SaveFileV1): Promise<void> {
    await saveGame(AUTO_SAVE_ID, '自动存档', data);
}
