# Botanica - Technical Implementation Notes

**Last Updated:** November 5, 2025  
**Version:** 1.1 - MVP Refinements

## Current Implementation Status

### ✅ Completed Components

#### 1. Plant3D System (FULLY IMPLEMENTED)
**Location:** `src/plants/Plant3D.ts`, `src/plants/presets3d.ts`

The project successfully migrated from L-system 2D plants to full 3D realistic plants using the **ez-tree** library.

**What Works:**
- Plant3D wrapper class provides simplified API
- 6 plant presets: Fern, Bush, Tree, Vine, Pine, Sapling
- Configurable parameters: trunk height, branch density, leaf size, colors
- Genetics system: `getGenetics()`, breeding, cloning functions
- Leaf animation support (wind/sway effects)
- Proper resource disposal

**Key Files:**
- `src/plants/Plant3D.ts` - Main plant class wrapper
- `src/plants/presets3d.ts` - Preset configurations
- `src/plants/genetics.ts` - Breeding system
- `PLANT3D_GUIDE.md` - Comprehensive usage documentation

**Integration:**
```typescript
// Current usage in main.ts
const fern = Plant3D.createFern();
fern.getMesh().position.set(0, 0, 0);
scene.add(fern.getMesh());
```

#### 2. Scene Management (FULLY IMPLEMENTED)
**Location:** `src/scene/`

Professional Three.js scene setup with proper architecture.

**Components:**
- `Scene.ts` - Scene manager with renderer
- `Camera.ts` - Camera + OrbitControls
- `Lighting.ts` - Ambient + directional lighting

**Configuration:**
- Configurable via interfaces in `src/types/index.ts`
- Clean separation of concerns
- Proper disposal patterns

#### 3. Glass Dome Container (IMPLEMENTED - KEEPING AS SIGNATURE AESTHETIC)
**Location:** `src/terrarium/`

The glass dome "snow globe" aesthetic is now a core design element for ALL environments.

**What Exists:**
- `GlassDome.ts` - Transparent sphere geometry ✅ KEEPING
- `Soil.ts` - Circular soil plane (base for environments)

**What Needs to Change:**
- Rename/refactor `Soil.ts` to be environment-specific base (BackyardGround, IndoorFloor, etc.)
- Add grass/ground plane inside dome for backyard
- Add paver tiles for plant placement area
- Add pot container objects
- Future: Different dome contents for indoor, greenhouse, etc.

**Design Philosophy:** Each environment (backyard, indoor, greenhouse) will be contained within the glass dome. The dome stays constant, the contents change. This creates a unique "living diorama" aesthetic.

#### 4. Development Environment (WORKING)
- Vite + TypeScript setup
- Three.js properly configured
- Hot module reloading works
- Production builds successfully

### ❌ Not Yet Implemented (Core Systems Needed)

#### 1. Soil Chemistry System
**Required For:** Nutrient management, pH, drainage

**Needed Classes:**
```typescript
class SoilComposition {
  nitrogen: number;      // 0-100
  phosphorus: number;    // 0-100
  potassium: number;     // 0-100
  pH: number;            // 4.0-8.0
  drainage: 'poor' | 'medium' | 'good';
  organicMatter: number; // 0-100
  waterLevel: number;    // 0-100
  
  update(deltaTime: number, plant: Plant): void;
  addFertilizer(npkRatios: NPK): void;
  addCompost(amount: number): void;
  addWater(amount: number): void;
}
```

**Integration Point:** Each pot/container has a SoilComposition instance

#### 2. Economic System
**Required For:** Money, shop, transactions

**Needed Classes:**
```typescript
class Economy {
  money: number;
  
  earnMoney(amount: number, source: string): void;
  spendMoney(amount: number, item: string): boolean;
  canAfford(amount: number): boolean;
}

interface ShopItem {
  id: string;
  name: string;
  price: number;
  category: 'consumable' | 'pot' | 'tool' | 'plant';
  description: string;
}

class Shop {
  catalog: ShopItem[];
  
  purchase(itemId: string, economy: Economy): boolean;
  getAvailableItems(): ShopItem[];
}
```

