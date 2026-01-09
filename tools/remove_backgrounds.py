import os
import math
from PIL import Image

SPRITES_DIR = '/Users/yongjiexue/Documents/GitHub/Petivolution/frontend/public/assets/sprites'
TOLERANCE_FLOOD = 80

def get_distance(c1, c2):
    return math.sqrt(sum((c1[i]-c2[i])**2 for i in range(3)))

def remove_background(image_path):
    print(f"Processing {image_path}...")
    try:
        img = Image.open(image_path).convert("RGBA")
        width, height = img.size
        pixels = img.load()
        
        # Corner Analysis
        corner_color = pixels[0, 0]
        corner_brightness = sum(corner_color[:3]) / 3
        
        # Pass 1: Flood Fill from Corners (Cleans Outer Background)
        queue = [(0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)]
        visited = set(queue)
        
        while queue:
            x, y = queue.pop(0)
            pixels[x, y] = (0, 0, 0, 0)
            
            for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        neighbor = pixels[nx, ny]
                        if neighbor[3] == 0: # Already transparent
                            visited.add((nx, ny))
                            queue.append((nx, ny))
                            continue
                            
                        # Standard Flood Tolerance
                        if get_distance(corner_color, neighbor) < TOLERANCE_FLOOD:
                            visited.add((nx, ny))
                            queue.append((nx, ny))
                            
        # Pass 2: Hole Cleaning (Cleans Inner Background)
        # Strategy:
        # If background is Bright (>200), we target "Gray" artifacts but PROTECT "Pure White" (Body).
        # We use a wider tolerance (30) to catch (229, 230, 254), but skip (255, 255, 255).
        
        is_bright_bg = corner_brightness > 200
        hole_tolerance = 30.0 # Aggressive to eat Gray (229)
        
        holes_removed = 0
        for y in range(height):
            for x in range(width):
                p = pixels[x, y]
                if p[3] != 0: # If opaque
                    # Check if it matches Corner Background
                    if get_distance(corner_color, p) <= hole_tolerance:
                        # PROTECTION: If Bright Clean Mode, spare Pure White
                        if is_bright_bg and p[:3] == (255, 255, 255):
                            continue
                            
                        pixels[x, y] = (0, 0, 0, 0)
                        holes_removed += 1
                        
        img.save(image_path, "PNG")
        print(f"  Saved {os.path.basename(image_path)}. Holes removed: {holes_removed}")

    except Exception as e:
        print(f"  Error processing {image_path}: {e}")

def main():
    if not os.path.exists(SPRITES_DIR):
        print(f"Directory not found")
        return

    files = [f for f in os.listdir(SPRITES_DIR) if f.lower().endswith('.png')]
    print(f"Found {len(files)} PNG files.")

    for filename in files:
        file_path = os.path.join(SPRITES_DIR, filename)
        remove_background(file_path)

if __name__ == "__main__":
    main()
