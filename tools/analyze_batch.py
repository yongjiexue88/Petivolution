from PIL import Image
import sys
import os

def analyze(path):
    print(f"--- Analyzing {os.path.basename(path)} ---")
    try:
        img = Image.open(path).convert("RGBA")
        print(f"Size: {img.size}")
        colors = img.getcolors(maxcolors=100000)
        
        transparent_count = 0
        opaque_count = 0
        
        for count, color in colors:
            if color[3] == 0:
                transparent_count += count
            else:
                opaque_count += count
                
        print(f"Transparent pixels: {transparent_count}")
        print(f"Opaque pixels: {opaque_count}")
        print(f"Total pixels: {img.size[0] * img.size[1]}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        analyze(arg)