**Integration Point:** Global economy manager, UI for shop interface

#### 3. Light Simulation
**Required For:** Sun exposure affecting plant growth

**Needed Classes:**
```typescript
class LightSimulation {
  timeOfDay: number;  // 0-24 hours
  
  getLightIntensityAtPosition(position: Vector3): number;
  update(deltaTime: number): void;
  getSunAngle(): number;
}

class LightZone {
  position: Vector3;
  lightLevel: number; // 0-100%
  description: 'full sun' | 'partial shade' | 'deep shade';
}
```

**Integration Point:** Plants query their position for light level

#### 4. Pruning System
**Required For:** Cutting branches, triggering re-growth

**Needed Classes:**
```typescript
class PruneableNode {
  position: Vector3;
  branchId: string;
  parent: PruneableNode | null;
  children: PruneableNode[];
  
  cut(): void;
  regrow(): void;
}

class PruningManager {
  activePlant: Plant | null;
  pruneMode: boolean;
  
  enterPruneMode(plant: Plant): void;
  exitPruneMode(): void;
  cutBranch(nodeId: string): void;
}
```

**Challenge:** ez-tree generates geometry procedurally. Need to:
- Map ez-tree structure to prunable nodes
- Regenerate tree with modified parameters after cut
- Show wound healing and new growth

#### 5. Side Activities System
**Required For:** Worm digging, composting

**Needed Classes:**
```typescript
class WormDigging {
  activeSpots: Vector3[];
  
  digAtPosition(pos: Vector3): { found: boolean; worms: number };
  getWormProbability(pos: Vector3): number;
}

class CompostBin {
  fillLevel: number;      // 0-100%
  maturityLevel: number;  // 0-100%
  
  addMaterial(amount: number): void;
  update(deltaTime: number): void;
  harvest(): { quality: number; amount: number };
}
```

**Integration Point:** Clickable zones for worm digging, compost bin object in scene

#### 6. Plant Lifecycle Management
**Required For:** Seed → Sprout → Mature → Fruiting

**Needed Extensions to Plant3D:**
```typescript
class ManagedPlant extends Plant3D {
  species: 'avocado' | 'tomato' | 'basil';
  age: number;           // in game hours
  growthStage: number;   // 0-100%
  maturityLevel: 'seed' | 'sprout' | 'seedling' | 'young' | 'mature' | 'fruiting';
  
  soilComposition: SoilComposition;
  lightExposure: number;
  
  fruit: Fruit[];
  
  update(deltaTime: number): void;
  checkFruitProduction(): void;
  harvestFruit(fruitId: string): Fruit;
}

class Fruit {
  age: number;
  ripeAt: number;
  quality: number;  // Affected by plant health during growth
  value: number;    // Selling price
  
  isRipe(): boolean;
}
```

**Integration Point:** Replaces current simple Plant3D usage

#### 7. Container System (Pots)
**Required For:** Individual soil instances, movable plants

**Needed Classes:**
```typescript
class PlantContainer {
  type: 'terracotta-small' | 'terracotta-large' | 'ceramic';
  position: Vector3;
  soil: SoilComposition;
  plant: ManagedPlant | null;
  drainageModifier: number;
  
  getMesh(): THREE.Group;
  plantSeed(species: string): void;
  removePlant(): ManagedPlant | null;
}
```

**Visual:** Need 3D models or procedural pots

#### 8. Time Management
**Required For:** Speed controls, day/night cycle

**Needed Classes:**
```typescript
class GameTime {
  currentTime: number;   // Hours since start
  timeScale: number;     // 1x, 5x, 10x
  isPaused: boolean;
  
  getTimeOfDay(): number;        // 0-24
  getDayNumber(): number;
  getScaledDelta(deltaTime: number): number;
  
  setSpeed(scale: number): void;
  pause(): void;
  resume(): void;
}
```

