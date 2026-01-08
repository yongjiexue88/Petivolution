# V1 AI System Implementation Progress Report
**Date:** 2026-01-07
**Status:** In Progress (Testing Phase Completed)

## Overview
Successfully implemented and integrated the new V1 AI system for Petivolution. The system replaces the legacy logic with a robust Goal-Action architecture, compliant with the provided specifications.

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

## 🌍 生态系统大路线图 (Ecosystem Roadmap)
**Date Added:** 2026-01-08

### 1) 产品愿景 (Vision)

> **一句话**: 玩家创建一个生态地图，通过投放有名字的动物与改造环境，观察食物链与行为涌现，并用可视化工具维持生态平衡、讲述动物家族的故事。

**三大体验支柱**:
| 支柱 | 描述 |
| :--- | :--- |
| **生命故事** | 个体有名字、寿命、家谱、关键事件回放 |
| **生态动力学** | 捕食/资源/栖息地让世界自己"活" |
| **玩家干预** | 小改动就能改变走势（策略感而非纯旁观） |

---

### 2) 核心平台架构 (Platform Architecture)

#### 2.1 数据驱动内容
- [ ] `SpeciesConfig`: 物种参数（移动/感知/vitals/繁殖/行为权重）
- [ ] `FoodWeb`: 食物网（谁吃谁、偏好、能量收益）
- [ ] `Habitat`: 栖息地偏好（森林/草地/水边/城市）
- [ ] `MapRecipe`: 地图生成配方（biome分布 + 资源点密度）

> **目标**: 新增一个物种=加配置+可选新动作，不用改核心引擎

#### 2.2 生态稳定器系统 (Avoid Balance Hell)
- [ ] 承载量 cap（按 biome/chunk/资源指数动态计算）
- [ ] 出生率/死亡率概率钳制（logistic）
- [ ] 资源下限与再生（防全灭）
- [ ] AI退化策略（缺资源时不发疯）

**WorldRule Presets**:
| Preset | 描述 |
| :--- | :--- |
| `Balanced` | 推荐，稳定平衡 |
| `Wild` | 繁殖快、死亡快 |
| `Abundant` | 资源多、更像养成 |

#### 2.3 可视化与调试
- [ ] 种群曲线（每物种数量）
- [ ] 资源指数曲线（水/食物/庇护）
- [ ] 热力图：捕食热点 / 缺水热点 / 迁徙路线
- [ ] 事件统计：出生、死亡、捕食、疾病

---

### 3) V4+ 内容扩展路线

#### 3.1 物种扩展阶梯 (Species Tiers)

**Tier 1：非捕食链扰动者（最安全）**
- [ ] 🐔 鸡 / 🐦 鸟 / 🦋 蝴蝶
- 新机制：觅食、群聚、迁徙、惊飞
- 资源交互：吃种子/虫子（"地面食物指数"）

**Tier 2：清道夫 / 害兽（生态调节器）**
- [ ] 🦝 浣熊 / 🐦‍⬛ 乌鸦 / 🦊 狐狸
- 新机制：偷窃、争夺、夜行

**Tier 3：顶级捕食者与驱赶者**
- [ ] 🐕 狗（驱赶） / 🦅 鹰（空中捕食） / 🐍 蛇（伏击）
- 新机制：庇护、领地、群体行为

**Tier 4：群居与社会结构**
- [ ] 🐺 狼群 / 🐦 鸟群 / 🐜 蚂蚁
- 新机制：领袖/队形/共享感知

#### 3.2 地图扩展路线 (Map Packs)

| Pack | 内容 | 新机制 |
| :--- | :--- | :--- |
| **Pack 1: 庭院/公园** (V1~V2) | 花园、灌木、水池、垃圾点 | 现有系统 |
| **Pack 2: 森林边缘** (V3) | 林地、河流、水边栖息地、洞穴 | `Habitat` 栖息地偏好 |
| **Pack 3: 城市生态** (V4) | 街道、建筑、垃圾箱、排水沟 | 人类干预工具：投喂点、垃圾清理、围栏 |
| **Pack 4: 程序生成大世界** (V5) | Biome噪声生成 | Chunk流式加载 + 地图种子分享 |

#### 3.3 系统扩展路线 (Systems)

| 系统 | 优先级 | 描述 |
| :--- | :--- | :--- |
| **System A: 昼夜节律** | 高 | 夜行性动物、资源刷新随时间变化、路灯/夜间投喂 |
| **System B: 天气与季节** | 中 | 下雨→水源丰富；冬季→食物减少、迁徙 |
| **System C: 疾病与寄生** | 低 | 密度高就更容易爆发（天然稳定器） |
| **System D: 领地与巢穴** | 高 | 动物建立"家"和巡逻范围，家谱系统 |

