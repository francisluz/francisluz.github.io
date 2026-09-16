// SURF — ride the wave face, stay in the pocket near the crest,
// dodge the rolling foam. 60-second session, 3 boards.

import { W, H, C64, skyBands, hudText, dither } from './engine.js';

const SESSION = 60;
const PLAYER_X_MIN = 30;
const PLAYER_X_MAX = 240;

// Crest line: high on the right, sloping down-left toward the beach.
const crestY = (x, t) => 34 + (W - x) * 0.32 + Math.sin(t * 0.8 + x * 0.02) * 4;

export function createSurf({ keys, end }) {
  const g = {
    t: 0,
    score: 0,
    boards: 3,
    px: 120,
    py: 90,
    tumble: 0,
    bogTimer: 0,
    foam: null, // rolling foam ball section
    nextFoam: 4,
    popup: null,
  };

  const wipeout = (reason) => {
    g.boards -= 1;
    g.tumble = 1.3;
    g.popup = { text: reason, ttl: 1.6 };
    if (g.boards <= 0) {
      // let the tumble play out, then report
      setTimeout(() => end({ score: Math.round(g.score), wiped: true }), 900);
    }
  };

  const update = (dt) => {
    g.t += dt;
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;

    if (g.t >= SESSION) {
      end({ score: Math.round(g.score) });
      return;
    }

    if (g.tumble > 0) {
      g.tumble -= dt;
      if (g.tumble <= 0) {
        g.py = crestY(g.px, g.t) + 22;
        g.bogTimer = 0;
      }
      return;
    }

    // steering
    const sp = 68;
    if (keys.has('ArrowLeft')) g.px -= sp * dt;
    if (keys.has('ArrowRight')) g.px += sp * dt;
    if (keys.has('ArrowUp')) g.py -= sp * dt;
    if (keys.has('ArrowDown')) g.py += sp * dt;
    // the face constantly pushes you down and toward the beach
    g.py += 14 * dt;
    g.px -= 7 * dt;
    g.px = Math.max(PLAYER_X_MIN, Math.min(PLAYER_X_MAX, g.px));

    const crest = crestY(g.px, g.t);
    const depth = g.py - crest;

    // over the falls
    if (depth < 2) {
      wipeout('OVER THE FALLS!');
      return;
    }
    // bottom of screen = flats
    if (g.py > H - 12) g.py = H - 12;

    // pocket scoring: sweet zone just under the crest
    if (depth >= 4 && depth <= 26) {
      g.score += (46 - depth) * dt * 2.2;
      g.bogTimer = 0;
    } else if (depth > 55) {
      g.bogTimer += dt;
      if (g.bogTimer > 1.6) {
        wipeout('BOGGED IN THE FLATS!');
        return;
      }
    } else {
      g.bogTimer = 0;
    }

    // rolling foam sections
    g.nextFoam -= dt;
    if (!g.foam && g.nextFoam <= 0) {
      const fx = Math.min(PLAYER_X_MAX, Math.max(60, g.px + (Math.random() * 90 - 30)));
      g.foam = { x: fx, y: crestY(fx, g.t) - 4, r: 9, vy: 46 };
      g.nextFoam = 5 + Math.random() * 5;
    }
    if (g.foam) {
      g.foam.y += g.foam.vy * dt;
      g.foam.x -= 14 * dt;
      g.foam.r += 2.4 * dt;
      if (g.foam.y > H + 12) g.foam = null;
      else {
        const dx = g.foam.x - g.px;
        const dy = g.foam.y - g.py;
        if (dx * dx + dy * dy < (g.foam.r + 4) ** 2) {
          g.foam = null;
          wipeout('MOWED BY THE FOAM!');
        }
      }
    }
  };

  const drawSurfer = (ctx, x, y, tumbling) => {
    ctx.save();
    ctx.translate(x, y);
    if (tumbling) ctx.rotate(g.tumble * 12);
    ctx.fillStyle = C64.yellow; // board
    ctx.fillRect(-7, 2, 14, 2);
    ctx.fillStyle = C64.black; // legs
    ctx.fillRect(-2, -3, 2, 5);
    ctx.fillRect(1, -3, 2, 5);
    ctx.fillStyle = C64.red; // torso
    ctx.fillRect(-2, -8, 5, 5);
    ctx.fillStyle = C64.lightred; // arms out
    ctx.fillRect(-6, -7, 4, 2);
    ctx.fillRect(3, -6, 4, 2);
    ctx.fillStyle = C64.orange; // head
    ctx.fillRect(-1, -12, 3, 4);
    ctx.restore();
  };

  const draw = (ctx) => {
    skyBands(ctx, 46);

    // wave face, column by column
    for (let x = 0; x < W; x += 1) {
      const c = crestY(x, g.t);
      ctx.fillStyle = C64.blue;
      ctx.fillRect(x, c, 1, H - c);
      ctx.fillStyle = C64.lightblue;
      ctx.fillRect(x, c + 2, 1, 14);
      ctx.fillStyle = C64.white;
      ctx.fillRect(x, c, 1, 2);
    }
    // deep-water texture
    dither(ctx, 0, 120, W, H - 120, C64.black, 0.12, 3);

    // curl ball riding the crest on the right
    const cx = 258 + Math.sin(g.t * 1.7) * 16;
    const cy = crestY(cx, g.t) - 2;
    ctx.fillStyle = C64.white;
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fill();
    dither(ctx, cx - 14, cy - 8, 28, 16, C64.cyan, 0.35, 1);

    // rolling foam section
    if (g.foam) {
      ctx.fillStyle = C64.white;
      ctx.beginPath();
      ctx.arc(g.foam.x, g.foam.y, g.foam.r, 0, Math.PI * 2);
      ctx.fill();
      dither(ctx, g.foam.x - g.foam.r, g.foam.y - g.foam.r, g.foam.r * 2, g.foam.r * 2, C64.lightblue, 0.3, 2);
    }

    // spray when carving
    if (g.tumble <= 0 && (keys.size > 0 || Math.random() < 0.3)) {
      dither(ctx, g.px - 10, g.py + 2, 8, 5, C64.white, 0.5, (g.t * 60) | 0);
    }

    drawSurfer(ctx, g.px, g.py, g.tumble > 0);

    // pocket hint: subtle sparkle under the crest at player's x
    const pc = crestY(g.px, g.t);
    if (g.py - pc > 30 && g.tumble <= 0) {
      hudText(ctx, '^ POCKET UP THERE ^', g.px - 40, pc + 6, C64.yellow);
    }

    // HUD
    hudText(ctx, `SCORE ${Math.round(g.score)}`, 6, 5);
    hudText(ctx, `BOARDS ${'#'.repeat(Math.max(0, g.boards))}`, 6, 16, C64.yellow);
    const left = Math.max(0, SESSION - g.t);
    ctx.fillStyle = C64.black;
    ctx.fillRect(W - 70, 6, 62, 6);
    ctx.fillStyle = C64.lightgreen;
    ctx.fillRect(W - 69, 7, 60 * (left / SESSION), 4);
    if (g.popup) hudText(ctx, g.popup.text, W / 2 - 50, 60, C64.lightred);
    if (g.bogTimer > 0.5) hudText(ctx, 'PADDLE UP!', g.px - 22, g.py - 24, C64.lightred);
    hudText(ctx, 'ARROWS RIDE · ESC QUITS', 6, H - 12, C64.lightgrey);
  };

  return { update, draw, score: () => Math.round(g.score) };
}
