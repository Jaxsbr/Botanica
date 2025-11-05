# Botanica - Documentation Changelog

## Version 1.2 - Podule System Implementation (November 5, 2025)

### Overview
Complete implementation of the **podule system** - the core architectural pattern for organizing game areas. The "podule" concept replaces loose references to "glass domes" and "scenes" with a unified, performance-optimized navigation system.

### What is a Podule?
A **podule** is a self-contained game area within a glass dome (Home, Shop, Indoor, Greenhouse, etc.). Each podule:
- Lives inside its own glass dome (snow globe aesthetic)
- Manages its own Three.js objects and logic
- Only updates when active (performance optimization)
- Can be navigated to via bottom navigation UI

### Implementation Completed ✅

#### 1. Core Architecture
**Files Created:**
- `src/podules/BasePodule.ts` - Abstract base class with lifecycle methods
- `src/podules/PoduleManager.ts` - Manages switching and updates
- `src/podules/HomePodule.ts` - Main garden/backyard area
- `src/podules/ShopPodule.ts` - Shopping area (placeholder for Phase 1.2 economy)

**Files Refactored:**
- `src/environment/GlassDome.ts` → `src/environment/PoduleDome.ts` (renamed)
- `src/types/index.ts` - Added `PoduleType`, `PoduleConfig` types
- `src/scene/Scene.ts` - Updated to use `PoduleConfig`
- `src/main.ts` - Completely refactored to use PoduleManager

#### 2. Navigation UI
**Files Created:**
- `src/ui/NavigationUI.ts` - Bottom navigation bar with icon buttons
- `src/ui/TransitionOverlay.ts` - Fade transitions between podules
- `src/style.css` - Navigation bar and transition styles

**Features:**
- Icon-based navigation (🏠 Home | 🛒 Shop)
- Active podule highlighted with green glow
- Smooth hover effects and transitions
- Modern glass-morphic design with backdrop blur

#### 3. Transition System
- Fullscreen black fade overlay
- 300ms transition duration
- Smooth `fadeOut()` → `switchPodule()` → `fadeIn()` sequence
- Only active podule renders (performance optimized)

### Technical Benefits

**Performance:**
- Only one podule's objects in scene at a time
- Inactive podules don't render (removed from scene graph)
- Inactive podules don't update (no CPU cycles)
- Memory efficient - podules stay loaded but inactive

**Architecture:**
- Clean separation of concerns (each podule self-contained)
- Easy extensibility (extend `BasePodule` for new areas)
- Consistent lifecycle pattern (activate, deactivate, update, dispose)
- Type-safe podule management

**User Experience:**
- Smooth navigation between game areas
- Clear visual feedback for active area
- Professional transitions
- Consistent "living diorama" aesthetic

### Documentation Updates

#### GAME_DESIGN.md
- Updated "The Scene" section with podule concept
- Added "Podule Navigation" section to UI/Controls
- Updated Phase 2 features with "Additional Podules"
- Replaced references to "glass dome framing" with "podule system"

#### TECHNICAL_NOTES.md
- Added comprehensive "Podule System Architecture" section
- Documented BasePodule, PoduleManager implementation details
- Added code examples for creating new podules
- Updated implementation status (Scene Setup now complete)
- Updated file structure to reflect new directories
- Marked podule system as "FULLY IMPLEMENTED ✅"

#### README.md
- Updated core concept with podule explanation
- Added podule system to implemented features list
- Updated current phase (1.2 - Core Economy in progress)
- Updated project structure with podules/ and ui/ directories
- Updated design philosophy with podule navigation details
- Updated status line to reflect latest progress

### Directory Structure Changes

**New Directories:**
```
src/
├── podules/          # NEW - Podule system
│   ├── BasePodule.ts
│   ├── PoduleManager.ts
│   ├── HomePodule.ts
│   └── ShopPodule.ts
├── ui/               # NEW - UI components
│   ├── NavigationUI.ts
│   └── TransitionOverlay.ts
```

**Renamed:**
```
src/environment/GlassDome.ts → src/environment/PoduleDome.ts
```

### Breaking Changes
- `GlassDome` class renamed to `PoduleDome`
- `TerrariumConfig` type renamed to `PoduleConfig` (alias maintained for compatibility)
- `main.ts` completely restructured (no longer directly manages scene objects)

### Phase 1.2 Status
- ✅ Podule navigation system (Home ↔ Shop)
- ✅ Podule architecture complete
- ✅ Icon-based navigation UI with transitions
- ⏳ Money tracking system (next)
- ⏳ Shop UI for purchasing items (next)
- ⏳ Transaction system (next)