---

### 4) 游戏模式矩阵 (Game Modes)

| Mode | 描述 | 特性 |
| :--- | :--- | :--- |
| **Mode 1: 沙盒** | 默认，无失败 | 世界规则可调 (Balanced/Wild/Abundant) |
| **Mode 2: 平衡挑战** | 最好做留存 | 目标：维持物种在区间内 X 天；奖励：解锁内容 |
| **Mode 3: 生存模式** | 剧情性强 | 生态预算有限；随机事件（干旱/寒潮/垃圾暴增） |
| **Mode 4: 情景关卡** | 可持续更新 | 固定地图 + 固定规则 + 固定目标 |

**情景关卡示例**:
- [ ] "把公园老鼠控制在合理范围"
- [ ] "在冬季让鸟群迁徙成功"
- [ ] "城市垃圾暴增，控制乌鸦数量"

---

### 5) 三层平衡法则 (Balance Strategy)

| 层级 | 策略 |
| :--- | :--- |
| **物种层** | 定义每物种"理想人口范围"；超过→出生率下降；低于→资源再生补偿 |
| **食物网层** | 两把旋钮：`捕食成功率` + `捕食收益`（能量守恒） |
| **世界规则层** | 把"更真实更残酷"当作模式/档位，不强制所有人体验 |

---

### 6) 内容更新节奏 (Update Rhythm)

**每 2 周：小更新**
- 1 个新物种（配置 + 少量动作）
- 1 个新对象（例如"鸟巢""饲料盆"）
- 1 个新挑战关卡

**每 1-2 月：大更新**
- 新地图包（森林/城市）
- 新系统（昼夜/天气/领地）
- 新模式玩法（生存事件）

---

### 7) V4 落地执行顺序 (V4 Execution Order)

完成 V1.2（分享）后，按以下顺序推进：

1. [ ] 🐦 **鸟（非捕食）**: 加入"惊飞/群聚/栖息点"
2. [ ] 🐕 **狗（驱赶）**: 新增"驱赶目标、领地影响"
3. [ ] 🌙 **昼夜**: 改变行为权重（夜行、白天活跃）
4. [ ] 🏆 **挑战模式**: 平衡挑战关卡（最能留存）
5. [ ] 🌧️ **天气**: 先做"雨/晴"两种，影响水源与可见度
6. [ ] 🏙️ **城市地图包**: 垃圾机制变得更有意义

---

## 📊 生态内容矩阵表 (Ecosystem Content Matrix - V4 Extended)
**Date Added:** 2026-01-08

> **目的**: 每加一个物种都能明确它的生态角色、食物网闭环、玩法增量、参数范围

**默认单位**: 2D tile 世界；tiles 和 tick(15Hz)

---

### 1) 生态角色分类 (Ecological Roles)

| 角色 | 描述 | 示例物种 |
| :--- | :--- | :--- |
| **Producer/Resource** | 植物、种子、浆果、昆虫 | seeds, insects |
| **Forager** | 吃资源、不捕食 | 🐔鸡、🐦鸽子、🐰兔 |
| **Prey** | 会逃、繁殖快 | 🐀鼠、🐰兔 |
| **Mesopredator** | 偷食/轻捕食 | 🦝浣熊、🐦‍⬛乌鸦、🦊狐狸 |
| **Apex Predator** | 强捕食 | 🦅鹰、🐺狼 |
| **Guardian/Herder** | 驱赶/管理 | 🐕狗 |
| **Decomposer/Cleaner** | 吃尸体/垃圾 | 🦅秃鹫、🐦‍⬛乌鸦 |
| **Pollinator** | 让世界"更活" | 🦋蝴蝶、🐝蜜蜂 |

---

### 2) 物种矩阵表

#### A. 基础链（已有 + 立即可扩）

##### 🐀 1) Rat（鼠）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Prey + 垃圾利用者 |
| **食物** | trash, seeds（地面食物指数） |
| **天敌** | cat, dog(驱赶), hawk |
| **栖息地** | 灌木/建筑边缘/垃圾附近（Cover依赖强） |

**独特动作**:
- [ ] `FleeToCover` - 优先灌木
- [ ] `ScavengeTrash` - 在垃圾点觅食
- [ ] `Freeze` - 短暂停顿降低被发现概率（可选）

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.06–0.09 tiles/tick |
| sense | 8–12 tiles |
| hungerDecay | 0.0005–0.0008 |
| thirstDecay | 0.0006–0.0010 |
| reproduction | 孕期30–90s, 胎数2–6, 密度惩罚强 |

