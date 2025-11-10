export interface UpgradeDefinition {
    upgradeId: string;
    name: string;
    description: string;
    baseCost: number;
    costScale: number;
    effectPerLevel: number;
    icon?: string;
}

export const UPGRADE_DEFINITIONS: UpgradeDefinition[] = [
    {
        upgradeId: 'drag_planting',
        name: 'Bulk Planting',
        description: 'Enables click-drag to plant multiple seeds.',
        baseCost: 20,
        costScale: 1.3,
        effectPerLevel: 1,
        icon: '🌱'
    },
    {
        upgradeId: 'drag_building',
        name: 'Bulk Building',
        description: 'Enables click-drag to place multiple soil tiles.',
        baseCost: 20,
        costScale: 1.3,
        effectPerLevel: 1,
        icon: '🧱'
    },
    {
        upgradeId: 'drag_harvesting',
        name: 'Bulk Harvesting',
        description: 'Enables click-drag to collect multiple fruits.',
        baseCost: 20,
        costScale: 1.3,
        effectPerLevel: 1,
        icon: '🍓'
    },
    {
        upgradeId: 'water_capacity',
        name: 'Reservoir Level',
        description: 'Increases water bar size.',
        baseCost: 25,
        costScale: 1.25,
        effectPerLevel: 0.2,
        icon: '💧'
    },
    {
        upgradeId: 'water_speed',
        name: 'Faster Watering',
        description: 'Reduces watering time per plant.',
        baseCost: 30,
        costScale: 1.3,
        effectPerLevel: 0.9,
        icon: '⚡'
    },
    {
        upgradeId: 'water_aoe',
        name: 'Water Range',
        description: 'Increases watering radius.',
        baseCost: 35,
        costScale: 1.35,
        effectPerLevel: 0.5,
        icon: '🌊'
    }
];

export function calculateUpgradeCost(baseCost: number, costScale: number, currentLevel: number): number {
    return Math.round(baseCost * Math.pow(costScale, currentLevel));
}

