// ============================================
// V1 World Object Configuration
// ============================================

import type { ObjectId, TilePos, WorldObject, ObjectType } from '../../shared/types';

// ============================================
// ID Generator
// ============================================

const mkId = (prefix: string, n: number): ObjectId => `${prefix}_${n}`;

// ============================================
// Placeable Object Templates
// ============================================

export type PlaceableTemplate = {
    type: ObjectType;
    label: string;              // For UI display
    footprint: { w: number; h: number };    // V1 uses single grid
    defaultData?: WorldObject['data'];
};

export const PLACEABLE_TEMPLATES: Record<ObjectType, PlaceableTemplate> = {
    water: {
        type: 'water',
        label: 'Water Source',
        footprint: { w: 2, h: 2 },
    },
    bush: {
        type: 'bush',
        label: 'Bush (Cover)',
        footprint: { w: 2, h: 2 },
        defaultData: { strength01: 0.8 },
    },
    trash: {
        type: 'trash',
        label: 'Trash Pile (Food/Spawn)',
        footprint: { w: 2, h: 2 },
        defaultData: { regenRate: 1 },
    },
    perch: {
        type: 'perch',
        label: 'Perch Point (Bird Rest)',
        footprint: { w: 2, h: 2 },
        defaultData: { strength01: 1.0 },
    },
};

// ============================================
// Default Objects Per Map
// ============================================

export const DEFAULT_OBJECTS_BY_MAP: Record<string, WorldObject[]> = {
    garden_v1: [
        { id: mkId('obj_water', 1), type: 'water', pos: { tx: 40, ty: 22 } },
        { id: mkId('obj_trash', 1), type: 'trash', pos: { tx: 12, ty: 58 } },
        {
            id: mkId('obj_bush', 1),
            type: 'bush',
            pos: { tx: 16, ty: 55 },
            data: { strength01: 0.85 },
        },
        {
            id: mkId('obj_bush', 2),
            type: 'bush',
            pos: { tx: 18, ty: 53 },
            data: { strength01: 0.75 },
        },
    ],

    // Default Map
    default: [
        { id: mkId('obj_water', 1), type: 'water', pos: { tx: 50, ty: 50 } },
        { id: mkId('obj_trash', 1), type: 'trash', pos: { tx: 30, ty: 30 } },
        { id: mkId('obj_trash', 2), type: 'trash', pos: { tx: 70, ty: 70 } },
        {
            id: mkId('obj_bush', 1),
            type: 'bush',
            pos: { tx: 40, ty: 60 },
            data: { strength01: 0.8 },
        },
        {
            id: mkId('obj_bush', 2),
            type: 'bush',
            pos: { tx: 60, ty: 40 },
            data: { strength01: 0.8 },
        },
    ],
};

// ============================================
// Object Interaction Configuration
// ============================================

export type ObjectInteractConfig = {
    type: ObjectType;
    maxResources: number;
    regenRatePerTick: number;
    interactRangeTiles: number;
    strengthDefault: number;
};

export const OBJECT_CONFIGS: Record<ObjectType, ObjectInteractConfig> = {
    water: {
        type: 'water',
        maxResources: 100,
        regenRatePerTick: 0.5,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
    },
    bush: {
        type: 'bush',
        maxResources: 0,            // Bushes have no resources
        regenRatePerTick: 0,
        interactRangeTiles: 2.0,
        strengthDefault: 0.8,
    },
    trash: {
        type: 'trash',
        maxResources: 80,
        regenRatePerTick: 0.2,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
    },
    perch: {
        type: 'perch',
        maxResources: 0,
        regenRatePerTick: 0,
        interactRangeTiles: 1.5,
        strengthDefault: 1.0,
    },
};

// ============================================
// Factory Functions
// ============================================

let objectIdCounter = 0;

/**
 * Create object for placement
 */
export function createObjectForPlacement(
    type: ObjectType,
    pos: TilePos,
    nextIdNumber?: number
): WorldObject {
    const id = nextIdNumber ?? ++objectIdCounter;
    const tpl = PLACEABLE_TEMPLATES[type];

    return {
        id: mkId(`obj_${type}`, id),
        type: tpl.type,
        pos,
        data: tpl.defaultData ? { ...tpl.defaultData } : undefined,
    };
}

/**
 * Get default object list for map
 */
export function getDefaultObjectsForMap(mapId: string): WorldObject[] {
    const objects = DEFAULT_OBJECTS_BY_MAP[mapId] ?? DEFAULT_OBJECTS_BY_MAP.default;
    // Return deep copy
    return objects.map(obj => ({
        ...obj,
        data: obj.data ? { ...obj.data } : undefined,
    }));
}

/**
 * Reset object ID counter
 */
export function resetObjectIdCounter(value: number = 0): void {
    objectIdCounter = value;
}
