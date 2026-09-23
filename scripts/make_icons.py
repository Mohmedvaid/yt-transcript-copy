#!/usr/bin/env python3
"""Generate the extension icons (red rounded square with a white "copy" glyph).

No dependencies: writes PNGs with zlib + struct. Run from the repo root:
    python3 scripts/make_icons.py
"""
import os
import struct
import zlib

OUT = os.path.join(os.path.dirname(__file__), "..", "extension", "icons")
RED = (255, 0, 51, 255)
WHITE = (255, 255, 255, 255)
CLEAR = (0, 0, 0, 0)


def in_round_rect(x, y, x0, y0, x1, y1, r):
    if not (x0 <= x < x1 and y0 <= y < y1):
        return False
    cx = min(max(x, x0 + r), x1 - r)
    cy = min(max(y, y0 + r), y1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


def pixel(x, y, n):
    s = n / 128.0
    fx, fy = (x + 0.5) / s, (y + 0.5) / s  # work in 128-unit space
    if not in_round_rect(fx, fy, 0, 0, 128, 128, 28):
        return CLEAR
    # Two overlapping "pages": back one outlined, front one filled.
    back_outer = in_round_rect(fx, fy, 30, 24, 80, 84, 8)
    back_inner = in_round_rect(fx, fy, 38, 32, 72, 76, 3)
    front = in_round_rect(fx, fy, 48, 44, 98, 104, 8)
    if front:
        line = 58 <= fx < 88 and any(y0 <= fy < y0 + 6 for y0 in (58, 70, 82))
        return RED if line else WHITE
    if back_outer and not back_inner:
        return WHITE
    return RED


def png(n):
    raw = b"".join(
        b"\x00" + b"".join(bytes(pixel(x, y, n)) for x in range(n)) for y in range(n)
    )

    def chunk(tag, data):
        c = tag + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for n in (16, 48, 128):
        with open(os.path.join(OUT, f"icon{n}.png"), "wb") as f:
            f.write(png(n))
    print("icons written to", os.path.abspath(OUT))
