// ============================================
// WorldScene - 主游戏场景 (V1)
// ============================================

import Phaser from 'phaser';
import type { SnapshotEntity, WorldObject } from '@shared/types';
import { useGameStore, getSimWorker } from '@app/store/gameStore';
import { V1 } from '@shared/constants';
import { ServerClient } from '../../app/api/ServerClient';

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

    preload() {
        this.load.on('loaderror', (file: any) => {
            console.error('Asset load failed:', file.key, file.src);
        });

        // Use relative path from root
        this.load.spritesheet('sprites', '/assets/sprites.png', {
            frameWidth: 32,
            frameHeight: 32,
        });
    }

    create() {
        // Map dimensions (for initial centering)
        const worldWidth = V1.defaultMapWidth * V1.tileSizePx;
        const worldHeight = V1.defaultMapHeight * V1.tileSizePx;

        // 1. Draw Background
        this.createBackground();

        // 2 Create Animations
        this.createAnimations();

        // 3. Setup Camera
        // Finite bounds removed for Infinite World
        // this.cameras.main.setBounds(...) 
        this.cameras.main.centerOn(worldWidth / 2, worldHeight / 2);
        this.cameras.main.setZoom(1);

        // 4. Setup Controls
        this.setupCameraControls();

        // 5. Input Events
        this.input.on('pointerdown', this.handlePointerDown, this);
        this.input.on('pointerup', this.handlePointerUp, this);

        // 6. Subscribe to Store State (Sync loop)
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

    createAnimations() {
        // --- RAT ANIMATIONS (Row 1 & 2) ---
        // Row 1: Idle(0), Walk1(1), Walk2(2), Run1(3), Run2(4)
        // Row 2: Eat(5), Attack(6), Sleep(7), Dead(8), Bones(9)

        this.anims.create({ key: 'rat-idle', frames: this.anims.generateFrameNumbers('sprites', { frames: [0] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-move', frames: this.anims.generateFrameNumbers('sprites', { frames: [1, 2] }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'rat-run', frames: this.anims.generateFrameNumbers('sprites', { frames: [3, 4] }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'rat-eat', frames: this.anims.generateFrameNumbers('sprites', { frames: [5] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-attack', frames: this.anims.generateFrameNumbers('sprites', { frames: [6] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'rat-sleep', frames: this.anims.generateFrameNumbers('sprites', { frames: [7] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-dead', frames: this.anims.generateFrameNumbers('sprites', { frames: [8] }), frameRate: 1, repeat: -1 });

        // --- CAT ANIMATIONS (Row 3 & 4) ---
        // Row 3: Idle(10), Walk1(11), Walk2(12), Run1(13), Run2(14)
        // Row 4: Eat(15), Attack(16), Sleep(17), Dead(18), Bones(19)
        const offset = 10;
        this.anims.create({ key: 'cat-idle', frames: this.anims.generateFrameNumbers('sprites', { frames: [0 + offset] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-move', frames: this.anims.generateFrameNumbers('sprites', { frames: [1 + offset, 2 + offset] }), frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'cat-run', frames: this.anims.generateFrameNumbers('sprites', { frames: [3 + offset, 4 + offset] }), frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'cat-eat', frames: this.anims.generateFrameNumbers('sprites', { frames: [5 + offset] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-attack', frames: this.anims.generateFrameNumbers('sprites', { frames: [6 + offset] }), frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'cat-sleep', frames: this.anims.generateFrameNumbers('sprites', { frames: [7 + offset] }), frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-dead', frames: this.anims.generateFrameNumbers('sprites', { frames: [8 + offset] }), frameRate: 1, repeat: -1 });
    }

    destroy() {
        this.unsubscribeStore();
        // Invoke parent destroy, but specifically clean up plugins/listeners if needed
        // this.scene.remove(this.key); // Not needed usually
    }

    private gridSprite!: Phaser.GameObjects.TileSprite;
    private chunkGridSprite!: Phaser.GameObjects.TileSprite;

    createBackground() {
        // Generate Textures programmatically
        this.createGridTexture('grid-texture', V1.tileSizePx, 0x232336, 0x2a2a3a);
        // Chunk grid is larger, maybe just draw it or use another tile sprite? 
        // Chunk size is 32x32 tiles = 1024px. Texture might be too big for some GPUs? 1024 is fine.
        this.createGridTexture('chunk-texture', V1.chunkSize * V1.tileSizePx, 0x00000000, 0x3a3a4a, 2);

        const width = this.scale.width;
        const height = this.scale.height;

        // 1. Base TileSprite (The Main Grid)
        // using setScrollFactor(0) to stick to camera, then we update tilePosition
        this.gridSprite = this.add.tileSprite(0, 0, width, height, 'grid-texture')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-1000);

        // 2. Chunk Grid Overlay
        this.chunkGridSprite = this.add.tileSprite(0, 0, width, height, 'chunk-texture')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(-999)
            .setAlpha(0.6);

        // Resize handler to keep background filling screen
        this.scale.on('resize', this.resizeBackground, this);

        // Force initial resize to ensure full coverage
        this.resizeBackground(this.scale.gameSize);
    }

    createGridTexture(key: string, size: number, color: number, lineColor: number, thickness: number = 1) {
        if (this.textures.exists(key)) return;

        const graphics = this.add.graphics();
        graphics.setVisible(false);

        // Fill
        if (color !== 0x00000000) {
            graphics.fillStyle(color, 1);
            graphics.fillRect(0, 0, size, size);
        }

        // Border (Bottom and Right to tile correctly)
        graphics.lineStyle(thickness, lineColor);
        graphics.moveTo(0, size);
        graphics.lineTo(size, size);
        graphics.lineTo(size, 0);

        graphics.generateTexture(key, size, size);
        graphics.destroy();
    }

    resizeBackground(gameSize: Phaser.Structs.Size) {
        if (this.gridSprite) {
            this.gridSprite.setSize(gameSize.width, gameSize.height);
        }
        if (this.chunkGridSprite) {
            this.chunkGridSprite.setSize(gameSize.width, gameSize.height);
        }
    }

    update() {
        // V1.1 Camera Fly Request
        const store = useGameStore.getState();
        if (store.cameraFlyTo) {
            this.cameras.main.centerOn(store.cameraFlyTo.x, store.cameraFlyTo.y);
            // Ensure visible zoom
            if (this.cameras.main.zoom < 0.8) {
                this.cameras.main.setZoom(1);
            }
            store.setCameraFlyTo(null);
            this.updateWorkerCamera();
        }

        // V1.1 Follow Mode
        if (store.followingEntityId && !store.cameraFlyTo) {
            // Find entity position
            const entitySprite = this.entitySprites.get(store.followingEntityId);
            if (entitySprite && entitySprite.visible) {
                // Smooth follow
                this.cameras.main.startFollow(entitySprite, true, 0.1, 0.1);
            } else {
                // Lost tracking or dead
                this.cameras.main.stopFollow();
                store.setFollowingEntityId(null);
            }
        } else if (!store.followingEntityId) {
            if (this.cameras.main.dirty) {
                // If we were following, stop
                // this.cameras.main.stopFollow(); 
                // Don't call stopFollow every frame, but we need to ensure we stop if we were following
            }
        }

        // Sync TileSprite position and scale with Camera
        const cam = this.cameras.main;
        const zoom = cam.zoom;

        if (this.gridSprite) {
            // Use setTileScale to scale the pattern, not the object itself
            this.gridSprite.setTileScale(zoom);
            // tilePosition should be world scroll 
            this.gridSprite.tilePositionX = cam.scrollX;
            this.gridSprite.tilePositionY = cam.scrollY;
        }
        if (this.chunkGridSprite) {
            this.chunkGridSprite.setTileScale(zoom);
            this.chunkGridSprite.tilePositionX = cam.scrollX;
            this.chunkGridSprite.tilePositionY = cam.scrollY;
        }
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

                if (store.useServer) {
                    // Fetch detail immediately
                    ServerClient.getInstance().getEntityDetail(clickedId).then(detail => {
                        if (detail) {
                            store.setSelectedEntityDetail(detail);
                        }
                    });
                } else {
                    const worker = getSimWorker();
                    worker?.postMessage({
                        type: 'SELECT_ENTITY',
                        payload: { entityId: clickedId }
                    });
                }

                // Don't drag camera if clicked entity? (Optional, kept drag enabled for now)
            } else {
                // Deselect
                store.setSelectedEntityId(null);
                store.setSelectedEntityDetail(null);

                if (!store.useServer) {
                    const worker = getSimWorker();
                    worker?.postMessage({
                        type: 'SELECT_ENTITY',
                        payload: { entityId: null }
                    });
                }
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

    async spawnAnimal(pos: { x: number; y: number }) {
        const store = useGameStore.getState();

        const costs = V1.godMode.costs.spawn as Record<string, number>;
        const cost = costs[store.spawnSpecies] || 0;

        if (store.godPower < cost) return;
        store.spendGodPower(cost);

        // Server Mode Support (V1.3)
        if (store.useServer) {
            const res = await ServerClient.getInstance().spawnAnimal(store.spawnSpecies, pos.x, pos.y);
            if (!res.ok) {
                console.warn('Server Spawn Failed:', res.error);
                // Refund GP? Technically state update makes it tricky.
                // ideally we only spend if valid.
            }
            return;
        }

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

    async placeObject(pos: { x: number; y: number }) {
        const store = useGameStore.getState();
        const costs = V1.godMode.costs.place as Record<string, number>;
        const cost = costs[store.placeObjectType] || 0;

        if (store.godPower < cost) {
            // TODO: Show floating warning
            return;
        }

        store.spendGodPower(cost);

        if (store.useServer) {
            const res = await ServerClient.getInstance().placeObject(store.placeObjectType, pos.x, pos.y);
            if (!res.ok) {
                console.warn('Server Object Placement Failed:', res.error);
            }
            return;
        }

        const worker = getSimWorker();
        const tilePos = {
            tx: Math.floor(pos.x / V1.tileSizePx),
            ty: Math.floor(pos.y / V1.tileSizePx)
        };

        // Construct object
        const objId = Math.random().toString(36).substring(7);
        // Need to import basic configs or hardcode defaults
        // For now, simple defaults
        const object: WorldObject = {
            id: objId,
            type: store.placeObjectType,
            pos: tilePos,
            data: { resources: 100, maxResources: 100, regenRate: 1.0 }
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
                // If facing WEST (left), scale X -1.
                // Original sprites face RIGHT.
                if (entity.facing === 'w') visual.setScale(-1, 1);
                else visual.setScale(1, 1);

                // Play Animation
                const sprite = visual.getByName('sprite') as Phaser.GameObjects.Sprite;
                if (sprite) {
                    const speciesPrefix = entity.species; // 'rat' or 'cat'
                    let animKey = `${speciesPrefix}-idle`;

                    // basic mapping
                    switch (entity.state) {
                        case 'idle': animKey = `${speciesPrefix}-idle`; break;
                        case 'wander':
                        case 'moveTo':
                            animKey = `${speciesPrefix}-move`;
                            break;
                        case 'chase':
                        case 'flee':
                            animKey = `${speciesPrefix}-run`;
                            break;
                        case 'eat':
                        case 'drink':
                            animKey = `${speciesPrefix}-eat`;
                            break;
                        case 'attack': animKey = `${speciesPrefix}-attack`; break;
                        case 'sleep': animKey = `${speciesPrefix}-sleep`; break;
                        case 'dead': animKey = `${speciesPrefix}-dead`; break;
                    }

                    // Only play if different to avoid restarting loop
                    if (sprite.anims.currentAnim?.key !== animKey) {
                        sprite.play(animKey);
                    }
                }
            }

            // Selection Highlight
            const outline = container.getByName('outline') as Phaser.GameObjects.Arc;
            if (outline) {
                outline.setVisible(entity.id === selectedId);
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
        const size = isCat ? 16 : 12; // Adjusted size for outline

        // Selection Outline (Outer ring, not flipped)
        const outline = this.add.circle(0, 0, size + 4);
        outline.setStrokeStyle(2, 0xffd700);
        outline.setVisible(false);
        outline.setName('outline');
        container.add(outline);

        // Sprite
        const sprite = this.add.sprite(0, 0, 'sprites');
        sprite.setName('sprite');

        // 32px frame -> 16px tile => 0.5 baseline, cats slightly bigger
        sprite.setScale(isCat ? 0.6 : 0.5);

        // Initial animation
        sprite.play(isCat ? 'cat-idle' : 'rat-idle');
        visual.add(sprite);

        container.add(visual);

        // Name Tag
        const nameText = this.add.text(0, -18, entity.name, {
            fontSize: '10px',
            color: '#e4e4eb',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 3, y: 1 },
        });
        nameText.setOrigin(0.5);
        container.add(nameText);

        // State Text (Debug/Clear info)
        // Kept small below sprite
        /*
        const stateText = this.add.text(0, 18, this.getStateEmoji(entity.state), {
            fontSize: '14px',
        });
        stateText.setOrigin(0.5);
        stateText.setName('stateText');
        container.add(stateText);
        */

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

        // Row 5 starts at frame 20 (5 cols * 4 rows)
        // 20: water, 21: bush, 22: trash, 23: skeleton, 24: (if present)
        let frameIndex = 21;

        switch (obj.type) {
            case 'water': frameIndex = 20; break;
            case 'bush': frameIndex = 21; break;
            case 'trash': frameIndex = 22; break;
            default: frameIndex = 21; break;
        }

        const sprite = this.add.sprite(0, 0, 'sprites', frameIndex);
        sprite.setScale(0.6); // 32px frame -> ~19px fits tile nicely
        container.add(sprite);

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
                    if (entity.targetPos) {
                        const tx = entity.targetPos.x;
                        const ty = entity.targetPos.y;

                        this.debugGraphics.lineStyle(1, 0xff0000, 0.6); // Red line
                        this.debugGraphics.moveTo(entity.x, entity.y);
                        this.debugGraphics.lineTo(tx, ty);
                        this.debugGraphics.strokePath();

                        // Tiny cross
                        this.debugGraphics.lineStyle(1, 0xff0000, 0.8);
                        this.debugGraphics.lineBetween(tx - 3, ty - 3, tx + 3, ty + 3);
                        this.debugGraphics.lineBetween(tx + 3, ty - 3, tx - 3, ty + 3);
                    }
                }
            }
        }
    }
}
