/**
 * PlantStagePresets - Define Plant3D configurations for each lifecycle stage
 *
 * Each plant type has 6 preset configurations (one per LifecycleStage).
 * Used for visual transitions as plants grow.
 */

import type { Plant3DConfig } from '../types';
import { LifecycleStage } from '../systems/PlantLifecycle';

export type StagePresets = Map<LifecycleStage, Plant3DConfig>;

/**
 * Helper to create a config with common defaults
 */
function stageConfig(config: Plant3DConfig): Plant3DConfig {
    return {
        branchLevels: 1,
        growthDirection: 1,
        ...config
    };
}

/**
 * Avocado tree stage presets
 * Grows from tiny sprout to large fruit-bearing tree
 */
export const AVOCADO_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, stageConfig({ trunkHeight: 0.4, branchDensity: 0.1, leafDensity: 0.08, leafSize: 0.06, branchLevels: 1 })],
    [LifecycleStage.SPROUT, stageConfig({ trunkHeight: 0.9, branchDensity: 0.22, leafDensity: 0.18, leafSize: 0.08, branchLevels: 2 })],
    [LifecycleStage.SEEDLING, stageConfig({ trunkHeight: 0.5, branchDensity: 0.035, leafDensity: 0.035, leafSize: 0.11, branchLevels: 1 })],
    [LifecycleStage.YOUNG, stageConfig({ trunkHeight: 2.4, branchDensity: 0.55, leafDensity: 0.55, leafSize: 0.13, branchLevels: 3 })],
    [LifecycleStage.MATURE, stageConfig({ trunkHeight: 3.2, branchDensity: 0.75, leafDensity: 0.75, leafSize: 0.16, branchLevels: 3 })],
    [LifecycleStage.FRUITING, stageConfig({ trunkHeight: 3.4, branchDensity: 0.78, leafDensity: 0.85, leafSize: 0.17, branchLevels: 3 })]
]);

/**
 * Fern stage presets
 * Grows from small fronds to bushy ground cover
 */
export const FERN_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, stageConfig({ trunkHeight: 0.18, branchDensity: 0.28, leafDensity: 0.12, leafSize: 0.04, growthDirection: 0.3, branchLevels: 1 })],
    [LifecycleStage.SPROUT, stageConfig({ trunkHeight: 0.32, branchDensity: 0.42, leafDensity: 0.26, leafSize: 0.05, growthDirection: 0.2, branchLevels: 2 })],
    [LifecycleStage.SEEDLING, stageConfig({ trunkHeight: 0.46, branchDensity: 0.58, leafDensity: 0.42, leafSize: 0.06, growthDirection: 0.1, branchLevels: 2 })],
    [LifecycleStage.YOUNG, stageConfig({ trunkHeight: 0.62, branchDensity: 0.76, leafDensity: 0.64, leafSize: 0.07, growthDirection: 0, branchLevels: 3 })],
    [LifecycleStage.MATURE, stageConfig({ trunkHeight: 0.78, branchDensity: 0.92, leafDensity: 0.82, leafSize: 0.08, growthDirection: -0.05, branchLevels: 3 })],
    [LifecycleStage.FRUITING, stageConfig({ trunkHeight: 0.78, branchDensity: 0.92, leafDensity: 0.82, leafSize: 0.08, growthDirection: -0.05, branchLevels: 3 })]
]);

/**
 * Bush stage presets (fallback for unknown species)
 */
export const BUSH_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, stageConfig({ trunkHeight: 0.3, branchDensity: 0.18, leafDensity: 0.14, leafSize: 0.05, growthDirection: 0.2, branchLevels: 1 })],
    [LifecycleStage.SPROUT, stageConfig({ trunkHeight: 0.6, branchDensity: 0.32, leafDensity: 0.32, leafSize: 0.07, growthDirection: 0.1, branchLevels: 2 })],
    [LifecycleStage.SEEDLING, stageConfig({ trunkHeight: 0.95, branchDensity: 0.48, leafDensity: 0.48, leafSize: 0.09, growthDirection: 0, branchLevels: 2 })],
    [LifecycleStage.YOUNG, stageConfig({ trunkHeight: 1.3, branchDensity: 0.66, leafDensity: 0.66, leafSize: 0.11, growthDirection: -0.05, branchLevels: 3 })],
    [LifecycleStage.MATURE, stageConfig({ trunkHeight: 1.6, branchDensity: 0.82, leafDensity: 0.82, leafSize: 0.13, growthDirection: -0.1, branchLevels: 3 })],
    [LifecycleStage.FRUITING, stageConfig({ trunkHeight: 1.6, branchDensity: 0.82, leafDensity: 0.86, leafSize: 0.14, growthDirection: -0.1, branchLevels: 3 })]
]);

/**
 * Get stage presets for a plant type
 */
export function getStagePresets(plantType: string): StagePresets {
    switch (plantType.toLowerCase()) {
        case 'avocado':
            return AVOCADO_STAGE_PRESETS;
        case 'fern':
            return FERN_STAGE_PRESETS;
        case 'bush':
            return BUSH_STAGE_PRESETS;
        default:
            console.warn(`Unknown plant type: ${plantType}, using bush presets`);
            return BUSH_STAGE_PRESETS;
    }
}

/**
 * Get preset configuration for a specific stage and plant type
 */
export function getStagePreset(plantType: string, stage: LifecycleStage): Plant3DConfig | undefined {
    const presets = getStagePresets(plantType);
    return presets.get(stage);
}

/**
 * Convert lifecycle stage to display label
 */
export function getStageDisplayName(stage: LifecycleStage): string {
    switch (stage) {
        case LifecycleStage.SEED:
            return 'Seed';
        case LifecycleStage.SPROUT:
            return 'Sprout';
        case LifecycleStage.SEEDLING:
            return 'Seedling';
        case LifecycleStage.YOUNG:
            return 'Young';
        case LifecycleStage.MATURE:
            return 'Mature';
        case LifecycleStage.FRUITING:
            return 'Fruiting';
        default:
            return stage;
    }
}

