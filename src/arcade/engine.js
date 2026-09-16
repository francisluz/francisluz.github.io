// VIC-II style graphics engine.
//
// Replicates how C64 games actually drew their screens:
// - 160x200 multicolor bitmap with 2:1 fat pixels (shown as 320x200)
// - the 16-color Pepto palette, nothing else
// - multicolor attribute constraint: each 4x8 cell may only hold the
//   shared background color plus 3 others; excess colors are remapped,
//   producing authentic color clash
// - hardware-style sprites: multicolor bitmaps composited over the
//   bitmap layer, exempt from cell limits (like the real chip); no
//   rotation in hardware, so rotated sprites are pre-rendered frames
// - the border around the screen, and tape-loading raster stripes

export const W = 160; // multicolor pixels (each 2 hires pixels wide)
export const H = 200;

// Pepto palette
export const PAL = [
  '#000000', '#ffffff', '#883932', '#67b6bd',
  '#8b3f96', '#55a049', '#40318d', '#bfce72',
  '#8b5429', '#574200', '#b86962', '#505050',
  '#787878', '#94e089', '#7869c4', '#9f9f9f',
];

export const C = {
  BLACK: 0, WHITE: 1, RED: 2, CYAN: 3, PURPLE: 4, GREEN: 5, BLUE: 6,
  YELLOW: 7, ORANGE: 8, BROWN: 9, LIGHTRED: 10, DARKGREY: 11, GREY: 12,
  LIGHTGREEN: 13, LIGHTBLUE: 14, LIGHTGREY: 15,
};

// palette RGB distance table for the attribute-clash remap
const RGB = PAL.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);
const DIST = [];
for (let a = 0; a < 16; a += 1) {
  DIST[a] = [];
  for (let b = 0; b < 16; b += 1) {
    const dr = RGB[a][0] - RGB[b][0];
    const dg = RGB[a][1] - RGB[b][1];
    const db = RGB[a][2] - RGB[b][2];
    DIST[a][b] = dr * dr + dg * dg * 2 + db * db; // weight green, eyes do
  }
}

// 4x6 pixel font, one nibble per row
const FONT = {
  A: [6, 9, 15, 9, 9, 0], B: [14, 9, 14, 9, 14, 0], C: [7, 8, 8, 8, 7, 0],
  D: [14, 9, 9, 9, 14, 0], E: [15, 8, 14, 8, 15, 0], F: [15, 8, 14, 8, 8, 0],
  G: [7, 8, 11, 9, 7, 0], H: [9, 9, 15, 9, 9, 0], I: [7, 2, 2, 2, 7, 0],
  J: [1, 1, 1, 9, 6, 0], K: [9, 10, 12, 10, 9, 0], L: [8, 8, 8, 8, 15, 0],
  M: [9, 15, 15, 9, 9, 0], N: [9, 13, 11, 9, 9, 0], O: [6, 9, 9, 9, 6, 0],
  P: [14, 9, 14, 8, 8, 0], Q: [6, 9, 9, 10, 5, 0], R: [14, 9, 14, 10, 9, 0],
  S: [7, 8, 6, 1, 14, 0], T: [15, 4, 4, 4, 4, 0], U: [9, 9, 9, 9, 6, 0],
  V: [9, 9, 9, 10, 4, 0], W: [9, 9, 15, 15, 9, 0], X: [9, 9, 6, 9, 9, 0],
  Y: [9, 9, 6, 4, 4, 0], Z: [15, 1, 6, 8, 15, 0],
  0: [6, 9, 11, 13, 6, 0], 1: [2, 6, 2, 2, 7, 0], 2: [6, 9, 2, 4, 15, 0],
  3: [14, 1, 6, 1, 14, 0], 4: [9, 9, 15, 1, 1, 0], 5: [15, 8, 14, 1, 14, 0],
  6: [7, 8, 14, 9, 6, 0], 7: [15, 1, 2, 4, 4, 0], 8: [6, 9, 6, 9, 6, 0],
  9: [6, 9, 7, 1, 6, 0],
  ' ': [0, 0, 0, 0, 0, 0], ':': [0, 4, 0, 4, 0, 0], '!': [4, 4, 4, 0, 4, 0],
  '.': [0, 0, 0, 0, 4, 0], '-': [0, 0, 15, 0, 0, 0], '/': [1, 2, 2, 4, 8, 0],
  '+': [0, 4, 14, 4, 0, 0], '?': [6, 9, 2, 4, 0, 4], '·': [0, 0, 4, 0, 0, 0],
};

export class Vic {
  constructor() {
    this.bmp = new Uint8Array(W * H);
    this.ovl = new Uint8Array(W * H); // sprite/HUD layer, 255 = transparent
    this.border = C.LIGHTBLUE;
    this.bg = C.BLUE;
  }

