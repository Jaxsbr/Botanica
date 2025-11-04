/**
 * Plant Breeding System - Example Usage
 * 
 * This file demonstrates how to use the Plant3D genetics and breeding system
 * to create unique plant variations for your game or application.
 */

import * as THREE from 'three';
import { Plant3D } from './src/plants/Plant3D';
import { breed, breedMultiple, clone, calculateSimilarity } from './src/plants/genetics';

/**
 * Example 1: Basic Breeding
 * Combine two different plant types to create a hybrid
 */
export function example1_BasicBreeding(scene: THREE.Scene) {
    console.log('=== Example 1: Basic Breeding ===');

    // Create two parent plants
    const bush = Plant3D.createBush();
    const tree = Plant3D.createTree();

    // Get their genetics
    const bushGenetics = bush.getGenetics();
    const treeGenetics = tree.getGenetics();

    // Breed them to create offspring
    const offspring = breed(bushGenetics, treeGenetics, {
        mutationRate: 0.1,  // 10% chance of mutations
        randomSeed: true    // Generate new random seed
    });

    // Create the hybrid plant
    const hybrid = new Plant3D(offspring);

    // Position plants
    bush.getMesh().position.set(-3, 0, 0);
    tree.getMesh().position.set(3, 0, 0);
    hybrid.getMesh().position.set(0, 0, 2);

    // Add to scene
    scene.add(bush.getMesh());
    scene.add(tree.getMesh());
    scene.add(hybrid.getMesh());

    // Check similarity
    const similarity1 = calculateSimilarity(bushGenetics, offspring);
    const similarity2 = calculateSimilarity(treeGenetics, offspring);
    console.log(`Hybrid is ${(similarity1 * 100).toFixed(1)}% similar to bush`);
    console.log(`Hybrid is ${(similarity2 * 100).toFixed(1)}% similar to tree`);
}

/**
 * Example 2: Multiple Offspring
 * Create several siblings from the same parents
 */
export function example2_MultipleOffspring(scene: THREE.Scene) {
    console.log('=== Example 2: Multiple Offspring ===');

    const parent1 = Plant3D.createFern().getGenetics();
    const parent2 = Plant3D.createVine().getGenetics();

    // Create 5 siblings
    const siblings = breedMultiple(parent1, parent2, 5, {
        mutationRate: 0.15  // Higher mutation for more variation
    });

    console.log(`Created ${siblings.length} sibling plants`);

    // Plant them in a row
    siblings.forEach((genetics, i) => {
        const plant = new Plant3D(genetics);
        plant.getMesh().position.set(i * 2 - 4, 0, 0);
        scene.add(plant.getMesh());
        console.log(`  Sibling ${i + 1}: Height=${genetics.trunkHeight.toFixed(2)}, Density=${genetics.branchDensity.toFixed(2)}`);
    });
}

/**
 * Example 3: Selective Breeding
 * Breed plants over multiple generations to select for specific traits
 */
export function example3_SelectiveBreeding(scene: THREE.Scene) {
    console.log('=== Example 3: Selective Breeding ===');

    // Goal: Breed for tall plants with high leaf density
    let generation = [
        Plant3D.createTree().getGenetics(),
        Plant3D.createBush().getGenetics(),
        Plant3D.createPine().getGenetics()
    ];

    for (let gen = 0; gen < 5; gen++) {
        // Breed all combinations
        const offspring = [];
        for (let i = 0; i < generation.length; i++) {
            for (let j = i + 1; j < generation.length; j++) {
                const child = breed(generation[i], generation[j], {
                    mutationRate: 0.1
                });
                offspring.push(child);
            }
        }

        // Select the tallest and most leafy plants
        offspring.sort((a, b) => {
            const scoreA = a.trunkHeight * a.leafDensity;
            const scoreB = b.trunkHeight * b.leafDensity;
            return scoreB - scoreA;
        });

        // Keep top 3
        generation = offspring.slice(0, 3);

        console.log(`Generation ${gen + 1}:`);
        generation.forEach((g, i) => {
            console.log(`  Plant ${i + 1}: Height=${g.trunkHeight.toFixed(2)}, Leaf Density=${g.leafDensity.toFixed(2)}, Score=${(g.trunkHeight * g.leafDensity).toFixed(2)}`);
        });
    }

    // Plant the final generation
    generation.forEach((genetics, i) => {
        const plant = new Plant3D(genetics);
        plant.getMesh().position.set(i * 4 - 4, 0, 0);
        scene.add(plant.getMesh());
    });
}

