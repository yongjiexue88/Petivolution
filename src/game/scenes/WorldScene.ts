// ============================================
// WorldScene - 主游戏场景 (V1)
// ============================================

import Phaser from 'phaser';
import type { SnapshotEntity, WorldObject } from '@shared/types';
import { useGameStore, getSimWorker } from '@app/store/gameStore';
import { V1 } from '@shared/constants';

export class WorldScene extends Phaser.Scene {
    private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private objectSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };
    private cameraStart = { x: 0, y: 0 };
    private unsubscribeStore: () => void = () => { };

    constructor() {
        super({ key: 'WorldScene' });
    }

    create() {
        // Map dimensions
        const worldWidth = V1.defaultMapWidth * V1.tileSizePx;
        const worldHeight = V1.defaultMapHeight * V1.tileSizePx;

        // 1. Draw Background
        this.createBackground(worldWidth, worldHeight);

        // 2. Setup Camera
        this.cameras.main.setBounds(-500, -500, worldWidth + 1000, worldHeight + 1000);
        this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
        this.cameras.main.setZoom(1);

        // 3. Setup Controls
        this.setupCameraControls();

        // 4. Input Events
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        // 5. Subscribe to Store State (Sync loop)
        // Check for updates every frame or via subscription
        this.unsubscribeStore = useGameStore.subscribe((state) => {
            this.syncAnimals(state.entities);
            this.syncObjects(state.objects);
        });

        // Initial sync
        const initialState = useGameStore.getState();
        this.syncAnimals(initialState.entities);
        this.syncObjects(initialState.objects);
    }

    destroy() {
        this.unsubscribeStore();
        // Invoke parent destroy, but specifically clean up plugins/listeners if needed
        // this.scene.remove(this.key); // Not needed usually
    }

    createBackground(width: number, height: number) {
        // Dark Void
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e, 1);
        bg.fillRect(-1000, -1000, width + 2000, height + 2000);
        bg.setDepth(-1000);

        // Playable Area
        const mapBg = this.add.graphics();
        mapBg.fillStyle(0x232336, 1);
        mapBg.fillRect(0, 0, width, height);
        mapBg.setDepth(-999);

        // Grid Lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x2a2a3a, 0.5);
        grid.setDepth(-998);

        const gridSize = V1.tileSizePx; // 32
        for (let x = 0; x <= width; x += gridSize) {
            grid.moveTo(x, 0);
            grid.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSize) {
            grid.moveTo(0, y);
            grid.lineTo(width, y);
        }
        grid.strokePath();

        // Chunk Grid (Thicker lines)
        const chunkGrid = this.add.graphics();
        chunkGrid.lineStyle(2, 0x3a3a4a, 0.8);
        chunkGrid.setDepth(-997);
        const chunkSize = V1.chunkSize * V1.tileSizePx;
        for (let x = 0; x <= width; x += chunkSize) {
            chunkGrid.moveTo(x, 0);
            chunkGrid.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += chunkSize) {
            chunkGrid.moveTo(0, y);
            chunkGrid.lineTo(width, y);
        }
        chunkGrid.strokePath();

        // World Border
        const border = this.add.graphics();
        border.lineStyle(4, 0x6366f1, 1);
        border.strokeRect(0, 0, width, height);
        border.setDepth(-996);
    }

    setupCameraControls() {
        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && pointer.isDown) {
                // Adjust for zoom to make drag feel natural
                const dx = (pointer.x - this.dragStart.x) / this.cameras.main.zoom;
                const dy = (pointer.y - this.dragStart.y) / this.cameras.main.zoom;

                this.cameras.main.scrollX = this.cameraStart.x - dx;
                this.cameras.main.scrollY = this.cameraStart.y - dy;

                // Throttle worker updates for LOD if needed
                if (this.game.loop.frame % 30 === 0) {
                    this.updateWorkerCamera();
                }
            }
        });

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _: unknown, __: unknown, deltaY: number) => {
            const zoom = this.cameras.main.zoom;
            // Simple center zoom
            const newZoom = Phaser.Math.Clamp(zoom - deltaY * 0.001, 0.2, 5);
            this.cameras.main.setZoom(newZoom);

            this.updateWorkerCamera();
        });
    }

    updateWorkerCamera() {
        const worker = getSimWorker();
        const cam = this.cameras.main;
        worker?.postMessage({
            type: 'UPDATE_CAMERA',
            payload: {
                centerX: cam.midPoint.x,
                centerY: cam.midPoint.y,
                zoom: cam.zoom,
            }
        });
    }

    handlePointerDown(pointer: Phaser.Input.Pointer) {
        const store = useGameStore.getState();
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

        if (store.currentTool === 'select') {
            const clickedId = this.findEntityAt(worldPoint.x, worldPoint.y);

            if (clickedId) {
                // Select entity
                store.setSelectedEntityId(clickedId);
                const worker = getSimWorker();
                worker?.postMessage({
                    type: 'SELECT_ENTITY',
                    payload: { entityId: clickedId }
                });
                // Don't drag camera if clicked entity? (Optional, kept drag enabled for now)
            } else {
                // Deselect
                store.setSelectedEntityId(null);
                const worker = getSimWorker();
                worker?.postMessage({
                    type: 'SELECT_ENTITY',
                    payload: { entityId: null }
                });
            }

            // Always allow drag for navigation
            this.isDragging = true;
            this.dragStart = { x: pointer.x, y: pointer.y };
            this.cameraStart = {
                x: this.cameras.main.scrollX,
                y: this.cameras.main.scrollY
            };
        }
        else if (store.currentTool === 'spawn') {
            this.spawnAnimal(worldPoint);
        }
        else if (store.currentTool === 'place') {
            this.placeObject(worldPoint);
        }
        else if (store.currentTool === 'delete') {
            // TODO: Delete object/entity logic
            // this.deleteAt(worldPoint);
        }
    }

    handlePointerUp() {
        this.isDragging = false;
        this.updateWorkerCamera();
    }

    // Hit Test
    findEntityAt(x: number, y: number): string | null {
        // Checking reverse order to pick top-most rendering sprite
        const entities = useGameStore.getState().entities;

        for (let i = entities.length - 1; i >= 0; i--) {
            const e = entities[i];
            const dx = e.x - x;
            const dy = e.y - y;
            const r = e.species === 'cat' ? 14 : 10; // slightly larger hit area

            if ((dx * dx + dy * dy) < (r * r)) {
                return e.id;
            }
        }
        return null;
    }

    spawnAnimal(pos: { x: number; y: number }) {
        const store = useGameStore.getState();
        const worker = getSimWorker();

        const names = {
            cat: ['Kitty', 'Tiger', 'Luna', 'Shadow', 'Simba', 'Oreo'],
            rat: ['Squeak', 'Jerry', 'Pip', 'Ratty', 'Cheese', 'Scabbers'],
        };
        const nameList = names[store.spawnSpecies] || ['Unknown'];
        const name = nameList[Math.floor(Math.random() * nameList.length)] + Math.floor(Math.random() * 99);

        // Convert to Tile Coordinates
        const tilePos = {
            tx: Math.floor(pos.x / V1.tileSizePx),
            ty: Math.floor(pos.y / V1.tileSizePx)
        };

        worker?.postMessage({
            type: 'SPAWN_ENTITY',
            payload: {
                species: store.spawnSpecies,
                name: name,
                personality: store.spawnPersonality,
                pos: tilePos,
            },
        });
    }

    placeObject(pos: { x: number; y: number }) {
        const store = useGameStore.getState();
        const worker = getSimWorker();

        const tilePos = {
            tx: Math.floor(pos.x / V1.tileSizePx),
            ty: Math.floor(pos.y / V1.tileSizePx)
        };

        worker?.postMessage({
            type: 'PLACE_OBJECT',
            payload: {
                type: store.placeObjectType,
                pos: tilePos,
            }, // Object payload might need full structure, check worker
        });

        // Note: The worker PLACE_OBJECT expects a full WorldObject payload?
        // Let's check types.ts -> { type: 'PLACE_OBJECT'; payload: { object: WorldObject } }
        // Ah, WorldScene needs to construct the object.
        // Let's do a quick fix here.

        // WORKAROUND: Send minimal data if worker supports it, or full obj
        // Actually sim.worker.ts handler:
        // case 'PLACE_OBJECT':
        //    if (cmd.payload.object) ...
        // So we need to construct it
        const objId = Math.random().toString(36).substring(7);
        const object: WorldObject = {
            id: objId,
            type: store.placeObjectType,
            pos: tilePos,
            data: { resources: 100 } // Default
        };

        worker?.postMessage({
            type: 'PLACE_OBJECT',
            payload: { object },
        });
    }

    // ===============================================
    // Sync Logic
    // ===============================================

    syncAnimals(entities: SnapshotEntity[]) {
        if (!this.sys || !this.sys.isActive() || !this.add) return;

        const selectedId = useGameStore.getState().selectedEntityId;
        const currentIds = new Set(entities.map(e => e.id));

        // 1. Remove Despawned
        const idsToRemove: string[] = [];
        this.entitySprites.forEach((_, id) => {
            if (!currentIds.has(id)) idsToRemove.push(id);
        });

        idsToRemove.forEach(id => {
            const sprite = this.entitySprites.get(id);
            sprite?.destroy();
            this.entitySprites.delete(id);
        });

        // 2. Update / Create
        for (const entity of entities) {
            let container = this.entitySprites.get(entity.id);

            if (!container) {
                container = this.createEntitySprite(entity);
                this.entitySprites.set(entity.id, container);
            }

            // Position
            container.setPosition(entity.x, entity.y);
            // Z-Index (Y-Sort)
            container.setDepth(entity.y);

            // Facing / Flip
            // Update the visual container inside
            const visual = container.getByName('visual') as Phaser.GameObjects.Container;
            if (visual) {
                if (entity.facing === 'w') visual.setScale(-1, 1);
                else visual.setScale(1, 1);
            }

            // Selection Highlight
            const outline = container.getByName('outline') as Phaser.GameObjects.Arc;
            if (outline) {
                outline.setVisible(entity.id === selectedId);
            }

            // State Emoji
            const stateText = container.getByName('stateText') as Phaser.GameObjects.Text;
            if (stateText) {
                stateText.setText(this.getStateEmoji(entity.state));
            }
        }

        // 3. Debug Draw
        this.drawDebug();

        // 4. Heatmap Draw
        // this.drawHeatmap();
    }

    createEntitySprite(entity: SnapshotEntity): Phaser.GameObjects.Container {
        const container = this.add.container(entity.x, entity.y);

        // Visual group (for flipping)
        const visual = this.add.container(0, 0);
        visual.setName('visual');

        const isCat = entity.species === 'cat';
        const color = isCat ? 0xffa500 : 0x808080; // Orange or Gray
        const size = isCat ? 12 : 8;

        // Selection Outline (Outer ring, not flipped)
        const outline = this.add.circle(0, 0, size + 4);
        outline.setStrokeStyle(2, 0xffd700);
        outline.setVisible(false);
        outline.setName('outline');
        container.add(outline);

        // Body
        const body = this.add.circle(0, 0, size, color);
        body.setStrokeStyle(1, 0x4a4a6a);
        visual.add(body);

        // Eyes (facing East by default)
        const eyeOffsetX = size * 0.4;
        const eyeOffsetY = -size * 0.2;
        const eyeSize = size * 0.25;

        const eyes = this.add.container(0, 0);
        eyes.add(this.add.circle(eyeOffsetX, eyeOffsetY, eyeSize, 0x000000));
        eyes.add(this.add.circle(eyeOffsetX + (isCat ? 5 : 3), eyeOffsetY, eyeSize, 0x000000));
        visual.add(eyes);

        container.add(visual);

        // Name Tag
        const nameText = this.add.text(0, -size - 12, entity.name, {
            fontSize: '10px',
            color: '#e4e4eb',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 3, y: 1 },
        });
        nameText.setOrigin(0.5);
        container.add(nameText);

        // State Emoji
        const stateText = this.add.text(0, size + 10, this.getStateEmoji(entity.state), {
            fontSize: '14px',
        });
        stateText.setOrigin(0.5);
        stateText.setName('stateText');
        container.add(stateText);

        return container;
    }

    getStateEmoji(state: string): string {
        const emojis: Record<string, string> = {
            idle: '😐',
            wander: '🚶',
            moveTo: '👉',
            chase: '🐆',
            flee: '💨',
            attack: '⚔️',
            eat: '🍽️',
            drink: '💧',
            sleep: '💤',
            dead: '💀',
        };
        return emojis[state] || '';
    }

    syncObjects(objects: WorldObject[]) {
        if (!this.sys || !this.sys.isActive() || !this.add) return;

        const currentIds = new Set(objects.map(o => o.id));

        const idsToRemove: string[] = [];
        this.objectSprites.forEach((_, id) => {
            if (!currentIds.has(id)) idsToRemove.push(id);
        });

        idsToRemove.forEach(id => {
            this.objectSprites.get(id)?.destroy();
            this.objectSprites.delete(id);
        });

        for (const obj of objects) {
            if (!this.objectSprites.has(obj.id)) {
                const px = obj.pos.tx * V1.tileSizePx + V1.tileSizePx / 2; // Center in tile
                const py = obj.pos.ty * V1.tileSizePx + V1.tileSizePx / 2;

                const sprite = this.createObjectSprite(obj, px, py);
                this.objectSprites.set(obj.id, sprite);
            }
        }
    }

    createObjectSprite(obj: WorldObject, x: number, y: number): Phaser.GameObjects.Container {
        const container = this.add.container(x, y);

        let shape: Phaser.GameObjects.Shape;
        let emoji: string;

        switch (obj.type) {
            case 'water':
                shape = this.add.circle(0, 0, 16, 0x3b82f6, 0.6);
                emoji = '💧';
                break;
            case 'bush':
                shape = this.add.circle(0, 0, 18, 0x22c55e, 0.5);
                emoji = '🌿';
                break;
            case 'trash':
                shape = this.add.rectangle(0, 0, 24, 24, 0x78716c, 0.6);
                emoji = '🗑️';
                break;
            default:
                shape = this.add.circle(0, 0, 10, 0x888888, 0.5);
                emoji = '❓';
        }

        shape.setStrokeStyle(2, 0x4a4a6a);
        container.add(shape);

        const emojiText = this.add.text(0, 0, emoji, { fontSize: '16px' });
        emojiText.setOrigin(0.5);
        container.add(emojiText);

        // Background layer
        container.setDepth(-100);

        return container;
    }

    // ===============================================
    // Debug Rendering
    // ===============================================

    private debugGraphics?: Phaser.GameObjects.Graphics;

    drawDebug() {
        if (!this.debugGraphics) {
            this.debugGraphics = this.add.graphics();
            this.debugGraphics.setDepth(9999);
        }

        this.debugGraphics.clear();
        const store = useGameStore.getState();
        const { showSenseRadius, showTargets, showChunkBounds } = store.rules.debug;


        const selectedId = store.selectedEntityId;
        if (selectedId) {
            const entity = store.entities.find(e => e.id === selectedId);
            if (entity) {
                // Ensure graphics exists if we skipped init above
                if (!this.debugGraphics) {
                    this.debugGraphics = this.add.graphics();
                    this.debugGraphics.setDepth(9999);
                }
                // this.drawOffscreenArrow(entity);
            }
        }

        // V1.1 Path Trace
        if (store.viewingGravePathId) {
            const entry = store.graveyard.find(g => g.entityId === store.viewingGravePathId);
            if (entry && entry.path && entry.path.length > 1) {
                this.debugGraphics.lineStyle(3, 0xffd700, 0.8); // Gold line

                const points = entry.path.map(p => ({ x: p.x, y: p.y }));
                this.debugGraphics.strokePoints(points, false, false);

                // Draw start/end dots
                this.debugGraphics.fillStyle(0xffd700, 1);
                const first = points[0];
                const last = points[points.length - 1];
                this.debugGraphics.fillCircle(first.x, first.y, 4);
                this.debugGraphics.fillCircle(last.x, last.y, 6); // Dead spot larger
            }
        }

        if (!showSenseRadius && !showTargets && !showChunkBounds && !store.viewingGravePathId) return;

        // 1. Chunk Bounds
        if (showChunkBounds) {
            this.debugGraphics.lineStyle(2, 0xffff00, 0.3); // Yellow, faint
            const worldWidth = V1.defaultMapWidth * V1.tileSizePx;
            const worldHeight = V1.defaultMapHeight * V1.tileSizePx;
            const chunkSizePx = V1.chunkSize * V1.tileSizePx; // 32 * 32 = 1024

            for (let x = 0; x <= worldWidth; x += chunkSizePx) {
                this.debugGraphics.moveTo(x, 0);
                this.debugGraphics.lineTo(x, worldHeight);
            }
            for (let y = 0; y <= worldHeight; y += chunkSizePx) {
                this.debugGraphics.moveTo(0, y);
                this.debugGraphics.lineTo(worldWidth, y);
            }
            this.debugGraphics.strokePath();

            // Label Chunks
            // (Optional: Draw text, but graphics is cheaper)
        }

        // 2. Entity Debug Info (Radius, Targets)
        if (showSenseRadius || showTargets) {
            const entities = store.entities;

            for (const entity of entities) {
                // We need species config for radius. 
                // Since we don't have full config here easily without importing, 
                // we'll approximate or assume standard (Cats=20, Rats=15 tiles).
                // Better: import SPECIES_CONFIGS? 
                // Currently importing types, V1. Let's hardcode or import.
                // Importing SPECIES_CONFIGS might be circular if not careful, but shared should be fine.
                // Let's us rough values for now to avoid breaking imports: 
                // Cat: 20 * 32 = 640, Rat: 15 * 32 = 480.
                const radius = entity.species === 'cat' ? 640 : 480;

                if (showSenseRadius) {
                    this.debugGraphics.lineStyle(1, 0x00ff00, 0.2); // Green ring
                    this.debugGraphics.strokeCircle(entity.x, entity.y, radius);
                }

                if (showTargets) {
                    // We don't have targetPos in SnapshotEntity to save bandwidth?
                    // Let's check shared/types.ts -> SnapshotEntity does NOT have targetPos.
                    // It only has state.
                    // To show targets, we need `EntityRuntime`.
                    // BUT, `EntityRuntime` is only sending for `selectedEntityDetail`.
                    // So we can only show target for the SELECTED entity?
                    // OR we need to add targetPos to SnapshotEntity if we want global debug.
                    // User request: "target line boundary is not showing".
                    // If they want it for ALL, we need to add it to snapshot.
                    // If just for selected, we use `selectedEntityDetail`.
                    // Let's try drawing for selected entity if available.

                    if (entity.selected && store.selectedEntityDetail && store.selectedEntityDetail.id === entity.id) {
                        const detail = store.selectedEntityDetail;
                        if (detail.targetPos) {
                            const tx = detail.targetPos.x * V1.tileSizePx + V1.tileSizePx / 2;
                            const ty = detail.targetPos.y * V1.tileSizePx + V1.tileSizePx / 2;

                            this.debugGraphics.lineStyle(2, 0xff0000, 0.8); // Red line
                            this.debugGraphics.moveTo(entity.x, entity.y);
                            this.debugGraphics.lineTo(tx, ty);
                            this.debugGraphics.strokePath();

                            // Draw X at target
                            this.debugGraphics.lineStyle(2, 0xff0000, 1);
                            this.debugGraphics.lineBetween(tx - 5, ty - 5, tx + 5, ty + 5);
                            this.debugGraphics.lineBetween(tx + 5, ty - 5, tx - 5, ty + 5);
                        }
                    }
                }
            }
        }
    }
}
