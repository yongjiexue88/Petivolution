# V1 AI System Implementation Progress Report
**Date:** 2026-01-11
**Status:** In Progress (AI Enhancements Completed)

### 🚀 Latest Updates (2026-01-11)
#### 🐛 Bug Fixes & Stability
- [x] **Connection Refused Fix**: Resolved `net::ERR_CONNECTION_REFUSED` by ensuring backend server (port 3000) is actively listening and cleaning up zombie processes.
- [x] **Configurable API URL**: Updated `ServerClient.ts` to support `VITE_API_URL`, improving deployment flexibility.
- [x] **Robust Backend Startup**: Verified backend startup sequence and port binding.

#### 🧠 Advanced Animal AI
- [x] **Perception Ranges**: Calibrated for 256x256 map (e.g., Hawk 20, Snake 4).
- [x] **Social Behaviors**: Implemented flocking for Birds/Wolves/Chickens; solitary logic for others.
- [x] **Enhanced Personalities**: distinct `Brave`, `Cautious`, `Curious` behaviors per species.
- [x] **Config Refactor**: Created standalone configs for Fox, Hawk, Wolf, Snake.
- [x] **Day/Night Cycle**: Removed AI logic per user request (Rest is now purely fatigue-based).

#### 🏙️ World Building
- [x] **City Construction**: Built a central city with Town Hall, roads, fences, gardens, and localized attributes.
- [x] **New Background**: Replaced dark grid with a tiling grass texture from `Tileset Spring.png`.

#### 🎨 Integrated Art Assets
- [x] Generated and sliced pixel art sprites for all 9 requested animals:
  - Chicken, Small Bird, Raccoon, Crow, Fox, Dog, Hawk, Wolf, Snake.
- [x] **High-Res Source**: Re-generated sprites at **64x64px** source resolution for crisp scaling.
- [x] **Display Scaling**: Configured `WorldScene.ts` to render new sprites at **32x32px** (0.5 scale).
- [x] **Animations**: Implemented Idle, Walk, Run, Attack, Eat, Sleep, Dead states for all new species.

#### ⚠️ Known Issues
- **Frontend Tests**: 3 tests failing in `actions.test.ts` and `perception.test.ts` related to AI perception radius and thirst restoration. These appear unrelated to recent connectivity fixes but need attention.

#### 🎨 Pixel Art Standards (NEW)
- [x] Switch to **2x integer zoom** (40 tiles visible)
- [x] Main actors: **32×32** | Small critters: **16×16**
- [x] Enable `roundPixels: true` in Phaser

## Overview
Successfully implemented and integrated the new V1 AI system for Petivolution. The system replaces the legacy logic with a robust Goal-Action architecture, compliant with the provided specifications. Recently addressed critical stability issues ensuring reliable backend connectivity.

## Key Accomplishments

### 1. AI Architecture Upgrade
*   **Utility System (`utility.ts`)**: Implemented utility-based decision making. Entities now evaluate needs (hunger, thirst, fatigue) and environmental stimuli to select high-level Goals (`Drink`, `Rest`, `Flee`, `Hunt`, `Eat`, `Wander`).
*   **Action Executors (`actions.ts`)**: Modularized action logic. Each state (`moveTo`, `chase`, `attack`, `sleep`, etc.) has a dedicated executor function.
*   **Perception (`perception.ts`)**: Optimized perception system that runs at a lower frequency (configurable) to scan for stimuli (Predator, Prey, Water, Trash, Bush).
*   **Decision Loop (`tick.ts`)**: Integrated the perception-decision-action loop into the main simulation tick.

### 2. Configuration System
*   **Species Config (`species.ts`)**: centralized stats and behavioral parameters for `rat` and `cat` species.
*   **World Objects (`objects.ts`)**: Defined properties for interactive objects (water sources, bushes, trash piles).
*   **World Rules (`worldRules.ts`)**: Created a flexible rules system for toggling simulation features.