/**
 * Example 4: Cloning with Variations
 * Create multiple variants of a single plant
 */
export function example4_CloningWithVariations(scene: THREE.Scene) {
    console.log('=== Example 4: Cloning with Variations ===');

    // Start with a nice plant
    const original = Plant3D.createTree({
        trunkHeight: 10,
        branchDensity: 0.7,
        leafSize: 0.15
    });
    const originalGenetics = original.getGenetics();

    // Create exact clone
    const exactClone = new Plant3D(clone(originalGenetics));
    exactClone.getMesh().position.set(-2, 0, 0);
    scene.add(exactClone.getMesh());
    console.log('Exact clone created');

    // Create variants with different mutation rates
    const mutationRates = [0.05, 0.15, 0.25];
    mutationRates.forEach((rate, i) => {
        const variant = new Plant3D(clone(originalGenetics, rate));
        variant.getMesh().position.set(i * 2, 0, 0);
        scene.add(variant.getMesh());
        console.log(`Variant ${i + 1} with ${rate * 100}% mutation`);
    });
}

/**
 * Example 5: Genetic Distance Mapping
 * Visualize how similar plants are to each other
 */
export function example5_GeneticDistance(scene: THREE.Scene) {
    console.log('=== Example 5: Genetic Distance ===');

    // Create diverse plants
    const plants = [
        { name: 'Fern', genetics: Plant3D.createFern().getGenetics() },
        { name: 'Bush', genetics: Plant3D.createBush().getGenetics() },
        { name: 'Tree', genetics: Plant3D.createTree().getGenetics() },
        { name: 'Vine', genetics: Plant3D.createVine().getGenetics() },
        { name: 'Pine', genetics: Plant3D.createPine().getGenetics() },
    ];

    // Calculate similarity matrix
    console.log('\nSimilarity Matrix:');
    console.log('       Fern  Bush  Tree  Vine  Pine');
    plants.forEach((plantA, i) => {
        let row = `${plantA.name.padEnd(6)} `;
        plants.forEach((plantB) => {
            const similarity = calculateSimilarity(plantA.genetics, plantB.genetics);
            row += `${(similarity * 100).toFixed(0).padStart(3)}%  `;
        });
        console.log(row);
    });

    // Position plants
    plants.forEach((plant, i) => {
        const p = new Plant3D(plant.genetics);
        p.getMesh().position.set(i * 3 - 6, 0, 0);
        scene.add(p.getMesh());
    });
}

/**
 * Example 6: Save and Load Genetics
 * Demonstrate serialization for persistence
 */
export function example6_SaveLoadGenetics() {
    console.log('=== Example 6: Save and Load Genetics ===');

    // Create a plant
    const plant = Plant3D.createBush({
        trunkHeight: 8,
        branchDensity: 0.85,
        leafSize: 0.12
    });

    // Get genetics
    const genetics = plant.getGenetics();

    // Serialize to JSON
    const json = JSON.stringify(genetics, null, 2);
    console.log('Saved genetics to JSON:');
    console.log(json.substring(0, 200) + '...');

    // Save to localStorage (example)
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('myFavoritePlant', json);
        console.log('Saved to localStorage');

        // Load back
        const loadedJson = localStorage.getItem('myFavoritePlant');
        const loadedGenetics = JSON.parse(loadedJson!);
        const recreated = new Plant3D(loadedGenetics);
        console.log('Successfully loaded and recreated plant');

        // Verify they're identical
        const similarity = calculateSimilarity(genetics, loadedGenetics);
        console.log(`Similarity: ${(similarity * 100).toFixed(1)}%`);
    }
}

