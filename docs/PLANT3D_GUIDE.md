# Plant3D Integration Guide

## Overview

Botanica now uses the **ez-tree** library for realistic 3D plant generation, replacing the previous L-system implementation. The new `Plant3D` class provides a simplified API while leveraging ez-tree's powerful procedural generation capabilities.

## Key Improvements

### L-System (Old) → Plant3D (New)

| Aspect | L-System | Plant3D (ez-tree) |
|--------|----------|-------------------|
| Dimensionality | 2D (X-Y plane only) | Full 3D |
| Generation | String-based rules | Recursive geometry with physics |
| Realism | Abstract patterns | Realistic branch structure |
| Textures | Solid colors only | Realistic bark & leaf textures |
| Animation | Static | Leaf swaying in wind |
| Control | Limited parameters | Extensive customization |

## Quick Start

### Basic Usage

```typescript
import { Plant3D } from './plants/Plant3D';

// Simple usage with defaults
const plant = new Plant3D();
scene.add(plant.getMesh());

// Custom configuration
const customPlant = new Plant3D({
  trunkHeight: 10,
  branchDensity: 0.8,
  leafSize: 0.2,
  color: {
    bark: 0x8B4513,    // Saddle brown
    leaves: 0x228B22   // Forest green
  }
});
scene.add(customPlant.getMesh());
```

### Using Presets

Six ready-to-use plant types are available:

```typescript
// Fern - short, bushy with dense leaves
const fern = Plant3D.createFern();

// Bush - medium height, wide spreading
const bush = Plant3D.createBush();

// Tree - tall trunk, classic tree shape
const tree = Plant3D.createTree();

// Vine - drooping branches
const vine = Plant3D.createVine();

// Pine - coniferous evergreen
const pine = Plant3D.createPine();

// Sapling - young, simple tree
const sapling = Plant3D.createSapling();

// Override preset parameters
const customBush = Plant3D.createBush({
  size: 'large',
  leafDensity: 0.9
});
```

## Configuration Parameters

### Plant3DConfig Interface

```typescript
interface Plant3DConfig {
  seed?: number;                    // Random seed (reproducible)
  treeType?: 'deciduous' | 'evergreen';
  size?: 'small' | 'medium' | 'large';
  trunkHeight?: number;             // Override size preset
  branchDensity?: number;           // 0-1 (sparse to dense)
  leafDensity?: number;             // 0-1 (few to many)
  leafSize?: number;                // Individual leaf size
  barkType?: 'birch' | 'oak' | 'pine' | 'willow';
  leafType?: 'ash' | 'aspen' | 'pine' | 'oak';
  color?: {
    bark?: number;                  // Hex color (e.g., 0x8B4513)
    leaves?: number;                // Hex color (e.g., 0x228B22)
  };
  growthDirection?: number;         // -1 to 1 (drooping to upward)
  branchLevels?: number;            // 1-5 (complexity)
}
```

### Parameter Details

- **seed**: Random seed for reproducible generation. Same seed = identical tree.
- **treeType**: `'deciduous'` for leafy trees, `'evergreen'` for conifers.
- **size**: Quick size preset. `'small'` ≈ 0.5x, `'medium'` ≈ 1x, `'large'` ≈ 1.8x.
- **trunkHeight**: Explicit trunk height in units (overrides size preset).
- **branchDensity**: Controls branch count. `0` = sparse (2-3 branches), `1` = dense (8-10 branches).
- **leafDensity**: Leaf count. `0` = ~10 leaves, `1` = ~50 leaves.
- **leafSize**: Size of individual leaves (typically 0.05-0.3).
- **growthDirection**: Growth bias. `-1` = drooping (vines), `0` = natural, `1` = strong upward.
- **branchLevels**: Recursion depth. More levels = more detailed but slower. Range: 1-5.

## Animation

Plant3D includes leaf swaying animation. Update in your render loop:

```typescript
private elapsedTime = 0;

private animate = (): void => {
  requestAnimationFrame(this.animate);
  
  // Update time
  this.elapsedTime += 0.016; // ~60fps
  
  // Update plants for wind animation
  plants.forEach(plant => plant.update(this.elapsedTime));
  
  renderer.render(scene, camera);
};
```

