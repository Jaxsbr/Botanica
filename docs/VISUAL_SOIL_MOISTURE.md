# Visual Soil Moisture System

## Overview

Botanica implements a realistic soil moisture visualization system where the **visual appearance of soil can be misleading** based on drainage type. This mimics real-life gardening where surface soil appearance doesn't always match actual moisture levels below the surface.

## Core Concept

**Players see**: Misleading visual soil color (affected by drainage type)  
**Reality is**: Actual moisture level (only revealed with moisture meters)

This creates meaningful decision-making around purchasing moisture meters vs. relying on visual cues.

---

## Moisture to Color Mapping

### Base Color Thresholds

The soil mesh color changes based on moisture percentage:

| Moisture Range | Visual State | Hex Color | RGB | Appearance |
|---------------|--------------|-----------|-----|------------|
| 0-20% | Dry | `0xA0826D` | (160, 130, 109) | Light brown, dusty |
| 21-40% | Low | `0x8B6F47` | (139, 111, 71) | Medium-light brown |
| 41-70% | Medium | `0x6B5638` | (107, 86, 56) | Brown, slightly moist |
| 71-100% | Wet | `0x4A3C28` | (74, 60, 40) | Dark brown, saturated |

### Color Transition Examples

```
Water Level: 100% → 0% (over time)
Visual Flow:  Dark Brown → Brown → Medium-Light → Light/Dusty

[████████████████] 100% - Very dark, rich soil
[████████████░░░░]  75% - Dark brown, well watered
[████████░░░░░░░░]  50% - Medium brown
[████░░░░░░░░░░░░]  25% - Light brown, getting dry
[░░░░░░░░░░░░░░░░]   0% - Very light, parched
```

---

## Drainage-Based Visual Deception

### The Misleading System

**Visual Moisture = Actual Moisture + Drainage Offset**

Each drainage type applies a percentage offset to the visual appearance:

| Drainage Type | Visual Offset | Visual Effect | Reason |
|--------------|---------------|---------------|---------|
| **Poor** | **+15%** | Looks **wetter** than actual | Surface retains water, stays damp |
| **Medium** | **0%** | **Accurate** representation | Balanced drainage |
| **Good** | **-15%** | Looks **drier** than actual | Surface dries quickly |

---

## Visual Deception Examples

### Example 1: Poor Drainage (Surface Stays Wet)

```
Actual Moisture: 30% (LOW - needs watering soon!)
Visual Offset:   +15%
Visual Appears:  45% (MEDIUM - looks fine)

Color Shown: Medium brown (#6B5638) - looks moist
Reality: Plant is thirsty, low moisture
Player Risk: May not water when needed
```

**Real-world analogy**: Clay soil with poor drainage - top layer stays wet even when roots are dry.

### Example 2: Good Drainage (Surface Dries Fast)

```
Actual Moisture: 60% (ADEQUATE - plant is fine)
Visual Offset:   -15%
Visual Appears:  45% (MEDIUM-LOW - looks drier)

Color Shown: Medium brown (#6B5638) - looks dry-ish
Reality: Plant has adequate water
Player Risk: May over-water
```

**Real-world analogy**: Sandy soil - surface looks bone dry but moisture is deeper down.

### Example 3: Medium Drainage (Accurate)

```
Actual Moisture: 50%
Visual Offset:   0%
Visual Appears:  50%

Color Shown: Medium brown (#6B5638)
Reality: Exactly as it appears
Player Risk: None - accurate representation
```

**Real-world analogy**: Well-balanced potting mix - what you see is what you get.

---

## Detailed Visual Scenarios

### Scenario A: Poor Drainage Deception Over Time

| Time | Actual % | Visual % | Color | Visual State | Truth |
|------|----------|----------|-------|--------------|-------|
| 0h | 80% | 95% | Dark brown | Very wet | Actually adequate |
| 4h | 60% | 75% | Dark brown | Looks wet | Actually adequate |
| 8h | 40% | 55% | Medium brown | Looks OK | Actually LOW |
| 12h | 20% | 35% | Medium-light | Looks low-ish | Actually DRY |
| 16h | 0% | 15% | Light brown | Looks very dry | CRITICAL |

