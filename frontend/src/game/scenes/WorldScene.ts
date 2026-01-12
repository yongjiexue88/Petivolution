// ============================================
// WorldScene - Main Game Scene (V1)
// ============================================

import Phaser from 'phaser';
import type { SnapshotEntity, WorldObject } from '@shared/types';
import { useGameStore, getSimWorker } from '@app/store/gameStore';
import { V1 } from '@shared/constants';
import { ServerClient } from '../../app/api/ServerClient';

export class WorldScene extends Phaser.Scene {
    private entitySprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private objectSprites: Map<string, Phaser.GameObjects.Container> = new Map();

    // --- UI CAMERA ---
    private uiCamera!: Phaser.Cameras.Scene2D.Camera;
    private readonly BORDER_THICKNESS = 4;

    // --- MINIMAP V1 PROPERTIES ---
    private minimapContainer!: Phaser.GameObjects.Container;
    private minimapGraphics!: Phaser.GameObjects.Graphics;
    private minimapBg!: Phaser.GameObjects.Rectangle;
    private minimapCoords!: Phaser.GameObjects.Text;
    private lastMinimapUpdate: number = 0;
    private isMinimapDragging: boolean = false;
    private readonly MINIMAP_SIZE = 220;
    private readonly MINIMAP_MARGIN = 12;
    private readonly MINIMAP_REFRESH_RATE = 50; // 20Hz

    // V1.3 Day/Night
    private dayNightOverlay!: Phaser.GameObjects.Rectangle;
    private isDragging = false;
    private dragStart = { x: 0, y: 0 };
    private cameraStart = { x: 0, y: 0 };
    private unsubscribeStore: () => void = () => { };
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    // --- P0 DEBUG OVERLAY ---
    private debugOverlayEnabled: boolean = false;
    private debugZoneGraphics!: Phaser.GameObjects.Graphics;
    private debugCountsText!: Phaser.GameObjects.Text;
    private spawnPointMarkers: { x: number; y: number; time: number }[] = [];
    private readonly SPAWN_MARKER_DURATION = 2000; // ms

    constructor() {
        super({ key: 'WorldScene' });
    }

