# 🌿 Botanica

A semi-realistic gardening simulation with economic progression - tend plants through their full lifecycle, manage soil chemistry, and build your garden operation from a single avocado plant into a thriving botanical business.

## About

Botanica is a **digital hobby** that combines deep horticultural systems with accessible gameplay. Players manage real gardening concepts (NPK nutrients, pH levels, light exposure, pruning) in gamified form, earning money through plant sales and side activities to expand their operation.

This is not a game to "beat" - it's something you check on for 10-20 minute sessions, make decisions, watch progress, and return to later. Like real gardening, success comes from understanding interconnected systems and patient observation.

## Current Status: Phase 1.3 Complete ✅ → Moving to Phase 1.4

The project has successfully transitioned from simple terrarium concept to a backyard gardening simulation inside a glass dome. Full 3D plant rendering is implemented via Plant3D/ez-tree. Phase 1.1 (Foundation & Scene), Phase 1.2 (Core Economy), and Phase 1.3 (Soil & Water) are complete with functional soil chemistry, water depletion, and plant inspection systems fully operational.

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

**Implemented:**
- ✅ Vite + TypeScript development environment
- ✅ Three.js 3D scene with orbit controls
- ✅ Professional lighting setup
- ✅ **Plant3D system** - Full 3D realistic plants via ez-tree library
- ✅ **Plant genetics** - Breeding, cloning, trait inheritance
- ✅ **6 plant presets** - Fern, Bush, Tree, Vine, Pine, Sapling
- ✅ **Leaf animation** - Wind/sway effects
- ✅ Feature-based code architecture
- ✅ **Phase 1.1 Complete** - Backyard scene with grass, pavers, and pot system
- ✅ **Podule System** - Navigation between game areas (Home, Shop) with smooth transitions

**Phase 1.2 - Core Economy (Complete):**
- ✅ Podule navigation system (Home ↔ Shop)
- ✅ Podule architecture (BasePodule, PoduleManager)
- ✅ Icon-based navigation UI with transitions
- ✅ **Interactive Plant Nursery Shop** - 3D environment with hotspots
- ✅ **Hotspot System** - Click zones for product categories
- ✅ **Shop UI Overlay** - Filtered item display by category
- ✅ **Mock Item Catalog** - Tools, pots, fertilizers, soil products
- ✅ **Economy System** - Money tracking with earn/spend, localStorage persistence
- ✅ **Money Display UI** - Top-right balance display with flash animations
- ✅ **Inventory System** - Track owned items with localStorage persistence
- ✅ **Purchase System** - Shop-to-economy-to-inventory flow complete
- ✅ **Inventory UI** - Modal overlay with category filtering and item display
- ✅ **Functional Purchases** - Buy items, track quantities, disable re-purchase of tools/pots

**Phase 1.3 - Soil & Water (Complete):**
- ✅ **Soil Chemistry System** - NPK nutrients (N/P/K 0-100), pH levels (4.0-9.0), drainage types
- ✅ **Water Management** - Water level tracking (0-100%), time-based depletion
- ✅ **Drainage Effects** - Poor (slow evaporation), Medium (standard), Good (fast evaporation)
- ✅ **Misleading Visual Feedback** - Soil color deceives based on drainage type
  - Poor drainage: Surface looks wetter than actual (+15% visual offset)
  - Good drainage: Surface looks drier than actual (-15% visual offset)
  - Medium drainage: Accurate representation (like real gardening!)
- ✅ **Plant Inspection UI** - Click pots to view soil stats and water levels
- ✅ **Interactive Watering** - Water button (requires watering-can from shop)
- ✅ **Three-Tier Information System** - Meaningful tool progression
  - No meter: See "Last watered: X ago" + misleading visuals (risky!)
  - Basic Moisture Meter ($25): Shows status text revealing true moisture
  - Pro Moisture Meter ($50): Full stats with exact % and progress bar
- ✅ **Pot Interactions** - Raycasting, hover cursors, clickable pots
- ✅ **Water Depletion** - Automatic water loss over time based on drainage type
- ✅ **Time Tracking** - Smart "last watered" display (just now, X mins/hours/days ago)
- ✅ **Soil Persistence** - Save/load soil state with last watered time