  clear(c) {
    this.bmp.fill(c);
    this.ovl.fill(255);
  }

  pset(x, y, c) {
    x |= 0; y |= 0;
    if (x >= 0 && x < W && y >= 0 && y < H) this.bmp[y * W + x] = c;
  }

  rect(x, y, w, h, c) {
    const x0 = Math.max(0, x | 0);
    const y0 = Math.max(0, y | 0);
    const x1 = Math.min(W, (x + w) | 0);
    const y1 = Math.min(H, (y + h) | 0);
    for (let yy = y0; yy < y1; yy += 1) this.bmp.fill(c, yy * W + x0, yy * W + x1);
  }

  // fast vertical column fill
  col(x, y0, y1, c) {
    x |= 0;
    if (x < 0 || x >= W) return;
    const a = Math.max(0, y0 | 0);
    const b = Math.min(H, y1 | 0);
    for (let y = a; y < b; y += 1) this.bmp[y * W + x] = c;
  }

  circle(cx, cy, r, c) {
    for (let dy = -r; dy <= r; dy += 1) {
      const dx = Math.floor(Math.sqrt(r * r - dy * dy));
      const y = (cy + dy) | 0;
      if (y < 0 || y >= H) continue;
      const x0 = Math.max(0, (cx - dx) | 0);
      const x1 = Math.min(W, (cx + dx + 1) | 0);
      this.bmp.fill(c, y * W + x0, y * W + x1);
    }
  }

  // ---- overlay layer (sprites + HUD, exempt from cell constraint) ----

  opset(x, y, c) {
    x |= 0; y |= 0;
    if (x >= 0 && x < W && y >= 0 && y < H) this.ovl[y * W + x] = c;
  }

  orect(x, y, w, h, c) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.opset(xx, yy, c);
    }
  }

  // grid: array of strings, '.'=transparent, '1'..'3' index into colors
  sprite(grid, x, y, colors) {
    for (let j = 0; j < grid.length; j += 1) {
      const row = grid[j];
      for (let i = 0; i < row.length; i += 1) {
        const ch = row[i];
        if (ch !== '.' && ch !== ' ') this.opset(x + i, y + j, colors[+ch - 1]);
      }
    }
  }

  text(str, x, y, c) {
    let cx = x;
    for (const ch of String(str).toUpperCase()) {
      const glyph = FONT[ch] || FONT['?'];
      for (let j = 0; j < 6; j += 1) {
        const bits = glyph[j];
        for (let i = 0; i < 4; i += 1) {
          if (bits & (8 >> i)) this.opset(cx + i, y + j, c);
        }
      }
      cx += 5;
    }
    return cx - x;
  }

  textWidth(str) {
    return String(str).length * 5;
  }

  // Casio-style HUD box drawn on the overlay
  hudBox(str, cx) {
    const w = this.textWidth(str) + 6;
    const x = Math.round(cx - w / 2);
    this.orect(x - 1, 3, w + 2, 12, C.BLUE);
    this.orect(x, 4, w, 10, C.WHITE);
    this.text(str, x + 3, 6, C.BLACK);
  }

  statusBar(left, right) {
    this.orect(0, H - 10, W, 10, C.BLACK);
    this.text(left, 3, H - 8, C.WHITE);
    if (right) this.text(right, W - this.textWidth(right) - 3, H - 8, C.WHITE);
  }

  // multicolor bitmap rule: per 4x8 cell, background + at most 3 colors
  applyCellConstraint() {
    const counts = new Uint16Array(16);
    for (let cy = 0; cy < H; cy += 8) {
      for (let cx = 0; cx < W; cx += 4) {
        counts.fill(0);
        for (let y = cy; y < cy + 8; y += 1) {
          const base = y * W + cx;
          counts[this.bmp[base]] += 1;
          counts[this.bmp[base + 1]] += 1;
          counts[this.bmp[base + 2]] += 1;
          counts[this.bmp[base + 3]] += 1;
        }
        counts[this.bg] = 0;
        // pick the 3 most frequent non-background colors
        let a = -1, b = -1, d = -1;
        for (let ci = 0; ci < 16; ci += 1) {
          const n = counts[ci];
          if (!n) continue;
          if (a === -1 || n > counts[a]) { d = b; b = a; a = ci; }
          else if (b === -1 || n > counts[b]) { d = b; b = ci; }
          else if (d === -1 || n > counts[d]) { d = ci; }
        }
        let extra = false;
        for (let ci = 0; ci < 16; ci += 1) {
          if (counts[ci] && ci !== a && ci !== b && ci !== d) { extra = true; break; }
        }
        if (!extra) continue;
        for (let y = cy; y < cy + 8; y += 1) {
          for (let x = cx; x < cx + 4; x += 1) {
            const p = this.bmp[y * W + x];
            if (p === this.bg || p === a || p === b || p === d) continue;
            // remap to nearest allowed color
            let best = this.bg;
            let bd = DIST[p][this.bg];
            if (a !== -1 && DIST[p][a] < bd) { best = a; bd = DIST[p][a]; }
            if (b !== -1 && DIST[p][b] < bd) { best = b; bd = DIST[p][b]; }
            if (d !== -1 && DIST[p][d] < bd) { best = d; }
            this.bmp[y * W + x] = best;
          }
        }
      }
    }
  }
}