### 3. Critical Bug Fixes
*   **Invisible Animals & Rendering**: Rewrote `WorldScene.ts` to perfectly sync with the Worker's `SnapshotEntity` data. Fixed TypeErrors that caused crashes during syncing.
*   **Runtime Stability**: Fixed a syntax error in `utility.ts` (restored function signature) that was causing simulation startup failures.
*   **Build System**: Resolved circular dependencies and invalid exports in `index.ts`.
*   **Debug & UX Tools**: Added "Minus" buttons for resource removal and visual debug overlays (Sense Radius, Target Lines, Chunk Bounds) to assist in AI verification.

## System Components

### Goal-Action Mapping
| Goal | Trigger Condition | Resulting State |
| :--- | :--- | :--- |
| **Flee** | High Fear (Predator nearby) | `MoveTo` (away from threat) |
| **Drink** | High Thirst | `MoveTo` (to water) -> `Drink` |
| **Eat** | High Hunger | `MoveTo` (to trash/prey) -> `Eat` |
| **Hunt** | Hunger + Prey visible (Cat) | `Chase` -> `Attack` |
| **Rest** | High Fatigue | `MoveTo` (to bush) -> `Sleep` |
| **Wander** | No urgent needs | `Wander` |

## Verification
*   **Interaction Enabled**: Users can click entities to select them. The "Animal Detail" panel correctly displays real-time AI data (vitals, current goal, top 3 utility scores).
*   **Simulation Validated**: Verified predation loops (cats hunting rats) and population dynamics in a running browser session.
*   **Debug Tools Verified**: Confirmed object removal works and debug overlays accurately reflect simulation state (grid, perception range).

### 4. Quality Assurance & Testing
*   **Unit Testing Suite**: Established a comprehensive Vitest suite covering the entire simulation engine.
*   **Test Coverage Results**:
    *   `src/sim/core/spawner.ts`: **100%**
    *   `src/sim/core/chunkManager.ts`: **99.4%**
    *   `src/sim/ai/utility.ts`: **92%**
    *   `src/sim/ai/actions.ts`: **73%**
    *   `src/sim/core/tick.ts`: **62%**
*   **Lint & Type Safety**: Resolved all critical lint warnings and replaced numerous `any` types with proper interfaces (`SimEvent`, `EntityRuntime`, etc.) across the simulation worker and game store.


## Next Steps
*   **Optimization**: Address remaining uncovered branches in `tick.ts` and `actions.ts` to reach 90%+ global simulation coverage.
*   **V2 Planning**: Finalize requirements for Genetics and Evolution modules.

## V1.3 Single World Multiplayer Layer (Completed)
**Date:** 2026-01-07
**Status:** Completed

### 1. Backend Infrastructure
*   **Decoupled Server**: Created a standalone Node.js/Express server (`server/src/index.ts`) that runs the authoritative simulation.
*   **Shared Simulation**: Ported existing simulation logic (`world/WorldServer.ts`) to run headless on the backend, sharing core logic with the frontend client.
*   **API Endpoints**: Implemented essential endpoints:
    *   `GET /health`: Server status tick.
    *   `GET /api/world/snapshot`: Full world state for client rendering.
    *   `POST /api/actions/spawn`: Validated entity spawning.
    *   `GET /api/world/entity/:id`: Detailed entity inspection.

### 2. Frontend Client Migration
*   **ServerClient**: Implemented a typesafe API wrapper (`ServerClient.ts`) to handle communication.
*   **Hybrid Mode**: Updated `gameStore.ts` with a `useServer` flag to toggle between Local Worker (legacy) and Server Mode (V1.3).
*   **Polling Loop**: Implemented a 10Hz/20Hz polling mechanism in `App.tsx` to sync state.
*   **UI Integration**:
    *   Added Connection Status indicator in the Toolbar.
    *   Successfully wired Selection and Spawn actions to backend endpoints.

