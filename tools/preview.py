#!/usr/bin/env python3
"""Render the store preview: before/after of the tray menu placement."""
import subprocess
import pathlib

W, H = 1280, 720
OUT = pathlib.Path("/home/yatli/kwin-dingtalk-front/dist/preview.png")

def r(x, y, w, h, f, extra=""):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{f}" {extra}/>'

def t(x, y, s, c="#fff", size=14, anchor="start", weight="normal"):
    s = s.replace("&", "&amp;").replace("<", "&lt;")
    return (f'<text x="{x}" y="{y}" fill="{c}" font-family="DejaVu Sans" font-size="{size}" '
            f'font-weight="{weight}" text-anchor="{anchor}">{s}</text>')

def mini_screen(x, y, menu_at, label, sub):
    """A stylised 560x400 screen with a bottom panel, a tray icon and the menu."""
    o = []
    o.append(r(x, y, 560, 400, "#2b3138", 'rx="6"'))
    # wallpaper
    o.append(r(x + 1, y + 1, 558, 340, "#1f4e79", 'rx="5"'))
    # some "windows" on the wallpaper to give scale
    o.append(r(x + 40, y + 50, 220, 150, "#3c3c3c"))
    o.append(r(x + 40, y + 50, 220, 18, "#4a4a4a"))
    o.append(r(x + 300, y + 120, 200, 130, "#333333"))
    o.append(r(x + 300, y + 120, 200, 18, "#454545"))
    # panel
    o.append(r(x + 1, y + 341, 558, 34, "#d8d8d8"))
    # tray icon at the right end of the panel
    icon_x = x + 500
    icon_y = y + 346
    o.append(r(icon_x, icon_y, 24, 24, "#ffffff", 'stroke="#000" stroke-width="1"'))
    o.append(r(icon_x + 5, icon_y + 5, 14, 14, "#1677ff"))
    # the menu
    mx, my = menu_at(x, y, icon_x, icon_y)
    o.append(r(mx, my, 190, 88, "#ffffff", 'stroke="#000" stroke-width="1"'))
    o.append(r(mx + 1, my + 1, 188, 22, "#efefef"))
    o.append(t(mx + 9, my + 16, "DingTalk", "#000", 11, weight="bold"))
    o.append(t(mx + 9, my + 40, "chat A", "#000", 11))
    o.append(t(mx + 9, my + 60, "chat B", "#000", 11))
    o.append(r(mx + 170, my + 30, 8, 8, "#e33"))
    o.append(r(mx + 170, my + 52, 8, 8, "#e33"))
    if menu_at.__name__ == "random":
        # dashed arrow showing the gap
        o.append(f'<path d="M{mx + 95},{my + 88} L{icon_x + 12},{icon_y - 6}" '
                 f'stroke="#ff6b6b" stroke-width="2" stroke-dasharray="6 5" fill="none"/>')
    o.append(t(x, y - 14, label, "#e6e6e6", 17, weight="bold"))
    o.append(t(x, y - 14, sub, "#9aa0a6", 13, anchor="end") if False else "")
    o.append(t(x, y + 420, sub, "#9aa0a6", 13))
    # right-align the subtitle inside the panel width
    o[-1] = t(x + 560, y + 420, sub, "#9aa0a6", 13, anchor="end")
    return "".join(o)

def random(x, y, icon_x, icon_y):
    return (x + 330, y + 18)          # somewhere at the top

def beside(x, y, icon_x, icon_y):
    mx = icon_x + 12 - 95                  # roughly centred on the icon
    mx = min(mx, x + 560 - 190 - 8)        # ... and clamped on-screen, as the script does
    return (mx, icon_y - 88 - 8)

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">',
       r(0, 0, W, H, "#14161a")]
svg.append(t(40, 52, "DingTalk tray menu on Plasma Wayland", "#f2f2f2", 26, weight="bold"))
svg.append(t(40, 80, "the client places it itself, at a position that varies — "
                     "this script puts it beside the pointer", "#9aa0a6", 14))
svg.append(mini_screen(40, 130, random, "before",
                       "random position, nowhere near the icon"))
svg.append(mini_screen(680, 130, beside, "after",
                       "beside the pointer, inward from the panel"))
svg.append(t(40, 690, "KWin script · no patches · Plasma 6.8 · XWayland clients",
             "#6b7075", 12))
svg.append("</svg>")

OUT.parent.mkdir(parents=True, exist_ok=True)
tmp = OUT.with_suffix(".svg")
tmp.write_text("".join(svg))
subprocess.run(["rsvg-convert", "-w", str(W), "-h", str(H), str(tmp), "-o", str(OUT)], check=True)
print(OUT)