**Integration Point:** Global time manager that all systems query

#### 9. UI System
**Required For:** Inspection panel, shop, time controls

**Needed Components:**
- Inspection panel (HTML/CSS overlay)
- Shop modal (HTML/CSS)
- Time control HUD (HTML/CSS)
- Money counter (HTML)
- Notifications/tooltips

**Framework:** Vanilla HTML/CSS or React/Vue overlay?

#### 10. Save/Load System
**Required For:** Persistence between sessions

**Needed:**
```typescript
interface SaveData {
  version: string;
  timestamp: number;
  economy: {
    money: number;
    inventory: Record<string, number>;
  };
  plants: Array<{
    species: string;
    position: [number, number, number];
    age: number;
    genetics: PlantGenetics;
    soil: SoilComposition;
  }>;
  gameTime: {
    elapsed: number;
    dayNumber: number;
  };
}

class SaveManager {
  save(): void;
  load(): SaveData | null;
  autoSave(): void;
}
```

**Storage:** localStorage for web build

### 🔧 Components That Need Modification

#### 1. Main Application Structure
**Current:** `src/main.ts` - Simple demo with one fern

**Needs:**
- Initialize all core systems
- Create backyard scene (grass, pavers, pots)
- Set up interaction handlers (raycasting)
- Connect UI to game state
- Implement game loop with time scaling

**Proposed Structure:**
```typescript
class BotanicaGame {
  // Core systems
  sceneManager: SceneManager;
  economy: Economy;
  timeManager: GameTime;
  lightSim: LightSimulation;
  
  // Game objects
  containers: PlantContainer[];
  compostBin: CompostBin;
  wormDigging: WormDigging;
  
  // UI
  inspectionPanel: InspectionPanel;
  shop: Shop;
  
  init(): void;
  update(deltaTime: number): void;
  handleClick(position: Vector3): void;
}
```

#### 2. Plant3D Integration
**Current:** Direct ez-tree wrapper

**Needs:** Extension to include game mechanics
- Wrap Plant3D with ManagedPlant
- Add lifecycle stages
- Add nutrient/water consumption
- Add fruit production

#### 3. Scene Setup
**Current:** Glass dome terrarium ✅ KEEPING

**Needs:** Transform dome contents to backyard
- Ground plane with grass texture inside dome
- Paved area for pots
- Lighting that works through glass dome
- Compost bin model/geometry
- Sky/background visible through transparent dome

## Architecture Recommendations

### System Communication Pattern

Use event-driven architecture for system communication:

```typescript
// Example: Plant fruit ripens
class ManagedPlant extends EventEmitter {
  private checkFruitMaturity() {
    if (fruit.isRipe()) {
      this.emit('fruitRipe', { fruitId: fruit.id, value: fruit.value });
    }
  }
}

// UI listens and shows notification
plant.on('fruitRipe', (data) => {
  showNotification(`Avocado ready to harvest! ($${data.value})`);
});
```

### Data Flow

```
User Input (click, UI interaction)
    ↓
Game Manager (handles input, updates state)
    ↓
Systems Update (soil, plants, economy, time)
    ↓
Visual Update (Three.js render, UI refresh)
```

### File Structure Proposal

```
src/
├── core/
│   ├── Game.ts              # Main game manager
│   ├── Economy.ts           # Money management
│   ├── TimeManager.ts       # Time controls
│   └── SaveManager.ts       # Save/load
├── systems/
│   ├── SoilSystem.ts        # Soil chemistry
│   ├── LightSystem.ts       # Light simulation
│   ├── PlantGrowth.ts       # Growth calculations
│   └── PruningSystem.ts     # Pruning mechanics
├── entities/
│   ├── ManagedPlant.ts      # Extended Plant3D
│   ├── PlantContainer.ts    # Pots
│   ├── Fruit.ts             # Fruit objects
│   └── CompostBin.ts        # Compost bin
├── activities/
│   ├── WormDigging.ts       # Worm mini-game
│   └── Composting.ts        # Compost management
├── ui/
│   ├── InspectionPanel.tsx  # Plant details UI
│   ├── Shop.tsx             # Shop modal
│   ├── HUD.tsx              # Time, money display
│   └── Notifications.tsx    # Toast messages
├── scene/                   # Existing
├── terrarium/               # To be refactored
├── plants/                  # Existing Plant3D
├── types/                   # Existing + extensions
└── main.ts                  # Entry point
```

