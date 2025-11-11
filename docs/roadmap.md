# 🌱 Future Features Plan

This document outlines upcoming feature implementations for the **Garden Incremental Prototype**, broken down into manageable, deliverable chunks.  
All features follow incremental game best practices — each system starts simple and becomes easier or automated through upgrades.

---

## FEATURE 1: Watering Mode

### 🧭 Overview
Introduce a **Watering Mode** that allows the player to manually water plants.  
Watering increases growth speed and opens up future upgrade and automation possibilities.

### 🎯 Design Goals
- Add depth and pacing to early-game progression.
- Introduce a manual action that becomes easier/faster via upgrades.
- Provide clear visual and feedback cues for water status.

---

### 🔹 Deliverable Chunks

#### 1. UI Integration
- [x] Add **Watering Can** action button in `GameUI.ts` beside existing Plant and Build buttons.
- [x] Add a **water level bar** (HUD element) that drains while watering and refills passively or after a delay.
- [x] Add keyboard shortcut (`W`) to toggle Water Mode.
- [x] Update cursor rules to support Water Mode state.

#### 2. Core Watering Mechanic
- [x] While in Water Mode:
  - **Mouse down / touch hold** drains water bar.
  - Emit **droplet particles** in a circular area under the cursor.
  - Tiles in range receive water (respecting AOE upgrades later).
- [x] Tune droplet height/arc for natural look (tweak values in a shared constants file).

#### 3. Plant Integration
- [x] Plants track **current water level** and **fully watered status**.
- [x] Fully watered plants:
  - Increase growth rate (e.g. +25–50% speed).
  - Show particle/sparkle effect to indicate boosted growth.
  - Display a **subtle water saturation indicator** (icon or color overlay).
- [x] Water level slowly decreases over time (prepares for automation systems later).

#### 4. Feedback & UX
- [x] Add watering sound effects and light splash particles.
- [x] Cursor switches to a watering can icon in Water Mode.
- [x] Use disabled cursor and greyed-out button if no water available.

#### 5. Balancing Variables
- `waterDrainRate` per second (base: 10%)
- `growthMultiplierWhenWatered` (base: 1.5×)
- `waterDuration` before plant dries out (base: 60s)
- `baseAOERadius` (base: 1 tile)

---

## FEATURE 2: Upgrades System

### 🧭 Overview
Introduce a new **Upgrades UI** where players can spend fruit to permanently enhance gameplay efficiency.  
All upgrades are incremental, with scaling costs and visible gameplay impact.

### 🎯 Design Goals
- Reward progression with tangible QoL improvements.
- Create multiple upgrade paths (efficiency, automation, capacity).
- Keep UI minimal and data-driven.

---

### 🔹 Deliverable Chunks

#### 1. UI & Data Setup
- [x] Add **Upgrades button** (icon-based, accessible from main HUD).
- [x] Create a **dedicated upgrades panel** (draggable tech tree layout with full overlay).
  - Implemented drag-to-pan navigation for large tech trees
  - Full-screen overlay with dark gradient background
  - Animated parallax background with moving circular patterns
  - Hierarchical tree layout with parent-child connections
  - Center starting upgrade on screen when panel opens
- [x] Define upgrades in a **data-driven config file** (`src/config/upgrades.ts`):
  ```typescript
  {
    upgradeId: "watering_speed",
    name: "Faster Watering",
    description: "Reduces watering time per plant.",
    baseCost: 30,
    costScale: 1.3,
    effectPerLevel: 0.9
  }
  ```
- [x] Display cost, current level, and upgrade effect in UI (cards show level, cost, name, and description).
  - Vertical card layout with large centered icons (72px)
  - Level indicator in top-left corner
  - Cost in top-right corner (same font size as level)
  - Bold title centered below icon
  - Description centered below title with multi-line wrapping
  - Gradient backgrounds with level-based colors
  - Depth effects with shadows and glowing borders
  - Hover animations and visual feedback
  - Click-to-purchase (entire card is clickable)

#### 2. Core Upgrade Logic

