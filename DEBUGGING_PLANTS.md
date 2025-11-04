# Debugging Plant Visualization

## What You're Seeing

When a plant doesn't look right, here's how to debug it:

### Common Issues

#### 1. **No Leaves Visible**

**Possible causes:**
- Leaves are too small (invisible)
- Leaves are too large (overlapping/culled)
- Not enough leaf count
- Leaves only appear on final branch level

**How to check:**
```typescript
const config = fern.getConfig();
console.log('Leaf size:', config.leafSize); // This gets multiplied by 10 internally
console.log('Leaf density:', config.leafDensity); // 0-1 maps to 10-50 leaves
```

**Solutions:**
- Increase `leafSize`: Try 0.1 to 0.2 (becomes 1.0 to 2.0 units)
- Increase `leafDensity`: 0.9 = ~46 leaves
- Check `branchLevels`: Leaves only appear on the final level

#### 2. **Thin/Invisible Branches**

**Possible causes:**
- Plant is too small (branches scale with trunk height)
- Branch radius is calculated proportionally

**How trunk height affects everything:**
```typescript
trunkHeight: 1.5  → trunk radius: ~0.12 → branches: microscopic
trunkHeight: 4    → trunk radius: ~0.32 → branches: visible
trunkHeight: 10   → trunk radius: ~0.80 → branches: thick
```

**Solution:**
- Increase `trunkHeight` to at least 3-5 for small plants

#### 3. **Wrong Scale**

Plants use real-world-ish units. Your terrarium has `radius: 1.5`, so:
- A plant with `trunkHeight: 1.5` is the same size as your terrarium!
- Recommended heights for terrarium: 2-8 units

### Parameter Guide

#### `trunkHeight` (controls overall size)
```typescript
trunkHeight: 2    // Tiny plant (bonsai)
trunkHeight: 5    // Small plant (fern/bush)
trunkHeight: 10   // Medium plant (small tree)
trunkHeight: 20   // Large plant (full tree)
```

#### `leafSize` (multiplied by 10 internally!)
```typescript
leafSize: 0.05    // Very small (0.5 units) - too small
leafSize: 0.10    // Small (1.0 units) - good for ferns
leafSize: 0.15    // Medium (1.5 units) - good for trees
leafSize: 0.25    // Large (2.5 units) - too large usually
```

#### `branchDensity` (controls branch count per level)
```typescript
branchDensity: 0.2   // Sparse: 2-3 branches
branchDensity: 0.5   // Medium: 4-5 branches
branchDensity: 0.8   // Dense: 6-7 branches
branchDensity: 1.0   // Very dense: 8 branches
```

#### `branchLevels` (recursion depth)
```typescript
branchLevels: 1   // Just trunk, no branches
branchLevels: 2   // Trunk + 1 level of branches (simple)
branchLevels: 3   // Trunk + 2 levels (normal trees)
branchLevels: 4   // Trunk + 3 levels (detailed, slower)
branchLevels: 5   // Trunk + 4 levels (very detailed, slow)
```

**Important:** Leaves only appear on the FINAL branch level!
- If `branchLevels: 3`, leaves appear on level 3 branches only
- More levels = smaller final branches = smaller leaves

### Quick Fixes

#### "I see trunk but no leaves"

```typescript
Plant3D.createFern({
  trunkHeight: 5,        // Bigger plant
  leafSize: 0.15,        // Bigger leaves (1.5 units)
  leafDensity: 0.9,      // Lots of leaves
  branchLevels: 2,       // Simpler = bigger final branches = easier to see
})
```

#### "Everything is too small"

```typescript
Plant3D.createFern({
  trunkHeight: 8,        // Much taller
  leafSize: 0.2,         // Much bigger leaves
})
```

#### "I see branches but they're too thin"

Branches scale with trunk height. Solution:
```typescript
Plant3D.createFern({
  trunkHeight: 10,       // Taller = thicker branches
})
```

#### "Too many tiny branches (confusing)"

```typescript
Plant3D.createFern({
  branchDensity: 0.4,    // Fewer branches
  branchLevels: 2,       // Simpler structure
})
```

### Recommended Starting Points

#### For Terrarium (radius 1.5)

**Small fern-like plant:**
```typescript
{
  trunkHeight: 4,
  branchDensity: 0.7,
  leafDensity: 0.8,
  leafSize: 0.12,
  branchLevels: 3
}
```

**Medium bush:**
```typescript
{
  trunkHeight: 6,
  branchDensity: 0.85,
  leafDensity: 0.9,
  leafSize: 0.15,
  branchLevels: 2
}
```

**Small tree:**
```typescript
{
  trunkHeight: 8,
  branchDensity: 0.6,
  leafDensity: 0.7,
  leafSize: 0.15,
  branchLevels: 3
}
```

### Debugging Checklist

1. **Check the console output:**
   ```
   Config: { trunkHeight: 4, leafSize: 0.12, ... }
   Performance: { vertexCount: 5234, triangleCount: 3421 }
   ```

2. **Verify leaf count in metrics:**
   - Low vertex count (< 1000) = probably no leaves rendering
   - High vertex count (> 3000) = leaves are there

3. **Check camera position:**
   - Make sure camera can see the plant
   - Try zooming in/out
   - Plant at (0, 0, 0), camera should be a few units away

4. **Verify plant is in scene:**
   ```typescript
   console.log('Plant added:', scene.children.includes(plant.getMesh()));
   ```

### Advanced: Understanding the Conversion

**leafSize conversion:**
```typescript
config.leafSize = 0.12
→ ez-tree sees: 0.12 * 10 = 1.2 units
```

**leafDensity conversion:**
```typescript
config.leafDensity = 0.9
→ ez-tree sees: 10 + (0.9 * 40) = 46 leaves
```

**branchDensity conversion:**
```typescript
config.branchDensity = 0.8
→ ez-tree sees: 2 + (0.8 * 6) = ~7 children per branch
```

### Visual Debugging

Add wireframe to see structure:
```typescript
const plant = Plant3D.createFern();
plant.getMesh().traverse((child) => {
  if (child instanceof THREE.Mesh) {
    child.material.wireframe = true;
  }
});
```

Or check bounding box:
```typescript
const box = new THREE.Box3().setFromObject(plant.getMesh());
console.log('Plant size:', box.getSize(new THREE.Vector3()));
```

### Still Having Issues?

1. Try the simplest possible plant:
   ```typescript
   new Plant3D({
     trunkHeight: 10,
     branchLevels: 1,  // No branches, just trunk
     leafDensity: 0.5,
     leafSize: 0.2
   })
   ```

2. Check browser console for WebGL errors

3. Verify Three.js version is 0.167+:
   ```bash
   npm list three
   ```

4. Try a different preset:
   ```typescript
   Plant3D.createTree({ size: 'small', trunkHeight: 6 })
   ```

