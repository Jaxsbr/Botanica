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
 * Avocado tree stage presets
 * Grows from tiny sprout to large fruit-bearing tree
 */
export const AVOCADO_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, {
        // Tiny sprout just breaking surface
        trunkHeight: 0.2,
        branchDensity: 0.1,
        leafSize: 0.05,
        leafCount: 0.1,
        branchAngle: 35,
        branchLevels: 1
    }],
    [LifecycleStage.SPROUT, {
        // First true leaves, very small
        trunkHeight: 0.5,
        branchDensity: 0.2,
        leafSize: 0.08,
        leafCount: 0.3,
        branchAngle: 40,
        branchLevels: 2
    }],
    [LifecycleStage.SEEDLING, {
        // Young plant establishing structure
        trunkHeight: 1.0,
        branchDensity: 0.4,
        leafSize: 0.12,
        leafCount: 0.5,
        branchAngle: 45,
        branchLevels: 2
    }],
    [LifecycleStage.YOUNG, {
        // Adolescent tree gaining height
        trunkHeight: 1.8,
        branchDensity: 0.6,
        leafSize: 0.15,
        leafCount: 0.7,
        branchAngle: 50,
        branchLevels: 3
    }],
    [LifecycleStage.MATURE, {
        // Full-sized tree
        trunkHeight: 2.5,
        branchDensity: 0.8,
        leafSize: 0.18,
        leafCount: 0.9,
        branchAngle: 55,
        branchLevels: 3
    }],
    [LifecycleStage.FRUITING, {
        // Same as mature but ready for fruit generation
        trunkHeight: 2.5,
        branchDensity: 0.8,
        leafSize: 0.18,
        leafCount: 1.0,
        branchAngle: 55,
        branchLevels: 3,
        // Could add fruit mesh here in future
    }]
]);

/**
 * Fern stage presets
 * Grows from small fronds to bushy ground cover
 */
export const FERN_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, {
        // Tiny unfurling frond
        trunkHeight: 0.1,
        branchDensity: 0.3,
        leafSize: 0.04,
        leafCount: 0.2,
        branchAngle: 60,
        branchLevels: 1
    }],
    [LifecycleStage.SPROUT, {
        // First fronds emerging
        trunkHeight: 0.3,
        branchDensity: 0.5,
        leafSize: 0.06,
        leafCount: 0.4,
        branchAngle: 65,
        branchLevels: 2
    }],
    [LifecycleStage.SEEDLING, {
        // Multiple fronds forming
        trunkHeight: 0.5,
        branchDensity: 0.7,
        leafSize: 0.08,
        leafCount: 0.6,
        branchAngle: 70,
        branchLevels: 2
    }],
    [LifecycleStage.YOUNG, {
        // Bushing out
        trunkHeight: 0.7,
        branchDensity: 0.85,
        leafSize: 0.10,
        leafCount: 0.8,
        branchAngle: 75,
        branchLevels: 3
    }],
    [LifecycleStage.MATURE, {
        // Full bushy fern
        trunkHeight: 0.9,
        branchDensity: 1.0,
        leafSize: 0.12,
        leafCount: 1.0,
        branchAngle: 80,
        branchLevels: 3
    }],
    [LifecycleStage.FRUITING, {
        // Ferns don't fruit, same as mature
        trunkHeight: 0.9,
        branchDensity: 1.0,
        leafSize: 0.12,
        leafCount: 1.0,
        branchAngle: 80,
        branchLevels: 3
    }]
]);

/**
 * Bush stage presets (for other plant types)
 */
export const BUSH_STAGE_PRESETS: StagePresets = new Map([
    [LifecycleStage.SEED, {
        trunkHeight: 0.2,
        branchDensity: 0.2,
        leafSize: 0.05,
        leafCount: 0.2,
        branchAngle: 45,
        branchLevels: 1
    }],
    [LifecycleStage.SPROUT, {
        trunkHeight: 0.5,
        branchDensity: 0.4,
        leafSize: 0.08,
        leafCount: 0.4,
        branchAngle: 50,
        branchLevels: 2
    }],
    [LifecycleStage.SEEDLING, {
        trunkHeight: 0.8,
        branchDensity: 0.6,
        leafSize: 0.12,
        leafCount: 0.6,
        branchAngle: 55,
        branchLevels: 2
    }],
    [LifecycleStage.YOUNG, {
        trunkHeight: 1.2,
        branchDensity: 0.75,
        leafSize: 0.15,
        leafCount: 0.8,
        branchAngle: 60,
        branchLevels: 3
    }],
    [LifecycleStage.MATURE, {
        trunkHeight: 1.5,
        branchDensity: 0.9,
        leafSize: 0.18,
        leafCount: 0.95,
        branchAngle: 65,
        branchLevels: 3
    }],
    [LifecycleStage.FRUITING, {
        trunkHeight: 1.5,
        branchDensity: 0.9,
        leafSize: 0.18,
        leafCount: 1.0,
        branchAngle: 65,
        branchLevels: 3
    }]
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