- [x] Deduct fruit when purchasing upgrades (via click-to-purchase on cards).
- [ ] Store upgrade progress persistently (localStorage or save system).
- [ ] Apply upgrade modifiers dynamically to gameplay systems (integration with game systems pending).

#### 3. Upgrade Definitions (Initial Set)

| ID                | Name            | Description                                      | Effect                  |
| ----------------- | --------------- | ------------------------------------------------ | ----------------------- |
| `drag_planting`   | Bulk Planting   | Enables click-drag to plant multiple seeds.      | Unlock                  |
| `drag_building`   | Bulk Building   | Enables click-drag to place multiple soil tiles. | Unlock                  |
| `drag_harvesting` | Bulk Harvesting | Enables click-drag to collect multiple fruits.   | Unlock                  |
| `water_capacity`  | Reservoir Level | Increases water bar size.                        | +20% capacity per level |
| `water_speed`     | Faster Watering | Reduces watering time per plant.                 | -10% time per level     |
| `water_aoe`       | Water Range     | Increases watering radius.                       | +0.5 tile per level     |

#### 4. Scaling & Progression

- [x] Upgrade costs scale exponentially with level (using `costScale` parameter in config).
- [x] Effects stack multiplicatively where applicable (calculated via `effectPerLevel`).
- [x] Add visual feedback on purchase (hover effects, card animations, border glow).

#### 5. Future Extensions

* Add automation upgrades (e.g. auto-watering sprinklers).
* Add meta-upgrades unlocked through prestige or milestones.

---

## ⚙️ Technical & Design Notes

### Data-driven approach

- [x] Define upgrade parameters and costs in external data (`/src/config/upgrades.ts`).
- [x] Define watering constants in `/config/gameBalance.ts`.

### Testing & Debugging

* Add developer toggle to **instantly refill water bar**.
* Add debug overlay for plant water levels.
* Add temporary UI readout for current watering boost multiplier.

### UX Consistency

* Watering, planting, and building should all use the same **cursor rules** system.
* Keep drag mechanics consistent (start on mouseDown, apply continuously, stop on mouseUp).
* Always show disabled states rather than silent failure.

---

## 🔮 Future Interactions

Later features that can build on this foundation:

* **Sprinkler Automation:** consumes fruit per minute to water tiles automatically.
* **Rain Weather Event:** occasional auto-watering.
* **Fertilizer System:** adds another layer of plant boosting.
* **Plant Variety:** different species with unique water needs and yields.

---

## 📋 Future Work Log

Items logged for future implementation:

### Gameplay Systems
- **Make seeds unlimited** - Remove seed scarcity, seeds become infinite resource
- **Add seed upgrade** - New seed types that yield more/different fruit
- **Balance watering upgrades** - Review and adjust water capacity, speed, and AOE upgrade values

### UI Improvements
- **Render fruit count above modes** - Move fruit counter to top of screen, above action mode buttons
- **Drop info bar** - Remove or redesign the current info bar layout

### Automation Upgrades
- **Auto watering upgrade** - 3 levels that increase automatic watering processing speed
- **Auto harvesting upgrade** - 3 levels that increase automatic harvesting processing speed

---

> **Guiding Rule:**
> Every new system should begin as an active player action and evolve toward convenience, efficiency, or automation through upgrades.
> Every upgrade should make the player's *time investment feel more powerful*.

```

---

## ✅ Completed Features

### FEATURE 1: Watering Mode - COMPLETE
All deliverables have been implemented and are functional.

### FEATURE 2: Upgrades System - IN PROGRESS
- ✅ UI & Data Setup - Complete
- ✅ Core Upgrade Logic (purchase system) - Complete
- ✅ Upgrade Definitions - Complete (7 upgrades defined: water_plants, drag_planting, drag_building, drag_harvesting, water_capacity, water_speed, water_aoe)
- ✅ Scaling & Progression - Complete
- ✅ Gameplay system integration - Complete (all upgrades now affect gameplay)
- ⏳ Persistent storage - Pending

---