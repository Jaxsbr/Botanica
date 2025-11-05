# Botanica - Game Design Specification

**Version:** 1.1  
**Last Updated:** November 5, 2025  
**Status:** Design Phase - MVP Refinements Complete

## Core Vision

Botanica is a semi-realistic gardening simulation that combines deep horticultural systems with economic progression. Players tend to plants through their full lifecycle, managing soil chemistry, light exposure, pruning, and pest control while earning money through plant sales and side activities to fund their growing operation.

This is a **digital hobby** - something you check on for 10-20 minute sessions, make decisions, watch progress, and return to later. Like real gardening, success comes from understanding interconnected systems and patient observation.

## Core Pillars

1. **Semi-Realistic Simulation** - Real gardening concepts (NPK nutrients, pH, drainage) implemented in gamified, accessible ways
2. **Economic Progression** - Everything costs money; money comes from selling plants, fruit, and doing side jobs
3. **Interconnected Systems** - Pruning creates compost, compost attracts worms, worms = money, money buys nutrients
4. **Visual Feedback** - Players read plant health from appearance, not UI bars
5. **Deep But Accessible** - Simple planting works, but mastery requires understanding advanced techniques

## Starting Scenario: Granny's Gift

### The Setup
Your grandmother gives you:
- 1 potted avocado plant (already bearing 2-3 ripe fruit)
- A few avocado seeds
- A bag of basic potting soil (enough for 2-3 pots)
- 3 empty terracotta pots
- 1 bottle of NPK fertilizer (teaches you to use it when soil depletes)
- A small backyard space with garden pavers
- $10 starting money (enough for 1-2 emergency purchases while learning)

### The Scene
The camera looks at a miniature backyard contained within a transparent glass dome (like a snow globe):
- Grass surrounding a paved area inside the dome
- Your single potted avocado plant on the pavers
- Empty pots stacked nearby
- A compost bin in the corner
- Natural sunlight filtering through the glass dome

**Design Note:** All environments (backyard, indoor, greenhouse) use the glass dome framing device. This creates a consistent "living diorama" aesthetic - each scene is a self-contained miniature world. Future environments will simply change the contents inside the dome while maintaining this signature visual style.

### Your First Goals
1. **Harvest the ripe fruit** - Immediate decision: Sell for cash or plant seeds?
2. **Keep the avocado plant alive** - Learn watering and nutrient management
3. **Use Granny's fertilizer** - When soil depletes, you already have a solution
4. **Dig for worms** - Optional side income to supplement fruit sales
5. **Expand your operation** - Buy more pots and soil with earnings

**Design Intent:** Players start with immediate success (ripe fruit) and a safety net ($10 + 1 fertilizer) so they can learn systems without panic. The core loop should click before resources become tight.

## The Game Loop

### Daily Session Flow (10-20 minutes)
1. **Check plant status** - Click plants to see nutrient levels, growth stage
2. **Tend to needs** - Water if dry, add nutrients if depleted
3. **Harvest** - Collect ripe fruit or seeds
4. **Economic decisions** - Sell fruit for immediate cash? Or plant seeds for long-term income?
5. **Side activities** - Dig worms, process compost, prune plants
6. **Purchases** - Buy soil, pots, nutrients, tools with earned money
7. **Expansion** - Plant new seeds, buy pre-potted plants, upgrade space

### Time Scale
- Real-time when playing at 1x speed
- Time controls: Pause, 1x, 5x, 10x
- Full plant lifecycle: Hours at 1x (but players will fast-forward)
- Fruit ripening: 30-60 minutes at 1x
- Soil nutrient depletion: 1-2 hours of growth at 1x

**Fast-Forward Experience:**
- At 5x-10x speed, growth visibly accelerates (time-lapse style animation)
- Milestone notifications even when paused: "Your plant reached 50% maturity!"
- Every 10-20 minute session should have meaningful progress (fruit ripens, compost finishes, worms found)

**Golden Rule:** Players should never feel like they have nothing to do while waiting for growth. There's always a side activity or decision to make.

## Core Systems

### 1. Soil & Nutrient System

**Soil Composition**
Every pot/plot has:
- **Nitrogen (N)** - Leaf growth (0-100)
- **Phosphorus (P)** - Root/flower development (0-100)
- **Potassium (K)** - Overall health/disease resistance (0-100)
- **pH Level** - 4.0-8.0 (affects nutrient availability)
- **Drainage** - Poor/Medium/Good (affects water retention)
- **Organic Matter** - 0-100 (slowly releases nutrients)