## Migration Path from Current Code

### Step 1: Core Systems
1. Implement TimeManager
2. Implement Economy
3. Implement basic UI framework

### Step 2: Plant Integration
1. Extend Plant3D to ManagedPlant
2. Implement SoilComposition
3. Connect plant growth to soil/time

### Step 3: Scene Transformation
1. Keep dome, transform contents to backyard
2. Add PlantContainer class
3. Create pot models

### Step 4: Interactions
1. Implement raycasting for clicks
2. Add inspection panel
3. Add shop interface

### Step 5: Activities
1. Implement worm digging
2. Implement composting
3. Connect to economy

### Step 6: Plant Lifecycle
1. Add growth stages to plants
2. Implement fruit production
3. Add harvesting mechanics

### Step 7: Polish
1. Visual feedback for all states
2. Notifications and tooltips
3. Save/load system
4. Balancing and tuning

## Technical Challenges to Solve

### Challenge 1: Pruning with Procedural Plants
**Problem:** ez-tree generates plants procedurally. How to prune specific branches?

**Possible Solutions:**
1. **Regenerate with parameters** - Adjust branch density, levels after cut
2. **Manual branch overlay** - Add/remove manual branches on top of procedural base
3. **Seed manipulation** - Change seed to regenerate slightly differently

**Recommended:** Option 1 - Modify generation parameters and regenerate

### Challenge 2: Plant Visual Variation for Species
**Problem:** Need different looking avocados, tomatoes, etc.

**Solutions:**
1. Use different presets per species
2. Adjust colors, sizes, growth patterns
3. Attach fruit models at specific points

**Recommended:** Preset per species + fruit as separate objects

### Challenge 3: Performance with Many Plants
**Problem:** 20-30 detailed 3D plants might be heavy

**Optimizations:**
1. Use LOD (Level of Detail) - simpler models when zoomed out
2. Instance similar plants
3. Limit branch levels for background plants
4. Freeze updates for off-screen plants

### Challenge 4: UI Framework Choice
**Problem:** Vanilla HTML/CSS vs React/Vue/Svelte?

**Recommendation:** Start with vanilla HTML/CSS for simplicity
- Easier to integrate with Three.js
- No build complications
- Can refactor to framework later if needed

## Dependencies

### Current
- three (0.169.0+)
- @types/three
- vite
- typescript
- ez-tree (custom integration)

### May Need to Add
- EventEmitter library (for system communication)
- UI library (if going beyond vanilla)
- State management (if complexity grows)

## Performance Targets

- 60 FPS with 20 plants at 1x speed
- 60 FPS with 10 plants at 10x speed
- Smooth animations even when time-scaled
- Save/load under 1 second
- UI responsive under 100ms

## MVP-Specific Implementation Notes

### Starting State Configuration
**Critical:** Game must initialize with proper starting state to avoid "too slow" problem

```typescript
interface StartingState {
  money: number;              // $10 (not $0)
  inventory: {
    fertilizer: number;       // 1 bottle
    soil: number;             // 1 bag (used for initial plant)
    pots: number;             // 3 empty pots
  };
  plants: [{
    species: 'avocado';
    age: number;              // Pre-aged to fruiting stage
    fruit: number;            // 2-3 ripe fruit ready to harvest
    soilNPK: {N: 60, P: 60, K: 60}; // Decent starting nutrients
  }];
}
```

### Progressive Shop Unlock System
Track milestones to unlock shop items:

