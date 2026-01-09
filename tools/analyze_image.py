from PIL import Image
import os

img_path = 'frontend/public/assets/sprites/rat_idle.png'
print(f"Analyzing {img_path}...")

try:
    img = Image.open(img_path)
    img = img.convert("RGBA")
    
    print(f"Image size: {img.size}")
    colors = img.getcolors(maxcolors=100000) # Returns (count, (r,g,b,a))
    
    if colors:
        print(f"Total unique colors: {len(colors)}")
        colors.sort(key=lambda x: x[0], reverse=True)
        print("Top 10 colors (Count, Color):")
        for c in colors[:10]:
            print(f"  {c}")
    else:
        print("Too many colors found.")

except Exception as e:
    print(f"Error: {e}")