**How It Works**
- Plants consume NPK as they grow (rates vary by species)
- Low nutrients = slow growth, yellowing leaves, no fruit production
- pH affects how well plants absorb nutrients (most prefer 6.0-7.0)
- Drainage determines how often you need to water
- Organic matter (from compost) slowly replenishes NPK over time

**Player Actions**
- Check soil status by clicking pot/plot
- Add fertilizer (costs money, instant NPK boost)
- Add compost (free if you made it, slow NPK release)
- Add lime (raises pH) or sulfur (lowers pH)
- Improve drainage with sand/perlite (costs money)

**Visual Feedback**
- Healthy: Dark, rich-looking soil
- Depleted: Light, dusty appearance
- Waterlogged: Muddy, pooling water
- Dry: Cracked surface texture

### 2. Economic System

**Money Sources**
1. **Selling Fruit** - Primary income for mature plants
   - Avocado: $3-5 each (depending on size/quality)
   - Quality affected by plant health during growth
2. **Selling Plants** - Higher margin but longer investment
   - Seedling: $5-10
   - Mature plant: $20-50
   - Pre-potted ready-to-sell: $30-60
3. **Digging Worms** - Manual side job
   - Click soil patches → Find worms randomly
   - Sell worms: $0.50-1.00 each
   - Takes time but guaranteed income
4. **Selling Compost** - Passive side income
   - 1 full compost bin = $10-15
   - Takes several prunings to fill

**Money Sinks**
1. **Consumables** (Always Available)
   - Potting soil: $5 per bag
   - NPK fertilizer: $8 per bottle
   - Compost accelerator: $3
   - Seeds (other species): $2-5 each (Phase 2)
2. **Equipment** (Progressive Unlocks)
   - Terracotta pot (small): $4 (Always available)
   - Terracotta pot (large): $8 (Unlocks after 3 plants)
   - Ceramic pot: $15 (Unlocks after 3 plants, better water retention)
   - **Pruning shears: $10** (Unlocks after first fruit sale - required for pruning)
   - **Worm rake: $15** (Unlocks after first compost harvest - reveals worm locations)
   - **pH meter: $20** (Unlocks after first compost harvest - see pH precisely)
   - **Soil tester: $25** (Unlocks after $50 total earned - see NPK levels precisely)
3. **Pre-potted Plants** (Unlocks after 3 plants)
   - Young avocado: $15 (Skip seed/sprout phase)
   - Mature avocado: $45 (Skip to fruit-bearing)
   - Other species: Varies (Phase 2)
4. **Advanced Tools** (Unlocks after $100 total earned)
   - Worm farm: $50 (Passive worm generation)
   - Better pruning shears: $30 (Faster pruning, better yield)
   - Watering can upgrade: $20 (Water 3 plants at once)
5. **Upgrades** (Future Phase 2)
   - Greenhouse dome: $200
   - Grow lights: $50
   - Irrigation system: $75

**Progressive Shop Design:**
Items unlock based on player progress to prevent decision paralysis and guide natural progression. Each unlock feels like an achievement.

**Starting Money**
Player starts with $10 and 1 bottle of fertilizer from Granny. This provides:
- Safety net for learning without immediate pressure
- Enough for 1-2 emergency purchases (fertilizer = $8)
- Encourages experimentation over survival anxiety
- First fruit harvest ($6-10) feels like real progress, not desperation

**Design Rationale:** Starting at $0 risks players quitting before the economic loop clicks. $10 smooths the learning curve without trivializing early challenges.

### 3. Light Simulation

**Natural Sunlight**
- Full sun: 100% light value (center of backyard)
- Partial shade: 60-80% (under tree, near walls)
- Deep shade: 20-40% (corners, covered areas)
- Light changes with time of day (peaks at noon)

**Plant Requirements**
Each plant species has:
- **Minimum light** - Below this = slow growth/etiolation
- **Optimal light** - Best growth rate
- **Maximum light** - Above this = leaf burn

**How It Works**
- Plants track accumulated light over time
- Insufficient light → Leggy stems, pale leaves, no flowering
- Too much light → Brown leaf tips, wilting despite water
- Player can move pots to adjust light exposure

**Visual Feedback**
- Healthy: Deep green, compact growth
- Too little: Stretched stems, reaching, pale color
- Too much: Brown edges, wilting in bright conditions

