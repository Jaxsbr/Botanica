# Abstract Plant System

This prototype adds a fully parametric plant generator using simple geometric primitives. It runs alongside the existing `ez-tree` integration without touching its code. Use it to prototype flexible, stylised foliage with three distinct growth stages and fantasy elements.

## Getting Started

1. Import the generator and a preset:
   ```ts
   import { AbstractPlant } from './AbstractPlant';
   import { glowShroom } from './PlantPresets';

   const abstractPlant = new AbstractPlant();
   const plantMesh = abstractPlant.generate(glowShroom, 45); // 45% growth
   scene.add(plantMesh);
   ```
2. Update growth by regenerating with a different `growthPercent` (0–100). Each call returns a fresh `THREE.Group`.
3. For a quick showcase, run `abstract-plant-demo.ts` inside the Vite dev server to view all presets animating from seedling to mature.

## Configuration Reference

All behaviour is controlled by the `AbstractPlantConfig`:

| Parameter | Description |
| --------- | ----------- |
| `maxHeight` | Full-grown height of the plant. Drives all other relative measurements. |
| `trunkThickness` | Base radius of the trunk. |
| `trunkTaper` | Fractional taper (0–1) applied along the trunk. |
| `branchLevels` | Number of vertical tiers that can spawn branches. |
| `branchesPerLevel` | Radial branch count per tier. |
| `branchAngle` | Base pitch of branches in degrees (positive tilts outward). |
| `branchLength` | Multiplier applied to `maxHeight` for branch length. |
| `branchCurve` | Curvature of branches (-1 backward arc, 1 forward arc). |
| `branchThickness` | Relative thickness of primary branches compared to trunk. |
| `branchThicknessFalloff` | How quickly branches thin per level (0–1 keeps them thick, >1 exaggerates taper). |
| `branchAtApex` | When true, the top of the trunk can carry a final branch tier. |
| `branchChildren` | Optional subdivision rules (`levels`, `branchesPerLevel`, `lengthScale`, `thicknessScale`, `angle`, `spread`, `curve`, `leafScale`). |
| `roots` | Optional root flare (`enabled`, `count`, `length`, `thickness`, `taper`, `spread`, `flareHeight`). |
| `leafShape` | Primitive leaf form: `sphere`, `ellipsoid`, `cone`, or `spiky`. |
| `leafSize` | Scalar for leaf primitives before per-instance jitter. |
| `leafCount` | Approximate total leaves (distributed across branches). |
| `leafDistribution` | Placement pattern: `spiral`, `opposite`, `whorled`, `clustered`. |
| `leafColor` | `THREE.Color` applied to foliage. |
| `flowers` | Optional bloom block (`enabled`, `petalCount`, `size`, `color`, `position`). |
| `fruit` | Optional fruit block (`enabled`, `shape`, `size`, `color`, `count`). |
| `glow` | Optional emissive accent (`enabled`, `intensity`, `color`). |
| `crystals` | Optional crystalline growth (`enabled`, `size`, `count`, `color`, `placement`). Placements support `trunk`, `branches`, and `roots`. |
| `trunkColor` | Primary bark colour. |
| `trunkMetallic` | Metallic channel for the trunk material. |
| `trunkRoughness` | Roughness channel for the trunk material. |

The generator blends three internal growth profiles (seedling, young, mature) using the provided `growthPercent`. Every numeric property can be tuned per species.

## Creating New Species

1. Start from the preset closest to your target and copy it.
2. Adjust structure: `maxHeight`, `branchLevels`, `branchesPerLevel`, and `branchLength`.
3. Refine branch styling with `branchThickness`, `branchThicknessFalloff`, and optional `branchChildren` recursion for secondary splits.
4. Dial in leaf style with `leafShape`, `leafSize`, `leafCount`, and `leafDistribution`.
5. Layer in accents:
   - Blooms with `flowers.position` (`top`, `branches`, `trunk`).
   - Fruit clusters across branch tips.
   - Crystals with targeted `placement` (trunk, branches, roots).
   - Root flares using the `roots` block for exposed buttress or tendril-style bases.
   - Emissive glow for alien designs.
6. Test growth transitions by regenerating at 10% increments to ensure silhouettes stay readable.

Presets live in `PlantPresets.ts`. Export any new configuration there to reuse across the project.

## Performance Notes

- Leaves use instanced meshes so the demo sustains 30+ stylised plants comfortably.
- Branch, child branch, and root geometries are modestly segmented to balance curvature and draw calls.
- Each generated `THREE.Group` exposes `userData.dispose()` to free geometries/materials.
- Particle systems can attach to `group.userData.particleAnchors`, which includes branch tips and the canopy apex.
- For dynamic growth in-game, reuse the same `AbstractPlant` instance and regenerate meshes as needed.

## Demo

`abstract-plant-demo.ts` renders all presets side-by-side, animating growth from 0–100% in five-second loops and cycling presets afterward. It exposes `window.abstractPlantDemo` for quick tweaks:

```ts
// At runtime in DevTools
abstractPlantDemo.regenerate('tentaclePlant', 80);
console.log(abstractPlantDemo.presets);
```

Use the demo to validate visual direction before wiring the system into gameplay. Adjust presets or craft new species, then compare silhouettes and performance in the same scene.