---

##### 🐱 2) Cat（猫）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Mesopredator（戏剧性来源） |
| **食物** | rat, smallBird（后期） |
| **天敌** | dog(驱赶), wolf(可选) |
| **栖息地** | 边缘地带/灌木旁（伏击感） |

**独特动作**:
- [ ] `Stalk` - 潜行接近，缩短距离惩罚
- [ ] `Chase + Attack`
- [ ] `GiveUpChase` - 超时放弃（稳定器）

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.05–0.07 |
| sense | 10–14 |
| attackRange | 0.5–0.8 |
| chaseTimeout | 6–12s |
| hungerDecay | 0.0006–0.0009 |

---

##### 🐔 3) Chicken（鸡）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Forager + 扰动者 |
| **食物** | seeds, insects（地面食物） |
| **天敌** | fox, hawk, cat(可选) |
| **栖息地** | 开阔草地 + 靠近灌木 |

**独特动作**:
- [ ] `PeckGround` - 觅食动画 + 消耗地面食物
- [ ] `Flock` - 简单群聚：靠近同类
- [ ] `StartleRun` - 受惊短跑

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.04–0.06 |
| sense | 8–12 |
| hungerDecay | 0.0004–0.0007 |
| fear权重 | 0.8–1.6 |
| flockRadius | 3–6 tiles |

---

##### 🐦 4) Small Bird（麻雀/鸽子）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Forager + Pollinator |
| **食物** | seeds, insects |
| **天敌** | cat, hawk |
| **栖息地** | 树/电线/屋檐（需PerchPoint） |

**独特动作**:
- [ ] `Perch` - 停在栖息点恢复疲劳
- [ ] `Hop/FlyBurst` - 短距离飞跃
- [ ] `FleeUp` - 逃到最近栖息点

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed(地面) | 0.04–0.06 |
| speed(飞跃) | 0.10–0.18 |
| sense | 10–16 |
| perchPreference | bonus 0.2–0.6 |

---

#### B. 中级捕食者/机会主义者（V4城市生态）

##### 🦝 5) Raccoon（浣熊）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Mesopredator + 偷食者 |
| **食物** | trash, eggs, smallPrey(可选) |
| **天敌** | dog, wolf(可选) |
| **栖息地** | 城市/垃圾箱附近，夜行性强 |

**独特动作**:
- [ ] `StealFromTrash` - 提升垃圾点价值
- [ ] `NightActive` - 昼夜系统价值
- [ ] `ThreatDisplay` - 威吓驱赶

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.05–0.07 |
| sense | 10–14 |
| nightBonus | +0.2–0.5 utility |
| trashAttraction | bonus 0.3–0.7 |

---

##### 🐦‍⬛ 6) Crow（乌鸦）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Cleaner + Mesopredator |
| **食物** | carcass(尸体), trash, eggs |
| **天敌** | hawk(可选), dog(驱赶) |
| **栖息地** | 城市/树（需栖息点） |

**独特动作**:
- [ ] `ScavengeCarcass` - 吃尸体（天然稳定器）
- [ ] `AlarmCall` - 捕食者出现时警报
- [ ] `FlyToPerch` - 快速撤离

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed(地面) | 0.04–0.06 |
| speed(飞行) | 0.12–0.20 |
| sense | 14–20 |
| carcassBonus | 0.4–0.9 |

---

##### 🦊 7) Fox（狐狸）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Mesopredator（平衡鸡/鼠） |
| **食物** | rat, chicken |
| **天敌** | dog, wolf |
| **栖息地** | 森林边缘/灌木多区域 |

**独特动作**:
- [ ] `Ambush` - 灌木附近伏击
- [ ] `CarryPrey` - 捕获后带走

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.06–0.09 (冲刺0.12) |
| sense | 12–16 |
| ambushBonus | 0.2–0.6 |

---

#### C. 驱赶者（玩家管理工具核心）

##### 🐕 8) Dog（狗）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Guardian/Herder（改变分布） |
| **食物** | 投喂点 food bowl |
| **天敌** | 几乎没有（可选狼） |
| **栖息地** | 城市/庭院 |

**独特动作**:
- [ ] `PatrolRoute` - 巡逻路径/半径
- [ ] `BarkChase` - 驱赶鼠/猫/浣熊
- [ ] `GuardZone` - 玩家设定保护区

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| speed | 0.06–0.10 |
| sense | 12–18 |
| 驱赶范围 | 6–12 tiles |
| killOnHit | false（默认） |
| barkCooldown | 2–5s |

> **重点**: 狗是"玩家可控生态工具"，让游戏从"旁观"变成"管理"