### 4. Pruning Mechanics

**Basic Pruning**
- Requires pruning shears (bought from shop after first fruit sale)
- Click plant → Enter prune mode
- Hover over branch → **Ghost preview** shows where new growth will appear
- Click branch → Branch is cut
- Plant responds: 2-3 new branches grow from cut point over next few game-hours

**Apical Dominance**
- Top/terminal buds grow strongest
- Cut the top → Side buds activate
- This creates bushier, wider plants

**Benefits of Pruning (Clearly Communicated in UI)**
1. **Shape control** - Make plants shorter/wider to fit space
2. **Increase branching** - More leaves = more photosynthesis = **20-40% faster fruit production**
3. **Remove dead/diseased parts** - Improves overall health
4. **Generate compostable material** - Free compost input

**Tutorial Moment:**
When player's first avocado reaches 70% maturity, Granny leaves a note:

> "The avocado is getting tall and leggy. Try pruning the top to make it bushier - you'll get more leaves that way! Plus, the cuttings go right into the compost bin. Your pruning shears are in the shed (check the shop)."

**UI Feedback After Pruning:**
- "Pruning increased leaf count by 35%"
- "Potential fruit yield improved by 25%"
- "Added pruning material to compost bin"

**Design Intent:** Make pruning benefits crystal clear. Players should understand not just HOW to prune, but WHY they should.

**Pruning Material → Compost**
- Cut branches automatically go to compost bin
- Speeds up compost production
- More pruning = more worms attracted

**Visual Changes**
- Cut point heals over time (shows wound healing)
- New buds emerge near cut within game-hours
- Growth pattern visibly changes (bushier vs tall)

### 5. Side Jobs & Activities

**Worm Digging**
- Click on grass/soil areas outside pots
- **Visual hints** show likely worm locations (darker, richer-looking soil)
- **Patterns:**
  - Higher chance near compost bin (2x probability)
  - Better after rain events
  - Morning hours slightly better than afternoon
- Sell for instant cash ($0.50-1.00 each)
- Reliable but time-consuming money source

**Progressive Enhancement:**
- Early game: Manual clicking with visual hints
- Mid game: Buy "Worm Rake" tool ($15) - reveals worm locations in area
- Late game: Unlock "Worm Farm" ($50) - passively generates 2-3 worms per hour

**Design Intent:** Keep early bootstrap interesting, allow late-game automation so players focus on plant management.

**Composting**
- Compost bin in corner of yard
- Auto-fills from pruning material
- Click bin → Check progress (0-100%)
- Full bin → Harvest compost
- Uses: Add to soil (free nutrients) OR sell for cash

**Compost Mechanics**
- Pruning adds 10-20% per branch
- Takes 30-60 minutes real-time to fully mature
- Mature compost attracts more worms nearby
- Quality compost = better nutrient release

### 6. Plant Lifecycle: Avocado

**Growth Stages**
1. **Seed** (0-20% mature) - Underground, no visuals yet
2. **Sprout** (20-30%) - First leaves emerge from soil
3. **Seedling** (30-50%) - Small stem, 4-6 leaves
4. **Young Plant** (50-70%) - Branching begins, 12+ leaves
5. **Mature Tree** (70-100%) - Full size, capable of flowering
6. **Fruiting** (100%+) - Flowers appear → Pollination → Fruit growth

**Fruit Production**
- Mature plant produces flowers periodically
- Flowers auto-pollinate after 1-2 game days
- Fruit grows over 1-2 hours at 1x speed
- Ripe fruit can be harvested (click to pick)
- Each fruit contains 1 seed (can plant or sell fruit whole)

**Seed → New Plant**
- Plant seed in pot with soil
- Requires adequate water and light
- Takes 2-4 hours at 1x to reach maturity
- Fruit production starts at 70% maturity

**Death Conditions**
- Prolonged nutrient depletion (NPK all at 0 for extended time)
- Severe water stress (dry for too long)
- Disease from pest infestation (Phase 2 feature)

### 7. Water System

**Water Mechanics**
- Each pot has water level: 0-100%
- Plants consume water over time (rate varies by size/light/temp)
- Low water → Wilting, growth stops
- Zero water for extended time → Plant death
- Over-watering in poor drainage → Root rot risk (visual warning)

**Player Actions**
- Click plant → "Water" button
- Adds 50% water instantly (free, unlimited)
- Can over-water if not careful (watch drainage)

