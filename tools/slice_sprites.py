
import sys
import os
from PIL import Image

def slice_and_save(image_path, output_dir, prefix, mapping_str, target_size=16):
    """
    Slices a 3x3 grid image and saves sub-images.
    mapping_str: comma separated list of suffixes for indices 0..8
                 e.g. "idle,walk1,walk2,run1,run2,attack,eat,sleep,dead"
                 If a suffix is empty, skip that index.
    """
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"Failed to open {image_path}: {e}")
        return

    # Check input aspect ratio, assume square grid
    width, height = img.size
    cell_w = width // 3
    cell_h = height // 3

    suffixes = mapping_str.split(',')
    
    # Ensure output dir exists
    os.makedirs(output_dir, exist_ok=True)

    for i in range(9):
        if i >= len(suffixes): break
        suffix = suffixes[i].strip()
        if not suffix: continue

        row = i // 3
        col = i % 3
        
        left = col * cell_w
        top = row * cell_h
        right = left + cell_w
        bottom = top + cell_h
        
        # Crop
        cell = img.crop((left, top, right, bottom))
        
        # Resize to target pixel art size using Nearest neighbor
        resized = cell.resize((int(target_size), int(target_size)), Image.Resampling.NEAREST)
        
        filename = f"{prefix}_{suffix}.png"
        out_path = os.path.join(output_dir, filename)
        resized.save(out_path)
        print(f"Saved {out_path}")

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python3 slice_sprites.py <image_path> <output_dir> <prefix> <mapping> [target_size]")
        sys.exit(1)
        
    img_path = sys.argv[1]
    out_dir = sys.argv[2]
    prefix = sys.argv[3]
    mapping = sys.argv[4]
    
    # Default to 16 if not provided
    target_size = 16
    if len(sys.argv) > 5:
        target_size = int(sys.argv[5])
    
    slice_and_save(img_path, out_dir, prefix, mapping, target_size)