---

#### D. 顶级捕食者（V5+，慎重加入）

##### 🦅 9) Hawk（鹰）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Apex Predator（空中捕食） |
| **食物** | rat, smallBird |
| **天敌** | 几乎没有 |
| **栖息地** | 开阔地/高处栖息点 |

**独特动作**:
- [ ] `SoarScan` - 大范围低频扫描
- [ ] `DiveAttack` - 俯冲捕食

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| sense | 20–30（低频更新） |
| attackCooldown | 5–12s |
| 成功率 | 0.15–0.45 |

---

##### 🐺 10) Wolf（狼群）
| 属性 | 值 |
| :--- | :--- |
| **生态角色** | Apex + Social（群体AI） |
| **食物** | fox, cat, 大猎物 |
| **栖息地** | 森林/山地 |

**独特动作**:
- [ ] `PackHunt` - 共享目标
- [ ] `TerritoryMark` - 领地系统

**参数范围**:
| 参数 | 范围 |
| :--- | :--- |
| packSize | 3–6 |
| territoryRadius | 10–20 |

> ⚠️ 只有你有"领地/远区统计模拟"后再上

---

### 3) 食物网与对象矩阵

#### 3.1 食物标签 (Food Tags)
`trash` `seed` `insect` `carcass` `egg` `smallPrey`

#### 3.2 栖息地标签 (Habitat Tags)
`garden` `forestEdge` `urban` `waterSide` `openField` `coverDense`

#### 3.3 关键世界对象 (V4配套)
| 对象 | 用途 |
| :--- | :--- |
| `PerchPoint` | 树/电线/屋檐 - 鸟类必需 |
| `FoodBowl` | 投喂点 - 狗/城市玩法 |
| `Fence/Barrier` | 围栏 - 挑战模式 |
| `TrashBin` | 城市垃圾箱 - 浣熊/乌鸦核心 |

---

### 4) 参数旋钮表 (Balance Knobs)

| 旋钮 | 控制方式 |
| :--- | :--- |
| **捕食成功率** | attackRange、速度差、伏击加成 |
| **捕食收益** | 吃一只恢复多少hunger |
| **猎物刷新率** | 从垃圾刷 or 繁殖概率 |
| **庇护强度** | 灌木对逃跑成功的提升 |
| **驱赶强度** | 狗的范围/持续时间/冷却 |

> 💡 建议做成 **Debug 面板滑条**（开发期超省命）

---

### 5) V4 内容包路线 (Content Pack Roadmap)

#### 📦 Content Pack 1: Backyard Life（庭院生态）
- [x] 🐔 鸡 + 🐦 小鸟 (Basic behaviors implemented: Peck, Perch, Forage)
- [x] 新对象：`PerchPoint`
- [ ] 新挑战：维持"猫不灭绝 + 鼠不爆炸 + 鸡存活" 5分钟

#### 📦 Content Pack 2: City Scavengers（城市清道夫）
- [x] 🦝 浣熊 + 🐦‍⬛ 乌鸦 + 垃圾箱 (Implemented Raccoon + Rummage)
- [x] 新系统：昼夜（夜行性显著）(Implemented Day/Night Cycle + Sleep Activity)
- [ ] 新挑战：控制垃圾导致的鼠增长

#### 📦 Content Pack 3: Guardian Mode（管理与驱赶）
- [/] 🐕 狗 + 围栏 + 保护区 (Dog + Guardian Perception implemented)
- [ ] 新模式：平衡挑战（预算限制投放/摆放）


## 🎨 Pending Art Assets (Placeholders)
**Date Added:** 2026-01-08
**Status:** Placeholder assets in use (Rat/Cat duplicates). Waiting for AI generation quota reset.

| Animal | Current Placeholder | Status |
| :--- | :--- | :--- |
| **Chicken** (🐔) | Rat | ⏳ Pending |
| **Small Bird** (🐦) | Rat | ⏳ Pending |
| **Raccoon** (🦝) | Rat | ⏳ Pending |
| **Crow** (🐦‍⬛) | Rat | ⏳ Pending |
| **Fox** (🦊) | Cat | ⏳ Pending |
| **Dog** (🐕) | Cat | ⏳ Pending |
| **Hawk** (🦅) | Rat | ⏳ Pending |
| **Wolf** (🐺) | Cat | ⏳ Pending |
| **Snake** (🐍) | Rat | ⏳ Pending |

**Resources Pending:**
- `perch.png`, `trash_bin.png`, `carcass.png`, `food_bowl.png`, `fence.png`, `egg.png`, `seed.png`, `insect.png`