**Visual Feedback**
- Well-watered: Perky leaves, vibrant color
- Dry: Drooping leaves, dull color
- Over-watered: Yellow lower leaves, soggy soil

**Weather Integration (Future Phase 2)**
- Rain auto-waters outdoor plants
- Too much rain = drainage problems
- Indoor plants unaffected by weather

## Granny's Tips System

**Purpose:** Teach systems organically without feeling like a tutorial. Granny left notes around the yard that appear as tooltips when relevant.

**Trigger-Based Tips:**

1. **First Soil Depletion** (Nitrogen drops below 30%)
   > "Looks like your soil is running low on nitrogen. Plants need it for healthy green leaves! Good thing I left you a bottle of fertilizer. You can also make compost from prunings - it's free!"

2. **Plant Reaches 70% Maturity** (Ready for first pruning)
   > "The avocado is getting tall! Try pruning the top to make it bushier. More leaves = more fruit! Your pruning shears are in the shed (check the shop)."

3. **First Compost Bin Interaction**
   > "Pruning scraps go right into the compost. Once it's ready (dark and crumbly), you can add it to soil or sell it! I heard worms love hanging out near compost bins..."

4. **After 5 Worm Digs with No Success**
   > "Worms like rich, dark soil. Look for patches that seem darker than the rest - that's where they hang out. They're especially common near the compost bin!"

5. **First Fruit Ripens**
   > "That avocado is ready to pick! You can sell it for quick cash, or plant the seed inside to grow more trees. Each fruit has one seed. Your choice!"

6. **Water Level Critical** (Below 20%)
   > "Plants are looking thirsty! See how the leaves droop a bit? A good watering will perk them right up."

7. **First pH Imbalance** (pH outside 5.5-7.5)
   > "Soil pH affects how well plants can absorb nutrients. Most plants like it around 6.0-7.0. Too high? Add sulfur. Too low? Add lime."

8. **After 3 Plants Growing**
   > "Your garden is growing! You might want to think about larger pots - they hold more soil and don't dry out as fast. Check the shop!"

9. **After $50 Earned**
   > "You're becoming quite the gardener! Maybe it's time to invest in better tools? A soil tester would let you see exactly what your plants need."

10. **First Plant Reaches Fruiting Stage**
    > "Look at that - flowers! When they're pollinated, they'll turn into fruit. Healthy soil and plenty of light make the best fruit. Take good care of it!"

