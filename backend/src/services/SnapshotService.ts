import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';
import { getStorageBucket, getBucketName } from '../config/storageConfig';
import { WorldService } from './WorldService';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

/**
 * World snapshot data structure
 */
export interface WorldSnapshot {
    schemaVersion: 1;
    tick: number;
    seed: number;
    entities: any[];
    objects: any[];
    chunks: Record<string, any>;
    graveyard: any[];
    metadata?: {
        savedAt: number;
        serverVersion: string;
    };
}

/**
 * Snapshot Service - Handles world snapshot compression and GCS storage
 */
export class SnapshotService {
    /**
     * Save world snapshot to Cloud Storage
     */
    static async saveSnapshot(worldData: WorldSnapshot): Promise<string> {
        try {
            const tick = worldData.tick;
            const bucket = getStorageBucket();

            // Add metadata
            const snapshotWithMeta: WorldSnapshot = {
                ...worldData,
                metadata: {
                    savedAt: Date.now(),
                    serverVersion: process.env.npm_package_version || '1.0.0',
                },
            };

            // Compress data
            const jsonString = JSON.stringify(snapshotWithMeta);
            const compressed = await gzipAsync(Buffer.from(jsonString, 'utf-8'));

            // Upload to GCS
            const filePath = `worlds/main/snapshots/${tick}.json.gz`;
            const file = bucket.file(filePath);

            await file.save(compressed, {
                contentType: 'application/gzip',
                metadata: {
                    tick: tick.toString(),
                    uncompressedSize: jsonString.length.toString(),
                },
            });

            const gsPath = `gs://${getBucketName()}/${filePath}`;
            console.log(`✅ Snapshot saved: ${gsPath} (${compressed.length} bytes compressed from ${jsonString.length} bytes)`);

            // Update Firestore with snapshot path
            await WorldService.updateWorldMetadata({
                tick,
                latestSnapshotPath: gsPath,
            });

            return gsPath;
        } catch (error: any) {
            console.error('Error saving snapshot:', error);
            throw new Error(`Failed to save snapshot: ${error.message}`);
        }
    }

    /**
     * Load world snapshot from Cloud Storage by tick
     */
    static async loadSnapshot(tick: number): Promise<WorldSnapshot> {
        try {
            const bucket = getStorageBucket();
            const filePath = `worlds/main/snapshots/${tick}.json.gz`;
            const file = bucket.file(filePath);

            // Check if file exists
            const [exists] = await file.exists();
            if (!exists) {
                throw new Error(`Snapshot not found: ${filePath}`);
            }

            // Download compressed data
            const [compressed] = await file.download();

            // Decompress
            const decompressed = await gunzipAsync(compressed);
            const jsonString = decompressed.toString('utf-8');
            const snapshot: WorldSnapshot = JSON.parse(jsonString);

            console.log(`✅ Snapshot loaded: tick ${tick} (${compressed.length} bytes compressed, ${jsonString.length} bytes decompressed)`);

            return snapshot;
        } catch (error: any) {
            console.error(`Error loading snapshot (tick ${tick}):`, error);
            throw new Error(`Failed to load snapshot: ${error.message}`);
        }
    }

    /**
     * Load latest snapshot from Cloud Storage
     */
    static async loadLatestSnapshot(): Promise<WorldSnapshot | null> {
        try {
            // Get latest snapshot path from Firestore
            const metadata = await WorldService.getWorldMetadata();

            if (!metadata || !metadata.latestSnapshotPath) {
                console.log('No latest snapshot found in metadata');
                return null;
            }

            return await this.loadSnapshot(metadata.tick);
        } catch (error: any) {
            console.error('Error loading latest snapshot:', error);
            return null;
        }
    }

    /**
     * Compress data using gzip
     */
    static async compressData(data: any): Promise<Buffer> {
        const jsonString = JSON.stringify(data);
        return await gzipAsync(Buffer.from(jsonString, 'utf-8'));
    }

    /**
     * Decompress gzipped data
     */
    static async decompressData(compressed: Buffer): Promise<any> {
        const decompressed = await gunzipAsync(compressed);
        const jsonString = decompressed.toString('utf-8');
        return JSON.parse(jsonString);
    }

    /**
     * List all snapshots in GCS
     */
    static async listSnapshots(limit: number = 10): Promise<Array<{ tick: number; path: string; size: number; createdAt: Date }>> {
        try {
            const bucket = getStorageBucket();
            const [files] = await bucket.getFiles({
                prefix: 'worlds/main/snapshots/',
                maxResults: limit,
            });

            return files.map(file => {
                const tickMatch = file.name.match(/(\d+)\.json\.gz$/);
                const tick = tickMatch ? parseInt(tickMatch[1], 10) : 0;

                return {
                    tick,
                    path: `gs://${getBucketName()}/${file.name}`,
                    size: typeof file.metadata.size === 'string'
                        ? parseInt(file.metadata.size, 10)
                        : (file.metadata.size || 0),
                    createdAt: new Date(file.metadata.timeCreated || Date.now()),
                };
            }).sort((a, b) => b.tick - a.tick);
        } catch (error: any) {
            console.error('Error listing snapshots:', error);
            throw new Error(`Failed to list snapshots: ${error.message}`);
        }
    }

    /**
     * Delete old snapshots (retention policy)
     */
    static async deleteOldSnapshots(retentionDays: number = 7): Promise<number> {
        try {
            const bucket = getStorageBucket();
            const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

            const [files] = await bucket.getFiles({
                prefix: 'worlds/main/snapshots/',
            });

            let deletedCount = 0;
            for (const file of files) {
                const createdAt = new Date(file.metadata.timeCreated || 0);
                if (createdAt < cutoffDate) {
                    await file.delete();
                    deletedCount++;
                    console.log(`🗑️  Deleted old snapshot: ${file.name}`);
                }
            }

            if (deletedCount > 0) {
                console.log(`✅ Deleted ${deletedCount} old snapshots (older than ${retentionDays} days)`);
            }

            return deletedCount;
        } catch (error: any) {
            console.error('Error deleting old snapshots:', error);
            throw new Error(`Failed to delete old snapshots: ${error.message}`);
        }
    }
}