**Upcoming Phases:**
- ⏳ Phase 1.4 - Plant Growth (lifecycle stages, time controls)
- ⏳ Phase 1.5 - Harvest & Income (fruit collection, sales)
- ⏳ Phase 1.6 - Side Activities (worm digging, composting)
- ⏳ Phase 1.7 - Light & Polish (sun simulation, UI polish)

## How to Play (Current Features)

1. **Navigate Between Podules** - Use the bottom navigation bar to switch between Home (🏠) and Shop (🛒)
2. **Explore the Plant Nursery** - Rotate camera to view the indoor building and outdoor plant displays
3. **Click Hotspots** - Hover over glowing green zones to highlight them, click to browse that category
4. **Browse Shop Items** - View tools, pots, fertilizers, and soil products with prices and descriptions
5. **Track Your Money** - See your balance ($100 starting) in the top-right corner with flash animations
6. **Purchase Items** - Click "Buy" buttons to spend money and add items to your inventory
7. **View Inventory** - Click the backpack icon (🎒) in the navigation bar to see all owned items
8. **Filter Inventory** - Use category tabs to filter your items (All, Tools, Pots, Fertilizers, Soil)
9. **Smart Purchases** - Tools/pots can only be bought once (button disables), consumables can be bought multiple times
10. **Inspect Plants** - Click on pots in the home podule to view detailed soil stats
11. **Monitor Soil Health** - Check water levels, NPK nutrients, pH, and drainage type
12. **Water Your Plants** - Purchase a watering can ($5), then click "Water Plant" in the inspection UI
13. **Watch Soil Changes** - Soil color darkens when wet, lightens as it dries over time
14. **Get Moisture Alerts** - Buy a moisture meter ($15) to see detailed hydration status

## Core Concept

You start with a single potted avocado plant (a gift from your grandmother) in a small backyard contained within a glass dome. Each game area exists in its own **podule** - a self-contained environment inside a glass dome, creating a unique miniature diorama aesthetic. Navigate between podules (Home, Shop, etc.) to manage your garden operation. Your goal: build a thriving garden by:

- Managing soil nutrients (NPK ratios, pH, drainage)
- Controlling light exposure and watering
- Harvesting and selling fruit for income
- Earning money through side jobs (digging worms, composting)
- Expanding your operation with new pots, plants, and equipment
- Pruning plants to control shape and encourage growth

Every system is interconnected - pruning creates compost, compost attracts worms, worms = money, money buys nutrients for better plants. The loop is endlessly satisfying.

## Game Systems

### Phase 1: Core Simulation (Current Focus)

Phase 1 is broken into 7 manageable sub-phases for iterative development:

#### **1.1 - Foundation & Scene** (Week 1)
- Transform terrarium contents to backyard scene (grass, pavers, pots inside dome)
- Keep glass dome as "snow globe" framing device
- Basic pot container system
- Camera controls for dome viewing
- Single plant in pot (using existing Plant3D)

#### **1.2 - Core Economy** (Week 1-2)
- Economy system (money tracking)
- Basic shop UI (buy pots, soil, fertilizer)
- Transaction system
- Money display in UI

#### **1.3 - Soil & Water** (Week 2)
- Soil chemistry class (NPK, pH, drainage, water)
- Watering mechanic
- Visual feedback for soil states
- Plant inspection UI (show soil stats)

#### **1.4 - Plant Growth** (Week 3)
- Lifecycle stages (seed → fruiting)
- Growth tied to soil nutrients + time
- Visual changes per growth stage
- Time controls (pause, 1x, 5x, 10x)

#### **1.5 - Harvest & Income** (Week 3-4)
- Fruit generation on mature plants
- Harvest mechanic (click fruit → collect)
- Sell fruit for money (close the economic loop)
- Seeds from harvested fruit

#### **1.6 - Side Activities** (Week 4)
- Worm digging system
- Compost bin basic version
- Pruning basics (if time allows)

#### **1.7 - Light & Polish** (Week 5)
- Light simulation (position-based sun exposure)
- Plant stress visuals
- UI polish and tutorial tooltips

**Core Systems Overview:**
- NPK (Nitrogen, Phosphorus, Potassium) tracking
- pH levels affecting nutrient availability
- Drainage types (poor, medium, good)
- Water management
- Economic progression (earn from sales, spend on expansion)
- Plant lifecycle (seed → sprout → seedling → young → mature → fruiting)
- Position-based light exposure
- Pruning and regrowth mechanics
- Side activities (worm digging, composting)

