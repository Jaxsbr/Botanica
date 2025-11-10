export enum GrowthPhase {
    Seedling = 'Seedling',
    Sproutspire = 'Sproutspire',
    VerdantCrown = 'VerdantCrown',
    Bloomflare = 'Bloomflare',
    Fruitburst = 'Fruitburst'
}

export interface PlantDefinition {
    id: string;
    displayName: string;
    growthDurationsMs: Record<GrowthPhase, number>;
    fruitYield: number;
    seedYield: number;
}

export interface PlantState {
    id: string;
    definitionId: string;
    plantedAt: number;
    currentPhase: GrowthPhase;
    phaseStartedAt: number;
    tileId: string;
    waterLevel: number;
    isFullyWatered: boolean;
    lastWateredAt: number;
    lastWaterLevelUpdate: number;
}

export interface GridPosition {
    x: number;
    z: number;
}

export interface SoilTile {
    id: string;
    gridPosition: GridPosition;
    occupiedByPlantId: string | null;
}

export interface Inventory {
    fruit: number;
    seeds: Record<string, number>;
}

export interface GameState {
    tiles: Map<string, SoilTile>;
    plants: Map<string, PlantState>;
    inventory: Inventory;
    selectedSeedId: string | null;
    upgrades: Record<string, number>;
}

export interface ShopItem {
    id: string;
    name: string;
    costFruit: number;
}

export const TILE_SPACING = 1.5;
