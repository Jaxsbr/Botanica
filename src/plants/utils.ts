/**
 * Utility functions for Plant3D
 * Handles conversion between simplified Plant3DConfig and ez-tree's TreeOptions
 */

import { Tree, TreeType, BarkType, LeafType, Billboard } from '@dgreenheck/ez-tree';
import type { Plant3DConfig, PlantGenetics } from '../types';

// TreeOptions type - matches ez-tree's internal TreeOptions structure
type TreeOptions = InstanceType<typeof Tree>['options'];

/**
 * Size multipliers for different size presets
 */
const SIZE_SCALES = {
    small: 0.5,
    medium: 1.0,
    large: 1.8,
};

/**
 * Default base values for tree generation
 */
const DEFAULTS = {
    seed: Math.floor(Math.random() * 100000),
    treeType: 'deciduous' as const,
    size: 'medium' as const,
    trunkHeight: 15,
    branchDensity: 0.5,
    leafDensity: 0.5,
    leafSize: 0.15,
    barkType: 'oak' as const,
    leafType: 'oak' as const,
    barkColor: 0xffffff,
    leavesColor: 0xffffff,
    growthDirection: 0,
    branchLevels: 3,
};

/**
 * Converts simplified Plant3DConfig to ez-tree's detailed TreeOptions
 * Maps intuitive parameters to ez-tree's extensive configuration system
 */
export function configToTreeOptions(config: Plant3DConfig = {}): TreeOptions {
    // Create a tree instance to get a default options object
    const tempTree = new Tree();
    const options = tempTree.options;

    // Apply defaults
    const cfg = {
        seed: config.seed ?? DEFAULTS.seed,
        treeType: config.treeType ?? DEFAULTS.treeType,
        size: config.size ?? DEFAULTS.size,
        trunkHeight: config.trunkHeight,
        branchDensity: config.branchDensity ?? DEFAULTS.branchDensity,
        leafDensity: config.leafDensity ?? DEFAULTS.leafDensity,
        leafSize: config.leafSize ?? DEFAULTS.leafSize,
        barkType: config.barkType ?? DEFAULTS.barkType,
        leafType: config.leafType ?? DEFAULTS.leafType,
        barkColor: config.color?.bark ?? DEFAULTS.barkColor,
        leavesColor: config.color?.leaves ?? DEFAULTS.leavesColor,
        growthDirection: config.growthDirection ?? DEFAULTS.growthDirection,
        branchLevels: config.branchLevels ?? DEFAULTS.branchLevels,
    };

    // Get size scale
    const sizeScale = SIZE_SCALES[cfg.size];

    // Calculate trunk height (use override if provided)
    const trunkHeight = cfg.trunkHeight ?? (DEFAULTS.trunkHeight * sizeScale);

    // Basic tree settings
    options.seed = cfg.seed;
    options.type = cfg.treeType === 'deciduous' ? TreeType.Deciduous : TreeType.Evergreen;

    // Bark settings
    options.bark.type = cfg.barkType;
    options.bark.tint = cfg.barkColor;
    options.bark.flatShading = false;
    options.bark.textured = true;
    options.bark.textureScale = { x: 1, y: 10 };

    // Branch density maps to number of children per level
    // 0 = sparse (2-3 branches), 1 = dense (8-10 branches)
    const densityScale = cfg.branchDensity;
    const childrenBase = Math.floor(2 + densityScale * 6); // 2 to 8

    // Branch settings - these create the tree structure
    options.branch.levels = Math.max(1, Math.min(5, cfg.branchLevels));

    // Set branch parameters for each level
    for (let level = 0; level <= options.branch.levels; level++) {
        if (level === 0) {
            // Trunk
            options.branch.length[0] = trunkHeight;
            options.branch.radius[0] = trunkHeight * 0.08 * sizeScale; // Trunk thickness proportional to height
            options.branch.sections[0] = 12;
            options.branch.segments[0] = 8;
            options.branch.gnarliness[0] = 0.1;
            options.branch.taper[0] = 0.7;
            options.branch.twist[0] = 0;
        } else {
            // Branches at various levels
            const levelScale = Math.pow(0.6, level); // Each level is 60% of previous

            options.branch.length[level] = trunkHeight * levelScale * 0.8;
            options.branch.radius[level] = options.branch.radius[0] * levelScale * 0.8;
            options.branch.sections[level] = Math.max(4, 12 - level * 2);
            options.branch.segments[level] = Math.max(3, 8 - level);
            options.branch.angle[level] = 50 + level * 10; // Branches get more horizontal at higher levels
            options.branch.children[level - 1] = Math.max(1, Math.floor(childrenBase * levelScale));
            options.branch.start[level] = 0.3 + level * 0.1; // Where on parent branch children start
            options.branch.gnarliness[level] = 0.1 + level * 0.05;
            options.branch.taper[level] = 0.7;
            options.branch.twist[level] = 0;
        }
    }

    // Growth force (controls drooping or upward growth)
    // -1 = drooping (vine), 0 = natural, 1 = strong upward
    options.branch.force.direction = { x: 0, y: 1, z: 0 };
    options.branch.force.strength = -0.01 + (cfg.growthDirection * 0.03);

    // Leaf settings
    options.leaves.type = cfg.leafType;
    options.leaves.billboard = Billboard.Double; // Double-sided leaves look better
    options.leaves.angle = 45; // Angle relative to branch
    options.leaves.count = Math.floor(10 + cfg.leafDensity * 40); // 10 to 50 leaves
    options.leaves.start = 0; // Leaves can appear anywhere on final branches
    options.leaves.size = cfg.leafSize * 10; // Scale to ez-tree's leaf size units
    options.leaves.sizeVariance = 0.5; // Natural variation in leaf size
    options.leaves.tint = cfg.leavesColor;
    options.leaves.alphaTest = 0.5; // Transparency threshold

    return options;
}