**Player Experience**: Soil looks healthy longer than it actually is. May delay watering too long.

### Scenario B: Good Drainage Deception Over Time

| Time | Actual % | Visual % | Color | Visual State | Truth |
|------|----------|----------|-------|--------------|-------|
| 0h | 80% | 65% | Medium-dark | Looks adequate | Actually very wet |
| 4h | 60% | 45% | Medium | Looks dry-ish | Actually adequate |
| 8h | 40% | 25% | Light-medium | Looks dry | Actually low |
| 12h | 20% | 5% | Light brown | Looks critical | Actually dry |
| 16h | 0% | -15%* | Light brown | Looks parched | CRITICAL |

*Clamped to minimum dry color

**Player Experience**: Soil looks drier than reality. May over-water and cause root rot.

---

## Gameplay Integration

### Three Information Tiers

#### Tier 1: No Moisture Meter (Default - $0)
**Player sees:**
- Misleading soil color (drainage-affected)
- "Last watered: X ago" timestamp

**Strategy:**
- Learn drainage behavior through trial and error
- Track time since last watering carefully
- Risk killing plants due to deception

**Example Decision:**
```
Visual: Light brown soil (looks 25% moisture)
Last Watered: 2 hours ago
Drainage: Good (-15% offset)

Player thinks: "Looks dry, should I water?"
Reality: Could be 40% actual (still adequate)
Risk: Over-watering if player waters based on appearance
```

#### Tier 2: Basic Moisture Meter ($25)
**Player sees:**
- Misleading soil color (still there)
- Status text revealing ACTUAL moisture:
  - "Dry - Water soon!" (red, <20%)
  - "Low moisture - Consider watering" (orange, 20-40%)
  - "Adequate moisture" (yellow, 40-70%)
  - "Well hydrated" (green, 70%+)

**Strategy:**
- Ignore misleading visuals
- Trust the meter's status text
- Safe and reliable watering decisions

**Example Decision:**
```
Visual: Light brown soil (looks dry)
Meter Says: "Well hydrated" (green)
Drainage: Good

Player learns: "Ah! The surface looks dry but plant is fine.
               This is good drainage doing its thing!"
Decision: Don't water, trust the meter
```

#### Tier 3: Pro Moisture Meter ($50)
**Player sees:**
- Misleading soil color (still there)
- Full moisture data:
  - Exact percentage (e.g., "42%")
  - Color-coded progress bar
  - Status text

**Strategy:**
- Complete transparency
- Understand exactly how much drainage deceives
- Optimal plant care

**Example Decision:**
```
Visual: Dark brown soil (looks 70% wet)
Meter Shows: 55% actual (progress bar)
Status: "Adequate moisture"
Drainage: Poor

Player learns: "Surface is holding water (+15% visual),
               but actual moisture is 55%. Plant is fine."
Decision: Scientific precision, perfect watering timing
```

---

## Implementation Details

### Code Architecture

**File**: `src/systems/Soil.ts`

#### Visual Water Color Method
```typescript
public getVisualWaterColor(): number {
    const offset = this.VISUAL_OFFSETS[this.drainage];
    const visualLevel = this.waterLevel + offset;

    if (visualLevel <= 20) return 0xA0826D; // Light brown
    if (visualLevel <= 40) return 0x8B6F47; // Medium-light brown
    if (visualLevel <= 70) return 0x6B5638; // Brown
    return 0x4A3C28; // Dark brown
}
```

#### Drainage Offsets
```typescript
private readonly VISUAL_OFFSETS = {
    poor: 15,    // Surface stays wet
    medium: 0,   // Accurate
    good: -15    // Surface dries fast
};
```

### Mesh Update Flow