    preload() {
        this.load.on('loaderror', (file: any) => {
            console.error('Asset load failed:', file.key, file.src);
        });

        // Load individual sprite images
        const spriteBase = '/assets/sprites';

        // Rat sprites
        this.load.image('rat_idle', `${spriteBase}/rat_idle.png`);
        this.load.image('rat_walk1', `${spriteBase}/rat_walk1.png`);
        this.load.image('rat_walk2', `${spriteBase}/rat_walk2.png`);
        this.load.image('rat_run1', `${spriteBase}/rat_run1.png`);
        this.load.image('rat_run2', `${spriteBase}/rat_run2.png`);
        this.load.image('rat_eat', `${spriteBase}/rat_eat.png`);
        this.load.image('rat_attack', `${spriteBase}/rat_attack.png`);
        this.load.image('rat_sleep', `${spriteBase}/rat_sleep.png`);
        this.load.image('rat_dead', `${spriteBase}/rat_dead.png`);

        // Cat sprites
        this.load.image('cat_idle', `${spriteBase}/cat_idle.png`);
        this.load.image('cat_walk1', `${spriteBase}/cat_walk1.png`);
        this.load.image('cat_walk2', `${spriteBase}/cat_walk2.png`);
        this.load.image('cat_run1', `${spriteBase}/cat_run1.png`);
        this.load.image('cat_run2', `${spriteBase}/cat_run2.png`);
        this.load.image('cat_eat', `${spriteBase}/cat_eat.png`);
        this.load.image('cat_attack', `${spriteBase}/cat_attack.png`);
        this.load.image('cat_sleep', `${spriteBase}/cat_sleep.png`);
        this.load.image('cat_dead', `${spriteBase}/cat_dead.png`);

        // Object sprites
        this.load.image('water', `${spriteBase}/water.png`);
        this.load.image('bush', `${spriteBase}/bush.png`);
        this.load.image('trash', `${spriteBase}/trash.png`);
        this.load.image('skeleton', `${spriteBase}/skeleton.png`);

        // Tier 1 Placeholders
        this.load.image('chicken_idle', `${spriteBase}/chicken_idle.png`);
        this.load.image('chicken_walk1', `${spriteBase}/chicken_walk1.png`);
        this.load.image('chicken_walk2', `${spriteBase}/chicken_walk2.png`);
        this.load.image('chicken_run1', `${spriteBase}/chicken_run1.png`);
        this.load.image('chicken_run2', `${spriteBase}/chicken_run2.png`);
        this.load.image('chicken_eat', `${spriteBase}/chicken_eat.png`);
        this.load.image('chicken_attack', `${spriteBase}/chicken_attack.png`);
        this.load.image('chicken_sleep', `${spriteBase}/chicken_sleep.png`);
        this.load.image('chicken_dead', `${spriteBase}/chicken_dead.png`);

        this.load.image('bird_idle', `${spriteBase}/bird_idle.png`);
        this.load.image('bird_hop1', `${spriteBase}/bird_hop1.png`);
        this.load.image('bird_hop2', `${spriteBase}/bird_hop2.png`);
        this.load.image('bird_fly1', `${spriteBase}/bird_fly1.png`);
        this.load.image('bird_fly2', `${spriteBase}/bird_fly2.png`);
        this.load.image('bird_perch', `${spriteBase}/bird_perch.png`);
        this.load.image('bird_eat', `${spriteBase}/bird_eat.png`);
        this.load.image('bird_dead', `${spriteBase}/bird_dead.png`);

        this.load.image('seed', `${spriteBase}/seed.png`);
        // this.load.image('insect', `${spriteBase}/insect.png`);
        // this.load.image('egg', `${spriteBase}/egg.png`);
        this.load.image('perch', `${spriteBase}/perch.png`);
        // this.load.image('food_bowl', `${spriteBase}/food_bowl.png`);
        // this.load.image('fence', `${spriteBase}/fence.png`);

        // Tier 2 Placeholders
        this.load.image('raccoon_idle', `${spriteBase}/raccoon_idle.png`);
        this.load.image('raccoon_walk1', `${spriteBase}/raccoon_walk1.png`);
        this.load.image('raccoon_walk2', `${spriteBase}/raccoon_walk2.png`);
        this.load.image('raccoon_run1', `${spriteBase}/raccoon_run1.png`);
        this.load.image('raccoon_run2', `${spriteBase}/raccoon_run2.png`);
        this.load.image('raccoon_steal', `${spriteBase}/raccoon_steal.png`);
        this.load.image('raccoon_attack', `${spriteBase}/raccoon_attack.png`);
        this.load.image('raccoon_eat', `${spriteBase}/raccoon_eat.png`);
        this.load.image('raccoon_sleep', `${spriteBase}/raccoon_sleep.png`);
        this.load.image('raccoon_dead', `${spriteBase}/raccoon_dead.png`);

        this.load.image('crow_idle', `${spriteBase}/crow_idle.png`);
        this.load.image('crow_hop1', `${spriteBase}/crow_hop1.png`);
        this.load.image('crow_hop2', `${spriteBase}/crow_hop2.png`);
        this.load.image('crow_fly1', `${spriteBase}/crow_fly1.png`);
        this.load.image('crow_fly2', `${spriteBase}/crow_fly2.png`);
        this.load.image('crow_attack', `${spriteBase}/crow_attack.png`);
        this.load.image('crow_eat', `${spriteBase}/crow_eat.png`);
        this.load.image('crow_dead', `${spriteBase}/crow_dead.png`);

        this.load.image('fox_idle', `${spriteBase}/fox_idle.png`);
        this.load.image('fox_walk1', `${spriteBase}/fox_walk1.png`);
        this.load.image('fox_walk2', `${spriteBase}/fox_walk2.png`);
        this.load.image('fox_run1', `${spriteBase}/fox_run1.png`);
        this.load.image('fox_run2', `${spriteBase}/fox_run2.png`);
        this.load.image('fox_attack', `${spriteBase}/fox_attack.png`);
        this.load.image('fox_eat', `${spriteBase}/fox_eat.png`);
        this.load.image('fox_sleep', `${spriteBase}/fox_sleep.png`);
        this.load.image('fox_dead', `${spriteBase}/fox_dead.png`);

        // Tier 3 Placeholders
        this.load.image('dog_idle', `${spriteBase}/dog_idle.png`);
        this.load.image('dog_walk1', `${spriteBase}/dog_walk1.png`);
        this.load.image('dog_walk2', `${spriteBase}/dog_walk2.png`);
        this.load.image('dog_run1', `${spriteBase}/dog_run1.png`);
        this.load.image('dog_run2', `${spriteBase}/dog_run2.png`);
        this.load.image('dog_attack', `${spriteBase}/dog_attack.png`);
        this.load.image('dog_bark', `${spriteBase}/dog_bark.png`);
        this.load.image('dog_eat', `${spriteBase}/dog_eat.png`);
        this.load.image('dog_sleep', `${spriteBase}/dog_sleep.png`);
        this.load.image('dog_dead', `${spriteBase}/dog_dead.png`);

        this.load.image('hawk_idle', `${spriteBase}/hawk_idle.png`);
        this.load.image('hawk_fly1', `${spriteBase}/hawk_fly1.png`);
        this.load.image('hawk_fly2', `${spriteBase}/hawk_fly2.png`);
        this.load.image('hawk_swoop1', `${spriteBase}/hawk_swoop1.png`);
        this.load.image('hawk_swoop2', `${spriteBase}/hawk_swoop2.png`);
        this.load.image('hawk_attack', `${spriteBase}/hawk_attack.png`);
        this.load.image('hawk_eat', `${spriteBase}/hawk_eat.png`);
        this.load.image('hawk_dead', `${spriteBase}/hawk_dead.png`);

        this.load.image('wolf_idle', `${spriteBase}/wolf_idle.png`);
        this.load.image('wolf_walk1', `${spriteBase}/wolf_walk1.png`);
        this.load.image('wolf_walk2', `${spriteBase}/wolf_walk2.png`);
        this.load.image('wolf_run1', `${spriteBase}/wolf_run1.png`);
        this.load.image('wolf_run2', `${spriteBase}/wolf_run2.png`);
        this.load.image('wolf_attack', `${spriteBase}/wolf_attack.png`);
        this.load.image('wolf_howl', `${spriteBase}/wolf_howl.png`);
        this.load.image('wolf_eat', `${spriteBase}/wolf_eat.png`);
        this.load.image('wolf_sleep', `${spriteBase}/wolf_sleep.png`);
        this.load.image('wolf_dead', `${spriteBase}/wolf_dead.png`);

        // Tier 3(extra) Snake Placeholders
        this.load.image('snake_idle', `${spriteBase}/snake_idle.png`);
        this.load.image('snake_move1', `${spriteBase}/snake_move1.png`);
        this.load.image('snake_move2', `${spriteBase}/snake_move2.png`);
        this.load.image('snake_attack', `${spriteBase}/snake_attack.png`);
        this.load.image('snake_eat', `${spriteBase}/snake_eat.png`);
        this.load.image('snake_sleep', `${spriteBase}/snake_sleep.png`);
        this.load.image('snake_dead', `${spriteBase}/snake_dead.png`);
        // Note: Snake uses 'move' for run, and 'idle' for others if mapped

        // Other resources
        this.load.image('trash_bin', `${spriteBase}/trash_bin.png`);
        this.load.image('carcass', `${spriteBase}/carcass.png`);

        // City Assets
        this.load.image('city_house', '/assets/city/house.png');
        this.load.image('city_road', '/assets/city/road.png');
        this.load.image('city_fence', '/assets/city/fence.png');
        this.load.image('city_tree', '/assets/city/tree.png');
        this.load.image('city_crops', '/assets/city/crops.png');
        this.load.image('city_chest', '/assets/city/chest.png');

        // Tileset
        this.load.spritesheet('tileset_spring', '/assets/city/tileset_spring.png', { frameWidth: 16, frameHeight: 16 });
    }