### Next Steps
With the podule system in place, Phase 1.2 can continue with:
1. Economy system (money tracking)
2. Shop UI overlay in ShopPodule
3. Transaction system for buying items
4. Basic inventory management

The podule architecture makes it trivial to add new game areas in the future by extending `BasePodule`.

---

## Version 1.1 - MVP Refinements (November 5, 2025)

### Overview
Complete review and refinement of game design specification based on MVP feedback and potential player experience issues. All identified concerns have been addressed with concrete solutions.

### Major Changes

#### 1. Starting Experience Improved ✅
**Problem:** Starting with $0 and forcing worm digging felt too slow/punishing  
**Solution:**
- Player now starts with **$10** (instead of $0)
- Starts with **2-3 ripe fruit** ready to harvest (instead of 1)
- Starts with **1 fertilizer bottle** from Granny (safety net)
- First 10-20 minutes now focus on learning, not survival scrambling

**Impact:** Players experience immediate success and positive feedback loop clicks faster

#### 2. Worm Digging Enhanced ✅
**Problem:** Random clicking for worms could become tedious busywork  
**Solution:**
- **Visual hints** - Darker soil patches indicate worm locations
- **Patterns** - 2x probability near compost bin, higher after rain
- **Tool progression** - Worm rake ($15) reveals locations
- **Late-game automation** - Worm farm ($50) generates passive income

**Impact:** Early game stays interesting, late game allows focus on plant management

#### 3. Pruning Benefits Clarified ✅
**Problem:** Players might not understand when, why, or how to prune  
**Solution:**
- **Tutorial moment** - Granny's note at 70% plant maturity explains pruning
- **Ghost preview** - Hover shows where new branches will grow
- **Quantified benefits** - UI shows "Pruning increased leaf count by 35%"
- **Clear impact** - "20-40% faster fruit production" communicated directly

**Impact:** Pruning becomes intentional strategic choice, not mysterious mechanic

#### 4. Time Scale Improvements ✅
**Problem:** Long growth times at 1x could make players feel stuck waiting  
**Solution:**
- **Fast-forward animations** - Visible acceleration at 5x-10x (time-lapse style)
- **Milestone notifications** - Alerts even when game paused/minimized
- **Session guarantees** - Every 10-20 min session has meaningful progress
- **Golden rule** - Always something to do (never just waiting)

**Impact:** Time never feels wasted, every session productive

#### 5. Progressive Shop Unlocks ✅
**Problem:** All shop items at once could cause decision paralysis  
**Solution:**
- **Start** - Only basics (soil, fertilizer, small pots)
- **After first fruit sale** - Pruning shears unlock
- **After first compost** - Worm rake, pH meter unlock
- **After 3 plants** - Large pots, pre-potted plants unlock
- **After $50 earned** - Soil tester unlocks
- **After $100 earned** - Advanced tools unlock

**Impact:** Natural progression guidance, each unlock feels like achievement

### New Features Added

#### Granny's Tips System
Context-sensitive tutorial system that teaches without feeling like tutorials:
- 10 trigger-based tips covering all core systems
- Written in Granny's warm, folksy voice
- Appear once, skippable, contextually relevant
- Teach "why" not just "how"
- Examples:
  - "Looks like your soil is running low on nitrogen..."
  - "The avocado is getting tall! Try pruning the top..."
  - "Worms like rich, dark soil. Look for darker patches..."

**Impact:** Organic learning curve, players discover systems naturally

#### Detailed MVP Roadmap
Week-by-week development plan with clear goals:
- **Week 1-2:** Core plant system (growth, water, time controls)
- **Week 3:** Nutrients & visual feedback (NPK, plant health)
- **Week 4:** Economy basics (money, shop, fruit sales)
- **Week 5:** Expansion (multi-plant, worm digging, compost, pruning)
- **Week 6:** Polish (UI, balance, save/load, notifications)
- **Post-Week 6:** Decision point (polish more vs Phase 2 features)

**Impact:** Clear development path with achievable milestones

#### Critical Prototyping Questions
10 key questions to test constantly during development:
- Does a 10-minute session feel satisfying?
- Is the economic loop clear?
- Does time acceleration feel good?
- Are nutrients balanced?
- Is worm digging fun or annoying?
- Do interconnected loops make sense?
- Is pruning benefit clear?
- Are Granny's Tips helpful?
- Can game handle 10-20 plants at 60 FPS?

**Impact:** Built-in validation framework for testing

