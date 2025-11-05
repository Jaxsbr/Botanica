# Individual Podule Sizing Implementation

**Date:** November 5, 2025  
**Feature:** Per-Podule Size Control  
**Status:** ✅ Complete

## Overview

Implemented the ability for each podule to have its own individual size (radius), allowing for optimal design of different game areas without being constrained to a single size for all podules.

## Problem

Previously, all podules shared the same radius from the base `PoduleConfig`. This meant:
- Home podule and Shop podule were forced to be the same size
- Couldn't optimize each podule for its specific purpose
- Shop nursery felt cramped, but scaling up affected the home podule too

## Solution

Added optional `radiusOverride` parameter to `BasePodule` constructor:

```typescript
constructor(type: PoduleType, config: PoduleConfig, radiusOverride?: number) {
    this.radius = radiusOverride ?? config.radius;
    this.dome = new PoduleDome(this.radius);
}
```

Each podule can now specify its own size while still inheriting other config properties.

## Implementation Changes

### 1. BasePodule (`src/podules/BasePodule.ts`)
- Added `protected radius: number` property
- Added optional `radiusOverride?: number` parameter to constructor
- Uses override if provided, otherwise falls back to `config.radius`
- Passes `this.radius` to `PoduleDome` constructor

### 2. HomePodule (`src/podules/HomePodule.ts`)
- Calls `super('home', config, 4.0)` - explicitly sets radius to 4.0
- Uses `this.radius` for `GrassGround` instead of `config.radius`
- Maintains cozy backyard feel at original size

### 3. ShopPodule (`src/podules/ShopPodule.ts`)
- Calls `super('shop', config, 8.0)` - explicitly sets radius to 8.0
- Uses `this.radius` for ground plane instead of `config.radius`
- Creates spacious nursery with room to explore

### 4. Main Configuration (`src/main.ts`)
- Base `poduleConfig.radius` set to 4.0 (default size)
- Camera position adjusted to `(0, 4, 6)` - works well for both sizes
- Individual podules override as needed

## Result

**Home Podule:**
- Radius: 4.0
- Cozy backyard scene
- Single plant with pot
- Comfortable scale for gardening activities

**Shop Podule:**
- Radius: 8.0 (2x larger)
- Spacious plant nursery
- Room for indoor building + outdoor covered area
- 18+ plants on display
- Multiple product displays (soil, pots, fertilizers)
- Easy to explore and navigate

## Benefits

✅ **Design Flexibility** - Each podule optimized for its purpose  
✅ **No Breaking Changes** - Existing podules work without modification  
✅ **Simple API** - Just pass third parameter to `super()`  
✅ **Future-Proof** - Easy to add more podules with different sizes  
✅ **Maintains Consistency** - Non-size configs still shared via `PoduleConfig`  

## Usage Example

```typescript
// Small cozy podule
export class HomePodule extends BasePodule {
    constructor(config: PoduleConfig) {
        super('home', config, 4.0); // Override to 4.0
        // ...
    }
}

// Large spacious podule
export class ShopPodule extends BasePodule {
    constructor(config: PoduleConfig, camera: THREE.Camera) {
        super('shop', config, 8.0); // Override to 8.0
        // ...
    }
}

// Default size podule
export class NewPodule extends BasePodule {
    constructor(config: PoduleConfig) {
        super('new', config); // No override, uses config.radius
        // ...
    }
}
```

## Future Possibilities

- Greenhouse podule: 6.0 radius (medium)
- Indoor growing room: 3.0 radius (small, intimate)
- Outdoor garden expansion: 12.0 radius (huge)
- Tutorial podule: 2.0 radius (tiny, focused)

Each podule can be sized perfectly for its gameplay purpose!

---

**Build Status:** ✅ Passing (0 errors, 0 warnings)  
**Lines Changed:** ~30 lines across 4 files  
**Breaking Changes:** None

