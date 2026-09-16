// Shared helpers for composing fat-pixel sprite grids at load time.
// Coordinates are in visual space: x in fat px (2 hires wide), y in
// rows (1 tall). Grids are arrays of Uint8Array rows, 0 = transparent;
// toStrings() turns them into the '.123' strings Vic.sprite() blits.

export const mk = (w, h = w) => Array.from({ length: h }, () => new Uint8Array(w));

export const px = (g, x, y, c) => {
  x = Math.round(x);
  y = Math.round(y);
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = c;
};

// `thick` widens across the line's dominant axis, so a stroke stays the
// same weight whether it runs horizontally or vertically.
export const line = (g, x0, y0, x1, y1, c, thick = 1) => {
  const steps = Math.max(Math.abs((x1 - x0) * 2), Math.abs(y1 - y0), 1) * 2;
  const steep = Math.abs(y1 - y0) > Math.abs((x1 - x0) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    for (let t = 0; t < thick; t += 1) {
      if (steep) px(g, x + t, y, c);
      else px(g, x, y + t, c);
    }
  }
};

export const ellipse = (g, cx, cy, rx, ry, c) => {
  for (let dy = -ry; dy <= ry; dy += 1) {
    const w = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (ry * ry))) + 0.3);
    for (let dx = -w; dx <= w; dx += 1) px(g, cx + dx, cy + dy, c);
  }
};

export const toStrings = (g) =>
  g.map((row) => Array.from(row, (v) => (v ? String(v) : '.')).join(''));

export const mirror = (grid) => grid.map((row) => [...row].reverse().join(''));
