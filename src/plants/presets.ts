import type { LSystemRules, PlantConfig } from '../types';

/**
 * Fern plant preset based on Week 1 MVP specification
 * Creates a balanced, fern-like branching structure
 */
export const FERN_RULES: LSystemRules = {
    axiom: 'X',
    rules: {
        X: 'F[+X][-X]FX',
        F: 'FF'
    },
    angle: 25, // degrees
    segmentLength: 0.05,
    iterations: 4
};

/**
 * Default plant visual configuration
 */
export const DEFAULT_PLANT_CONFIG: PlantConfig = {
    color: 0x228B22, // Forest green
    thickness: 0.01,
    roughness: 0.8
};

