# 🐾 Petivolution

[![GitHub License](https://img.shields.io/github/license/yongjiexue88/Petivolution)](https://github.com/yongjiexue88/Petivolution/blob/main/LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/yongjiexue88/Petivolution?style=flat)](https://github.com/yongjiexue88/Petivolution/stargazers)
[![Tech Stack](https://img.shields.io/badge/tech-React%20%7C%20Phaser%20%7C%20TS-blue)](https://github.com/yongjiexue88/Petivolution)

**Petivolution** is an open-source **Ecological Simulation Sandbox** built with React, Phaser 3, and Utility AI. Observe artificial life evolve, adjust environmental factors, and maintain a balanced ecosystem.

### 🚀 [PLAY LIVE DEMO](https://petivolution.web.app/)


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
