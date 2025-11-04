# 🌿 Botanica

A digital terrarium ecosystem simulator - not a game to beat, but a living system to tend and observe.

## About

Botanica is a **digital hobby** that lets you grow procedurally-generated plants in a virtual terrarium. Watch them grow, prune their branches, breed hybrids, and build your botanical collection.

This project explores creating something that matches the joy of real terrarium keeping: watching systems grow, optimizing ecosystems, and tinkering with long-term projects.

## Current Status: Phase 2 - Plants Growing! ✅

The project now includes procedurally-generated plants using L-systems. A test fern grows in the terrarium!

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

**Current Features:**
- ✅ Vite + TypeScript development environment
- ✅ Three.js 3D scene with orbit controls
- ✅ Glass dome terrarium container
- ✅ Soil bed with realistic materials
- ✅ Professional lighting setup
- ✅ **L-system plant generator** (NEW!)
- ✅ **Procedurally-generated Fern** (NEW!)
- ✅ Feature-based code architecture

**Controls:**
- Drag to rotate camera
- Scroll to zoom in/out
- Watch the fern growing from the center!

**Prototype Available:**
The original HTML prototype is available in `notes/prototype.html` and includes:
- 🌱 L-system procedural plant generation
- 🎨 5 plant presets + random generation
- 🎯 Click to add plants

## How It Works

Plants are generated using **L-systems** (Lindenmayer systems) - a mathematical approach where simple rules create complex branching structures:

```
Rule: "F[+F][-F]F"
F = grow forward
+ = turn left
- = turn right
[ = start branch
] = end branch

Apply rule 3 times → Complex plant structure emerges!
```

## Roadmap

### Phase 0: Prototype ✅
- [x] L-system plant generator
- [x] Interactive browser demo
- [x] Multiple plant presets

### Week 1: The Terrarium (In Progress)
**Phase 1: Basic Scene ✅**
- [x] Set up Vite + Three.js + TypeScript
- [x] Glass dome container with realistic glass material
- [x] Soil bed and lighting
- [x] Orbit camera controls

**Phase 2: Plant Generation ✅**
- [x] L-system string generator
- [x] Turtle graphics geometry builder
- [x] Plant entity class
- [x] Fern preset renders in terrarium

**Phase 3-5: Growth & Interaction**
- [ ] Growth animation over time
- [ ] Time controls (pause/speed up)
- [ ] Click soil to plant seeds
- [ ] Click plant to inspect details

### Week 2: Interaction
- [ ] Harvest seeds from mature plants
- [ ] Seed inventory system
- [ ] Water individual plants
- [ ] Visual feedback for plant needs

### Week 3: Pruning & Cuttings
- [ ] Click branches to prune
- [ ] Take cuttings (clone plants)
- [ ] Plants respond to pruning

### Week 4: Genetics
- [ ] View plant genetics
- [ ] Cross-pollinate plants
- [ ] Create hybrid species
- [ ] Visual trait inheritance

### Week 5+: Collection System
- [ ] Seed vault interface
- [ ] Breeding lab
- [ ] Species catalog
- [ ] Multiple terrarium biomes

## Philosophy

This isn't a game with objectives or scores. It's a **digital hobby** you check on daily and tend to, like real terrariums:

- **No win/lose states** - Just observation and tinkering
- **Procedural beauty** - No art skills required, geometry emerges from rules
- **Satisfying feedback** - Watch numbers go up, watch plants grow
- **Long-term projects** - Build your collection over time

## Technical Stack

- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Three.js** - 3D rendering and WebGL
- **Feature-based architecture** - Scene, Terrarium, and Type modules

**Project Structure:**
```
src/
├── scene/            # Scene, Camera, Lighting
├── terrarium/        # GlassDome, Soil
├── plants/           # L-system generator, geometry builder, presets
├── types/            # TypeScript definitions
└── main.ts           # Application entry point
```

## Development

Full development documentation lives in the `_context-vault/personal/botanica/` directory:

- **Ideas**: Initial concept brainstorming
- **Specs**: Detailed specifications (UX, technical, MVP)
- **Decisions**: Design decisions with rationale
- **DevLogs**: Development progress journal

## Inspiration

- Real-world terrarium and aquarium keeping
- L-systems and procedural generation
- Incremental games and idle systems
- Digital gardens and personal creativity tools

## License

MIT License - See LICENSE file for details

---

**Status**: Active Development | **Latest**: Phase 2 Complete - L-System Plants! 🌱  
**Repository**: https://github.com/Jaxsbr/Botanica.git