## Plant Genetics & Breeding

### Getting Genetics

```typescript
const plant = Plant3D.createBush();
const genetics = plant.getGenetics(); // PlantGenetics object

// Genetics are JSON-serializable for saving
const json = JSON.stringify(genetics);
localStorage.setItem('myPlant', json);

// Load from saved genetics
const loaded = JSON.parse(localStorage.getItem('myPlant'));
const recreated = new Plant3D(loaded);
```

### Breeding Two Plants

```typescript
import { breed } from './plants/genetics';

// Create parents
const parent1 = Plant3D.createBush();
const parent2 = Plant3D.createTree();

// Get genetics
const genetics1 = parent1.getGenetics();
const genetics2 = parent2.getGenetics();

// Breed them
const offspring = breed(genetics1, genetics2, {
  mutationRate: 0.1,     // 10% mutation chance
  randomSeed: true       // Generate new seed
});

// Create plant from offspring
const hybrid = new Plant3D(offspring);
scene.add(hybrid.getMesh());
```

### Breeding Options

```typescript
interface BreedingOptions {
  mutationRate?: number;      // 0-1, default 0.1
  useDominance?: boolean;     // Use dominant traits, default false
  randomSeed?: boolean;       // New random seed, default true
}
```

### Multiple Offspring

```typescript
import { breedMultiple } from './plants/genetics';

// Create 5 siblings with different trait combinations
const siblings = breedMultiple(parent1Genetics, parent2Genetics, 5, {
  mutationRate: 0.15
});

// Plant them all
siblings.forEach((genetics, i) => {
  const plant = new Plant3D(genetics);
  plant.getMesh().position.set(i * 2, 0, 0);
  scene.add(plant.getMesh());
});
```

### Cloning

```typescript
import { clone } from './plants/genetics';

// Perfect clone
const exactCopy = clone(originalGenetics);

// Clone with slight mutations
const variant = clone(originalGenetics, 0.05); // 5% mutation
```

### Genetic Similarity

```typescript
import { calculateSimilarity } from './plants/genetics';

const similarity = calculateSimilarity(plant1Genetics, plant2Genetics);
console.log(`Plants are ${(similarity * 100).toFixed(1)}% similar`);
```

## Migration from L-System

### Parameter Mapping

| L-System | Plant3D Equivalent | Notes |
|----------|-------------------|-------|
| `iterations` | `branchLevels` | Controls recursion depth |
| `angle` | Automatic | Based on branch level |
| `segmentLength` | `trunkHeight` | Overall size control |
| `thickness` | Automatic | Calculated from trunk height |
| `color` | `color.bark` & `color.leaves` | Separate bark/leaf colors |

### Example Migration

**Old L-System Code:**
```typescript
const plant = new Plant(
  new THREE.Vector3(0, 0, 0),
  {
    axiom: 'X',
    rules: { X: 'F[+X][-X]FX', F: 'FF' },
    angle: 25,
    segmentLength: 0.05,
    iterations: 4
  },
  {
    color: 0x228B22,
    thickness: 0.01,
    roughness: 0.8
  }
);
```

**New Plant3D Code:**
```typescript
const plant = new Plant3D({
  branchLevels: 4,        // Was: iterations
  trunkHeight: 2,         // Scaled from segmentLength
  branchDensity: 0.8,     // More intuitive control
  leafDensity: 0.9,
  leafSize: 0.08,
  color: {
    bark: 0x6B8E23,
    leaves: 0x228B22      // Was: color
  }
});
```

## Performance

### Metrics

```typescript
const metrics = plant.getMetrics();
console.log(`Vertices: ${metrics.vertexCount}`);
console.log(`Triangles: ${metrics.triangleCount}`);
```

Typical metrics:
- **Fern (small)**: ~5,000 vertices, ~3,000 triangles
- **Bush (medium)**: ~12,000 vertices, ~8,000 triangles
- **Tree (large)**: ~25,000 vertices, ~18,000 triangles

### Optimization Tips

1. **Use appropriate branch levels**: More levels = more detail but slower
   - Simple plants: 2-3 levels
   - Detailed plants: 4-5 levels

