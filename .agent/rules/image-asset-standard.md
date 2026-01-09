---
trigger: always_on
---

A) “Rule File” (copy/paste as your Asset Standards spec)

Asset Standards (Choice 2: 32×32 entities @ scale=1)

World & Rendering Rules

Tile size (world): 16×16 px

Map size: 512×512 tiles → 8192×8192 world px

Camera zoom: 2 (integer zoom only)

No fractional scaling in-world: default all sprites scale=1

Pixel rendering:

pixelArt: true

roundPixels: true

Round sprite positions to integers (world px) before rendering

Entity (Animals) Rules

Default entity frame size: 32×32 px

Visual footprint: 2×2 tiles

Collision footprint: smaller “feet” box

Hitbox: 16×10 or 18×12 (anchored at feet)

Origin/anchor:

Sprite origin: bottom-center (0.5, 1.0)

Label positioned above sprite using displayHeight

Static Objects & Buildings Rules (Option A)

Author static objects/buildings in world pixel units (multiples of 16)

Use scale=1 for static assets

Place objects aligned to grid: x=tileX*16, y=tileY*16

Sizes:

Props: 16×16 (1×1) or 32×32 (2×2)

Buildings/large objects: multiples of 16 (e.g., 160×128, 224×112)

Asset Size Table (Allowed Sizes)

Tiles: 16×16

Entities:

Standard: 32×32

Large (rare): 48×48 / 64×64

Props:

Small: 16×16

Medium: 32×32

Buildings:

Any W×H where W and H are multiples of 16

Sprite Sheet Rules

Frame size: 32×32

Prefer 4-direction walk:

4 directions × 4 frames = 16 frames total

Feet alignment must be consistent across frames (no jitter)

Folder & Naming Rules

Folder structure:

assets/tilesets/*_16.png

assets/entities/*_32_sheet.png

assets/objects/*_(16|32|48|64).png

assets/buildings/*_<WxH>.png

Naming format:

<name>_<WxH>.png or <name>_32_sheet.png