```typescript
class ShopUnlockManager {
  milestones = {
    firstFruitSale: false,      // Unlocks pruning shears
    firstCompostHarvest: false, // Unlocks worm rake, pH meter
    threeP lantsGrowing: false,  // Unlocks large pots, pre-potted plants
    fiftyDollarsEarned: false,  // Unlocks soil tester
    hundredDollarsEarned: false // Unlocks advanced tools
  };
  
  checkMilestone(event: MilestoneEvent): void;
  getAvailableItems(): ShopItem[];
}
```

### Granny's Tips Trigger System
Context-sensitive tutorial system:

```typescript
class GrannyTipsManager {
  shownTips: Set<string> = new Set();
  
  checkTriggers(): void {
    // Check various game state conditions
    if (!this.shownTips.has('first_nitrogen_low')) {
      if (anyPlant.soil.nitrogen < 30) {
        this.showTip('first_nitrogen_low', TIPS.nitrogenLow);
      }
    }
    
    if (!this.shownTips.has('first_pruning_ready')) {
      if (anyPlant.maturity >= 70 && !player.hasItem('pruning_shears')) {
        this.showTip('first_pruning_ready', TIPS.pruningReady);
      }
    }
    // ... more triggers
  }
  
  showTip(id: string, message: string): void {
    // Show tooltip UI
    this.shownTips.add(id);
    // Save to localStorage so tips don't repeat across sessions
  }
}
```

### Worm Digging Visual Hints
Make worm digging less tedious with visual feedback:

```typescript
class WormDigging {
  getWormProbabilityAtPosition(pos: Vector3): number {
    let probability = 0.1; // Base 10% chance
    
    // Visual hint: darker soil = more likely
    if (this.isNearCompostBin(pos, 2.0)) {
      probability *= 2.0; // 20% near compost
    }
    
    if (this.weatherWasRecentRain()) {
      probability *= 1.5; // 15-30% after rain
    }
    
    if (this.isCurrentlyMorning()) {
      probability *= 1.2; // Slight morning boost
    }
    
    return Math.min(probability, 0.6); // Cap at 60%
  }
  
  getSoilDarknessForPosition(pos: Vector3): number {
    // Return 0-1 darkness value for soil texture
    // Higher probability areas = visually darker soil
    return this.getWormProbabilityAtPosition(pos) / 0.6;
  }
}
```

### Pruning Ghost Preview
Show players where new growth will appear:

```typescript
class PruningSystem {
  ghostPreviews: THREE.Mesh[] = [];
  
  onBranchHover(branch: PruneableNode): void {
    this.clearGhostPreviews();
    
    // Calculate where new branches would grow
    const growthPoints = this.calculateNewGrowthPoints(branch);
    
    growthPoints.forEach(point => {
      const ghost = this.createGhostBranch(point);
      ghost.material.opacity = 0.3;
      ghost.material.transparent = true;
      this.ghostPreviews.push(ghost);
      scene.add(ghost);
    });
  }
  
  clearGhostPreviews(): void {
    this.ghostPreviews.forEach(mesh => scene.remove(mesh));
    this.ghostPreviews = [];
  }
}
```

### Time Scale Animation
Make fast-forward visually satisfying:

```typescript
class GameTime {
  getAnimationSpeedMultiplier(): number {
    // Return multiplier for animations based on time scale
    switch(this.timeScale) {
      case 1: return 1.0;   // Normal speed
      case 5: return 3.0;   // Visibly faster
      case 10: return 5.0;  // Time-lapse effect
      default: return 1.0;
    }
  }
  
  shouldShowMilestoneNotification(plant: Plant): boolean {
    // Show notification when reaching growth milestones
    // Even if game is paused/minimized
    return plant.hasReachedNewGrowthStage();
  }
}

// In plant update loop:
plant.update(deltaTime * gameTime.getAnimationSpeedMultiplier());
```

### Pruning Feedback UI
Quantify benefits so players understand impact:

