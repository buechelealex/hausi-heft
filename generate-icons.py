# -*- coding: utf-8 -*-
"""Erzeugt die App-Symbole (icon-192.png, icon-512.png, icon-maskable-512.png).

Kein Pillow noetig — die Symbole werden aus einfachen Formen gerechnet und mit
zlib als PNG geschrieben. Motiv: zwei Heftseiten auf orangem Grund, auf der
vorderen ein roter Rand und drei Zeilen wie in einem Hausaufgabenheft.

    python generate-icons.py
"""

import math
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.abspath(__file__))

BG_TOP = (214, 138, 62)
BG_BOTTOM = (177, 97, 30)
PAGE_FRONT = (255, 253, 251)
PAGE_BACK = (240, 226, 210)
MARGIN = (176, 74, 58)
LINE = (201, 118, 47)
LINE_LAST = (224, 205, 184)

SS = 3  # Kantenglaettung durch dreifaches Abtasten je Achse


def rounded_rect(px, py, cx, cy, w, h, radius, angle):
    """Liegt der Punkt in einem um `angle` (Grad) gedrehten Rechteck mit runden Ecken?"""
    rad = math.radians(-angle)
    dx, dy = px - cx, py - cy
    lx = dx * math.cos(rad) - dy * math.sin(rad)
    ly = dx * math.sin(rad) + dy * math.cos(rad)
    ax, ay = abs(lx) - (w / 2.0 - radius), abs(ly) - (h / 2.0 - radius)
    if ax <= 0 or ay <= 0:
        return ax <= radius and ay <= radius and abs(lx) <= w / 2.0 and abs(ly) <= h / 2.0
    return ax * ax + ay * ay <= radius * radius


def shape_color(x, y, size, scale):
    """Farbe an der Stelle (x, y) — Hintergrundverlauf plus die beiden Seiten."""
    unit = size / 512.0
    cx = cy = size / 2.0

    t = y / float(size)
    bg = tuple(int(BG_TOP[i] + (BG_BOTTOM[i] - BG_TOP[i]) * t) for i in range(3))

    def place(ox, oy, w, h, r, angle):
        return (cx + ox * unit * scale, cy + oy * unit * scale,
                w * unit * scale, h * unit * scale, r * unit * scale, angle)

    back = place(-54, 6, 200, 280, 22, -13)
    front = place(22, 0, 228, 300, 26, 5)

    if rounded_rect(x, y, *front):
        # Rand und Zeilen liegen im gedrehten Koordinatensystem der vorderen Seite
        rad = math.radians(-front[5])
        dx, dy = x - front[0], y - front[1]
        lx = dx * math.cos(rad) - dy * math.sin(rad)
        ly = dx * math.sin(rad) + dy * math.cos(rad)

        # Roter Rand links, wie die Randlinie im Heft
        if rounded_rect(lx, ly, -74 * unit * scale, 0, 7 * unit * scale,
                        226 * unit * scale, 4 * unit * scale, 0):
            return MARGIN

        # Drei beschriebene Zeilen, die letzte nur angefangen
        step = 58 * unit * scale
        for index, (width, color) in enumerate(((118, LINE), (118, LINE), (64, LINE_LAST))):
            by = (index - 1) * step
            bx = (-38 + width / 2.0) * unit * scale
            if rounded_rect(lx, ly, bx, by, width * unit * scale, 19 * unit * scale,
                            9 * unit * scale, 0):
                return color
        return PAGE_FRONT

    if rounded_rect(x, y, *back):
        return PAGE_BACK

    return bg


def render(size, scale):
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            r = g = b = 0
            for sy in range(SS):
                for sx in range(SS):
                    c = shape_color(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, scale)
                    r += c[0]; g += c[1]; b += c[2]
            n = SS * SS
            row += bytes((r // n, g // n, b // n))
        rows.append(row)
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + bytes(row) for row in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)
    print("geschrieben:", os.path.basename(path), size, "px")


if __name__ == "__main__":
    for name, size, scale in (("icon-192.png", 192, 1.0),
                              ("icon-512.png", 512, 1.0),
                              # maskable: Motiv kleiner, damit der Zuschnitt nichts abschneidet
                              ("icon-maskable-512.png", 512, 0.7)):
        write_png(os.path.join(ROOT, name), size, render(size, scale))
