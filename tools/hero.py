# Builds screenshots/hero.png: dark/light diagonal split of the top of the
# dashboard on a soft background, for README / portfolio cards.
import sys
from PIL import Image, ImageDraw, ImageFilter

def rounded(im, r):
    m = Image.new('L', im.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, im.size[0] - 1, im.size[1] - 1], r, fill=255)
    out = im.convert('RGBA'); out.putalpha(m); return out

def hero(dark_path, light_path, out, bg0, bg1, crop_px, W=2400):
    d = Image.open(dark_path).convert('RGB'); l = Image.open(light_path).convert('RGB')
    ch = min(crop_px, d.size[1])
    d = d.crop((0, 0, d.size[0], ch)); l = l.crop((0, 0, l.size[0], ch))
    # diagonal split: light on the right
    mask = Image.new('L', d.size, 0)
    w, h = d.size
    ImageDraw.Draw(mask).polygon([(w * 0.62, 0), (w, 0), (w, h), (w * 0.42, h)], fill=255)
    comp = d.copy(); comp.paste(l, (0, 0), mask)
    tw = int(W * 0.86); th = int(comp.size[1] * tw / comp.size[0])
    comp = comp.resize((tw, th), Image.LANCZOS)
    m = int(W * 0.07)
    H = th + 2 * m
    g = Image.new('RGB', (1, 2)); g.putpixel((0, 0), bg0); g.putpixel((0, 1), bg1)
    canvas = g.resize((W, H), Image.BICUBIC)
    x, y = (W - tw) // 2, m
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle([x + 10, y + 30, x + tw - 10, y + th + 30], 28, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    canvas = Image.alpha_composite(canvas.convert('RGBA'), shadow)
    canvas.alpha_composite(rounded(comp, 22), (x, y))
    canvas.convert('RGB').save(out, optimize=True)

if __name__ == '__main__':
    # crop_rows: grid rows to include (header + rows 0..crop_rows); screenshots are rendered at 2x
    root, bg0, bg1, crop_rows = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
    hex2 = lambda s: tuple(int(s[i:i + 2], 16) for i in (1, 3, 5))
    hero(f'{root}/screenshots/dashboard-dark.png', f'{root}/screenshots/dashboard-light.png', f'{root}/screenshots/hero.png', hex2(bg0), hex2(bg1), (40 + 96 + crop_rows * 40 - 4) * 2)