**Design Principles:**
- Tips appear once (don't repeat)
- Skippable but not intrusive
- Contextual (appear when relevant)
- Written in Granny's voice (warm, helpful, slightly folksy)
- Teach the "why" not just the "how"

## Interconnected System Loops

### The Pruning Loop
```
Prune plant → Branches to compost bin → Compost matures → Attracts worms →
Dig worms → Sell for money → Buy nutrients → Healthier plant → More growth →
More branches to prune
```

### The Economic Loop
```
Plant seed → Grow to maturity → Harvest fruit → 
Decision Point:
  A) Sell fruit → Immediate cash → Buy supplies → Plant more
  B) Plant seed → More plants → More fruit production → Scale up operation
```

### The Soil Health Loop
```
Add compost → Slow nutrient release → Plant grows healthy → 
Produces quality fruit → Sell for good price → Buy more compost materials →
Maintain soil health
```

## Progression Path

### Phase 1: First Harvest (First 10-20 minutes)
**Starting state:** 1 potted avocado with 2-3 ripe fruit, $10, 1 fertilizer bottle

**Player Experience:**
1. **Immediate success:** Harvest first fruit (2-3 × $4 = $8-12 income)
2. **First decision:** Sell all fruit for cash? Or plant one seed for future?
3. **Learn watering:** Plant needs water, click to water (free, easy)
4. **Optional exploration:** Try worm digging for extra cash
5. **Milestone:** $20+ cash, feel ready to expand

**Design Goal:** Hook players with immediate positive feedback. The core economic loop should click: "Fruit = Money = Buy Things = Grow More."

### Phase 2: First Expansion (20-60 minutes)
**Goal:** Learn nutrient management and expand to 2-3 plants

**Player Experience:**
1. **Soil depletion triggers Granny's tip** about nitrogen
2. **Use starter fertilizer** (free from Granny) - learn the system
3. **Buy second pot and soil** with fruit money ($9 total)
4. **Plant second avocado** from harvested seed
5. **First pruning unlocks** after fruit sale - buy shears ($10)
6. **Pruning creates compost** - see the interconnected loop
7. **Original plant produces more fruit** - steady income starts
8. **Milestone:** 2-3 plants growing, compost system active, $30+ earned

**Design Goal:** Teach all core systems (water, nutrients, pruning, compost) while maintaining positive momentum.

### Phase 3: Multi-Plant Operation (1-3 hours)
**Goal:** Efficient 5-10 plant garden with multiple income streams

**Player Experience:**
1. **Stagger planting** so fruit ripens at different times (constant income)
2. **Compost harvests** provide free nutrients (reduce costs)
3. **Worm farming unlocks** ($50) - passive income supplement
4. **Tool upgrades** (soil tester $25, pH meter $20) - precision management
5. **Experiment with pruning** shapes and positions for light
6. **Pre-potted plants** available as shortcut option
7. **Milestone:** 5-10 plants, $100+ earned, all tools unlocked

**Design Goal:** Mastery of interconnected systems. Players optimize their operation.

### Phase 4: Optimization & Mastery (3+ hours)
**Goal:** Maximum efficiency and experimentation

**Player Experience:**
1. **10-20 plants** at various growth stages
2. **Advanced tool upgrades** (better shears, watering can upgrade)
3. **Perfect light positioning** for each pot
4. **Compost + worm farm** fully automated side income
5. **Saving for major purchases** (preparing for Phase 2 content)
6. **Experimenting** with aggressive pruning strategies
7. **Milestone:** Self-sustaining operation, $500+ earned

**Design Goal:** Long-term engagement through optimization. Players have solved survival and now focus on efficiency and experimentation.

### Phase 5: Future Expansion (Phase 2 Content)
**Goal:** New challenges and systems

1. **New species** with different needs/yields (tomato, basil, lemon)
2. **Breeding system** - Cross-pollinate for hybrid traits
3. **Indoor growing** - Greenhouses, grow lights, climate control
4. **Pest management** - Organic and chemical solutions
5. **Multiple growing areas** - Expand beyond single backyard
6. **Seasonal effects** - Weather and seasons affect outdoor plants

**Key Progression Metrics:**
- Time to first $50: ~30 minutes (feels achievable)
- Time to 5 plants: ~1-2 hours (satisfying expansion)
- Time to all tools: ~2-3 hours (natural progression)
- Time to "mastery": ~5-10 hours (ready for Phase 2 content)

## User Interface Design

### Main View
- 3D view of glass dome containing the environment
- Camera can orbit and zoom around the dome
- Click directly on objects inside the dome to interact
- Minimal UI overlays (time controls, money counter)
- Glass dome provides consistent framing across all environments (backyard, indoor, etc.)

### Plant Inspection Panel
Click plant → Side panel slides in:
```
╔═══════════════════════════╗
║ Avocado Tree #1           ║
║ ─────────────────────────  ║
║ Age: 12 days              ║
║ Growth: 85% [████████░]   ║
║ Health: Good ✓            ║
║                           ║
║ Soil Status:              ║
║ Water:  65% [██████░░]    ║
║ N: 42%  P: 38%  K: 51%    ║
║ pH: 6.8 (Optimal)         ║
║                           ║
║ Light: 85% (Full sun)     ║
║                           ║
║ Current Stage: Fruiting   ║
║ Fruit ready: 2 🥑         ║
║                           ║
║ [💧 Water] [✂️ Prune]     ║
║ [🥑 Harvest Fruit]        ║
╚═══════════════════════════╝
```

### Shop Interface
Click shop icon → Modal overlay:
```
╔════════════════════════════════════╗
║ Garden Shop          Money: $47    ║
║ ─────────────────────────────────  ║
║                                    ║
║ CONSUMABLES                        ║
║ [ ] Potting Soil .......... $5     ║
║ [ ] NPK Fertilizer ........ $8     ║
║ [ ] Compost Accelerator ... $3     ║
║                                    ║
║ POTS & CONTAINERS                  ║
║ [ ] Small Terracotta Pot .. $4     ║
║ [ ] Large Terracotta Pot .. $8     ║
║ [ ] Ceramic Pot ........... $15    ║
║                                    ║
║ TOOLS                              ║
║ [✓] Pruning Shears (owned)         ║
║ [ ] pH Meter .............. $20    ║
║ [ ] Soil Tester ........... $25    ║
║                                    ║
║ PLANTS                             ║
║ [ ] Young Avocado ......... $15    ║
║ [ ] Mature Avocado ........ $45    ║
║                                    ║
║         [Cart: $0] [Purchase]      ║
╚════════════════════════════════════╝
```

### Time Controls
Bottom HUD:
```
[⏸ Pause] [▶️ 1x] [⏩ 5x] [⏩⏩ 10x]    💰 $47    🌞 Day 3, 2:45 PM
```

## Visual Feedback System

### Plant Health Indicators
Players should be able to assess plant health at a glance:

**Healthy Plant**
- Deep green foliage
- Perky, upright leaves
- Smooth bark texture
- Even growth
- Vibrant fruit color

**Nutrient Deficient**
- Nitrogen low: Yellowing older leaves
- Phosphorus low: Purple tint, stunted roots
- Potassium low: Brown leaf edges

**Water Stressed**
- Too dry: Drooping leaves, dull color
- Too wet: Yellow lower leaves, dark soil

**Light Issues**
- Too little: Pale leaves, stretched stems
- Too much: Brown leaf tips, wilting

### Soil Visual Cues
- Rich dark brown = Healthy, nutrient-rich
- Light tan = Depleted, needs fertilizer
- Dark wet = Well-watered
- Cracked = Dry, needs water
- Muddy = Over-watered

## Plant Species (Initial Set)

### Avocado (Starting Plant)
- Growth time: 2-4 hours to maturity (1x speed)
- Light need: High (80-100%)
- Water: Medium consumption
- NPK preference: Balanced
- Fruit value: $3-5 each
- Fruit frequency: Every 1-2 hours when mature
- Seeds per fruit: 1

### Future Species (Phase 2)
- Tomato (fast-growing, high yield)
- Basil (herb, quick cash crop)
- Lemon tree (similar to avocado but different needs)
- Jade plant (ornamental, low maintenance)
- Cannabis (high value, complex needs)

## Phase 2 Features (Future Expansion)

**Note:** All Phase 2 environments will maintain the glass dome framing. Indoor scenes will show furniture, shelves, and grow lights *inside* the dome. Greenhouses will have transparent walls *inside* the dome. The dome is the signature visual that unifies all environments.

### Deferred Systems
1. **Breeding/Genetics** - Cross-pollinate plants for hybrid traits
2. **Indoor vs Outdoor** - Switch dome contents between backyard/indoor/greenhouse scenes
3. **Pest System** - Aphids appear, need organic/chemical pest control
4. **Advanced Training** - Wire training, weights, bonsai techniques
5. **Propagation Station** - Dedicated cutting area with humidity control
6. **Multiple Domes** - Expand to several growing areas
7. **Weather System** - Rain, heat waves, seasons affect outdoor plants
8. **Disease** - Root rot, fungal infections requiring treatment
9. **Soil Organisms** - Beneficial bacteria, mycorrhizae for boost
10. **Market Fluctuation** - Prices change, seasonal demand

## Technical Considerations

### Performance Targets
- Support 20-30 plants simultaneously
- Smooth 60 FPS even with time acceleration
- Fast-forward should animate, not skip frames

### Save System
Auto-save every 30 seconds:
- Plant states (growth, health, position)
- Soil chemistry for each container
- Player money and inventory
- Time elapsed
- Unlocked items

### Accessibility
- Colorblind modes for plant health
- Text labels for all visual indicators
- Adjustable time scale for different play speeds
- Tooltips explain all systems

## Success Metrics

### Engagement
- Average session length: 10-20 minutes
- Return frequency: Daily check-ins
- Long-term retention: Players return for weeks/months

### Satisfaction Markers
- "Aha!" moments when systems click together
- Pride in well-maintained garden
- Satisfaction of profitable harvest
- Joy of expansion and optimization

### Core Loop Validation
Players should naturally discover:
1. Selling fruit gives money
2. Money buys nutrients
3. Nutrients help plants thrive
4. Thriving plants produce more fruit
5. Side activities (worms, compost) support main loop

## Development Priorities

### Must-Have (Phase 1)
- ✓ 3D plant rendering (already implemented via Plant3D/ez-tree)
- Backyard scene with pots
- Soil/nutrient system (NPK, pH, drainage)
- Water system
- Light simulation
- Plant growth over time
- Avocado lifecycle (seed to fruit)
- Economic system (money, shop)
- Worm digging mini-activity
- Composting system
- Pruning mechanics (cut → multi-branch)
- UI for inspection, shop, time controls

### Nice-to-Have (Phase 1.5)
- Multiple plant types
- Weather effects (visual only, no gameplay impact yet)
- Plant repositioning (move pots)
- Tool upgrades (better shears, watering can)

### Future (Phase 2)
- All deferred systems listed above
- Breeding and genetics
- Indoor growing
- Pest and disease
- Advanced training techniques
- Multiple growing areas

## MVP Development Roadmap

### Week 1-2: Core Plant System
**Goal:** Watch a plant grow from seed to mature

**Implementation:**
- ✅ Plant3D rendering with ez-tree (already complete)
- Single avocado plant in a pot
- Water system (water level depletes, click to water)
- Growth over time with visual growth animation
- Time controls (pause, 1x, 5x, 10x)
- Basic backyard scene (grass, pavers, single pot)

**Success Metric:** Can plant a seed, fast-forward time, watch it grow to maturity in one session

### Week 3: Nutrients & Visual Feedback
**Goal:** Plant dies if you don't manage nutrients

**Implementation:**
- NPK tracking system (N, P, K values 0-100 each)
- Nutrient consumption during growth (rates based on growth stage)
- Visual plant changes (yellowing when N is low, purple tint when P is low)
- Click plant → Inspection panel shows nutrient levels
- Fertilizer item in shop (costs $8, replenishes nutrients)

**Success Metric:** Player sees plant health decline, adds fertilizer, plant recovers

### Week 4: Economy Basics
**Goal:** Complete core loop - grow, harvest, sell, reinvest

**Implementation:**
- Money counter UI
- Fruit production system (mature plant produces fruit)
- Harvest interaction (click fruit → Add to inventory)
- Sell fruit button (fruit → money)
- Simple shop UI (buy fertilizer, pots, soil)
- Starting state: $10, 1 fertilizer, 2-3 ripe fruit

**Success Metric:** Plant grows → Makes fruit → Sell fruit → Buy supplies → Plant more seeds → Full loop understood

### Week 5: Expansion & Interactions
**Goal:** Multi-plant management with side income

**Implementation:**
- Multiple plant container support (place new pots)
- Worm digging mini-game (click grass, visual hints for worms)
- Compost bin object (collects pruning material)
- Pruning system (buy shears, enter prune mode, cut branches)
- Granny's Tips tooltips (context-sensitive tutorials)

**Success Metric:** Managing 3-5 plants, using compost system, earning money from multiple sources

### Week 6: Polish & Balance
**Goal:** Feels good to play for 20+ minutes

**Implementation:**
- UI improvements and visual polish
- Better visual feedback for all plant states
- Balancing pass (prices, growth rates, nutrient consumption)
- Progressive shop unlocks
- Save/load system (localStorage)
- Milestone notifications

**Success Metric:** 10-minute sessions feel satisfying, players return for multiple sessions

### Post-Week 6: Decision Point
**Option A:** Polish and balance further (2-3 more weeks)
- Advanced tutorials
- More visual states
- Performance optimization
- Playtesting and iteration

**Option B:** Begin Phase 2 features
- New plant species
- Breeding system
- Indoor growing
- Pest management

**Recommendation:** Option A - Ensure Phase 1 is rock-solid before adding complexity

## Critical Prototyping Questions

Test these constantly during development:

### Engagement Questions
1. **Does a 10-minute session feel satisfying?**
   - Did I make progress? Accomplish something?
   - Test: Play for 10 minutes, walk away. Do you want to come back?

2. **Is the economic loop clear?**
   - Do players naturally understand "sell fruit → buy stuff → grow more"?
   - Test: Watch new player for 15 minutes. Do they "get it" without explanation?

3. **Does time acceleration feel good?**
   - Can you visibly see growth speed up at 10x?
   - Test: Fast-forward growth. Does it feel like time-lapse or like skipping?

### Balance Questions
4. **Are nutrients too punishing or too lenient?**
   - Do plants die too easily? Or never have problems?
   - Test: Play without adding fertilizer. How long until plant dies?

5. **Is worm digging fun or annoying?**
   - Would players rather just skip it?
   - Test: Dig 20 worms. Still interesting on worm #20?

6. **Is starting money right?**
   - Does $10 + 1 fertilizer + 2-3 fruit feel comfortable?
   - Test: Can a new player survive first 30 minutes without frustration?

### System Questions
7. **Do interconnected loops make sense?**
   - Do players discover "pruning → compost → worms" naturally?
   - Test: Does anyone use the compost bin without being told?

8. **Is pruning benefit clear?**
   - Do players understand WHY to prune (not just how)?
   - Test: Remove UI feedback. Do players still prune? If not, feedback is critical.

9. **Are Granny's Tips helpful or annoying?**
   - Do they teach without feeling like tutorials?
   - Test: Play without tips. What do you get stuck on? That needs a tip.

### Technical Questions
10. **Can the game handle 10-20 plants at 60 FPS?**
    - Performance target validation
    - Test: Spawn 20 plants. Still smooth at 10x speed?

## Potential Issues & Mitigation Strategies

### Issue 1: Starting Experience Too Slow ✅ ADDRESSED
**Solution Implemented:**
- Start with $10 (not $0)
- Start with 2-3 ripe fruit (immediate harvest)
- Start with 1 fertilizer bottle (safety net)
- First 10 minutes = positive momentum, not scrambling

### Issue 2: Worm Digging Gets Tedious ✅ ADDRESSED
**Solution Implemented:**
- Visual hints (darker soil = worms)
- Patterns (near compost, after rain)
- Unlockable tools (worm rake reveals locations)
- Late-game automation (worm farm)

### Issue 3: Pruning Benefits Unclear ✅ ADDRESSED
**Solution Implemented:**
- Tutorial moment (Granny's tip at 70% maturity)
- Ghost preview before cutting
- Clear UI feedback ("Pruning increased leaf count by 35%")
- Quantified benefits (20-40% faster fruit production)

### Issue 4: Time Scale Needs Tuning ✅ ADDRESSED
**Solution Implemented:**
- Visible acceleration at 5x-10x (time-lapse animation)
- Milestone notifications even when paused
- Every session has progress (fruit ripens, compost finishes, worms found)
- Golden rule: Never nothing to do

### Issue 5: Shop Overwhelms Early ✅ ADDRESSED
**Solution Implemented:**
- Progressive unlocks based on milestones
- Start: Only basics (soil, fertilizer, small pots)
- Unlock tools after achieving specific goals
- Each unlock feels like achievement, not just new option

## Success Metrics & KPIs

### Engagement Metrics
- **Average session length:** 10-20 minutes (target)
- **Return frequency:** Daily check-ins (target)
- **Retention:** 30%+ return after 7 days
- **Session depth:** 5+ actions per session

### Progression Metrics
- **Time to first $50:** ~30 minutes
- **Time to 5 plants:** 1-2 hours
- **Time to all basic tools:** 2-3 hours
- **Time to "mastery":** 5-10 hours

### Satisfaction Indicators
- Player discovers interconnected loops without tutorials
- "Aha!" moments when systems click
- Pride in well-maintained garden
- Satisfaction of profitable harvest
- Joy of expansion and optimization

### Red Flags to Watch For
- ⚠️ Session length < 5 minutes (quit too early)
- ⚠️ Never return after first session (failed hook)
- ⚠️ Quit before first fruit harvest (too slow)
- ⚠️ Never use compost system (loop unclear)
- ⚠️ Never prune plants (benefit unclear)

## Conclusion

Botanica aims to be a deeply satisfying gardening simulation that respects the player's time while offering meaningful complexity. The interconnected systems create emergent gameplay where every action has cascading effects. Starting with immediate success (ripe fruit, safety net money) and growing into a thriving garden operation provides a clear progression arc with constant small victories.

**Version 1.1 Improvements:**
- Smoother starting experience ($10 + ripe fruit + fertilizer)
- Progressive shop unlocks prevent overwhelm
- Granny's Tips system teaches without feeling like tutorials
- Clear pruning benefits with UI feedback
- Visual hints and automation for worm digging
- Fast-forward animations and milestone notifications
- Detailed MVP roadmap with week-by-week goals

The semi-realistic approach grounds the game in real horticultural knowledge while keeping mechanics accessible and fun. Players will learn actual gardening concepts (NPK ratios, pH, pruning techniques) through natural gameplay, not forced tutorials.

Most importantly, Botanica is designed to be a **digital hobby** - something you tend to, check on, optimize, and take pride in, just like real plants. Every design decision prioritizes the question: "Does this make the game more satisfying to check on daily?"