2. **Control density**: Lower density for background plants
   ```typescript
   const backgroundTree = Plant3D.createTree({
     branchDensity: 0.3,  // Sparse
     leafDensity: 0.4,    // Fewer leaves
     branchLevels: 2      // Less detail
   });
   ```

3. **Reuse genetics**: Generate once, instantiate multiple times
   ```typescript
   const genetics = Plant3D.createBush().getGenetics();
   
   // Create many identical bushes efficiently
   for (let i = 0; i < 10; i++) {
     const bush = new Plant3D(genetics);
     bush.getMesh().position.set(i * 2, 0, 0);
     scene.add(bush.getMesh());
   }
   ```

## Cleanup

Always dispose of plants when removing them:

```typescript
scene.remove(plant.getMesh());
plant.dispose(); // Frees geometry and material resources
```

## Advanced: Direct ez-tree Access

For advanced users, access the underlying ez-tree instance:

```typescript
const plant = new Plant3D({ ... });
const tree = plant.getMesh(); // This is the ez-tree Tree instance

// Access ez-tree's detailed options
tree.options.branch.gnarliness[0] = 0.5;
tree.options.leaves.alphaTest = 0.6;

// Regenerate with new options
tree.generate();
```

## Examples

### Example 1: Garden Scene

```typescript
// Create diverse garden
const plants = [
  { preset: Plant3D.createFern, pos: [-2, 0, -1] },
  { preset: Plant3D.createBush, pos: [0, 0, -1.5] },
  { preset: Plant3D.createTree, pos: [3, 0, 0] },
  { preset: Plant3D.createSapling, pos: [-1, 0, 1] },
];

plants.forEach(({ preset, pos }) => {
  const plant = preset({ size: 'small' });
  plant.getMesh().position.set(...pos);
  scene.add(plant.getMesh());
});
```

### Example 2: Evolutionary Breeding

```typescript
import { breed, calculateSimilarity } from './plants/genetics';

// Start with two different plants
let generation = [
  Plant3D.createBush().getGenetics(),
  Plant3D.createTree().getGenetics()
];

// Evolve over generations
for (let gen = 0; gen < 5; gen++) {
  const offspring = [];
  
  // Breed all pairs
  for (let i = 0; i < generation.length - 1; i++) {
    const child = breed(generation[i], generation[i + 1], {
      mutationRate: 0.2
    });
    offspring.push(child);
  }
  
  generation = offspring;
  console.log(`Generation ${gen + 1}: ${generation.length} plants`);
}

// Plant the final generation
generation.forEach((genetics, i) => {
  const plant = new Plant3D(genetics);
  plant.getMesh().position.set(i * 2, 0, 0);
  scene.add(plant.getMesh());
});
```

### Example 3: Custom Plant Designer

```typescript
function createCustomPlant(height: number, bushiness: number): Plant3D {
  return new Plant3D({
    treeType: 'deciduous',
    trunkHeight: height,
    branchDensity: bushiness,
    leafDensity: bushiness * 0.8,
    leafSize: 0.1 + (bushiness * 0.1),
    branchLevels: Math.min(5, Math.floor(2 + bushiness * 3)),
    color: {
      bark: 0x8B4513,
      leaves: 0x228B22
    }
  });
}

// Usage
const tallSparse = createCustomPlant(20, 0.2);
const shortDense = createCustomPlant(5, 0.9);
```

## Troubleshooting

### Plant not visible
- Check position: `plant.getMesh().position.set(x, y, z)`
- Check scale: Plants use real-world units
- Check camera distance: Tree heights range from 1-20 units

### Performance issues
- Reduce `branchLevels` (try 2-3 instead of 4-5)
- Lower `branchDensity` and `leafDensity`
- Limit number of plants in scene

### Unrealistic appearance
- Adjust `growthDirection` for natural droop/lift
- Try different `barkType` and `leafType` combinations
- Experiment with `branchDensity` (0.4-0.7 often looks best)

## License

Plant3D uses the **ez-tree** library by Daniel Greenheck, licensed under MIT License.

- Repository: https://github.com/dgreenheck/ez-tree
- Website: https://eztree.dev
- License: MIT (free for commercial use)

