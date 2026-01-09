// ============================================
// V1 世界对象配置
// ============================================

import type { ObjectId, TilePos, WorldObject, ObjectType } from '../../shared/types';

// ============================================
// ID 生成器
// ============================================

const mkId = (prefix: string, n: number): ObjectId => `${prefix}_${n}`;

// ============================================
// 可放置对象模板
// ============================================

export type PlaceableTemplate = {
    type: ObjectType;
    label: string;              // UI 显示用
    footprint: { w: number; h: number };    // V1 用单格
    defaultData?: WorldObject['data'];
};

export const PLACEABLE_TEMPLATES: Record<ObjectType, PlaceableTemplate> = {
    water: {
        type: 'water',
        label: 'Water Source',
        footprint: { w: 1, h: 1 },
    },
    bush: {
        type: 'bush',
        label: 'Bush (Cover)',
        footprint: { w: 1, h: 1 },
        defaultData: { strength01: 0.8 },
    },
    trash: {
        type: 'trash',
        label: 'Trash Pile (Food/Spawn)',
        footprint: { w: 1, h: 1 },
        defaultData: { regenRate: 1 },
    },
    perch: {
        type: 'perch',
        label: 'Perch (Bird Rest)',
        footprint: { w: 1, h: 1 },
        defaultData: { strength01: 1.0 },
    },
};

// ============================================
// 每张地图的默认对象
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

    // 默认地图
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
// 对象交互配置
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
        maxResources: 0,            // 灌木没有资源
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
// 工厂函数
// ============================================

let objectIdCounter = 0;

/**
 * 创建放置对象
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
 * 获取地图默认对象列表
 */
export function getDefaultObjectsForMap(mapId: string): WorldObject[] {
    const objects = DEFAULT_OBJECTS_BY_MAP[mapId] ?? DEFAULT_OBJECTS_BY_MAP.default;
    // 返回深拷贝
    return objects.map(obj => ({
        ...obj,
        data: obj.data ? { ...obj.data } : undefined,
    }));
}

/**
 * 重置对象 ID 计数器
 */
export function resetObjectIdCounter(value: number = 0): void {
    objectIdCounter = value;
}
