from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image


CASES = (
    (
        "reference",
        Path(r"C:\Users\yusio\AppData\Local\Temp\codex-clipboard-4c52922c-540c-4012-9eb3-8a73b74a2317.png"),
        (913, 94, 1113, 294),
    ),
    (
        "implementation",
        Path(r"D:\2026PM\4AI\微电子签\esign.byjin.cn\.codex-audit\02-seal-classic-after.png"),
        (752, 277, 992, 519),
    ),
)


def components(mask: np.ndarray):
    height, width = mask.shape
    visited = np.zeros_like(mask, dtype=bool)
    found = []

    for start_y, start_x in zip(*np.nonzero(mask)):
        if visited[start_y, start_x]:
            continue
        queue = deque(((start_y, start_x),))
        visited[start_y, start_x] = True
        pixels = []
        while queue:
            y, x = queue.popleft()
            pixels.append((y, x))
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    if mask[next_y, next_x] and not visited[next_y, next_x]:
                        visited[next_y, next_x] = True
                        queue.append((next_y, next_x))
        if len(pixels) >= 4:
            ys = [pixel[0] for pixel in pixels]
            xs = [pixel[1] for pixel in pixels]
            found.append((len(pixels), min(xs), min(ys), max(xs), max(ys)))
    return sorted(found, reverse=True)


for name, path, crop in CASES:
    image = np.array(Image.open(path).convert("RGB").crop(crop))
    red = (image[:, :, 0] > 170) & (image[:, :, 0] > image[:, :, 1] * 1.35) & (image[:, :, 0] > image[:, :, 2] * 1.35)
    items = components(red)
    print(name)
    for item in items[:30]:
        area, left, top, right, bottom = item
        print(f"  area={area:4d} box=({left:3d},{top:3d})-({right:3d},{bottom:3d}) size={right-left+1:3d}x{bottom-top+1:3d}")