### Workflow Stabilization & Quality Gates
**Date:** 2026-01-07
**Status:** Completed

### 1. Workflow Restoration
*   **Missing Tools**: Restored `.agent/workflows/` including `verify-app.md`, `test-author.md`, and `commit.md`.
*   **Filenames**: Synchronized `/progress` workflow with `memory/progress.md` and `memory/mistake-learn.md`.

### 2. Code Quality & Testing
*   **Linting**: Fixed React Hook violations in `Toolbar.tsx`.
*   **Test Suite**: Stabilized `SpawnPanel.test.tsx` and `sim.worker.test.ts`. 
*   **Coverage**: Verified simulation core at ~90% and critical UI components (SpawnPanel) at 91%.
*   **Result**: 85 tests passing end-to-end.

### Next Steps
*   **Workflow Integration**: Use `/progress` regularly to maintain memory logs and coverage.
*   **Backend Coverage**: Implement tests for `backend/src/index.ts`.

---

## 🌍 Ecosystem Roadmap
**Date Added:** 2026-01-08

### 1) Product Vision

> **One Sentence**: Players create an ecosystem map, observe food chains and emergent behaviors by spawning named animals and modifying the environment, and use visualization tools to maintain ecological balance and tell stories of animal families.

**Three Experience Pillars**:
| Pillar | Description |
| :--- | :--- |
| **Life Stories** | Individuals have names, lifespans, family trees, key event replays |
| **Eco-Dynamics** | Predation/Resources/Habitats make the world "alive" |
| **Player Intervention** | Small changes alter the trend (Strategic rather than pure spectator) |

---

### 2) Core Platform Architecture

#### 2.1 Data-Driven Content
- [ ] `SpeciesConfig`: Species parameters (movement/sensing/vitals/reproduction/behavior weights)
- [ ] `FoodWeb`: Food web (who eats whom, preferences, energy gain)
- [ ] `Habitat`: Habitat preferences (Forest/Grassland/Waterside/City)
- [ ] `MapRecipe`: Map generation recipes (biome distribution + resource density)

> **Goal**: Adding a species = config + optional new actions, no core engine changes needed