```typescript
class PruningFeedbackUI {
  showPruningResults(plant: Plant, branch: Branch): void {
    const beforeLeafCount = plant.getLeafCount();
    const beforePotentialYield = plant.getPotentialFruitYield();
    
    // Perform the prune
    plant.pruneBranch(branch);
    
    // Calculate after waiting for regrowth (or simulate)
    const afterLeafCount = plant.getProjectedLeafCount();
    const afterPotentialYield = plant.getProjectedFruitYield();
    
    const leafIncrease = ((afterLeafCount - beforeLeafCount) / beforeLeafCount) * 100;
    const yieldIncrease = ((afterPotentialYield - beforePotentialYield) / beforePotentialYield) * 100;
    
    this.showNotification([
      `Pruning increased leaf count by ${leafIncrease.toFixed(0)}%`,
      `Potential fruit yield improved by ${yieldIncrease.toFixed(0)}%`,
      `Added pruning material to compost bin`
    ]);
  }
}
```

## MVP Development Priority Order

### Phase 1: Foundation (Week 1-2)
1. TimeManager class (time controls, speed scaling)
2. GameTime integration with Plant3D growth
3. Basic backyard scene inside dome (grass plane, paver area)
4. Single pot with avocado plant
5. Water system (simple depletion + refill)

### Phase 2: Nutrients (Week 3)
1. SoilComposition class (NPK tracking)
2. Nutrient consumption during growth
3. Visual plant changes (color shifts for deficiency)
4. Inspection panel UI (show NPK values)
5. Fertilizer item implementation

### Phase 3: Economy (Week 4)
1. Economy manager (money tracking)
2. Fruit production system
3. Harvest interaction
4. Shop UI (basic items only)
5. Starting state setup ($10, 1 fert, 2-3 fruit)

### Phase 4: Expansion (Week 5)
1. Multiple container support
2. Worm digging with visual hints
3. Compost bin object
4. Pruning system with ghost preview
5. GrannyTipsManager implementation
6. Progressive shop unlocks

### Phase 5: Polish (Week 6)
1. Visual feedback pass (all plant states)
2. UI polish and responsiveness
3. Balancing tuning pass
4. Milestone notification system
5. Save/load implementation
6. Performance optimization

## Next Steps for Development

1. ✅ **Design refinements complete** - All MVP concerns addressed
2. **Decision:** Choose UI approach (vanilla HTML/CSS recommended for MVP)
3. **Implement:** TimeManager + starting state configuration
4. **Implement:** ManagedPlant wrapper with fruit production
5. **Implement:** SoilComposition with visual feedback
6. **Build:** Basic UI (inspection panel, shop, HUD)
7. **Implement:** GrannyTipsManager for organic tutorials
8. **Iterate:** Playtest, balance, polish based on critical questions

## Notes on Existing Code

### What to Keep
- Entire `src/plants/` directory (Plant3D is solid)
- `src/scene/` structure (good architecture)
- Type definitions in `src/types/`
- Build configuration (Vite setup works well)

### What to Keep/Refactor
- `src/terrarium/GlassDome.ts` - ✅ KEEPING - Core visual signature
- `src/terrarium/Soil.ts` - REFACTOR to environment-specific bases
- Current `main.ts` - Expand with full game structure

### What to Rename/Refactor
- `terrarium/` → `environment/` (but keep dome, just expand contents)
- `Soil.ts` → Create environment-specific classes (BackyardGround, IndoorFloor, etc.)
- Add `_deprecated/` folder for old L-system code if still present

## Documentation to Create

As development progresses:
1. **SYSTEM_GUIDE.md** - How each system works in detail
2. **API_REFERENCE.md** - Class/method documentation
3. **BALANCING.md** - Tuning values for gameplay
4. **ART_ASSETS.md** - Models, textures, how to add new ones

## Conclusion

The foundation is solid (Plant3D, scene setup), but significant work remains:
- 10 new core systems to implement
- UI layer to build
- Integration of all systems
- Balancing and polish

Estimated development time: 60-120 hours for Phase 1 MVP with all specified systems.

The modular architecture proposed will allow iterative development - each system can be built and tested independently before integration.