    create() {
        // Map dimensions (for initial centering)
        const worldWidth = V1.defaultMapWidth * V1.tileSizePx;
        const worldHeight = V1.defaultMapHeight * V1.tileSizePx;

        // RESET CAMERA STATE (Fix for "Stuck at Top-Left" issue)
        // Clear any stale fly/follow targets from store that might override our initial setBounds/centerOn
        useGameStore.getState().setCameraFlyTo(null);
        useGameStore.getState().setFollowingEntityId(null);

        // 1. Setup Camera using Phaser's built-in bounds (SIMPLE APPROACH)
        const cam = this.cameras.main;
        cam.setBounds(0, 0, worldWidth, worldHeight); // Phaser handles clamping!
        cam.centerOn(worldWidth / 2, worldHeight / 2);
        cam.setZoom(1); // Default integer zoom
        cam.setBackgroundColor('#2f5a2f');

        // 2. World (background, animations, border, etc.)
        this.createBackground();
        this.createAnimations();
        this.createCity(worldWidth / 2, worldHeight / 2);
        this.createWorldBorder(worldWidth, worldHeight);

        // 3. UI camera AFTER world exists (so it can ignore everything already created)
        this.createUICamera();

        // 4. UI elements rendered only by UI camera
        this.createDayNightOverlayUI();
        this.createMinimap();

        // minimap ONLY on UI camera
        if (this.minimapContainer) {
            this.cameras.main.ignore(this.minimapContainer);
        }

        // 5. Setup Controls
        this.setupCameraControls();

        // 5.5. Setup Debug Overlay (P0)
        this.setupDebugOverlay();

        // 6. Input Events
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

        // --- DEBUG LOGS FOR VIEWPORT/WORLD ---
        console.log('--- MAP SIZE DEBUG ---');
        console.log('world:', worldWidth, worldHeight);
        console.log('scale:', this.scale.width, this.scale.height);
        console.log('cam zoom:', cam.zoom);
        console.log('cam view:', cam.width / cam.zoom, cam.height / cam.zoom);

        // Calculate Min Zoom to prevent seeing void
        const minZoomX = this.scale.width / worldWidth;
        const minZoomY = this.scale.height / worldHeight;
        const minZoom = Math.max(minZoomX, minZoomY);

        if (cam.zoom < minZoom) {
            console.log(`Initial zoom ${cam.zoom} is too small, clamping to ${minZoom}`);
            cam.setZoom(minZoom);
        }

        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            // Re-check zoom on resize
            const newMinZoom = Math.max(
                gameSize.width / (V1.defaultMapWidth * V1.tileSizePx),
                gameSize.height / (V1.defaultMapHeight * V1.tileSizePx)
            );
            if (this.cameras.main.zoom < newMinZoom) {
                this.cameras.main.setZoom(newMinZoom);
            }
        });
    }

    private createUICamera() {
        // UI camera overlays the world, never zooms
        this.uiCamera = this.cameras.add(0, 0, this.scale.width, this.scale.height, false, 'UICamera');
        this.uiCamera.setScroll(0, 0);
        this.uiCamera.setZoom(1);

        // IMPORTANT:
        // Ignore everything that exists right now (world/background/borders/etc).
        // We'll ensure any *future* world objects (entities/objects/debug gfx) also get ignored.
        this.uiCamera.ignore(this.children.list);

        // Keep UI camera sized on resize
        this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
            this.uiCamera.setSize(gameSize.width, gameSize.height);
        });
    }

    private createDayNightOverlayUI() {
        const screenWidth = this.scale.width;
        const screenHeight = this.scale.height;

        this.dayNightOverlay = this.add.rectangle(
            screenWidth / 2,
            screenHeight / 2,
            screenWidth,
            screenHeight,
            0x000022
        )
            .setScrollFactor(0)
            .setDepth(20000)
            .setAlpha(0)
            .setOrigin(0.5, 0.5)
            .setBlendMode(Phaser.BlendModes.MULTIPLY);

        // Render ONLY on UI camera (not the main camera)
        this.cameras.main.ignore(this.dayNightOverlay);
    }

    createAnimations() {
        // --- RAT ANIMATIONS ---
        this.anims.create({ key: 'rat-idle', frames: [{ key: 'rat_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-move', frames: [{ key: 'rat_walk1' }, { key: 'rat_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'rat-run', frames: [{ key: 'rat_run1' }, { key: 'rat_run2' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'rat-eat', frames: [{ key: 'rat_eat' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-attack', frames: [{ key: 'rat_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'rat-sleep', frames: [{ key: 'rat_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'rat-dead', frames: [{ key: 'rat_dead' }], frameRate: 1, repeat: -1 });

        // --- CAT ANIMATIONS ---
        this.anims.create({ key: 'cat-idle', frames: [{ key: 'cat_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-move', frames: [{ key: 'cat_walk1' }, { key: 'cat_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'cat-run', frames: [{ key: 'cat_run1' }, { key: 'cat_run2' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'cat-eat', frames: [{ key: 'cat_eat' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-attack', frames: [{ key: 'cat_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'cat-sleep', frames: [{ key: 'cat_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'cat-dead', frames: [{ key: 'cat_dead' }], frameRate: 1, repeat: -1 });

        // --- CHICKEN ANIMATIONS ---
        this.anims.create({ key: 'chicken-idle', frames: [{ key: 'chicken_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'chicken-move', frames: [{ key: 'chicken_walk1' }, { key: 'chicken_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'chicken-run', frames: [{ key: 'chicken_run1' }, { key: 'chicken_run2' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'chicken-eat', frames: [{ key: 'chicken_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'chicken-attack', frames: [{ key: 'chicken_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'chicken-sleep', frames: [{ key: 'chicken_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'chicken-dead', frames: [{ key: 'chicken_dead' }], frameRate: 1, repeat: -1 });

        // --- BIRD ANIMATIONS ---
        this.anims.create({ key: 'bird-idle', frames: [{ key: 'bird_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'bird-move', frames: [{ key: 'bird_hop1' }, { key: 'bird_hop2' }], frameRate: 5, repeat: -1 });
        this.anims.create({ key: 'bird-run', frames: [{ key: 'bird_fly1' }, { key: 'bird_fly2' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'bird-eat', frames: [{ key: 'bird_eat' }], frameRate: 3, repeat: -1 });
        this.anims.create({ key: 'bird-perch', frames: [{ key: 'bird_perch' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'bird-dead', frames: [{ key: 'bird_dead' }], frameRate: 1, repeat: -1 });

        // --- RACCOON ANIMATIONS ---
        this.anims.create({ key: 'raccoon-idle', frames: [{ key: 'raccoon_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'raccoon-move', frames: [{ key: 'raccoon_walk1' }, { key: 'raccoon_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'raccoon-run', frames: [{ key: 'raccoon_run1' }, { key: 'raccoon_run2' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'raccoon-eat', frames: [{ key: 'raccoon_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'raccoon-attack', frames: [{ key: 'raccoon_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'raccoon-sleep', frames: [{ key: 'raccoon_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'raccoon-dead', frames: [{ key: 'raccoon_dead' }], frameRate: 1, repeat: -1 });

        // --- CROW ANIMATIONS ---
        this.anims.create({ key: 'crow-idle', frames: [{ key: 'crow_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'crow-move', frames: [{ key: 'crow_hop1' }, { key: 'crow_hop2' }], frameRate: 5, repeat: -1 });
        this.anims.create({ key: 'crow-run', frames: [{ key: 'crow_fly1' }, { key: 'crow_fly2' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'crow-eat', frames: [{ key: 'crow_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'crow-attack', frames: [{ key: 'crow_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'crow-sleep', frames: [{ key: 'crow_idle' }], frameRate: 1, repeat: -1 }); // No sleep sprite
        this.anims.create({ key: 'crow-dead', frames: [{ key: 'crow_dead' }], frameRate: 1, repeat: -1 });

        // --- FOX ANIMATIONS ---
        this.anims.create({ key: 'fox-idle', frames: [{ key: 'fox_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'fox-move', frames: [{ key: 'fox_walk1' }, { key: 'fox_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'fox-run', frames: [{ key: 'fox_run1' }, { key: 'fox_run2' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'fox-eat', frames: [{ key: 'fox_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'fox-attack', frames: [{ key: 'fox_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'fox-sleep', frames: [{ key: 'fox_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'fox-dead', frames: [{ key: 'fox_dead' }], frameRate: 1, repeat: -1 });

        // --- DOG ANIMATIONS ---
        this.anims.create({ key: 'dog-idle', frames: [{ key: 'dog_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'dog-move', frames: [{ key: 'dog_walk1' }, { key: 'dog_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'dog-run', frames: [{ key: 'dog_run1' }, { key: 'dog_run2' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'dog-eat', frames: [{ key: 'dog_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'dog-attack', frames: [{ key: 'dog_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'dog-sleep', frames: [{ key: 'dog_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'dog-dead', frames: [{ key: 'dog_dead' }], frameRate: 1, repeat: -1 });

        // --- HAWK ANIMATIONS ---
        this.anims.create({ key: 'hawk-idle', frames: [{ key: 'hawk_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'hawk-move', frames: [{ key: 'hawk_fly1' }, { key: 'hawk_fly2' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'hawk-run', frames: [{ key: 'hawk_swoop1' }, { key: 'hawk_swoop2' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'hawk-eat', frames: [{ key: 'hawk_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'hawk-attack', frames: [{ key: 'hawk_attack' }], frameRate: 10, repeat: -1 });
        this.anims.create({ key: 'hawk-sleep', frames: [{ key: 'hawk_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'hawk-dead', frames: [{ key: 'hawk_dead' }], frameRate: 1, repeat: -1 });

        // --- WOLF ANIMATIONS ---
        this.anims.create({ key: 'wolf-idle', frames: [{ key: 'wolf_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'wolf-move', frames: [{ key: 'wolf_walk1' }, { key: 'wolf_walk2' }], frameRate: 6, repeat: -1 });
        this.anims.create({ key: 'wolf-run', frames: [{ key: 'wolf_run1' }, { key: 'wolf_run2' }], frameRate: 12, repeat: -1 });
        this.anims.create({ key: 'wolf-eat', frames: [{ key: 'wolf_eat' }], frameRate: 2, repeat: -1 });
        this.anims.create({ key: 'wolf-attack', frames: [{ key: 'wolf_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'wolf-sleep', frames: [{ key: 'wolf_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'wolf-dead', frames: [{ key: 'wolf_dead' }], frameRate: 1, repeat: -1 });

        // --- SNAKE ANIMATIONS ---
        this.anims.create({ key: 'snake-idle', frames: [{ key: 'snake_idle' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'snake-move', frames: [{ key: 'snake_move1' }, { key: 'snake_move2' }], frameRate: 4, repeat: -1 }); // Slither
        this.anims.create({ key: 'snake-run', frames: [{ key: 'snake_move1' }, { key: 'snake_move2' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'snake-eat', frames: [{ key: 'snake_eat' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'snake-attack', frames: [{ key: 'snake_attack' }], frameRate: 8, repeat: -1 });
        this.anims.create({ key: 'snake-sleep', frames: [{ key: 'snake_sleep' }], frameRate: 1, repeat: -1 });
        this.anims.create({ key: 'snake-dead', frames: [{ key: 'snake_dead' }], frameRate: 1, repeat: -1 });
    }

    createCity(centerX: number, centerY: number) {
        console.log('Building City at', centerX, centerY);
        // City elements removed as per user request

    }

    createWorldBorder(worldWidth: number, worldHeight: number) {
        // Place trees along the perimeter to visualizing the "Edge of the World"
        const spacing = 120; // Slight overlap or gap
        console.log('Creating World Border...');

        // Top & Bottom
        for (let x = 0; x <= worldWidth; x += spacing) {
            // Top (Aligned to 0)
            this.add.image(x, 0, 'city_tree')
                .setOrigin(0.5, 0) // Anchor at top to hang down into world
                .setDepth(0) // Depth 0 is fine for top edge
                .setScale(1.5);

            // Bottom (Aligned to worldHeight)
            this.add.image(x, worldHeight, 'city_tree')
                .setOrigin(0.5, 1)
                .setDepth(worldHeight) // Depth sort correct
                .setScale(1.5);
        }

        // DEBUG: Draw a red line at the actual bottom of the world
        const g = this.add.graphics();
        g.lineStyle(10, 0xff0000, 1);
        g.lineBetween(0, worldHeight, worldWidth, worldHeight);
        g.setDepth(20000); // On top of everything
        console.log(`DEBUG: Bottom Border Y=${worldHeight}.`);

        // Left & Right
        for (let y = 0; y <= worldHeight; y += spacing) {
            // Left (Aligned to 0)
            this.add.image(0, y, 'city_tree')
                .setOrigin(0.5, 1) // Anchor at bottom to sit on line
                .setDepth(y)
                .setScale(1.5);

            // Right (Aligned to worldWidth)
            this.add.image(worldWidth, y, 'city_tree')
                .setOrigin(0.5, 1)
                .setDepth(y)
                .setScale(1.5);
        }
    }

    destroy() {
        this.unsubscribeStore();
        // Invoke parent destroy, but specifically clean up plugins/listeners if needed
        // this.scene.remove(this.key); // Not needed usually
    }

    // private gridSprite!: Phaser.GameObjects.TileSprite;
    // private chunkGridSprite!: Phaser.GameObjects.TileSprite;

    createBackground() {
        const worldWidth = V1.defaultMapWidth * V1.tileSizePx;
        const worldHeight = V1.defaultMapHeight * V1.tileSizePx;

        // 1. Generate Grass Texture Programmatically (Reliable Fallback)
        if (!this.textures.exists('grass-base')) {
            const g = this.add.graphics();
            g.fillStyle(0x2f5a2f, 1); // Darker Grass Green
            g.fillRect(0, 0, 32, 32);
            // Add some "noise" dots
            g.fillStyle(0x3e7a3e, 1);
            g.fillRect(4, 4, 2, 2);
            g.fillRect(20, 10, 2, 2);
            g.fillRect(10, 25, 2, 2);
            g.generateTexture('grass-base', 32, 32);
            g.destroy();
        }

        // 1. Static World Background
        // Since the world is finite (8192x8192), we can just place a single large TileSprite.
        // Phaser handles culling automatically.
        this.add.tileSprite(
            worldWidth / 2,
            worldHeight / 2,
            worldWidth,
            worldHeight,
            'grass-base'
        )
            .setOrigin(0.5, 0.5) // Center anchored
            .setScrollFactor(1)  // Moves with camera (part of the world)
            .setDepth(-1000);

        // 2. Chunk Grid Overlay (World Space)
        this.createGridTexture('chunk-texture', V1.chunkSize * V1.tileSizePx, 0x00000000, 0x3a3a4a, 2);
        this.add.tileSprite(
            worldWidth / 2,
            worldHeight / 2,
            worldWidth,
            worldHeight,
            'chunk-texture'
        )
            .setOrigin(0.5, 0.5)
            .setScrollFactor(1)
            .setDepth(-999)
            .setAlpha(0.2);

        // Resize handler (UI only, background is static world object now)
        this.scale.on('resize', this.resizeUI, this);

        // MAP BOUNDARY (World Object - Stays in World)
        const border = this.add.graphics();
        const t = this.BORDER_THICKNESS;
        border.lineStyle(t, 0xff0000, 1);

        // Draw INSIDE the world so stroke never sits outside the edge.
        border.strokeRect(t / 2, t / 2, worldWidth - t, worldHeight - t);
        border.setDepth(10);
        border.setDepth(10);

        // Force UI resize to set initial dimensions for Overlay
        this.resizeUI(this.scale.gameSize);
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

    resizeUI(gameSize: Phaser.Structs.Size) {
        const width = gameSize.width;
        const height = gameSize.height;

        // Keep UI overlays centered and sized
        if (this.dayNightOverlay) {
            this.dayNightOverlay.setPosition(width / 2, height / 2);
            this.dayNightOverlay.setSize(width, height);
        }

        // Reposition Minimap
        if (this.minimapContainer) {
            this.minimapContainer.setPosition(
                width - this.MINIMAP_SIZE - this.MINIMAP_MARGIN,
                this.MINIMAP_MARGIN
            );
        }
    }

    update(time: number, _delta: number) {
        const cam = this.cameras.main;
        const zoom = cam.zoom;
        const width = this.scale.width;
        const height = this.scale.height;

        // Update Minimap
        this.updateMinimap(time);

        // P0: Update Debug Overlay
        this.updateDebugOverlay();

        // V1.1 Camera Fly Request
        const store = useGameStore.getState();
        if (store.cameraFlyTo) {
            this.cameras.main.centerOn(store.cameraFlyTo.x, store.cameraFlyTo.y);
            if (this.cameras.main.zoom < 0.8) {
                this.cameras.main.setZoom(1);
            }
            store.setCameraFlyTo(null);
            this.updateWorkerCamera();
        }

        // V1.1 Follow Mode
        if (store.followingEntityId && !store.cameraFlyTo) {
            const entitySprite = this.entitySprites.get(store.followingEntityId);
            if (entitySprite && entitySprite.visible) {
                this.cameras.main.startFollow(entitySprite, true, 0.1, 0.1);
            } else {
                this.cameras.main.stopFollow();
                store.setFollowingEntityId(null);
            }
        } else if (!store.followingEntityId) {
            // Unfollow: stop camera from following when followingEntityId is null
            this.cameras.main.stopFollow();
        }

        // Update Day/Night Overlay
        // Overlay IS Screen Space (should not zoom texture? just flat color).
        // Rectangle with ScrollFactor 0 and Zoom 2x => Rectangle appears 2x bigger.
        // We want it to cover screen.
        // Overlay Size = ScreenWidth / Zoom.
        // Overlay Size = ScreenWidth / Zoom.
        const stats = useGameStore.getState().stats;
        if (stats && this.dayNightOverlay) {
            // TODO: Night mode temporarily disabled by user request. 
            // Uncomment logic below to re-enable day/night cycle visualization.

            // const time = stats.timeOfDay || 0;
            // const rad = (time - 0.25) * Math.PI * 2;
            // const intensity = (1 - Math.cos(rad)) / 2;
            // this.dayNightOverlay.setAlpha(intensity * 0.7);

            this.dayNightOverlay.setAlpha(0); // Force Day Mode

            // --- KEYBOARD PANNING ---
            if (this.cursors) {
                const speed = 20 / zoom; // Constant screen speed -> World speed adjusts with zoom
                if (this.cursors.left.isDown) {
                    cam.scrollX -= speed;
                    this.updateWorkerCamera();
                } else if (this.cursors.right.isDown) {
                    cam.scrollX += speed;
                    this.updateWorkerCamera();
                }

                if (this.cursors.up.isDown) {
                    cam.scrollY -= speed;
                    this.updateWorkerCamera();
                } else if (this.cursors.down.isDown) {
                    cam.scrollY += speed;
                    this.updateWorkerCamera();
                }
            }

            this.dayNightOverlay.setSize(width / zoom, height / zoom);
        }
    }

    setupCameraControls() {
        // Initialize Cursor Keys
        this.cursors = this.input.keyboard!.createCursorKeys();

        // ZOOM - Keyboard Hotkeys
        this.input.keyboard!.on('keydown-MINUS', () => {
            this.stepZoom(-1, this.scale.width / 2, this.scale.height / 2);
        });
        this.input.keyboard!.on('keydown-PLUS', () => { // Numpad +
            this.stepZoom(1, this.scale.width / 2, this.scale.height / 2);
        });
        this.input.keyboard!.on('keydown-EQUALS', () => { // Standard =/+ key
            this.stepZoom(1, this.scale.width / 2, this.scale.height / 2);
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isDragging && pointer.isDown) {
                // Use screen delta for stable dragging
                const screenDx = pointer.position.x - this.dragStart.x;
                const screenDy = pointer.position.y - this.dragStart.y;

                // Adjust for zoom to get world delta
                const worldDx = screenDx / this.cameras.main.zoom;
                const worldDy = screenDy / this.cameras.main.zoom;

                // Set new scroll - Phaser's setBounds() handles clamping automatically!
                const cam = this.cameras.main;
                cam.scrollX = this.cameraStart.x - worldDx;
                cam.scrollY = this.cameraStart.y - worldDy;

                // Throttle worker updates for LOD
                if (this.game.loop.frame % 30 === 0) {
                    this.updateWorkerCamera();
                }
            }
        });

        // ZOOM - Simple approach: zoom around screen center
        this.input.on('wheel', (pointer: Phaser.Input.Pointer, _: unknown, __: unknown, deltaY: number) => {
            const direction = deltaY > 0 ? -1 : 1;
            this.stepZoom(direction, pointer.x, pointer.y);
        });
    }

    // ============================================
    // P0 DEBUG OVERLAY - Zone Visualization
    // ============================================

    private setupDebugOverlay() {
        // Create graphics object for drawing zones (world space)
        this.debugZoneGraphics = this.add.graphics();
        this.debugZoneGraphics.setDepth(15000);
        this.debugZoneGraphics.setVisible(false);

        // Create text for species counts (screen space)
        this.debugCountsText = this.add.text(10, 50, '', {
            fontSize: '14px',
            fontFamily: 'monospace',
            color: '#00ff00',
            backgroundColor: '#000000aa',
            padding: { x: 8, y: 8 },
        });
        this.debugCountsText.setScrollFactor(0);
        this.debugCountsText.setDepth(20001);
        this.debugCountsText.setVisible(false);

        // Main camera should ignore the text (it's UI)
        this.cameras.main.ignore(this.debugCountsText);

        // Shift+Z to toggle
        this.input.keyboard!.on('keydown-Z', (event: KeyboardEvent) => {
            if (event.shiftKey) {
                this.debugOverlayEnabled = !this.debugOverlayEnabled;
                this.debugZoneGraphics.setVisible(this.debugOverlayEnabled);
                this.debugCountsText.setVisible(this.debugOverlayEnabled);
                console.log(`🔧 Debug Overlay: ${this.debugOverlayEnabled ? 'ON' : 'OFF'}`);
            }
        });

        // Shift+A to Reset World (with confirmation)
        this.input.keyboard!.on('keydown-A', (event: KeyboardEvent) => {
            if (event.shiftKey) {
                const confirmed = window.confirm('⚠️ RESET WORLD? This will clear all entities and sync to a fresh state.');
                if (confirmed) {
                    console.log('🔄 Requesting World Reset...');

                    // Call API to reset backend
                    import('../../app/api/ServerClient').then(({ ServerClient }) => {
                        ServerClient.getInstance().resetWorld().then(res => {
                            if (res.ok) {
                                console.log('✅ World Reset Successful');
                                // Force reload to get fresh state
                                window.location.reload();
                            } else {
                                console.error('❌ Reset Failed:', res.error);
                                alert('Reset Failed: ' + res.error);
                            }
                        });
                    });
                }
            }
        });
    }

    private updateDebugOverlay() {
        if (!this.debugOverlayEnabled) return;

        const cam = this.cameras.main;
        const centerX = cam.midPoint.x;
        const centerY = cam.midPoint.y;
        const activeRadiusPx = V1.activeZoneRadiusTiles * V1.tileSizePx;

        // Clear previous frame
        this.debugZoneGraphics.clear();

        // Draw Active Zone (green circle)
        this.debugZoneGraphics.lineStyle(3, 0x00ff00, 0.8);
        this.debugZoneGraphics.strokeCircle(centerX, centerY, activeRadiusPx);

        // Draw Spawn Ring (60%-100% of active zone - where animals spawn)
        const ringMinRadius = activeRadiusPx * 0.6;
        this.debugZoneGraphics.lineStyle(2, 0xffff00, 0.5);
        this.debugZoneGraphics.strokeCircle(centerX, centerY, ringMinRadius);

        // Draw small + at center
        this.debugZoneGraphics.lineStyle(2, 0x00ff00, 1);
        this.debugZoneGraphics.lineBetween(centerX - 10, centerY, centerX + 10, centerY);
        this.debugZoneGraphics.lineBetween(centerX, centerY - 10, centerX, centerY + 10);

        // Draw spawn point markers (fade out over time)
        const now = Date.now();
        this.spawnPointMarkers = this.spawnPointMarkers.filter(m => now - m.time < this.SPAWN_MARKER_DURATION);
        for (const marker of this.spawnPointMarkers) {
            const age = now - marker.time;
            const alpha = 1 - (age / this.SPAWN_MARKER_DURATION);
            this.debugZoneGraphics.fillStyle(0xff6600, alpha);
            this.debugZoneGraphics.fillCircle(marker.x, marker.y, 8);
        }

        // Update species count text
        const stats = useGameStore.getState().stats;
        if (stats) {
            const lines = [
                '🔧 DEBUG OVERLAY (Shift+Z to hide)',
                '─'.repeat(30),
                `📍 Camera: (${Math.floor(centerX)}, ${Math.floor(centerY)})`,
                `🔍 Zoom: ${cam.zoom.toFixed(2)}x`,
                `🟢 Active Zone: ${V1.activeZoneRadiusTiles} tiles`,
                '─'.repeat(30),
                `🐭 Rats: ${stats.rat ?? 0}`,
                `🐱 Cats: ${stats.cat ?? 0}`,
                `🐔 Chickens: ${stats.chicken ?? 0}`,
                `🐦 Birds: ${stats.smallBird ?? 0}`,
                `🦝 Raccoons: ${stats.raccoon ?? 0}`,
                `🐦‍⬛ Crows: ${stats.crow ?? 0}`,
                `🐕 Dogs: ${stats.dog ?? 0}`,
            ];
            this.debugCountsText.setText(lines.join('\n'));
        }
    }

    // Helper to add spawn markers (called from sync if we detect new spawns)
    public addSpawnMarker(x: number, y: number) {
        this.spawnPointMarkers.push({ x, y, time: Date.now() });
    }

    // ---- ZOOM HELPERS (SIMPLIFIED) ----
    private readonly ZOOM_MIN = 1;   // Don't zoom out past 1x
    private readonly ZOOM_MAX = 4;
    private readonly ZOOM_LEVELS = [1, 2, 3, 4]; // Simple fixed levels

    private getWorldSizePx() {
        return {
            worldWidth: V1.defaultMapWidth * V1.tileSizePx,
            worldHeight: V1.defaultMapHeight * V1.tileSizePx,
        };
    }

    /**
     * Compute the minimum zoom that prevents showing void outside the world.
     * minZoom = max(viewportW/worldW, viewportH/worldH)
     */
    private getMinZoom(): number {
        const { worldWidth, worldHeight } = this.getWorldSizePx();
        const minZoomX = this.scale.width / worldWidth;
        const minZoomY = this.scale.height / worldHeight;
        // Use Math.max so viewport never exceeds world (no void)
        return Math.max(minZoomX, minZoomY, this.ZOOM_MIN);
    }

    private getZoomLevels(): number[] {
        const minZoom = this.getMinZoom();
        // Only include levels >= minZoom (no void)
        return this.ZOOM_LEVELS.filter(z => z >= minZoom);
    }

    // Apply zoom anchored to a screen point (mouse position)
    private applyZoom(newZoom: number, screenAnchorX?: number, screenAnchorY?: number) {
        const cam = this.cameras.main;
        const minZoom = this.getMinZoom();
        const targetZoom = Phaser.Math.Clamp(newZoom, minZoom, this.ZOOM_MAX);

        if (Math.abs(targetZoom - cam.zoom) < 1e-6) return;

        // Default to center of screen if no anchor
        const sx = screenAnchorX ?? (cam.width / 2);
        const sy = screenAnchorY ?? (cam.height / 2);

        // Get world point BEFORE zoom
        const worldBefore = cam.getWorldPoint(sx, sy);

        // Apply zoom
        cam.setZoom(targetZoom);

        // Get world point AFTER zoom (shifted due to zoom change)
        const worldAfter = cam.getWorldPoint(sx, sy);

        // Adjust scroll to keep anchor point stable
        cam.scrollX += worldBefore.x - worldAfter.x;
        cam.scrollY += worldBefore.y - worldAfter.y;

        // Phaser's setBounds() handles clamping automatically!
        this.updateWorkerCamera();
    }

    private stepZoom(direction: 1 | -1, screenAnchorX?: number, screenAnchorY?: number) {
        const cam = this.cameras.main;
        const levels = this.getZoomLevels();

        let idx = 0;
        let best = Infinity;

        for (let i = 0; i < levels.length; i++) {
            const d = Math.abs(levels[i] - cam.zoom);
            if (d < best) { best = d; idx = i; }
        }

        const newIdx = Phaser.Math.Clamp(idx + direction, 0, levels.length - 1);
        this.applyZoom(levels[newIdx], screenAnchorX, screenAnchorY);
    }

    updateWorkerCamera() {
        const worker = getSimWorker();
        const cam = this.cameras.main;

        // Calculate World ViewRect
        // WorldView = { x, y, width, height } in pixels
        // Convert to TileRect
        const worldView = cam.worldView;

        const leftTx = Math.floor(worldView.x / V1.tileSizePx);
        const topTy = Math.floor(worldView.y / V1.tileSizePx);
        const rightTx = Math.ceil((worldView.x + worldView.width) / V1.tileSizePx);
        const bottomTy = Math.ceil((worldView.y + worldView.height) / V1.tileSizePx);

        // Clamp to Map Bounds (0..255)
        const viewRectTiles = {
            leftTx: Phaser.Math.Clamp(leftTx, 0, V1.defaultMapWidth - 1),
            topTy: Phaser.Math.Clamp(topTy, 0, V1.defaultMapHeight - 1),
            rightTx: Phaser.Math.Clamp(rightTx, 0, V1.defaultMapWidth),
            bottomTy: Phaser.Math.Clamp(bottomTy, 0, V1.defaultMapHeight)
        };

        worker?.postMessage({
            type: 'UPDATE_CAMERA',
            payload: {
                centerX: cam.midPoint.x,
                centerY: cam.midPoint.y,
                zoom: cam.zoom,
                viewRectTiles: viewRectTiles,
            }
        });
    }

    handlePointerDown(pointer: Phaser.Input.Pointer) {
        // --- MINIMAP INTERACTION START ---
        if (this.minimapContainer) {
            // Use pointer.x/y as they are transformed by the camera (uiCamera is 1:1)
            const x = pointer.x;
            const y = pointer.y;
            const mx = this.minimapContainer.x;
            const my = this.minimapContainer.y;

            if (x >= mx && x <= mx + this.MINIMAP_SIZE &&
                y >= my && y <= my + this.MINIMAP_SIZE) {

                // Removed Zoom Button Logic

                this.isMinimapDragging = true;
                this.handleMinimapClick(pointer);
                return; // BLOCK World Tools
            }
        }
        // --- MINIMAP INTERACTION END ---

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
                        } else {
                            // Entity no longer exists on server (died/despawned)
                            console.log(`Entity ${clickedId} no longer exists on server`);
                            store.setSelectedEntityId(null);
                            store.setSelectedEntityDetail(null);
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
            this.dragStart = { x: pointer.position.x, y: pointer.position.y }; // Use Screen Space
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
        this.isMinimapDragging = false;
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

        const names = {
            cat: ['Kitty', 'Tiger', 'Luna', 'Shadow', 'Simba', 'Oreo'],
            rat: ['Squeak', 'Jerry', 'Pip', 'Ratty', 'Cheese', 'Scabbers'],
            chicken: ['Henny', 'Penny', 'Cluck', 'Nugget', 'Feathers', 'Peck'],
            smallBird: ['Tweety', 'Chirp', 'Sky', 'Blue', 'Robin', 'Pip'],
            raccoon: ['Bandit', 'Rocket', 'Sly', 'Meeko', 'Rascal'],
            crow: ['Edgar', 'Poe', 'Odin', 'Raven', 'Shadow'],
            dog: ['Buddy', 'Rex', 'Spot', 'Max', 'Bella', 'Charlie'],
            fox: ['Foxy', 'Rusty', 'Vixey', 'Swift', 'Red'],
            hawk: ['Sky', 'Talon', 'Soar', 'Hunter', 'Swift'],
            wolf: ['Alpha', 'Fang', 'Luna', 'Ghost', 'Shadow'],
            snake: ['Sly', 'Hiss', 'Nagini', 'Ka', 'Fang'],
        };
        const nameList = names[store.spawnSpecies] || ['Unknown'];
        // Use custom name if provided, otherwise generate random one
        const nameToUse = store.spawnName.trim() || (nameList[Math.floor(Math.random() * nameList.length)] + Math.floor(Math.random() * 99));

        // Server Mode Support (V1.3)
        if (store.useServer) {
            const res = await ServerClient.getInstance().spawnAnimal(store.spawnSpecies, pos.x, pos.y, nameToUse);
            if (!res.ok) {
                console.warn('Server Spawn Failed:', res.error);
                // Refund GP? Technically state update makes it tricky.
                // ideally we only spend if valid.
            }
            // Clear custom name after use (optional UX choice, usually good to clear)
            if (store.spawnName) store.setSpawnName('');
            return;
        }

        const worker = getSimWorker();

        // Convert to Tile Coordinates
        const tilePos = {
            tx: Math.floor(pos.x / V1.tileSizePx),
            ty: Math.floor(pos.y / V1.tileSizePx)
        };

        worker?.postMessage({
            type: 'SPAWN_ENTITY',
            payload: {
                species: store.spawnSpecies,
                name: nameToUse,
                personality: store.spawnPersonality,
                pos: tilePos,
            },
        });

        // Clear custom name after use
        if (store.spawnName) store.setSpawnName('');
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

    private syncAnimals(entities: SnapshotEntity[]) {
        if (!entities) return;

        // DEBUG: Trace sync
        if (entities.length > 0 && Math.random() < 0.05) {
            // console.log(`[WorldScene] Syncing ${entities.length} entities. Sample:`, entities[0]);
        }

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
                    const species = entity.species;
                    // Mapping species ID to animation prefix if needed
                    // smallBird -> bird
                    const animPrefix = species === 'smallBird' ? 'bird' : species;

                    let animKey = `${animPrefix}-idle`;

                    // basic mapping
                    switch (entity.state) {
                        case 'idle': animKey = `${animPrefix}-idle`; break;
                        case 'wander':
                        case 'moveTo':
                            animKey = `${animPrefix}-move`;
                            break;
                        case 'chase':
                        case 'flee':
                            animKey = `${animPrefix}-run`;
                            break;
                        case 'eat':
                        case 'drink':
                        case 'peck': // V4
                            animKey = `${animPrefix}-eat`;
                            break;
                        case 'perch': // V4
                            // Use perch anim for birds, else idle
                            animKey = species === 'smallBird' ? 'bird-perch' : `${animPrefix}-idle`;
                            break;
                        case 'hop': // V4
                            animKey = `${animPrefix}-move`;
                            break;
                        case 'attack': animKey = `${animPrefix}-attack`; break;
                        case 'sleep': animKey = `${animPrefix}-sleep`; break;
                        case 'dead': animKey = `${animPrefix}-dead`; break;
                    }

                    // Only play if different to avoid restarting loop
                    if (sprite.anims.currentAnim?.key !== animKey) {
                        // Check if animation exists to avoid warnings
                        if (this.anims.exists(animKey)) {
                            sprite.play(animKey);
                        } else {
                            // Fallback to idle
                            sprite.play(`${animPrefix}-idle`, true);
                        }
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

        // Sprite - use species-specific initial texture
        let initialTexture = 'rat_idle';
        // Now all assets are standardized to 64x64 source
        // Target display size: 32x32px -> Scale 0.5
        let scale = 0.5;

        // Map species to initial texture
        if (entity.species === 'rat') initialTexture = 'rat_idle';
        else if (entity.species === 'cat') initialTexture = 'cat_idle';
        else if (entity.species === 'chicken') initialTexture = 'chicken_idle';
        else if (entity.species === 'smallBird') { initialTexture = 'bird_idle'; scale = 0.35; } // Birds slightly smaller
        else if (entity.species === 'raccoon') initialTexture = 'raccoon_idle';
        else if (entity.species === 'crow') { initialTexture = 'crow_idle'; scale = 0.4; } // Crow slightly smaller
        else if (entity.species === 'fox') initialTexture = 'fox_idle';
        else if (entity.species === 'dog') initialTexture = 'dog_idle';
        else if (entity.species === 'hawk') initialTexture = 'hawk_idle';
        else if (entity.species === 'wolf') initialTexture = 'wolf_idle';
        else if (entity.species === 'snake') initialTexture = 'snake_idle';

        const sprite = this.add.sprite(0, 0, initialTexture);
        sprite.setName('sprite');
        sprite.setScale(scale);

        // Initial animation
        const animPrefix = entity.species === 'smallBird' ? 'bird' : entity.species;
        sprite.play(`${animPrefix}-idle`);
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
        */

        if (this.uiCamera) this.uiCamera.ignore(container);

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

        // Use individual texture keys
        let textureKey = 'bush';
        switch (obj.type) {
            case 'water': textureKey = 'water'; break;
            case 'bush': textureKey = 'bush'; break;
            case 'trash': textureKey = 'trash'; break;
            case 'perch': textureKey = 'perch'; break;
            default: textureKey = 'bush'; break;
        }

        const sprite = this.add.image(0, 0, textureKey);
        // Target display size: 32px (matching standard entity size)
        // Original assets are likely large (e.g. ~200px+), so we scale dynamically
        const targetSize = 32;
        const scale = targetSize / sprite.width;
        sprite.setScale(scale);
        container.add(sprite);

        // Background layer
        container.setDepth(-100);

        if (this.uiCamera) this.uiCamera.ignore(container);

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
            if (this.uiCamera) this.uiCamera.ignore(this.debugGraphics);
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
                    if (this.uiCamera) this.uiCamera.ignore(this.debugGraphics);
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

    // ============================================
    // MINIMAP IMPL (V1)
    // ============================================

    createMinimap() {
        if (!this.scale) return; // Guard against early call
        const x = this.scale.width - this.MINIMAP_SIZE - this.MINIMAP_MARGIN;
        const y = this.MINIMAP_MARGIN;

        this.minimapContainer = this.add.container(x, y).setScrollFactor(0).setDepth(30000);

        // 1. Background
        this.minimapBg = this.add.rectangle(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x000000, 0.6)
            .setOrigin(0, 0)
            .setInteractive(); // Blocks input if handled correctly, but we handle in Scene PointerDown

        // 2. Border
        const border = this.add.rectangle(0, 0, this.MINIMAP_SIZE, this.MINIMAP_SIZE, 0x000000, 0)
            .setStrokeStyle(2, 0x444444)
            .setOrigin(0, 0);

        // 3. Graphics Layer (Content)
        this.minimapGraphics = this.add.graphics();

        // 4. Coords Text (Bottom Right)
        this.minimapCoords = this.add.text(this.MINIMAP_SIZE - 6, this.MINIMAP_SIZE - 6, '0,0', {
            fontSize: '11px',
            color: '#dddddd',
            fontFamily: 'monospace'
        }).setOrigin(1, 1);

        // 5. Zoom Buttons (Top Left) - REMOVED

        this.minimapContainer.add([this.minimapBg, this.minimapGraphics, border, this.minimapCoords]);

        // Drag Handler
        this.input.on('pointermove', this.handleMinimapDrag, this);
    }

    updateMinimap(time: number) {
        // Guard if minimap not ready
        if (!this.minimapGraphics) return;

        if (time - this.lastMinimapUpdate < this.MINIMAP_REFRESH_RATE) return;
        this.lastMinimapUpdate = time;

        const g = this.minimapGraphics;
        g.clear();

        // Constants
        const worldW = V1.defaultMapWidth * V1.tileSizePx;
        const worldH = V1.defaultMapHeight * V1.tileSizePx;
        const scaleX = this.MINIMAP_SIZE / worldW;
        const scaleY = this.MINIMAP_SIZE / worldH;

        // Helper: World -> Minimap
        const toMini = (wx: number, wy: number) => ({
            x: wx * scaleX,
            y: wy * scaleY
        });

        // 1. Draw Entities (White dots)
        g.fillStyle(0xffffff, 1);
        const entities = useGameStore.getState().entities;
        for (const e of entities) {
            // Optimization: Skip if off-world (shouldn't happen but safe)
            if (e.x < 0 || e.x > worldW) continue;
            const p = toMini(e.x, e.y);
            g.fillRect(p.x, p.y, 2, 2);
        }

        // 2. Draw Objects (Gray dots)
        g.fillStyle(0xaaaaaa, 0.8);
        const objects = useGameStore.getState().objects;
        for (const o of objects) {
            const wx = o.pos.tx * V1.tileSizePx;
            const wy = o.pos.ty * V1.tileSizePx;
            const p = toMini(wx, wy);
            g.fillRect(p.x, p.y, 2, 2);
        }

        // 3. Viewport Rect
        const cam = this.cameras.main;
        // worldView is correct rect
        const vw = cam.worldView;

        const vPos = toMini(vw.x, vw.y);
        const vSize = { w: vw.width * scaleX, h: vw.height * scaleY };

        g.lineStyle(1, 0xffffff, 1);
        g.strokeRect(vPos.x, vPos.y, vSize.w, vSize.h);

        // 4. Update Coords (Tile X,Y)
        const cx = Math.floor(cam.midPoint.x / V1.tileSizePx);
        const cy = Math.floor(cam.midPoint.y / V1.tileSizePx);
        this.minimapCoords.setText(`${cx},${cy}`);
    }

    handleMinimapClick(pointer: Phaser.Input.Pointer) {
        // Local x/y within container (Using Screen Coords)
        const localX = pointer.position.x - this.minimapContainer.x;
        const localY = pointer.position.y - this.minimapContainer.y;

        this.moveCameraToMinimapPos(localX, localY);
        this.showClickFeedback(localX, localY);
    }

    handleMinimapDrag(pointer: Phaser.Input.Pointer) {
        if (!this.isMinimapDragging || !pointer.isDown) return;

        const localX = pointer.position.x - this.minimapContainer.x;
        const localY = pointer.position.y - this.minimapContainer.y;

        // Clamp to minimap area
        const clampedX = Phaser.Math.Clamp(localX, 0, this.MINIMAP_SIZE);
        const clampedY = Phaser.Math.Clamp(localY, 0, this.MINIMAP_SIZE);

        this.moveCameraToMinimapPos(clampedX, clampedY);
    }

    moveCameraToMinimapPos(mx: number, my: number) {
        const worldW = V1.defaultMapWidth * V1.tileSizePx;
        const worldH = V1.defaultMapHeight * V1.tileSizePx;

        const scaleX = worldW / this.MINIMAP_SIZE;
        const scaleY = worldH / this.MINIMAP_SIZE;

        const targetX = mx * scaleX;
        const targetY = my * scaleY;

        this.cameras.main.centerOn(targetX, targetY);

        // Ensure bounds logic if centerOn doesn't clamp automatically (it does partly but let's be safe)
        // this.cameras.main.setBounds(...) already set in create.

        // Trigger updates
        this.updateWorkerCamera();
    }

    showClickFeedback(mx: number, my: number) {
        const ring = this.add.graphics();
        this.minimapContainer.add(ring);

        ring.lineStyle(2, 0xffff00, 1);
        ring.strokeCircle(0, 0, 10);
        ring.setPosition(mx, my);

        this.tweens.add({
            targets: ring,
            scale: 2,
            alpha: 0,
            duration: 500,
            onComplete: () => {
                ring.destroy();
            }
        });

        // Debug Log
        console.log(`Minimap Jump: ${mx.toFixed(1)}, ${my.toFixed(1)}`);
    }
}