/**
 * Example 7: Breeding Game Loop
 * Simulate a simple plant breeding game mechanic
 */
export function example7_BreedingGameLoop(scene: THREE.Scene) {
    console.log('=== Example 7: Breeding Game Loop ===');

    // Player's collection
    const collection = [
        Plant3D.createFern().getGenetics(),
        Plant3D.createBush().getGenetics(),
    ];

    console.log('Starting collection:');
    collection.forEach((g, i) => console.log(`  ${i + 1}. Height=${g.trunkHeight.toFixed(2)}, Type=${g.treeType}`));

    // Game loop: Breed random pairs
    for (let turn = 1; turn <= 3; turn++) {
        console.log(`\nTurn ${turn}:`);

        // Pick two random parents
        const parent1 = collection[Math.floor(Math.random() * collection.length)];
        const parent2 = collection[Math.floor(Math.random() * collection.length)];

        // Breed them
        const child = breed(parent1, parent2, { mutationRate: 0.2 });

        // Add to collection
        collection.push(child);
        console.log(`  Bred new plant: Height=${child.trunkHeight.toFixed(2)}, Density=${child.branchDensity.toFixed(2)}`);

        // Keep only best 5 (by some criteria)
        if (collection.length > 5) {
            collection.sort((a, b) => b.trunkHeight - a.trunkHeight);
            const removed = collection.splice(5);
            console.log(`  Removed ${removed.length} plants to keep collection at 5`);
        }
    }

    console.log('\nFinal collection:');
    collection.forEach((g, i) => {
        console.log(`  ${i + 1}. Height=${g.trunkHeight.toFixed(2)}, Density=${g.branchDensity.toFixed(2)}, Type=${g.treeType}`);

        // Show final plants
        const plant = new Plant3D(g);
        plant.getMesh().position.set(i * 3 - 6, 0, 0);
        scene.add(plant.getMesh());
    });
}

/**
 * Example 8: Custom Breeding Logic
 * Implement your own breeding algorithm
 */
export function example8_CustomBreeding(scene: THREE.Scene) {
    console.log('=== Example 8: Custom Breeding ===');

    // Custom breeding: Always pick the better trait
    function customBreed(parent1: any, parent2: any) {
        return {
            seed: Math.floor(Math.random() * 100000),
            treeType: parent1.treeType,  // Always deciduous
            size: 'medium' as const,
            trunkHeight: Math.max(parent1.trunkHeight, parent2.trunkHeight),  // Take max
            branchDensity: (parent1.branchDensity + parent2.branchDensity) / 2,  // Average
            leafDensity: Math.max(parent1.leafDensity, parent2.leafDensity),  // Take max
            leafSize: (parent1.leafSize + parent2.leafSize) / 2,  // Average
            barkType: Math.random() < 0.5 ? parent1.barkType : parent2.barkType,
            leafType: Math.random() < 0.5 ? parent1.leafType : parent2.leafType,
            color: {
                bark: parent1.color.bark,  // Keep parent1's color
                leaves: parent2.color.leaves,  // Keep parent2's color
            },
            growthDirection: (parent1.growthDirection + parent2.growthDirection) / 2,
            branchLevels: Math.floor((parent1.branchLevels + parent2.branchLevels) / 2),
        };
    }

    const p1 = Plant3D.createBush().getGenetics();
    const p2 = Plant3D.createTree().getGenetics();

    const offspring = customBreed(p1, p2);
    const plant = new Plant3D(offspring);
    scene.add(plant.getMesh());

    console.log('Custom bred plant created with "best trait" selection');
    console.log(`  Height: ${offspring.trunkHeight.toFixed(2)} (max of parents)`);
    console.log(`  Leaf Density: ${offspring.leafDensity.toFixed(2)} (max of parents)`);
}

// Usage in your application:
// import { example1_BasicBreeding } from './BREEDING_EXAMPLE';
// example1_BasicBreeding(scene);

