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
- [ ] Add **Upgrades button** (icon-based, accessible from main HUD).
- [ ] Create a **dedicated upgrades panel** (scrollable or tabbed layout).
- [ ] Define upgrades in a **data-driven JSON/config file**:
  ```json
  {
    "upgradeId": "watering_speed",
    "name": "Faster Watering",
    "description": "Reduce time needed to fully water plants.",
    "baseCost": 20,
    "costScale": 1.3,
    "effectPerLevel": 0.9
  }
````

* [ ] Display cost, current level, and upgrade effect in UI.

#### 2. Core Upgrade Logic

* [ ] Deduct fruit when purchasing upgrades.
* [ ] Store upgrade progress persistently.
* [ ] Apply upgrade modifiers dynamically to gameplay systems.

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

* Upgrade costs should **scale exponentially** with level (e.g., ×1.25 per level).
* Effects **stack multiplicatively** where applicable.
* Add visual feedback (brief flash or particle) on purchase.

#### 5. Future Extensions

* Add automation upgrades (e.g. auto-watering sprinklers).
* Add meta-upgrades unlocked through prestige or milestones.

---

## ⚙️ Technical & Design Notes

### Data-driven approach

* Define upgrade parameters and costs in external data (e.g., `/data/upgrades.json`).
* Define watering constants in `/config/gameBalance.ts`.

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

> **Guiding Rule:**
> Every new system should begin as an active player action and evolve toward convenience, efficiency, or automation through upgrades.
> Every upgrade should make the player’s *time investment feel more powerful*.

```

---