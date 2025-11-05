/**
 * Preset plant configurations for Plant3D
 * These provide ready-to-use plant types with carefully tuned parameters
 */

import type { Plant3DConfig } from '../types';

/**
 * Fern preset: Young potted plant with thin stem and few leaves
 * Characteristics:
 * - Thin, visible stem
 * - Very few leaves on simple branches
 * - Young plant appearance
 * - Minimal structure
 */
export const FERN_PRESET: Plant3DConfig = {
    seed: 12345,
    treeType: 'deciduous',
    size: 'small',
    trunkHeight: 1.2, // Tall thin stem clearly visible above pot
    branchDensity: 0.15, // Very sparse branching - just a few branches
    leafDensity: 0.1, // Minimal leaves - young plant
    leafSize: 0.1, // Slightly larger leaves to be visible with fewer count
    barkType: 'willow',
    leafType: 'ash',
    color: {
        bark: 0x7A5C3E, // Brown stem (visible trunk)
        leaves: 0x4CBB17, // Bright green leaves
    },
    growthDirection: 0.8, // Strong upward growth for straight trunk
    branchLevels: 1, // Single level - just trunk and simple branches
};

/**
 * Bush preset: Medium-height plant with wide, spreading branches
 * Characteristics:
 * - Medium height but compact
 * - Very high branch density
 * - Dense foliage
 * - Horizontal spreading growth
 */
export const BUSH_PRESET: Plant3DConfig = {
    seed: 23456,
    treeType: 'deciduous',
    size: 'small',
    trunkHeight: 3.0,
    branchDensity: 0.95, // Very dense
    leafDensity: 0.85, // Lots of leaves
    leafSize: 0.12,
    barkType: 'oak',
    leafType: 'oak',
    color: {
        bark: 0x8B7355, // Light brown bark
        leaves: 0x3CB371, // Medium sea green
    },
    growthDirection: -0.1, // Slightly spreading outward
    branchLevels: 3,
};

/**
 * Tree preset: Classic tree with tall trunk and moderate branching
 * Characteristics:
 * - Tall trunk
 * - Moderate branch density
 * - Natural upward growth
 * - Balanced proportions
 */
export const TREE_PRESET: Plant3DConfig = {
    seed: 34567,
    treeType: 'deciduous',
    size: 'large',
    trunkHeight: 18,
    branchDensity: 0.5, // Moderate branching
    leafDensity: 0.6, // Moderate leaves
    leafSize: 0.15,
    barkType: 'oak',
    leafType: 'oak',
    color: {
        bark: 0x8B4513, // Saddle brown bark
        leaves: 0x228B22, // Forest green
    },
    growthDirection: 0.1, // Slight upward growth
    branchLevels: 3,
};

/**
 * Vine preset: Drooping plant with long, hanging branches
 * Characteristics:
 * - Medium height
 * - Lower branch density
 * - Drooping growth pattern
 * - Elongated appearance
 */
export const VINE_PRESET: Plant3DConfig = {
    seed: 45678,
    treeType: 'deciduous',
    size: 'medium',
    trunkHeight: 8,
    branchDensity: 0.3, // Sparse for wispy appearance
    leafDensity: 0.5,
    leafSize: 0.1,
    barkType: 'willow',
    leafType: 'aspen',
    color: {
        bark: 0x9ACD32, // Yellow green bark
        leaves: 0x90EE90, // Light green
    },
    growthDirection: -0.7, // Strong drooping
    branchLevels: 3,
};

/**
 * Pine tree preset: Coniferous evergreen tree
 * Characteristics:
 * - Tall and narrow
 * - Evergreen type
 * - Dense needles
 * - Classic Christmas tree shape
 */
export const PINE_PRESET: Plant3DConfig = {
    seed: 56789,
    treeType: 'evergreen',
    size: 'large',
    trunkHeight: 20,
    branchDensity: 0.7,
    leafDensity: 0.8,
    leafSize: 0.12,
    barkType: 'pine',
    leafType: 'pine',
    color: {
        bark: 0x654321, // Dark brown
        leaves: 0x0F5F0F, // Dark forest green
    },
    growthDirection: 0.3, // Strong upward growth
    branchLevels: 4,
};

/**
 * Sapling preset: Young, small tree
 * Characteristics:
 * - Very short
 * - Few branches
 * - Small leaves
 * - Simple structure
 */
export const SAPLING_PRESET: Plant3DConfig = {
    seed: 67890,
    treeType: 'deciduous',
    size: 'small',
    trunkHeight: 2,
    branchDensity: 0.3, // Few branches
    leafDensity: 0.4, // Sparse leaves
    leafSize: 0.1,
    barkType: 'birch',
    leafType: 'aspen',
    color: {
        bark: 0xF5F5DC, // Beige/cream
        leaves: 0x7CFC00, // Lawn green (young leaves)
    },
    growthDirection: 0.2,
    branchLevels: 2, // Simple structure
};

/**
 * All available presets mapped by name
 */
export const PRESETS: Record<string, Plant3DConfig> = {
    fern: FERN_PRESET,
    bush: BUSH_PRESET,
    tree: TREE_PRESET,
    vine: VINE_PRESET,
    pine: PINE_PRESET,
    sapling: SAPLING_PRESET,
};

/**
 * Get a preset by name
 */
export function getPreset(name: string): Plant3DConfig | undefined {
    return PRESETS[name.toLowerCase()];
}

/**
 * List all available preset names
 */
export function listPresets(): string[] {
    return Object.keys(PRESETS);
}