### Phase 2: Expansion (Future)
- Breeding and genetics system
- Indoor vs outdoor growing (different dome contents)
- Pest and disease management
- Advanced training (bonsai, wire training)
- Propagation stations for cuttings
- Multiple domes for different growing areas
- Weather and seasons (visible through dome)
- More plant species

## Design Philosophy

**Living Diorama Aesthetic**
- All game areas exist as "podules" - self-contained environments in glass domes
- Creates a unique miniature world feel (snow globe aesthetic)
- Navigate between podules with smooth transitions
- Each podule has its own dome, contents, and purpose (Home, Shop, etc.)
- **Individual podule sizing** - Each podule can have its own radius for optimal design
  - Home: Cozy backyard (4.0 radius)
  - Shop: Spacious nursery (8.0 radius)
- Signature visual identity that sets Botanica apart

**A Digital Hobby, Not a Game**
- Check in for 10-20 minute sessions, not multi-hour playthroughs
- No win/lose states - just feedback loops and optimization
- Systems that teach real gardening knowledge through gameplay
- Patient observation rewarded over twitch reflexes

**Semi-Realistic Simulation**
- Real concepts (NPK ratios, pH, photosynthesis) in accessible form
- Visual feedback over number watching
- Interconnected systems create emergent complexity
- Learn by doing, not tutorials

**Economic Core**
- Everything costs money, money comes from what you grow
- Early game: Bootstrap from nothing (worm digging, first fruit)
- Mid game: Optimize production and sales
- Late game: Breeding, collection, experimentation

## Technical Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Three.js** - 3D rendering and WebGL
- **Feature-based architecture** - Scene, Terrarium, and Type modules

**Project Structure:**
```
src/
├── scene/            # Scene, Camera, Lighting
├── podules/          # Podule system (BasePodule, Manager, Home, Shop)
├── ui/               # NavigationUI, TransitionOverlay, ShopCategoryUI, MoneyDisplay, InventoryUI
├── shop/             # Hotspot system, ShopItems catalog, HotspotManager
├── economy/          # Economy system (money tracking, persistence)
├── inventory/        # Inventory system (item tracking, persistence)
├── systems/          # InputManager (central input routing), PurchaseSystem (shop-economy-inventory)
├── environment/      # PoduleDome, GrassGround, Pavers
├── containers/       # Pot system for plants
├── plants/           # Plant3D system, genetics, presets
├── types/            # TypeScript definitions (including IClickable interface)
└── main.ts           # Application entry point
```

## Documentation

Comprehensive documentation is in the `/docs` directory:

- **[GAME_DESIGN.md](docs/GAME_DESIGN.md)** - Complete game design specification
  - Core systems in detail
  - Starting scenario and progression
  - Game loop and player activities
  - UI/UX specifications
  - Phase 1 and Phase 2 features

- **[TECHNICAL_NOTES.md](docs/TECHNICAL_NOTES.md)** - Implementation status
  - What's implemented vs what needs building
  - Architecture recommendations
  - Technical challenges and solutions
  - Development roadmap

- **[PLANT3D_GUIDE.md](docs/PLANT3D_GUIDE.md)** - Plant3D/ez-tree integration guide
  - Usage examples
  - Preset configurations
  - Genetics and breeding
  - Performance optimization

- **[VISUAL_SOIL_MOISTURE.md](docs/VISUAL_SOIL_MOISTURE.md)** - Visual soil moisture system
  - How drainage types create misleading visuals
  - Moisture to color mapping
  - Three-tier information system (no meter / basic / pro)
  - Gameplay decision-making and strategy
  - Testing scenarios and examples

## Inspiration

- Real-world terrarium and aquarium keeping
- L-systems and procedural generation
- Incremental games and idle systems
- Digital gardens and personal creativity tools

## License

MIT License - See LICENSE file for details

---

**Status**: Phase 1.3 Complete ✅ → Moving to Phase 1.4 | **Latest**: Full soil chemistry & water management with interactive plant inspection | **Next**: Plant Growth systems (lifecycle stages, time controls) 🚀  
**Repository**: https://github.com/Jaxsbr/Botanica.git  
**Documentation**: See `/docs` directory for complete specifications
