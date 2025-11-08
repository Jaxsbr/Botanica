# Botanica Interaction Behaviour Map

This document captures the planned interaction rules for the next iteration of the Botanica prototype.  
Goals:
1. Reduce repetitive clicking by letting players “paint” actions while holding the primary button.
2. Keep the cursor anchored to the selected mode so intent is obvious.
3. Let the world objects communicate availability via animation, highlight, or particles instead of abrupt cursor swaps.

The map focuses on left-button (`LMB`) input. `RMB` and `Esc` cancel the current drag but do not exit the active mode.

---

## Interaction Glossary

| Term | Description |
| --- | --- |
| **Plant Mode** | Activated by choosing a seed. Cursor shows the seed icon and persists until another mode is selected. |
| **Build Mode** | Activated by selecting soil placement. Cursor shows a soil tile icon and persists until replaced. |
| **Harvest Overlay** | Harvesting is always permitted; drag harvesting rides on top of other modes. |
| **Drag Sequence** | `LMB down` → continuous `LMB move` (cursor held) → `LMB up`. |
| **Preview Tile** | Highlight generated during build placement. |
| **Locked Tile** | Tile or cell that is outside the placement range or otherwise unavailable. |

Visual shorthand:
- **Shake** – quick 2–3 frame wobble communicating “blocked.”
- **Glow** – soft bloom around the object, optionally with pulse.
- **Spark** – short particle burst (fruit glitter, soil dust, etc.).

---

## Cursor Baseline

| Mode | Cursor Icon | Notes |
| --- | --- | --- |
| Plant | Seed icon for the selected seed | Includes seed count badge in future UI. Remains fixed even on harvestables. |
| Build | Soil tile icon | Optionally show fruit cost badge. Remains fixed even on invalid targets. |

Cursor states never switch automatically; all feedback shifts to hovered objects.

---

## Plant Mode Behaviour Matrix

| Input State | Target Type | Action | Visual Feedback |
| --- | --- | --- | --- |
| Hover | Empty soil (no preview) | None | Soil tile shows faint highlight ring. |
| Hover | Occupied plant, not ripe | None | Plant + soil perform **shake** to signal blocked. |
| Hover | Ripe plant | Ready flag only | Plant emits **glow** and subtle fruit motes. |
| Hover | Locked / non-garden | None | Nothing (optional shake on tile border). |
| LMB Down | Empty soil with seeds available | Plant seed immediately on down event. | Plant sprouts animation + soil puff. |
| LMB Down | Empty soil, no seeds | No action | Tile performs **shake** + UI ping “Out of seeds”. |
| LMB Down | Occupied plant (any phase) | Harvest check; if ripe, harvest. | Ripe plant: harvest animation + particles. Unripe: **shake**. |
| Drag Move (held) | Enter empty soil with seeds remaining | Auto-plant on enter. | Same planting VFX as single plant. |
| Drag Move (held) | Enter ripe plant | Auto-harvest on enter. | Harvest VFX on each plant hit. |
| Drag Move (held) | Enter unripe plant or locked tile | Skip—no state change. | Momentary **shake** to reinforce block. |
| LMB Up | Anywhere | End drag. | Remove transient highlights. |
| RMB / Esc | Anywhere | Cancel current drag only | Clear transient highlight but stay in plant mode. |

Notes:
- Seed counts gate planting; when inventory reaches zero mid-drag the next invalid tile should shake and subsequent tiles won’t consume drag input until player releases/re-clicks.
- Harvesting during plant drag takes priority (matching “harvest always works” rule).

---

## Build Mode Behaviour Matrix