/**
 * Converts ez-tree TreeOptions back to Plant3DConfig
 * Useful for extracting genetics from an existing tree
 */
export function treeOptionsToConfig(options: TreeOptions): Plant3DConfig {
    // This is a reverse mapping - approximate since some ez-tree details don't map cleanly
    const trunkHeight = options.branch.length[0];
    const childrenCount = options.branch.children[0] || 5;
    const branchDensity = Math.max(0, Math.min(1, (childrenCount - 2) / 6));
    const leafCount = options.leaves.count;
    const leafDensity = Math.max(0, Math.min(1, (leafCount - 10) / 40));

    return {
        seed: options.seed,
        treeType: options.type,
        trunkHeight: trunkHeight,
        branchDensity: branchDensity,
        leafDensity: leafDensity,
        leafSize: options.leaves.size / 10,
        barkType: options.bark.type as any,
        leafType: options.leaves.type as any,
        color: {
            bark: options.bark.tint,
            leaves: options.leaves.tint,
        },
        branchLevels: options.branch.levels,
    };
}

/**
 * Normalizes a Plant3DConfig to ensure all values are within valid ranges
 */
export function normalizeConfig(config: Plant3DConfig): Plant3DConfig {
    return {
        ...config,
        branchDensity: config.branchDensity !== undefined
            ? Math.max(0, Math.min(1, config.branchDensity))
            : undefined,
        leafDensity: config.leafDensity !== undefined
            ? Math.max(0, Math.min(1, config.leafDensity))
            : undefined,
        growthDirection: config.growthDirection !== undefined
            ? Math.max(-1, Math.min(1, config.growthDirection))
            : undefined,
        branchLevels: config.branchLevels !== undefined
            ? Math.max(1, Math.min(5, Math.floor(config.branchLevels)))
            : undefined,
    };
}

/**
 * Converts a Plant3DConfig to complete PlantGenetics
 * Fills in all missing values with defaults
 */
export function configToGenetics(config: Plant3DConfig): PlantGenetics {
    const cfg = {
        seed: config.seed ?? DEFAULTS.seed,
        treeType: config.treeType ?? DEFAULTS.treeType,
        size: config.size ?? DEFAULTS.size,
        trunkHeight: config.trunkHeight ?? (DEFAULTS.trunkHeight * SIZE_SCALES[config.size ?? DEFAULTS.size]),
        branchDensity: config.branchDensity ?? DEFAULTS.branchDensity,
        leafDensity: config.leafDensity ?? DEFAULTS.leafDensity,
        leafSize: config.leafSize ?? DEFAULTS.leafSize,
        barkType: config.barkType ?? DEFAULTS.barkType,
        leafType: config.leafType ?? DEFAULTS.leafType,
        color: {
            bark: config.color?.bark ?? DEFAULTS.barkColor,
            leaves: config.color?.leaves ?? DEFAULTS.leavesColor,
        },
        growthDirection: config.growthDirection ?? DEFAULTS.growthDirection,
        branchLevels: config.branchLevels ?? DEFAULTS.branchLevels,
    };

    return cfg as PlantGenetics;
}

/**
 * Creates a random variation of a config by mutating values slightly
 */
export function mutateConfig(config: Plant3DConfig, mutationRate: number = 0.1): Plant3DConfig {
    const mutate = (value: number | undefined, range: number): number | undefined => {
        if (value === undefined) return undefined;
        const delta = (Math.random() - 0.5) * 2 * range * mutationRate;
        return value + delta;
    };

    return normalizeConfig({
        ...config,
        seed: Math.floor(Math.random() * 100000), // Always new seed for variation
        trunkHeight: mutate(config.trunkHeight, 5),
        branchDensity: mutate(config.branchDensity, 0.3),
        leafDensity: mutate(config.leafDensity, 0.3),
        leafSize: mutate(config.leafSize, 0.05),
        growthDirection: mutate(config.growthDirection, 0.2),
        color: config.color ? {
            bark: config.color.bark, // Keep colors the same
            leaves: config.color.leaves,
        } : undefined,
    });
}