#### Success Metrics & KPIs
Concrete targets for measuring success:
- **Engagement:** 10-20 min sessions, daily returns, 30%+ 7-day retention
- **Progression:** $50 in 30 min, 5 plants in 1-2 hrs, mastery in 5-10 hrs
- **Red flags:** Session < 5 min, never return, quit before first fruit

**Impact:** Data-driven development and tuning

### Updated Progression Path

**Phase 1: First Harvest (10-20 min)**
- Immediate success with ripe fruit
- Learn core mechanics without pressure
- $20+ cash, ready to expand

**Phase 2: First Expansion (20-60 min)**
- Learn nutrient management
- Expand to 2-3 plants
- Unlock pruning, start compost system
- $30+ earned

**Phase 3: Multi-Plant Operation (1-3 hours)**
- 5-10 plants efficiently managed
- Tool upgrades unlocked
- Multiple income streams
- $100+ earned

**Phase 4: Optimization & Mastery (3+ hours)**
- 10-20 plants optimized
- Advanced strategies
- Self-sustaining operation
- $500+ earned

**Key Metrics:**
- Time to first $50: ~30 minutes
- Time to 5 plants: ~1-2 hours
- Time to all tools: ~2-3 hours
- Time to mastery: ~5-10 hours

### Documentation Updates

#### GAME_DESIGN.md (870 lines, 34KB)
**New Sections:**
- Granny's Tips System (10 contextual tutorials)
- MVP Development Roadmap (week-by-week)
- Critical Prototyping Questions (validation framework)
- Potential Issues & Mitigation Strategies (5 major concerns addressed)
- Success Metrics & KPIs (concrete targets)

**Updated Sections:**
- Starting Scenario (new gifts: $10, fertilizer, ripe fruit)
- Time Scale (fast-forward animations, milestone notifications)
- Economic System (starting money rationale, progressive unlocks)
- Worm Digging (visual hints, patterns, tools, automation)
- Pruning Mechanics (tutorial, ghost preview, quantified benefits)
- Progression Path (4 phases with clear milestones)

#### TECHNICAL_NOTES.md (820 lines, 22KB)
**New Sections:**
- MVP-Specific Implementation Notes
  - Starting State Configuration (code example)
  - Progressive Shop Unlock System (implementation)
  - Granny's Tips Trigger System (code example)
  - Worm Digging Visual Hints (probability calculation)
  - Pruning Ghost Preview (hover system)
  - Time Scale Animation (speed multipliers)
  - Pruning Feedback UI (quantified results)
- MVP Development Priority Order (5 phases)

**Updated Sections:**
- Next Steps for Development (refined priorities)
- Architecture recommendations (MVP-focused)

#### README.md (179 lines)
**Updated:**
- Core concept (gardening simulation vs terrarium)
- Current status (Design Complete - Implementation Starting)
- Game systems overview (Phase 1 vs Phase 2)
- Design philosophy (digital hobby emphasis)
- Documentation links (points to new comprehensive docs)

### Files Created
- `/docs/GAME_DESIGN.md` - 870 lines
- `/docs/TECHNICAL_NOTES.md` - 820 lines
- `/docs/CHANGELOG.md` - This file

### Files Removed
- `/_context-vault/personal/botanica/` - Entire directory deleted
  - hub.md, tasks.md, specs/, ideas/, devlogs/, decisions/ - All superseded

### Total Documentation
- **1,869 lines** of comprehensive specification
- **~56KB** of design documentation
- **Single source of truth** in `/docs` directory

## Version 1.0 - Initial Specification (November 5, 2025)

### Initial Creation
- Complete game design specification
- Core systems defined
- Technical implementation notes
- Migration from scattered context-vault docs

---

## Summary of v1.1 Improvements

**Problems Identified → Solutions Implemented:**
1. ❌ Too slow start → ✅ $10 + ripe fruit + fertilizer
2. ❌ Tedious worm digging → ✅ Visual hints + tools + automation
3. ❌ Unclear pruning → ✅ Tutorial + ghost preview + quantified benefits
4. ❌ Waiting feels bad → ✅ Fast-forward animation + milestone notifications
5. ❌ Shop overwhelms → ✅ Progressive unlocks by achievement

**New Systems Added:**
- Granny's Tips (10 contextual tutorials)
- MVP Roadmap (6-week development plan)
- Prototyping Questions (10 validation tests)
- Success Metrics (engagement, progression, satisfaction)
- Red Flags (early warning indicators)

**Result:** Comprehensive, actionable MVP specification ready for implementation with built-in validation framework and clear success criteria.