#### 2.2 Ecosystem Stabilizer System (Avoid Balance Hell)
- [ ] Carrying Capacity (Dynamic calculation by biome/chunk/resource index)
- [ ] Birth/Death Rate Probability Clamping (Logistic)
- [ ] Resource Minimums and Regeneration (Prevent total extinction)
- [ ] AI Degradation Strategy (Don't go crazy when resources scarce)

**WorldRule Presets**:
| Preset | Description |
| :--- | :--- |
| `Balanced` | Recommended, stable balance |
| `Wild` | Fast reproduction, fast death |
| `Abundant` | Lots of resources, more like a pet sim |

#### 2.3 Visualization & Debugging
- [ ] Population Curves (Count per species)
- [ ] Resource Index Curves (Water/Food/Shelter)
- [ ] Heatmaps: Predation hotspots / Water shortage hotspots / Migration routes
- [ ] Event Stats: Births, Deaths, Predation, Disease

---

### 3) V4+ Content Expansion Roadmap

#### 3.1 Species Tiers

**Tier 1: Non-Predatory Disturbers (Safest)**
- [ ] 🐔 Chicken / 🐦 Bird / 🦋 Butterfly
- New Mechanics: Foraging, Flocking, Migration, Startle
- Resource Interaction: Eat seeds/bugs ("Ground Food Index")

**Tier 2: Scavengers / Pests (Ecosystem Regulators)**
- [ ] 🦝 Raccoon / 🐦‍⬛ Crow / 🦊 Fox
- New Mechanics: Stealing, Scrambling, Nocturnal

**Tier 3: Apex Predators & Drivers**
- [ ] 🐕 Dog (Herding) / 🦅 Hawk (Aerial Predation) / 🐍 Snake (Ambush)
- New Mechanics: Shelter, Territory, Group Behavior

**Tier 4: Social Structures**
- [ ] 🐺 Wolf Pack / 🐦 Bird Flock / 🐜 Ant Colony
- New Mechanics: Leader/Formation/Shared Perception

#### 3.2 Map Compansion Roadmap (Map Packs)

| Pack | Content | New Mechanics |
| :--- | :--- | :--- |
| **Pack 1: Backyard/Park** (V1~V2) | Garden, Bushes, Pond, Trash Spots | Existing Systems |
| **Pack 2: Forest Edge** (V3) | Woods, River, Waterside Habitat, Caves | `Habitat` Preferences |
| **Pack 3: Urban Ecology** (V4) | Streets, Buildings, Dumpsters, Gutters | Human Intervention Tools: Feeders, Cleanup, Fences |
| **Pack 4: Procedural World** (V5) | Biome Noise Generation | Chunk Streaming + Map Seed Sharing |

#### 3.3 System Expansion Roadmap

| System | Priority | Description |
| :--- | :--- | :--- |
| **System A: Circadian Rhythm** | High | Nocturnal animals, resource refresh over time, streetlights/night feeding |
| **System B: Weather & Seasons** | Med | Rain -> Abundant water; Winter -> Less food, Migration |
| **System C: Disease & Parasites** | Low | High density outbreak (Natural stabilizer) |
| **System D: Territory & Dens** | High | Animals establish "Home" and patrol range, Family Tree System |

---

### 4) Game Modes Matrix

| Mode | Description | Features |
| :--- | :--- | :--- |
| **Mode 1: Sandbox** | Default, No fail state | Adjustable Rules (Balanced/Wild/Abundant) |
| **Mode 2: Balance Challenge** | Best for Retention | Goal: Maintain species within range for X days; Reward: Unlocks |
| **Mode 3: Survival Mode** | Narrative Driven | Limited Eco-Budget; Random Events (Drought/Cold Snap/Trash Spikes) |
| **Mode 4: Scenarios** | Sustainable Updates | Fixed Map + Fixed Rules + Fixed Goal |

**Scenario Examples**:
- [ ] "Keep Park Rats within reasonable range"
- [ ] "Ensure Bird Flock migration success in Winter"
- [ ] "Urban Trash Spike: Control Crow population"

---

### 5) Three-Layer Balance Strategy

| Layer | Strategy |
| :--- | :--- |
| **Species Layer** | Define "Ideal Population Range" per species; Above -> Low Birth Rate; Below -> Resource Regen Boost |
| **Food Web Layer** | Two Knobs: `Predation Success Rate` + `Predation Gain` (Energy Conservation) |
| **World Rule Layer** | Treat "More Realistic/Cruel" as a Mode/Setting, don't force everyone to experience it |

---

### 6) Content Update Rhythm

**Every 2 Weeks: Minor Update**
- 1 New Species (Config + Few Actions)
- 1 New Object (e.g., "Bird Nest", "Feeder")
- 1 New Challenge Level

**Every 1-2 Months: Major Update**
- New Map Pack (Forest/City)
- New System (Day-Night/Weather/Territory)
- New Game Mode (Survival Events)

---

### 7) V4 Execution Order

After completing V1.2 (Sharing), proceed in this order:

1. [ ] 🐦 **Bird (Non-Predator)**: Add "Startle/Flock/Perch Point"
2. [ ] 🐕 **Dog (Herding)**: Add "Drive Target, Territory Influence"
3. [ ] 🌙 **Day/Night**: Change behavior weights (Nocturnal vs Diurnal)
4. [ ] 🏆 **Challenge Mode**: Balance Challenge Levels (Best for retention)
5. [ ] 🌧️ **Weather**: Implement "Rain/Sunny" first, affecting water and visibility
6. [ ] 🏙️ **City Map Pack**: Trash mechanics become more meaningful

---

## 📊 Ecosystem Content Matrix (V4 Extended)
**Date Added:** 2026-01-08

> **Purpose**: Every added species must have a clear ecological role, food web closure, gameplay increment, and parameter range.

**Default Units**: 2D tile world; tiles and tick(15Hz)

---

### 1) Ecological Roles

| Role | Description | Example Species |
| :--- | :--- | :--- |
| **Producer/Resource** | Plants, Seeds, Berries, Insects | seeds, insects |
| **Forager** | Eats resources, does not hunt | 🐔Chicken, 🐦Pigeon, 🐰Rabbit |
| **Prey** | Flees, Fast Reproduction | 🐀Rat, 🐰Rabbit |
| **Mesopredator** | Thief/Light Predator | 🦝Raccoon, 🐦‍⬛Crow, 🦊Fox |
| **Apex Predator** | Strong Predator | 🦅Hawk, 🐺Wolf |
| **Guardian/Herder** | Drives/Manages | 🐕Dog |
| **Decomposer/Cleaner** | Eats carcasses/trash | 🦅Vulture, 🐦‍⬛Crow |
| **Pollinator** | Makes world "alive" | 🦋Butterfly, 🐝Bee |

---

### 2) Species Matrix

#### A. Basic Chain (Existing + Immediate Expansion)

##### 🐀 1) Rat
| Attribute | Value |
| :--- | :--- |
| **Role** | Prey + Trash User |
| **Food** | trash, seeds (Ground Food Index) |
| **Predators** | cat, dog(drives), hawk |
| **Habitat** | Bushes/Building Edges/Near Trash (High Cover Dependency) |

**Unique Actions**:
- [ ] `FleeToCover` - Prioritize Bushes
- [ ] `ScavengeTrash` - Forage at Trash Points
- [ ] `Freeze` - Brief pause to lower detection chance (Optional)

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.06–0.09 tiles/tick |
| sense | 8–12 tiles |
| hungerDecay | 0.0005–0.0008 |
| thirstDecay | 0.0006–0.0010 |
| reproduction | Gestation 30–90s, Litter 2–6, High Density Penalty |

---

##### 🐱 2) Cat
| Attribute | Value |
| :--- | :--- |
| **Role** | Mesopredator (Source of Drama) |
| **Food** | rat, smallBird (Later) |
| **Predators** | dog(drives), wolf(Optional) |
| **Habitat** | Edge Zones/Near Bushes (Ambush feel) |

**Unique Actions**:
- [ ] `Stalk` - Stealth approach, reduce distance penalty
- [ ] `Chase + Attack`
- [ ] `GiveUpChase` - Timeout abandon (Stabilizer)

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.05–0.07 |
| sense | 10–14 |
| attackRange | 0.5–0.8 |
| chaseTimeout | 6–12s |
| hungerDecay | 0.0006–0.0009 |

---

##### 🐔 3) Chicken
| Attribute | Value |
| :--- | :--- |
| **Role** | Forager + Disturber |
| **Food** | seeds, insects (Ground Food) |
| **Predators** | fox, hawk, cat(Optional) |
| **Habitat** | Open Grass + Near Bushes |

**Unique Actions**:
- [ ] `PeckGround` - Forage anim + consume ground food
- [ ] `Flock` - Simple flocking: stay near kin
- [ ] `StartleRun` - Run when startled

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.04–0.06 |
| sense | 8–12 |
| hungerDecay | 0.0004–0.0007 |
| fearWeight | 0.8–1.6 |
| flockRadius | 3–6 tiles |

---

##### 🐦 4) Small Bird (Sparrow/Pigeon)
| Attribute | Value |
| :--- | :--- |
| **Role** | Forager + Pollinator |
| **Food** | seeds, insects |
| **Predators** | cat, hawk |
| **Habitat** | Trees/Wires/Eaves (Requires PerchPoint) |

**Unique Actions**:
- [ ] `Perch` - Rest at Perch Point to recover fatigue
- [ ] `Hop/FlyBurst` - Short distance hop/fly
- [ ] `FleeUp` - Flee to nearest Perch Point

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed(Ground) | 0.04–0.06 |
| speed(Flight) | 0.10–0.18 |
| sense | 10–16 |
| perchPreference | bonus 0.2–0.6 |

---

#### B. Intermediate Predators/Opportunists (V4 Urban Eco)

##### 🦝 5) Raccoon
| Attribute | Value |
| :--- | :--- |
| **Role** | Mesopredator + Thief |
| **Food** | trash, eggs, smallPrey(Optional) |
| **Predators** | dog, wolf(Optional) |
| **Habitat** | Urban/Near Dumpster, Highly Nocturnal |

**Unique Actions**:
- [ ] `StealFromTrash` - Increase Trash Point value
- [ ] `NightActive` - Value in Day/Night system
- [ ] `ThreatDisplay` - Intimidate/Drive away

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.05–0.07 |
| sense | 10–14 |
| nightBonus | +0.2–0.5 utility |
| trashAttraction | bonus 0.3–0.7 |

---

##### 🐦‍⬛ 6) Crow
| Attribute | Value |
| :--- | :--- |
| **Role** | Cleaner + Mesopredator |
| **Food** | carcass, trash, eggs |
| **Predators** | hawk(Optional), dog(drives) |
| **Habitat** | Urban/Trees (Requires Perch) |

**Unique Actions**:
- [ ] `ScavengeCarcass` - Eat carcass (Natural Stabilizer)
- [ ] `AlarmCall` - Warn when predator appears
- [ ] `FlyToPerch` - Quick retreat

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed(Ground) | 0.04–0.06 |
| speed(Flight) | 0.12–0.20 |
| sense | 14–20 |
| carcassBonus | 0.4–0.9 |

---

##### 🦊 7) Fox
| Attribute | Value |
| :--- | :--- |
| **Role** | Mesopredator (Balances Chicken/Rat) |
| **Food** | rat, chicken |
| **Predators** | dog, wolf |
| **Habitat** | Forest Edge/Shrubby Areas |

**Unique Actions**:
- [ ] `Ambush` - Ambush near Bushes
- [ ] `CarryPrey` - Carry prey away after catch

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.06–0.09 (Sprint 0.12) |
| sense | 12–16 |
| ambushBonus | 0.2–0.6 |

---

#### C. Drivers (Core Player Management Tool)

##### 🐕 8) Dog
| Attribute | Value |
| :--- | :--- |
| **Role** | Guardian/Herder (Changes Distribution) |
| **Food** | Food Bowl (Feeder) |
| **Predators** | Almost none (Optional Wolf) |
| **Habitat** | City/Backyard |

**Unique Actions**:
- [ ] `PatrolRoute` - Patrol Path/Radius
- [ ] `BarkChase` - Drive away Rat/Cat/Raccoon
- [ ] `GuardZone` - Player defined safe zone

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| speed | 0.06–0.10 |
| sense | 12–18 |
| driveRange | 6–12 tiles |
| killOnHit | false (Default) |
| barkCooldown | 2–5s |

> **Key**: Dog is a "Player Controlled Eco-Tool", turning game from "Spectator" to "Manager"

---

#### D. Apex Predators (V5+, Add with Caution)

##### 🦅 9) Hawk
| Attribute | Value |
| :--- | :--- |
| **Role** | Apex Predator (Aerial) |
| **Food** | rat, smallBird |
| **Predators** | Almost none |
| **Habitat** | Open Field/High Perch |

**Unique Actions**:
- [ ] `SoarScan` - Wide range low freq scan
- [ ] `DiveAttack` - Swoop attack

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| sense | 20–30 (Low freq update) |
| attackCooldown | 5–12s |
| SuccessRate | 0.15–0.45 |

---

##### 🐺 10) Wolf (Pack)
| Attribute | Value |
| :--- | :--- |
| **Role** | Apex + Social (Group AI) |
| **Food** | fox, cat, Large Prey |
| **Habitat** | Forest/Mountain |

**Unique Actions**:
- [ ] `PackHunt` - Shared Target
- [ ] `TerritoryMark` - Territory System

**Parameter Ranges**:
| Param | Range |
| :--- | :--- |
| packSize | 3–6 |
| territoryRadius | 10–20 |

> ⚠️ Only add this after you have "Territory/Long Range Stats Sim"

---

### 3) Food Web & Object Matrix

#### 3.1 Food Tags
`trash` `seed` `insect` `carcass` `egg` `smallPrey`

#### 3.2 Habitat Tags
`garden` `forestEdge` `urban` `waterSide` `openField` `coverDense`

#### 3.3 Key World Objects (V4 Compatible)
| Object | Usage |
| :--- | :--- |
| `PerchPoint` | Tree/Wire/Eaves - Essential for Birds |
| `FoodBowl` | Feeder - Dog/City Gameplay |
| `Fence/Barrier` | Fence - Challenge Mode |
| `TrashBin` | City Dumpster - Core for Raccoon/Crow |

---

### 4) Parameter Knobs (Balance Knobs)

| Knob | Control Method |
| :--- | :--- |
| **Predation Success** | attackRange, Speed Difference, Ambush Bonus |
| **Predation Gain** | Hunger restored per kill |
| **Prey Spawn Rate** | Spawn from Trash or Reproduction Chance |
| **Cover Strength** | Boost to Flee Success when near Bush |
| **Drive Strength** | Dog's Range/Duration/Cooldown |

> 💡 Suggest implementing as **Debug Panel Sliders** (Huge life saver during dev)

---

### 5) V4 Content Pack Roadmap

#### 📦 Content Pack 1: Backyard Life
- [x] 🐔 Chicken + 🐦 Small Bird (Basic behaviors implemented: Peck, Perch, Forage)
- [x] New Object: `PerchPoint`
- [ ] New Challenge: Maintain "Cats not extinct + Rats not exploding + Chickens surviving" for 5 minutes

#### 📦 Content Pack 2: City Scavengers
- [x] 🦝 Raccoon + 🐦‍⬛ Crow + Trash Bin (Implemented Raccoon + Rummage)
- [x] New System: Day/Night (Nocturnal behavior) (REMOVED per user request)
- [ ] New Challenge: Control Rat growth caused by trash

#### 📦 Content Pack 3: Guardian Mode
- [/] 🐕 Dog + Fence + Safe Zone (Dog + Guardian Perception implemented)
- [ ] New Mode: Balance Challenge (Budget limited spawning/placement)

#### 🎨 Pixel Art Standards (NEW)
- [x] Switch to **2x integer zoom** (40 tiles visible)
- [x] Main actors: **32×32** | Small critters: **16×16**
- [x] Enable `roundPixels: true` in Phaser


## 🎨 Art Assets Status
**Date Updated:** 2026-01-08
**Status:** All initial requested assets generated and integrated.

| Animal | Asset Status | Display Size |
| :--- | :--- | :--- |
| **Chicken** (🐔) | ✅ Integrated | 32x32px |
| **Small Bird** (🐦) | ✅ Integrated | ~22px |
| **Raccoon** (🦝) | ✅ Integrated | 32x32px |
| **Crow** (🐦‍⬛) | ✅ Integrated | ~25px |
| **Fox** (🦊) | ✅ Integrated | 32x32px |
| **Dog** (🐕) | ✅ Integrated | 32x32px |
| **Hawk** (🦅) | ✅ Integrated | 32x32px |
| **Wolf** (🐺) | ✅ Integrated | 32x32px |
| **Snake** (🐍) | ✅ Integrated | 32x32px |

**Resources Pending:**
- `perch.png`, `trash_bin.png`, `carcass.png`, `food_bowl.png` (using generic placeholders/sprites for now)
