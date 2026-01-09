from PIL import Image
import os
import math

INPUT_FILE = 'frontend/public/assets/sprites/rat_idle.png'
OUTPUT_FILE = 'frontend/public/assets/sprites/test_rat_idle.png'
THRESHOLD = 30 # Adjust as needed

def is_white(pixel, threshold):
    r, g, b, a = pixel
    if a == 0: return False # Already transparent
    # Distance from white (255, 255, 255)
    dist = math.sqrt((r-255)**2 + (g-255)**2 + (b-255)**2)
    return dist < threshold

def process():
    try:
        img = Image.open(INPUT_FILE).convert("RGBA")
        datas = img.getdata()
        
        newData = []
        removed_count = 0
        existing_transparent = 0
        
        for item in datas:
            if item[3] == 0:
                newData.append(item)
                existing_transparent += 1
            elif is_white(item, THRESHOLD):
                newData.append((255, 255, 255, 0))
                removed_count += 1
            else:
                newData.append(item)
        
        img.putdata(newData)
        img.save(OUTPUT_FILE, "PNG")
        print(f"Processed {INPUT_FILE} -> {OUTPUT_FILE}")
        print(f"  Existing transparent pixels: {existing_transparent}")
        print(f"  Removed pixels (white-ish): {removed_count}")
        print(f"  Remaining opaque pixels: {len(datas) - existing_transparent - removed_count}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process()