```
1. Soil.update(deltaTime)
   └─> waterLevel decreases over time

2. Pot.update(deltaTime)
   └─> soil.update(deltaTime)
   └─> updateSoilColor()

3. Pot.updateSoilColor()
   └─> color = soil.getVisualWaterColor()  // Misleading!
   └─> soilMesh.material.color.setHex(color)

4. Player sees misleading color in 3D scene
```

### Truth Revelation Flow

```
1. Player clicks pot
   └─> HomePodule.handleClick()

2. PlantInspectionUI opens
   └─> stats = pot.getSoil().getStats()  // ACTUAL values

3. Display based on inventory:
   
   No meter:
   └─> Show: "Last watered: ${getTimeSinceWatered()}"
   
   Basic meter:
   └─> Show: Status text from ACTUAL waterLevel
       (reveals truth despite misleading visuals)
   
   Pro meter:
   └─> Show: Exact % + bar + status
       (complete transparency)
```

---

## Testing & Debugging

### Manual Test Scenarios

#### Test 1: Poor Drainage Visual Lag
1. Create pot with poor drainage
2. Water to 100%
3. Observe soil color over time
4. Expected: Stays dark brown longer than actual moisture
5. At 30% actual, should still look ~45% (medium brown)

#### Test 2: Good Drainage Visual Dryness
1. Create pot with good drainage
2. Water to 100%
3. Observe soil color over time
4. Expected: Looks drier faster than actual
5. At 60% actual, should look ~45% (medium-dry brown)

#### Test 3: Moisture Meter Progression
1. Start with no meters
   - Click pot → See "Last watered: just now"
   - Only visual color available
2. Buy Basic Meter ($25)
   - Click pot → See status text revealing truth
3. Buy Pro Meter ($50)
   - Click pot → See exact % + bar + status

### Debug Console Commands

```javascript
// Get current soil stats
const homePodule = window.botanica.getPoduleManager().getCurrentPodule();
const pot = homePodule.pot; // Assuming pot is exposed
const stats = pot.getSoil().getStats();
console.log('Actual:', stats.waterLevel);

// Get visual appearance
const visual = pot.getSoil().getVisualWaterColor();
console.log('Visual Color:', visual.toString(16));

// Force water level for testing
pot.getSoil().water(50); // Add 50%
```

---

## Design Philosophy

### Why Misleading Visuals?

1. **Realism**: Real gardening has this exact problem
2. **Value Creation**: Makes moisture meters worth purchasing
3. **Learning Curve**: Players learn drainage behavior
4. **Decision Making**: Creates meaningful choices
5. **Skill Expression**: Experienced players can "read" drainage types

### Educational Value

Players learn real horticultural concepts:
- Surface moisture ≠ root moisture
- Drainage types have distinct behaviors
- Tools provide objective measurement
- Visual cues can be deceiving

---

## Future Enhancements

### Potential Additions

1. **Seasonal Variation**
   - Summer: Faster evaporation, more deception
   - Winter: Slower evaporation, more accurate visuals

2. **Plant-Specific Needs**
   - Cacti: Need very dry soil (visual deception more critical)
   - Ferns: Need constant moisture (less margin for error)

3. **Advanced Meters**
   - Probe-style meters (multiple depth readings)
   - Continuous monitoring meters (always-on display)

4. **Visual Enhancements**
   - Wet soil sheen/gloss effect
   - Dry soil cracks/texture
   - Particle effects for very dry soil

---

## Summary Table

| Drainage | Offset | Visual vs Reality | Player Risk | Best Strategy |
|----------|--------|-------------------|-------------|---------------|
| **Poor** | +15% | Looks wetter | Under-watering | Buy meter early |
| **Medium** | 0% | Accurate | Low risk | Can learn visually |
| **Good** | -15% | Looks drier | Over-watering | Meter recommended |

**Key Takeaway**: Without moisture meters, players must combine visual cues with time tracking and knowledge of drainage behavior. Moisture meters reveal the truth and enable optimal plant care.

