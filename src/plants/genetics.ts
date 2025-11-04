/**
 * Plant genetics and breeding system
 * 
 * Allows combining traits from two parent plants to create offspring
 * with characteristics inherited from both parents, plus optional mutations
 */

import type { Plant3DConfig, PlantGenetics } from '../types';
import { configToGenetics, normalizeConfig, mutateConfig } from './utils';

/**
 * Breeding options for controlling offspring generation
 */
export interface BreedingOptions {
    /** Rate of random mutations (0-1, default 0.1) */
    mutationRate?: number;

    /** Whether to use dominant/recessive trait logic (default false) */
    useDominance?: boolean;

    /** Generate a new random seed (default true) */
    randomSeed?: boolean;
}

/**
 * Breed two plants to create offspring with mixed genetics
 * 
 * The offspring inherits traits from both parents:
 * - Numeric values are averaged between parents
 * - Categorical values (types) are randomly selected from one parent
 * - Optional mutations add variation
 * 
 * @param parent1 - First parent plant configuration
 * @param parent2 - Second parent plant configuration
 * @param options - Breeding options
 * @returns New plant configuration with mixed genetics
 * 
 * @example
 * ```typescript
 * const bush = Plant3D.createBush();
 * const tree = Plant3D.createTree();
 * const genetics1 = bush.getGenetics();
 * const genetics2 = tree.getGenetics();
 * const hybrid = breed(genetics1, genetics2, { mutationRate: 0.1 });
 * const offspring = new Plant3D(hybrid);
 * ```
 */
export function breed(
    parent1: Plant3DConfig | PlantGenetics,
    parent2: Plant3DConfig | PlantGenetics,
    options: BreedingOptions = {}
): Plant3DConfig {
    const {
        mutationRate = 0.1,
        useDominance = false,
        randomSeed = true,
    } = options;

    // Convert to full genetics to ensure all values present
    const p1 = configToGenetics(parent1);
    const p2 = configToGenetics(parent2);

    // Helper: Average two numbers with optional mutation
    const average = (v1: number, v2: number): number => {
        const avg = (v1 + v2) / 2;
        if (Math.random() < mutationRate) {
            const range = Math.abs(v1 - v2);
            const mutation = (Math.random() - 0.5) * range * 0.5;
            return avg + mutation;
        }
        return avg;
    };

    // Helper: Pick random trait from parents
    const pickRandom = <T>(v1: T, v2: T): T => {
        return Math.random() < 0.5 ? v1 : v2;
    };

    // Helper: Pick with dominance (some traits are dominant)
    const pickDominant = <T>(v1: T, v2: T, trait: string): T => {
        if (!useDominance) return pickRandom(v1, v2);

        // Define dominant traits
        const dominantTraits: Record<string, any> = {
            treeType: 'deciduous', // Deciduous is dominant over evergreen
            size: 'large', // Large is dominant over small
        };

        const dominant = dominantTraits[trait];
        if (dominant === v1) return v1;
        if (dominant === v2) return v2;
        return pickRandom(v1, v2);
    };

    // Mix color values
    const mixColor = (c1: number, c2: number): number => {
        // Extract RGB components
        const r1 = (c1 >> 16) & 0xFF;
        const g1 = (c1 >> 8) & 0xFF;
        const b1 = c1 & 0xFF;

        const r2 = (c2 >> 16) & 0xFF;
        const g2 = (c2 >> 8) & 0xFF;
        const b2 = c2 & 0xFF;

        // Average with optional mutation
        let r = Math.floor(average(r1, r2));
        let g = Math.floor(average(g1, g2));
        let b = Math.floor(average(b1, b2));

        // Clamp to valid range
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // Combine back to hex
        return (r << 16) | (g << 8) | b;
    };

    // Create offspring configuration
    const offspring: Plant3DConfig = {
        seed: randomSeed ? Math.floor(Math.random() * 100000) : Math.floor(average(p1.seed, p2.seed)),
        treeType: pickDominant(p1.treeType, p2.treeType, 'treeType'),
        size: pickDominant(p1.size, p2.size, 'size'),
        trunkHeight: average(p1.trunkHeight, p2.trunkHeight),
        branchDensity: average(p1.branchDensity, p2.branchDensity),
        leafDensity: average(p1.leafDensity, p2.leafDensity),
        leafSize: average(p1.leafSize, p2.leafSize),
        barkType: pickRandom(p1.barkType, p2.barkType),
        leafType: pickRandom(p1.leafType, p2.leafType),
        color: {
            bark: mixColor(p1.color.bark, p2.color.leaves),
            leaves: mixColor(p1.color.leaves, p2.color.leaves),
        },
        growthDirection: average(p1.growthDirection, p2.growthDirection),
        branchLevels: Math.floor(average(p1.branchLevels, p2.branchLevels)),
    };

    // Apply additional mutations if mutation rate is high
    if (mutationRate > 0.3) {
        return mutateConfig(offspring, mutationRate - 0.2);
    }

    return normalizeConfig(offspring);
}

