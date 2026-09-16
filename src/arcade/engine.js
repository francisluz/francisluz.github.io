// Bounded C64-inspired graphics engine.
//
// Models the useful visual constraints of a C64-style screen:
// - 160x200 multicolor bitmap with 2:1 fat pixels (shown as 320x200)
// - the 16-color Pepto palette, nothing else
// - multicolor attribute constraint: each 4x8 cell may only hold the
//   shared background color plus 3 others; excess colors are remapped,
//   producing authentic color clash
// - hardware-style sprite visuals: multicolor bitmaps composited over the
//   bitmap layer, exempt from cell limits (like the real chip); no
//   rotation in hardware, so rotated sprites are pre-rendered frames
// - the border around the screen, and tape-loading raster stripes
// This is a renderer approximation, not a VIC-II timing or bus emulator.

export const W = 160; // multicolor pixels (each 2 hires pixels wide)
export const H = 200;
export const DISPLAY_W = 320;

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

const CELL_W = 4;
const CELL_H = 8;
const CELL_COLS = W / CELL_W;
const CELL_ROWS = H / CELL_H;
const TRANSPARENT = 255;

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

// Compact 5x7 font. Each set bit is one native display pixel; the six-pixel
// advance gives a three-unit width in the 160-wide game coordinate space.
const FONT = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 14], H: [17, 17, 17, 31, 17, 17, 17],
  I: [31, 4, 4, 4, 4, 4, 31], J: [1, 1, 1, 1, 17, 17, 14],
  K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 17, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 17, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14],
  2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 16, 30, 1, 1, 30],
  6: [14, 16, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 1, 14],
  ' ': [0, 0, 0, 0, 0, 0, 0], ':': [0, 4, 0, 0, 4, 0, 0],
  '!': [4, 4, 4, 4, 4, 0, 4], '.': [0, 0, 0, 0, 0, 0, 4],
  '-': [0, 0, 0, 31, 0, 0, 0], '/': [1, 2, 2, 4, 8, 8, 16],
  '+': [0, 4, 4, 31, 4, 4, 0], '?': [14, 17, 1, 2, 4, 0, 4],
  '·': [0, 0, 0, 4, 0, 0, 0],
};

export class Vic {
  constructor() {
    this.bmp = new Uint8Array(W * H);
    this.ovl = new Uint8Array(W * H); // sprite/HUD layer, 255 = transparent
    this.ovl.fill(TRANSPARENT);
    this.hiresOvl = new Uint8Array(DISPLAY_W * H); // exact-pixel overlay
    this.hiresOvl.fill(TRANSPARENT);
    this.constrained = new Uint8Array(W * H);
    this.cellPalettes = new Array(CELL_COLS * CELL_ROWS).fill(null);
    this.rasterBg = new Uint8Array(H);
    this.border = C.LIGHTBLUE;
    this.bg = C.BLUE;
  }

