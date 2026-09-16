// Tiny canvas engine for the terminal arcade: fixed low-res buffer,
// C64 Pepto palette, keyboard + touch input, one game at a time.

export const W = 320;
export const H = 180;

export const C64 = {
  black: '#000000',
  white: '#ffffff',
  red: '#9f4e44',
  cyan: '#6abfc6',
  purple: '#a057a3',
  green: '#5cab5e',
  blue: '#50459b',
  yellow: '#c9d487',
  orange: '#a1683c',
  brown: '#6d5412',
  lightred: '#cb7e75',
  darkgrey: '#626262',
  grey: '#898989',
  lightgreen: '#9ae29b',
  lightblue: '#887ecb',
  lightgrey: '#adadad',
};

const HANDLED_KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '];

const PAD_BUTTONS = [
  ['◀', 'ArrowLeft'],
  ['▼', 'ArrowDown'],
  ['▲', 'ArrowUp'],
  ['▶', 'ArrowRight'],
];

// Mounts a canvas over `host`, runs the game loop, resolves with the
// game's result when it calls end() or the player hits Escape.
export function runGame(host, createGame) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'arcade';
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
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

    const api = { W, H, keys, end, C64 };
    const game = createGame(api);

    let last = performance.now();
    const frame = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      game.update(dt);
      game.draw(ctx);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
  });
}

// ---- shared drawing helpers ------------------------------------------------

// cheap deterministic noise
export const hash = (n) => {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

// white Casio-style box with a blue border, like the reference HUD
export function hudBox(ctx, text, cx = W / 2) {
  ctx.font = '8px "Silkscreen", monospace';
  ctx.textBaseline = 'top';
  const w = ctx.measureText(text).width + 10;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = '#2929c7';
  ctx.fillRect(x - 2, 3, w + 4, 15);
  ctx.fillStyle = C64.white;
  ctx.fillRect(x, 5, w, 11);
  ctx.fillStyle = C64.black;
  ctx.fillText(text, x + 5, 7);
}

// black status bar along the bottom, white text left + right
export function statusBar(ctx, left, right) {
  ctx.fillStyle = C64.black;
  ctx.fillRect(0, H - 12, W, 12);
  ctx.font = '8px "Silkscreen", monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = C64.white;
  ctx.fillText(left, 5, H - 10);
  const w = ctx.measureText(right).width;
  ctx.fillText(right, W - w - 5, H - 10);
}

export function skyBands(ctx, horizon) {
  const bands = [C64.lightblue, C64.lightblue, C64.cyan, C64.cyan, C64.lightgreen];
  const bh = horizon / bands.length;
  // last band extends to the bottom so no frame leaves stale pixels
  ctx.fillStyle = bands[bands.length - 1];
  ctx.fillRect(0, 0, W, H);
  bands.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.fillRect(0, i * bh, W, bh + 1);
  });
  ctx.fillStyle = C64.yellow;
  ctx.fillRect(W - 46, 12, 14, 14);
  ctx.fillRect(W - 43, 9, 8, 20);
  ctx.fillRect(W - 49, 15, 20, 8);
}

export function hudText(ctx, text, x, y, color = C64.white) {
  ctx.font = '8px "Silkscreen", monospace';
  ctx.textBaseline = 'top';
  ctx.fillStyle = C64.black;
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function dither(ctx, x, y, w, h, color, density = 0.5, seed = 0) {
  ctx.fillStyle = color;
  for (let yy = y; yy < y + h; yy += 2) {
    for (let xx = x + (((yy + seed) >> 1) % 2); xx < x + w; xx += 2) {
      if (Math.random() < density) ctx.fillRect(xx, yy, 1, 1);
    }
  }
}