/**
 * Create multiple offspring from two parents
 * Each offspring will have different random trait combinations
 * 
 * @param parent1 - First parent
 * @param parent2 - Second parent
 * @param count - Number of offspring to generate
 * @param options - Breeding options
 * @returns Array of offspring configurations
 */
export function breedMultiple(
    parent1: Plant3DConfig | PlantGenetics,
    parent2: Plant3DConfig | PlantGenetics,
    count: number,
    options: BreedingOptions = {}
): Plant3DConfig[] {
    const offspring: Plant3DConfig[] = [];
    for (let i = 0; i < count; i++) {
        offspring.push(breed(parent1, parent2, options));
    }
    return offspring;
}

/**
 * Clone a plant (create identical copy)
 * Useful for propagation or creating variations
 * 
 * @param parent - Parent plant to clone
 * @param mutationRate - Optional mutation rate for variation (default 0)
 * @returns Cloned configuration
 */
export function clone(
    parent: Plant3DConfig | PlantGenetics,
    mutationRate: number = 0
): Plant3DConfig {
    const genetics = configToGenetics(parent);

    if (mutationRate === 0) {
        return { ...genetics };
    }

    return mutateConfig(genetics, mutationRate);
}

/**
 * Calculate genetic similarity between two plants (0-1)
 * 1 = identical, 0 = completely different
 * 
 * @param plant1 - First plant
 * @param plant2 - Second plant
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(
    plant1: Plant3DConfig | PlantGenetics,
    plant2: Plant3DConfig | PlantGenetics
): number {
    const p1 = configToGenetics(plant1);
    const p2 = configToGenetics(plant2);

    let totalDifference = 0;
    let comparisons = 0;

    // Compare numeric values (normalized to 0-1 range)
    const compareNumeric = (v1: number, v2: number, maxDiff: number) => {
        const diff = Math.abs(v1 - v2) / maxDiff;
        totalDifference += Math.min(1, diff);
        comparisons++;
    };

    compareNumeric(p1.trunkHeight, p2.trunkHeight, 30);
    compareNumeric(p1.branchDensity, p2.branchDensity, 1);
    compareNumeric(p1.leafDensity, p2.leafDensity, 1);
    compareNumeric(p1.leafSize, p2.leafSize, 0.5);
    compareNumeric(p1.growthDirection, p2.growthDirection, 2);
    compareNumeric(p1.branchLevels, p2.branchLevels, 5);

    // Compare categorical values
    if (p1.treeType !== p2.treeType) totalDifference += 1;
    comparisons++;

    if (p1.size !== p2.size) totalDifference += 0.5;
    comparisons++;

    if (p1.barkType !== p2.barkType) totalDifference += 0.5;
    comparisons++;

    if (p1.leafType !== p2.leafType) totalDifference += 0.5;
    comparisons++;

    // Calculate average difference and convert to similarity
    const averageDifference = totalDifference / comparisons;
    return 1 - averageDifference;
}

/**
 * Example breeding demonstration
 * 
 * @example
 * ```typescript
 * import { Plant3D } from './Plant3D';
 * import { breed, breedMultiple, calculateSimilarity } from './genetics';
 * 
 * // Create parent plants
 * const bush = Plant3D.createBush();
 * const tree = Plant3D.createTree();
 * 
 * // Get their genetics
 * const bushGenetics = bush.getGenetics();
 * const treeGenetics = tree.getGenetics();
 * 
 * // Breed them to create a hybrid
 * const hybrid = breed(bushGenetics, treeGenetics, { mutationRate: 0.15 });
 * const offspring = new Plant3D(hybrid);
 * 
 * // Create multiple offspring
 * const siblings = breedMultiple(bushGenetics, treeGenetics, 5);
 * const plants = siblings.map(config => new Plant3D(config));
 * 
 * // Check similarity
 * const similarity = calculateSimilarity(bushGenetics, hybrid);
 * console.log(`Offspring is ${(similarity * 100).toFixed(1)}% similar to bush parent`);
 * ```
 */