  clear(c = this.bg) {
    this.bmp.fill(c);
    this.ovl.fill(TRANSPARENT);
    this.hiresOvl.fill(TRANSPARENT);
    this.constrained.fill(c);
    this.cellPalettes.fill(null);
    this.rasterBg.fill(this.bg);
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
    if (x1 <= x0 || y1 <= y0) return;
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
      if (x1 > x0) this.bmp.fill(c, y * W + x0, y * W + x1);
    }
  }

  // ---- overlay layer (sprites + HUD, exempt from cell constraint) ----

  opset(x, y, c) {
    x |= 0; y |= 0;
    if (x >= 0 && x < W && y >= 0 && y < H) this.ovl[y * W + x] = c;
  }

  hpset(x, y, c) {
    x |= 0; y |= 0;
    if (x >= 0 && x < DISPLAY_W && y >= 0 && y < H) this.hiresOvl[y * DISPLAY_W + x] = c;
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
        if (typeof ch === 'number') {
          if (ch !== TRANSPARENT) this.opset(x + i, y + j, ch);
          continue;
        }
        if (ch !== '.' && ch !== ' ') this.opset(x + i, y + j, colors[+ch - 1]);
      }
    }
  }

  // Hires counterpart to sprite(). Grid columns are native display pixels.
  hsprite(grid, x, y, colors) {
    for (let j = 0; j < grid.length; j += 1) {
      const row = grid[j];
      for (let i = 0; i < row.length; i += 1) {
        const ch = row[i];
        if (typeof ch === 'number') {
          if (ch !== TRANSPARENT) this.hpset(x + i, y + j, ch);
        } else if (ch !== '.' && ch !== ' ') {
          this.hpset(x + i, y + j, colors[+ch - 1]);
        }
      }
    }
  }

  text(str, x, y, c) {
    // Text positions and widths remain in the 160-wide game coordinate space.
    // Glyph strokes are single native display pixels for a crisp overlay.
    let cx = Math.round(x * 2);
    const value = String(str).toUpperCase();
    for (const ch of value) {
      const glyph = FONT[ch] || FONT['?'];
      for (let j = 0; j < 7; j += 1) {
        const bits = glyph[j];
        for (let i = 0; i < 5; i += 1) {
          if (bits & (16 >> i)) this.hpset(cx + i, y + j, c);
        }
      }
      cx += 6;
    }
    return value.length * 3;
  }

  textWidth(str) {
    return String(str).length * 3;
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

  setCellPalette(cx, cy, colors = []) {
    cx |= 0; cy |= 0;
    if (cx < 0 || cx >= CELL_COLS || cy < 0 || cy >= CELL_ROWS) return;
    const palette = [];
    for (const c of colors || []) {
      const color = c | 0;
      if (color >= 0 && color < 16 && !palette.includes(color)) {
        palette.push(color);
      }
      if (palette.length === 3) break;
    }
    this.cellPalettes[cy * CELL_COLS + cx] = palette;
  }

  // Set the raster background register for rows without erasing bitmap art.
  rasterBackground(y0, y1, c) {
    const a = Math.max(0, y0 | 0);
    const b = Math.min(H, y1 | 0);
    if (b <= a) return;
    for (let y = a; y < b; y += 1) {
      this.rasterBg[y] = c;
    }
  }

  // multicolor bitmap rule: per 4x8 cell, each row's background + at most 3
  // other colors. The source bitmap is kept intact for redraws and inspection.
  applyCellConstraint() {
    this.constrained.set(this.bmp);
    const counts = new Uint16Array(16);
    for (let cy = 0; cy < H; cy += CELL_H) {
      for (let cx = 0; cx < W; cx += CELL_W) {
        counts.fill(0);
        for (let y = cy; y < cy + CELL_H; y += 1) {
          const rowBg = this.rasterBg[y];
          const base = y * W + cx;
          for (let x = 0; x < CELL_W; x += 1) {
            const p = this.bmp[base + x];
            if (p !== rowBg) counts[p] += 1;
          }
        }

        const explicit = this.cellPalettes[(cy / CELL_H) * CELL_COLS + (cx / CELL_W)];
        const allowed = explicit ? explicit.slice() : [];
        if (!explicit) {
          // Pick the 3 most frequent non-background colors. Ties retain the
          // lower palette index so frames remain deterministic.
          while (allowed.length < 3) {
            let best = -1;
            for (let ci = 0; ci < 16; ci += 1) {
              if (!counts[ci] || allowed.includes(ci)) continue;
              if (best === -1 || counts[ci] > counts[best]) best = ci;
            }
            if (best === -1) break;
            allowed.push(best);
          }
        }

        for (let y = cy; y < cy + CELL_H; y += 1) {
          const rowBg = this.rasterBg[y];
          for (let x = cx; x < cx + CELL_W; x += 1) {
            const p = this.bmp[y * W + x];
            if (p === rowBg || allowed.includes(p)) continue;
            let best = rowBg;
            let bd = DIST[p][rowBg];
            for (const color of allowed) {
              if (DIST[p][color] < bd) {
                best = color;
                bd = DIST[p][color];
              }
            }
            this.constrained[y * W + x] = best;
          }
        }
      }
    }
    return this.constrained;
  }

  // Compose a native 320x200 RGBA frame. Pass a Uint8Array/Uint8ClampedArray
  // to reuse storage, or an ImageData-like object with a .data property.
  compose(targetRGBA) {
    const target = targetRGBA && targetRGBA.data ? targetRGBA.data :
      (targetRGBA || new Uint8ClampedArray(DISPLAY_W * H * 4));
    if (target.length < DISPLAY_W * H * 4) throw new RangeError('RGBA target is too small');
    const constrained = this.applyCellConstraint();
    for (let y = 0; y < H; y += 1) {
      const base = y * W;
      const hiresBase = y * DISPLAY_W;
      for (let x = 0; x < W; x += 1) {
        const over = this.ovl[base + x];
        const color = over !== TRANSPARENT ? over : constrained[base + x];
        const rgb = RGB[color] || RGB[C.BLACK];
        for (let dx = 0; dx < 2; dx += 1) {
          const p = (hiresBase + x * 2 + dx) * 4;
          target[p] = rgb[0];
          target[p + 1] = rgb[1];
          target[p + 2] = rgb[2];
          target[p + 3] = 255;
        }
      }
      for (let x = 0; x < DISPLAY_W; x += 1) {
        const over = this.hiresOvl[hiresBase + x];
        if (over === TRANSPARENT) continue;
        const rgb = RGB[over] || RGB[C.BLACK];
        const p = (hiresBase + x) * 4;
        target[p] = rgb[0];
        target[p + 1] = rgb[1];
        target[p + 2] = rgb[2];
        target[p + 3] = 255;
      }
    }
    return target;
  }
}