| Input State | Target Type | Action | Visual Feedback |
| --- | --- | --- | --- |
| Hover | Placement preview (affordable) | None | Preview tile pulses softly. |
| Hover | Placement preview (not enough fruit) | None | Preview tile desaturates + slow **shake**. |
| Hover | Existing soil tile | None | Tile pulses to show already placed. |
| Hover | Locked space (no preview) | None | No visual (optional border flash). |
| LMB Down | Placement preview (affordable) | Place soil immediately on down. | Soil rises animation + dust particles. |
| LMB Down | Placement preview (not enough fruit) | No action | Preview flashes red + **shake**. |
| LMB Down | Existing soil tile | No action | Tile gives **shake** (cannot build). |
| Drag Move (held) | Enter placement preview (affordable + fruit remaining) | Auto-place tile as soon as cursor crosses cell. | Same placement VFX; decrement fruit per placement. |
| Drag Move (held) | Enter placement preview (insufficient fruit) | Skip placement, preview flashes. | Red flash + **shake**. |
| Drag Move (held) | Enter existing soil / locked | Skip. | Light shake if already placed. |
| LMB Up | Anywhere | End drag. | Stop preview pulsing if placement mode ends. |
| RMB / Esc | Anywhere | Cancel current drag only | Preview stays active; mode remains build. |

Notes:
- Drag placement continues until fruit hits zero or player releases `LMB`.
- After each placement, system should refresh available previews to maintain adjacency rules without leaving stale cells under the cursor.

---

## Harvest Overlay (applies in any mode)

| Input State | Target Type | Action | Visual Feedback |
| --- | --- | --- | --- |
| Hover | Ripe plant | None | Plant emits **glow** and sparkle motes to signal readiness. |
| LMB Down | Ripe plant | Harvest immediately on down event. | Harvest VFX (fruit pop, particles). |
| Drag Move (held) | Enter ripe plant | Auto-harvest chain while held. | Same harvest VFX per plant. |
| Drag Move (held) | Enter unripe plant | No state change. | Quick **shake** to indicate not ready. |
| LMB Up | Anywhere | End harvest drag. | Remove transient harvest highlights. |
| RMB / Esc | Anywhere | Cancel current drag only. | Stop active highlight/particles. |

---

## Shared Rules & Edge Cases

1. **Harvest priority**  
   - Regardless of active mode, encountering a ripe plant during a drag harvests immediately.

2. **Drag gating**  
   - A drag sequence can start on any valid actionable target (plantable soil, ripe plant, affordable preview).  
   - If the initial `LMB down` occurs on an invalid target, no drag action is established; subsequent movement during that hold produces only feedback (shake) until button is released and pressed again on a valid target.

3. **Mode persistence**  
   - Plant / Build modes stay active until another mode is chosen. `RMB`/`Esc` do not exit the current mode.

4. **Visual layering**  
   - Highlights should not conflict: e.g., a tile can show both “preview pulse” and “affordable glow” states by layering materials or overlay sprites.  
   - When a harvestable plant glows, the soil highlight beneath should dim to avoid visual overload.

5. **Gamepad / touch future-proofing**  
   - Drag semantics translate to touch hold + swipe.  
   - For gamepad, consider directional “paint” once cursor navigation exists.

6. **Performance considerations**  
   - Dragging across many tiles should batch state updates to avoid hitching.  
   - Visual feedback should use pooled particles and short timers.

---

## Open Questions

1. Should planting while dragging consume the seed before entering the tile (pre-check) or after animation completes? (Impacts feedback if player runs out mid-animation.)
2. Do we allow drag planting diagonally (i.e., accepting any tile the cursor passes) or restrict to orthogonal adjacency?  
3. For build mode, do we preview additional tiles while dragging (shadow grid) or keep single-cell previews only?
4. Should there be an explicit control to exit Plant/Build modes, or is staying in the chosen mode preferable?

---

## Implementation Checklist (Follow-up)

- Update `InteractionController` to track drag state and feed hover/drag events to the controller.
- Expand `GameController` with drag pipelines (plant, harvest, build) and maintain mode-specific visual controllers.
- Introduce a visual feedback layer (shake/glow/particles) addressable per tile/plant.
- Replace cursor swapping logic with static mode cursor assignment.
- Implement particle/animation pooling for performance.