// Pre-render rotation frames for a sprite, the way real games shipped
// hand-drawn rotation frames. Accounts for 2:1 fat pixels.
export function rotationFrames(grid, frames, size = 26) {
  const sh = grid.length;
  const sw = grid[0].length;
  const out = [];
  for (let f = 0; f < frames; f += 1) {
    const ang = (f / frames) * Math.PI * 2;
    const cos = Math.cos(-ang);
    const sin = Math.sin(-ang);
    const rows = [];
    for (let j = 0; j < size; j += 1) {
      let row = '';
      for (let i = 0; i < size; i += 1) {
        // to visual space (x2 wide), rotate, back to fat pixels
        const vx = (i - size / 2) * 2;
        const vy = j - size / 2;
        const sx = Math.round((vx * cos - vy * sin) / 2 + sw / 2);
        const sy = Math.round(vx * sin + vy * cos + sh / 2);
        row += sy >= 0 && sy < sh && sx >= 0 && sx < sw ? grid[sy][sx] : '.';
      }
      rows.push(row);
    }
    out.push(rows);
  }
  return out;
}

// ---------------------------------------------------------------- runner

const HANDLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];
const PAD_BUTTONS = [
  ['◀', 'ArrowLeft'],
  ['▼', 'ArrowDown'],
  ['▲', 'ArrowUp'],
  ['▶', 'ArrowRight'],
];

const BORDER_X = 16; // in fat pixels: 32 hires
const BORDER_Y = 20;
const CANVAS_W = (W + BORDER_X * 2) * 2; // 384 hires pixels
const CANVAS_H = H + BORDER_Y * 2; // 240

export function runGame(host, createGame) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'arcade';
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    wrap.appendChild(canvas);

    const pads = document.createElement('div');
    pads.className = 'arcade-pads';
    const keys = new Set();
    for (const [label, key] of PAD_BUTTONS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        keys.add(key);
      });
      for (const evt of ['pointerup', 'pointercancel', 'pointerleave']) {
        b.addEventListener(evt, () => keys.delete(key));
      }
      pads.appendChild(b);
    }
    wrap.appendChild(pads);
    host.appendChild(wrap);

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const buf = document.createElement('canvas');
    buf.width = W;
    buf.height = H;
    const bufCtx = buf.getContext('2d');
    const img = bufCtx.createImageData(W, H);

    const vic = new Vic();

    let done = false;
    let raf = 0;

    const end = (result = {}) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      wrap.remove();
      resolve(result);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        end({ quit: true, score: game.score ? game.score() : 0 });
        return;
      }
      if (HANDLED_KEYS.includes(e.key)) {
        e.preventDefault();
        keys.add(e.key);
      }
    };
    const onKeyUp = (e) => keys.delete(e.key);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const api = { keys, end };
    const game = createGame(api);

    const present = () => {
      const data = img.data;
      const { bmp, ovl } = vic;
      for (let i = 0; i < W * H; i += 1) {
        const o = ovl[i];
        const rgb = RGB[o !== 255 ? o : bmp[i]];
        const p = i * 4;
        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
      }
      bufCtx.putImageData(img, 0, 0);
      ctx.fillStyle = PAL[vic.border];
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(buf, BORDER_X * 2, BORDER_Y, W * 2, H);
    };

    // tape-loading raster stripes before the game starts
    const LOAD_TIME = 0.9;
    let loadT = 0;
    let last = performance.now();

    const frame = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (loadT < LOAD_TIME) {
        loadT += dt;
        const stripe = [C.CYAN, C.RED, C.YELLOW, C.BLUE, C.WHITE, C.PURPLE];
        for (let y = 0; y < CANVAS_H; y += 2) {
          ctx.fillStyle = PAL[stripe[(Math.random() * stripe.length) | 0]];
          ctx.fillRect(0, y, CANVAS_W, 2);
        }
        ctx.fillStyle = PAL[C.BLACK];
        ctx.fillRect(CANVAS_W / 2 - 60, CANVAS_H / 2 - 10, 120, 20);
        ctx.fillStyle = PAL[C.WHITE];
        ctx.font = '8px "Silkscreen", monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText('LOADING', CANVAS_W / 2, CANVAS_H / 2);
        ctx.textAlign = 'left';
      } else {
        game.update(dt);
        game.draw(vic);
        vic.applyCellConstraint();
        present();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
