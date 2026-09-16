// SURF — ride the wave face, stay in the pocket near the crest,
// dodge the rolling foam. 60-second session, 3 boards.
// Look modeled on late-80s EGA surf games: flat cyan sky, deep
// speckled ocean, jagged foam crest, chunky board-first sprite.

import { W, H, C64, hudText, hudBox, statusBar, hash } from './engine.js';

const SKY = '#4fc8dc';
const WATER = '#2c33c4';
const WATER_LIGHT = '#4d55e6';
const WATER_DEEP = '#1d2287';

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
    vx: 0,
    vy: 0,
    tumble: 0,
    bogTimer: 0,
    foam: null,
    nextFoam: 4,
    popup: null,
    spray: [],
  };

  const wipeout = (reason) => {
    g.boards -= 1;
    g.tumble = 1.3;
    g.popup = { text: reason, ttl: 1.6 };
    if (g.boards <= 0) {
      setTimeout(() => end({ score: Math.round(g.score), wiped: true }), 900);
    }
  };

  const update = (dt) => {
    g.t += dt;
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;

    for (const p of g.spray) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.ttl -= dt;
    }
    g.spray = g.spray.filter((p) => p.ttl > 0);

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
    g.vx = (keys.has('ArrowRight') ? sp : 0) - (keys.has('ArrowLeft') ? sp : 0);
    g.vy = (keys.has('ArrowDown') ? sp : 0) - (keys.has('ArrowUp') ? sp : 0);
    g.px += g.vx * dt;
    g.py += g.vy * dt;
    // the face constantly pushes you down and toward the beach
    g.py += 14 * dt;
    g.px -= 7 * dt;
    g.px = Math.max(PLAYER_X_MIN, Math.min(PLAYER_X_MAX, g.px));

    // wake spray off the tail while carving
    if (Math.abs(g.vx) + Math.abs(g.vy) > 10 || Math.random() < 0.4) {
      g.spray.push({
        x: g.px - 8 + Math.random() * 4,
        y: g.py + 3 + Math.random() * 3,
        vx: -30 - Math.random() * 25,
        vy: 8 + Math.random() * 18,
        ttl: 0.5 + Math.random() * 0.4,
      });
    }

    const crest = crestY(g.px, g.t);
    const depth = g.py - crest;

    if (depth < 2) {
      wipeout('OVER THE FALLS!');
      return;
    }
    if (g.py > H - 22) g.py = H - 22;

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
        if (dx * dx + dy * dy < (g.foam.r + 5) ** 2) {
          g.foam = null;
          wipeout('MOWED BY THE FOAM!');
        }
      }
    }
  };

  // chunky surfer seen from behind, board leading down the face
  const drawSurfer = (ctx) => {
    ctx.save();
    ctx.translate(g.px, g.py);
    if (g.tumble > 0) ctx.rotate(g.tumble * 12);
    else ctx.rotate(-0.5 + g.vy * 0.003 + g.vx * 0.002);

    // board: yellow with red nose, angled down the line
    ctx.fillStyle = C64.yellow;
    ctx.fillRect(-11, 2, 22, 4);
    ctx.fillStyle = '#d43d1a';
    ctx.fillRect(8, 2, 4, 4);
    ctx.fillRect(-11, 2, 3, 4);
    // legs (skin), bent into a crouch
    ctx.fillStyle = C64.orange;
    ctx.fillRect(-4, -3, 3, 6);
    ctx.fillRect(2, -4, 3, 7);
    // wetsuit torso, leaning forward
    ctx.fillStyle = C64.black;
    ctx.fillRect(-3, -10, 7, 8);
    // arms out for balance
    ctx.fillStyle = C64.orange;
    ctx.fillRect(-10, -9, 7, 2);
    ctx.fillRect(4, -12, 7, 2);
    // head + hair
    ctx.fillRect(-1, -15, 4, 5);
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(-1, -16, 4, 2);
    ctx.restore();
  };

  const draw = (ctx) => {
    // flat cyan sky
    ctx.fillStyle = SKY;
    ctx.fillRect(0, 0, W, H);

    // wave, column by column: jagged foam crest, lit face, deep water
    const frame = Math.floor(g.t * 3);
    for (let x = 0; x < W; x += 1) {
      const c = crestY(x, g.t);
      const foamH = 2 + hash(x * 7.3 + frame) * 5;
      ctx.fillStyle = C64.white;
      ctx.fillRect(x, c - 1, 1, foamH + 1);
      ctx.fillStyle = WATER_LIGHT;
      ctx.fillRect(x, c + foamH, 1, 12);
      ctx.fillStyle = WATER;
      ctx.fillRect(x, c + foamH + 12, 1, H - c);
      ctx.fillStyle = WATER_DEEP;
      ctx.fillRect(x, Math.max(c + 20, H - 26), 1, 26);
    }

    // ocean speckle texture, stable with a slow shimmer
    ctx.fillStyle = C64.white;
    for (let i = 0; i < 420; i += 1) {
      const sx = Math.floor(hash(i * 13.7) * W);
      const sy = Math.floor(hash(i * 71.3) * H);
      if (sy > crestY(sx, g.t) + 9 && hash(i + frame) > 0.35) {
        ctx.fillRect(sx, sy, 1, 1);
      }
    }

    // curl ball riding the crest on the right
    const cx = 258 + Math.sin(g.t * 1.7) * 16;
    const cy = crestY(cx, g.t) - 2;
    ctx.fillStyle = C64.white;
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKY;
    for (let i = 0; i < 26; i += 1) {
      ctx.fillRect(cx - 12 + hash(i * 3.1 + frame) * 24, cy - 10 + hash(i * 9.7) * 18, 1, 1);
    }

    // rolling foam section
    if (g.foam) {
      ctx.fillStyle = C64.white;
      ctx.beginPath();
      ctx.arc(g.foam.x, g.foam.y, g.foam.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WATER_LIGHT;
      for (let i = 0; i < 18; i += 1) {
        ctx.fillRect(
          g.foam.x - g.foam.r + hash(i * 5.3 + frame) * g.foam.r * 2,
          g.foam.y - g.foam.r + hash(i * 8.9) * g.foam.r * 2,
          1,
          1,
        );
      }
    }

    // spray trail
    ctx.fillStyle = C64.white;
    for (const p of g.spray) ctx.fillRect(p.x, p.y, 2, 2);

    drawSurfer(ctx);

    const pc = crestY(g.px, g.t);
    if (g.py - pc > 30 && g.tumble <= 0) {
      hudText(ctx, '^ POCKET UP THERE ^', g.px - 40, pc + 8, C64.yellow);
    }
    if (g.bogTimer > 0.5) hudText(ctx, 'PADDLE UP!', g.px - 22, g.py - 26, C64.lightred);
    if (g.popup) hudText(ctx, g.popup.text, W / 2 - 50, 54, C64.lightred);

    // HUD, reference style
    const left = Math.max(0, SESSION - g.t);
    const mm = Math.floor(left / 60);
    const ss = String(Math.floor(left % 60)).padStart(2, '0');
    hudBox(ctx, `SURF ${mm}:${ss}`, 52);
    hudText(ctx, `SCORE ${Math.round(g.score)}`, W - 84, 7);
    // remaining boards as mini boards
    for (let i = 0; i < g.boards; i += 1) {
      ctx.fillStyle = C64.yellow;
      ctx.fillRect(W - 84 + i * 12, 19, 9, 3);
      ctx.fillStyle = '#d43d1a';
      ctx.fillRect(W - 84 + i * 12 + 7, 19, 2, 3);
    }
    statusBar(ctx, 'CONTESTANT FRANCIS', 'ESC QUITS');
  };

  return { update, draw, score: () => Math.round(g.score) };
}
