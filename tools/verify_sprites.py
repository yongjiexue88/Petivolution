
from PIL import Image
import os
import math

SPRITES_DIR = '/Users/yongjiexue/Documents/GitHub/Petivolution/frontend/public/assets/sprites'
CHECK_FILES = [
    'chicken_idle.png',
    'bird_fly1.png', 
    'bird_dead.png',
    'dog_attack.png',
    'dog_dead.png', 
    'dog_walk1.png'
]

def verify_image(filename):
    path = os.path.join(SPRITES_DIR, filename)
    if not os.path.exists(path):
        print(f"{filename}: Not found")
        return

    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    width, height = img.size
    
    # Check corners
    corners = [(0,0), (width-1, 0), (0, height-1), (width-1, height-1)]
    non_transparent_corners = []
    for c in corners:
        if pixels[c][3] != 0:
            non_transparent_corners.append(c)
    
    # Scan for "near white" opaque pixels
    near_white_count = 0
    opaque_count = 0
    total_pixels = width * height
    
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if a != 0:
                opaque_count += 1
                # Check if it's "near white" (which might be an artifact)
                # Distance from white
                dist_white = math.sqrt((255-r)**2 + (255-g)**2 + (255-b)**2)
                if dist_white < 50: # If it's very light gray/white but opaque
                    near_white_count += 1

    print(f"--- {filename} ---")
    print(f"  Dimensions: {width}x{height}")
    print(f"  Non-transparent corners: {non_transparent_corners}")
    print(f"  Opaque pixels: {opaque_count} / {total_pixels}")
    print(f"  Near-white opaque pixels (potential artifacts): {near_white_count}")
    
    if near_white_count > 0:
        print("    WARNING: Residual high-brightness pixels found.")
    else:
        print("    CLEAN: No near-white artifacts detected.")

def main():
    print("Verifying specific sprites...")
    for f in CHECK_FILES:
        verify_image(f)

if __name__ == "__main__":
    main()