// Decode the 63-byte bitmap used by a real 24x21 C64 sprite. In multicolor
// mode each two-bit value is expanded to two display columns, preserving the
// native 24-pixel width while retaining the hardware colour meanings.
export function decodeSprite(bytes, {
  multicolor = false,
  color = C.WHITE,
  sharedColors = [C.BLACK, C.WHITE],
} = {}) {
  if (!bytes || bytes.length < 63) throw new RangeError('C64 sprite data must contain 63 bytes');
  const own = color | 0;
  const shared0 = (sharedColors && sharedColors[0] !== undefined ? sharedColors[0] : C.BLACK) | 0;
  const shared1 = (sharedColors && sharedColors[1] !== undefined ? sharedColors[1] : C.WHITE) | 0;
  const out = [];
  for (let y = 0; y < 21; y += 1) {
    const row = [];
    for (let byte = 0; byte < 3; byte += 1) {
      const value = bytes[y * 3 + byte] & 0xff;
      if (!multicolor) {
        for (let bit = 7; bit >= 0; bit -= 1) row.push(value & (1 << bit) ? own : TRANSPARENT);
      } else {
        for (let pair = 3; pair >= 0; pair -= 1) {
          const code = (value >> (pair * 2)) & 3;
          const mapped = code === 0 ? TRANSPARENT : code === 1 ? shared0 : code === 2 ? own : shared1;
          row.push(mapped, mapped);
        }
      }
    }
    out.push(row);
  }
  return out;
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

const BORDER_X = 4; // in fat pixels: 8 hires
const BORDER_Y = 6;
const CANVAS_W = (W + BORDER_X * 2) * 2; // 336 hires pixels
const SCREEN_H = H * 6 / 5; // 320x200 memory displayed at 4:3 (320x240)
const CANVAS_H = SCREEN_H + BORDER_Y * 2; // 252, keeping the canvas 4:3

export function runGame(host, createGame) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'arcade';
    const stage = document.createElement('div');
    stage.className = 'arcade-screen';
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stage.appendChild(canvas);
    wrap.appendChild(stage);

    const resizeStage = () => {
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const fit = Math.min(rect.width / CANVAS_W, rect.height / CANVAS_H);
      // Use the whole available 4:3 area. The canvas still renders from its
      // low-resolution buffer with smoothing disabled, so fractional display
      // scaling stays crisp while avoiding a large unused step between 2x
      // and 3x integer sizes.
      canvas.style.width = `${CANVAS_W * fit}px`;
      canvas.style.height = `${CANVAS_H * fit}px`;
    };
    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resizeStage) : null;
    if (resizeObserver) resizeObserver.observe(stage);
    resizeStage();

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
    buf.width = DISPLAY_W;
    buf.height = H;
    const bufCtx = buf.getContext('2d');
    const img = bufCtx.createImageData(DISPLAY_W, H);

    const vic = new Vic();
    wrap.style.background = PAL[vic.border];

    let done = false;
    let raf = 0;

    const end = (result = {}) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (resizeObserver) resizeObserver.disconnect();
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

    // The border colour also fills the letterbox around the canvas, so the
    // C64 border runs to the edges of the window instead of stopping at black bars.
    let shownBorder = -1;
    const present = () => {
      vic.compose(img.data);
      bufCtx.putImageData(img, 0, 0);
      if (vic.border !== shownBorder) {
        shownBorder = vic.border;
        wrap.style.background = PAL[vic.border];
      }
      ctx.fillStyle = PAL[vic.border];
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(buf, BORDER_X * 2, BORDER_Y, DISPLAY_W, SCREEN_H);
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
        present();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}
