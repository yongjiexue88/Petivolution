# 🐾 Petivolution

Ecological Simulation Sandbox Game - Observe animal behaviors, adjust ecological balance

## ✨ Core Gameplay

**Spawn Animals** → **Observe Behaviors** → **Identify Issues** → **Environmental Intervention** → **Ecological Stability**

- 🐱 **Cat**: Predator, obtains food by hunting mice
- 🐭 **Rat**: Scavenger, forages in trash piles

## 🎯 V1 Acceptance Criteria

| Criteria | Description |
|----------|-------------|
| **Stability** | 10 rats + 2 cats, runs continuously ≥5 minutes without crashing |
| **Explainability** | Click on animals to see: current state, reason, needs values |
| **Effective Intervention** | Placing water/bushes/trash visibly changes population trends |
| **Performance** | 200-300 entities without frame drops |

## 🛠️ Tech Stack

- **Frontend Framework**: React + TypeScript + Vite
- **Game Engine**: Phaser 3
- **State Management**: Zustand
- **Simulation Layer**: Web Worker (independent thread)
- **Save System**: IndexedDB

## 📁 Project Structure

```
src/
├── app/         # React UI (panels, toolbar)
├── game/        # Phaser scenes and rendering
├── sim/         # Pure logic simulation layer (AI, ecology)
├── worker/      # Web Worker entry point
├── storage/     # IndexedDB saves
└── shared/      # Shared types and config
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎮 Controls Guide

| Control | Description |
|---------|-------------|
| **Drag** | Drag canvas to move viewport |
| **Scroll** | Zoom viewport |
| **Click Animal** | View details |
| **Spawn Mode** | Click map to spawn animals |
| **Place Mode** | Click map to place resources |

## 🌿 Environment Objects

| Object | Icon | Function |
|--------|------|----------|
| Water | 💧 | Animals drink to restore thirst value |
| Bush | 🌿 | Provides shelter and resting spots |
| Trash Pile | 🗑️ | Primary food source for rats |

## 🧠 AI System

Animals use a **Utility AI** decision system:

1. Evaluate various needs (hunger, thirst, fatigue, threats)
2. Calculate utility score for each action
3. Execute the highest-scoring action

### Behavior States

| State | Description |
|-------|-------------|
| Idle | Idle, nothing to do |
| Wander | Wandering around |
| Chase | Chasing prey (cat) |
| Flee | Fleeing from threats (rat) |
| Eat | Eating |
| Drink | Drinking water |
| Sleep | Resting to recover fatigue |

## 📄 License

MIT
