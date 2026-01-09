import os
from PIL import Image

# Config
INPUT_DIR = "frontend/public/assets/Farm RPG FREE 16x16 - Tiny Asset Pack/Character"
OUTPUT_DIR = "frontend/public/assets/entities"
SCALE_FACTOR = 2  # 16x16 -> 32x32

# Map rows to character names (guesses based on typical layout)
CHAR_NAMES = ["player", "pig", "cow", "chicken_brown", "sheep", "alpaca"]

def ensure_dir(d):
    if not os.path.exists(d):
        os.makedirs(d)

def process_character(name, row_idx, walk_img):
    """
    Creates a 16-frame sprite sheet (4 rows x 4 cols) for a single character.
    Output size: 128x128 (assuming 32x32 frames scale).
    Row order: Down, Left, Right, Up
    Animation pattern from 3-frame source (0,1,2): 1(stand), 0(stepL), 1(stand), 2(stepR)
    """
    
    TILE_SRC_W, TILE_SRC_H = 16, 16
    TILE_DST_W, TILE_DST_H = 32, 32
    
    # Create blank canvas for the sheet: 4 cols * 32, 4 rows * 32 = 128x128
    sheet = Image.new("RGBA", (TILE_DST_W * 4, TILE_DST_H * 4))
    
    # Source layout assumptions for Walk.png (12 cols total):
    # Cols 0-2: Down
    # Cols 3-5: Left
    # Cols 6-8: Right
    # Cols 9-11: Up
    # Each direction has 3 frames: 0, 1, 2. Usually 1 is 'stand'.
    
    # Map target rows (0:Down, 1:Left, 2:Right, 3:Up) to source column offsets
    dir_offsets = {
        0: 0, # Down
        1: 3, # Left
        2: 6, # Right
        3: 9  # Up
    }
    
    # Animation frame mapping: Target Frame 0,1,2,3 -> Source Offset 1,0,1,2
    # This creates a "Stand, Step1, Stand, Step2" loop.
    anim_map = [1, 0, 1, 2]
    
    for target_row_idx in range(4): # Down, Left, Right, Up
        src_col_start = dir_offsets[target_row_idx]
        
        for target_frame_idx in range(4): # 0, 1, 2, 3
            src_frame_offset = anim_map[target_frame_idx]
            
            # Calculate source coordinates
            src_col = src_col_start + src_frame_offset
            src_row = row_idx
            
            sx = src_col * TILE_SRC_W
            sy = src_row * TILE_SRC_H
            
            # Crop
            tile = walk_img.crop((sx, sy, sx + TILE_SRC_W, sy + TILE_SRC_H))
            
            # Scale
            tile = tile.resize((TILE_DST_W, TILE_DST_H), Image.NEAREST)
            
            # Paste into sheet
            dx = target_frame_idx * TILE_DST_W
            dy = target_row_idx * TILE_DST_H
            sheet.paste(tile, (dx, dy))
            
    # Save
    out_name = f"{name}_32_sheet.png"
    out_path = os.path.join(OUTPUT_DIR, out_name)
    sheet.save(out_path)
    print(f"Saved {out_path}")

def main():
    ensure_dir(OUTPUT_DIR)
    
    walk_path = os.path.join(INPUT_DIR, "Walk.png")
    if not os.path.exists(walk_path):
        print(f"Error: {walk_path} not found.")
        return
        
    walk_img = Image.open(walk_path)
    
    print(f"Processing characters from {walk_path}...")
    for i, name in enumerate(CHAR_NAMES):
        process_character(name, i, walk_img)
        
    print("Done processing assets.")

if __name__ == "__main__":
    main()
