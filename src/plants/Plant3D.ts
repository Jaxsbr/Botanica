/**
 * Plant3D - Simplified wrapper around ez-tree for 3D plant generation
 * 
 * This class provides an intuitive API for creating realistic 3D plants
 * while hiding the complexity of ez-tree's extensive parameter system.
 * 
 * Migration from L-system:
 * - Old L-system generated 2D patterns in X-Y plane only
 * - Plant3D generates full 3D trees with realistic branch physics
 * - L-system iterations → branch.levels
 * - L-system angle → branch.angle
 * - L-system segmentLength → branch.length
 * - L-system thickness → branch.radius
 * - L-system color → bark.tint and leaves.tint
 */

import * as THREE from 'three';
import { Tree } from '@dgreenheck/ez-tree';
import type { Plant3DConfig, PlantGenetics } from '../types';
import { configToTreeOptions, configToGenetics, treeOptionsToConfig } from './utils';
import {
    FERN_PRESET,
    BUSH_PRESET,
    TREE_PRESET,
    VINE_PRESET,
    PINE_PRESET,
    SAPLING_PRESET
} from './presets3d';

/**
 * Plant3D class - simplified 3D plant generation
 * 
 * Usage:
 * ```typescript
 * // Simple usage with defaults
 * const plant = new Plant3D();
 * scene.add(plant.getMesh());
 * 
 * // Custom configuration
 * const plant = new Plant3D({
 *   trunkHeight: 10,
 *   branchDensity: 0.8,
 *   leafSize: 0.2
 * });
 * scene.add(plant.getMesh());
 * 
 * // Using presets
 * const fern = Plant3D.createFern();
 * scene.add(fern.getMesh());
 * ```
 */
export class Plant3D {
    private tree: Tree;
    private config: Plant3DConfig;

    /**
     * Create a new 3D plant
     * @param config - Simplified plant configuration
     */
    constructor(config: Plant3DConfig = {}) {
        this.config = config;
        this.tree = new Tree();

        // Convert simplified config to ez-tree options and generate
        const treeOptions = configToTreeOptions(config);
        this.tree.options.copy(treeOptions);
        this.tree.generate();
    }

    /**
     * Get the Three.js mesh for this plant
     * @returns THREE.Group containing the plant geometry
     */
    getMesh(): THREE.Group {
        return this.tree;
    }

    /**
     * Regenerate the plant with new configuration
     * @param config - New configuration (merged with existing)
     */
    regenerate(config: Partial<Plant3DConfig> = {}): void {
        this.config = { ...this.config, ...config };
        const treeOptions = configToTreeOptions(this.config);
        this.tree.options.copy(treeOptions);
        this.tree.generate();
    }

    /**
     * Get the current plant genetics (for breeding/saving)
     * @returns Complete genetics information
     */
    getGenetics(): PlantGenetics {
        return configToGenetics(this.config);
    }

    /**
     * Get the current configuration
     * @returns Current Plant3DConfig
     */
    getConfig(): Plant3DConfig {
        return { ...this.config };
    }

    /**
     * Update plant animation (for leaf swaying in wind)
     * Call this in your render loop
     * @param elapsedTime - Total elapsed time in seconds
     */
    update(elapsedTime: number): void {
        this.tree.update(elapsedTime);
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        // Dispose of geometries and materials
        this.tree.traverse((object) => {
            if (object instanceof THREE.Mesh) {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            }
        });
    }

    /**
     * Get performance metrics
     */
    getMetrics(): { vertexCount: number; triangleCount: number } {
        return {
            vertexCount: this.tree.vertexCount,
            triangleCount: this.tree.triangleCount,
        };
    }

    // ========== FACTORY METHODS ==========

    /**
     * Create a fern plant
     * Short, bushy plant with dense branching and many small leaves
     * @param overrides - Optional parameter overrides
     */
    static createFern(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...FERN_PRESET, ...overrides });
    }

    /**
     * Create a bush
     * Medium-height plant with wide, spreading branches and dense foliage
     * @param overrides - Optional parameter overrides
     */
    static createBush(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...BUSH_PRESET, ...overrides });
    }

    /**
     * Create a tree
     * Classic tree with tall trunk and moderate branching
     * @param overrides - Optional parameter overrides
     */
    static createTree(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...TREE_PRESET, ...overrides });
    }

    /**
     * Create a vine
     * Drooping plant with long, hanging branches
     * @param overrides - Optional parameter overrides
     */
    static createVine(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...VINE_PRESET, ...overrides });
    }

    /**
     * Create a pine tree
     * Coniferous evergreen tree with classic Christmas tree shape
     * @param overrides - Optional parameter overrides
     */
    static createPine(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...PINE_PRESET, ...overrides });
    }

    /**
     * Create a sapling
     * Young, small tree with simple structure
     * @param overrides - Optional parameter overrides
     */
    static createSapling(overrides: Partial<Plant3DConfig> = {}): Plant3D {
        return new Plant3D({ ...SAPLING_PRESET, ...overrides });
    }

    /**
     * Create a plant from genetics
     * @param genetics - Complete plant genetics
     */
    static fromGenetics(genetics: PlantGenetics): Plant3D {
        return new Plant3D(genetics);
    }
}

