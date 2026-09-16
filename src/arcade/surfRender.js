// Draws the surf screen from the wave model. Artwork follows the model;
// the model never looks at the artwork.
//
// Layers, back to front: sky, far sea, wave face (dithered bands plus
// ripple streaks that bend with the lip), the pitching curl, whitewater,
// foreground chop, then effect sprites on the bitmap (so they colour-clash
// like the real thing) and the surfer on the hardware-sprite layer.
// Water animates at 8 fps and foam at 10 fps, not every frame.

import { W, H, C } from './engine.js';
import { HORIZON, TROUGH, SESSION } from './surfWave.js';
import {
  S, N_ROT, COLORS, POSES, BOARD_ROT, FALL_ROT, SWIM, mirrored,
  FX, FX_COLORS, STREAKS, FOAM, CURTAIN, FAR_SEA, CHOP, FOAM_EDGE,
} from './surfSprites.js';

const TAU = Math.PI * 2;
const frameOf = (ang) => ((Math.round((ang / TAU) * N_ROT) % N_ROT) + N_ROT) % N_ROT;
const mod = (a, n) => ((a % n) + n) % n;

// 4x4 ordered dither, in fat-pixel space
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

const STREAK_W = STREAKS[0].length;
const STREAK_H = STREAKS.length;

// a rotated frame facing either way: mirroring a frame for heading a
// gives heading PI - a, so pick the source frame to land on `ang`
const facingFrame = (frames, ang, facing) =>
  facing > 0 ? frames[frameOf(ang)] : mirrored(frames[frameOf(Math.PI - ang)]);

const blitSprite = (vic, grid, cx, cy, flip) => {
  vic.sprite(grid, Math.round(cx) - S / 2 + (flip ? 1 : 0), Math.round(cy) - S / 2, COLORS);
};

// effect sprites go on the bitmap layer
const blitFx = (vic, grid, x, y, flip) => {
  const w = grid[0].length;
  for (let j = 0; j < grid.length; j += 1) {
    const row = grid[j];
    for (let i = 0; i < w; i += 1) {
      const ch = row[flip ? w - 1 - i : i];
      if (ch !== '.') vic.pset(x + i, y + j, FX_COLORS[+ch - 1]);
    }
  }
};

export function drawSurf(vic, g) {
  const { wave } = g;
  vic.border = C.LIGHTBLUE;
  vic.bg = C.BLUE;
  vic.clear(C.CYAN);

  const camX = Math.floor(g.camX);
  const wf = Math.floor(g.anim * 8); // water frame
  const ff = Math.floor(g.anim * 10); // foam frame
  const curl = wave.p.curl;
  const bmp = vic.bmp;

  // ---- sky: a couple of flat cloud streaks, then the horizon ----
  for (const [cx, cy, len] of [[20, 26, 18], [96, 34, 26], [140, 22, 10]]) {
    const x0 = mod(cx - Math.floor(g.anim * 0.6) - Math.floor(camX * 0.05), W + 40) - 20;
    vic.rect(x0, cy, len, 1, C.WHITE);
    vic.rect(x0 + 3, cy - 1, len - 8, 1, C.WHITE);
  }

  const farShift = Math.floor(camX * 0.25) + (wf >> 2);
  const chopShift = Math.floor(camX * 1.15) + wf;
  const foamTile = FOAM[(ff >> 2) % 2];

  for (let x = 0; x < W; x += 1) {
    const X = camX + x;
    const d = X - wave.breakX;
    const faceH = wave.faceH(d);
    const lip = Math.round(TROUGH - faceH);

    // ---- far sea above the wave ----
    vic.pset(x, HORIZON, C.BLUE);
    vic.pset(x, HORIZON + 1, C.BLUE);
    for (let y = HORIZON + 2; y < lip; y += 1) {
      const row = FAR_SEA[(y - HORIZON) % 8];
      const c = row[mod(x + farShift + ((y * 5) & 7), row.length)];
      bmp[y * W + x] = c;
    }

    if (d < 0) {
      // ---- whitewater: the broken wave rolling behind the peak ----
      // a tumbling mound: tallest right behind the peak, slumping away
      const slump = Math.min(1, -d / 90);
      const top = Math.round(
        TROUGH - wave.faceH(0) * (0.92 - 0.55 * slump)
        + FOAM_EDGE[mod(X + (ff >> 1), FOAM_EDGE.length)] * 2,
      );
      for (let y = HORIZON + 2; y < top; y += 1) {
        const row = FAR_SEA[(y - HORIZON) % 8];
        bmp[y * W + x] = row[mod(x + farShift + ((y * 5) & 7), row.length)];
      }
      for (let y = top; y < H - 10; y += 1) {
        const row = foamTile[mod(y + ff, 16)];
        let c = row[mod(X + ff * 3, 16)];
        // the foam thins into blue near the bottom of the pile
        if (y > TROUGH && BAYER[((y & 3) << 2) | (x & 3)] < (y - TROUGH) / 12) c = C.LIGHTBLUE;
        bmp[y * W + x] = c;
      }
      continue;
    }

    // ---- wave face ----
    const pocketDark = 0.3 * Math.exp(-d / 26);
    for (let y = Math.max(lip, HORIZON + 2); y < TROUGH; y += 1) {
      const u = TROUGH - y;
      const f = u / faceH;
      const shade = f - pocketDark;
      const b = BAYER[((y & 3) << 2) | (x & 3)];
      let c;
      if (y <= lip + 1) {
        c = (X + (wf >> 1) + y) & 3 ? C.WHITE : C.CYAN; // crest line
      } else if (shade > 0.94) {
        c = b < (shade - 0.94) / 0.06 ? C.WHITE : C.CYAN;
      } else if (shade > 0.74) {
        c = b < (shade - 0.74) / 0.2 ? C.CYAN : C.LIGHTBLUE;
      } else if (shade > 0.3) {
        c = b < (shade - 0.3) / 0.44 ? C.LIGHTBLUE : C.BLUE;
      } else {
        c = C.BLUE;
      }
      // ripple streaks climb the face as the swell moves through
      const sr = STREAKS[mod(u + (wf >> 1), STREAK_H)];
      if (sr[mod(X - (wf >> 2), STREAK_W)]) {
        c = shade > 0.74 ? C.WHITE : shade > 0.3 ? C.CYAN : C.LIGHTBLUE;
      }
      bmp[y * W + x] = c;
    }

    // ---- the curl: the lip pitching forward just ahead of the break ----
    // A white hook of lip over a dark hollow, closing down to the
    // falling sheet right at the break.
    const tube = curl + 10; // drawn hollow matches the X2 scoring zone
    if (d < tube) {
      const k = 1 - d / tube;
      const hook = Math.round(lip - 6 * Math.sin(k * Math.PI));
      const bottom = Math.round(lip + faceH * 0.85 * k ** 1.4);
      for (let y = Math.max(hook, HORIZON + 2); y <= bottom; y += 1) {
        let c;
        if (y < hook + 3) c = (X + ff + y) & 3 ? C.WHITE : C.CYAN; // the lip
        else if (y >= bottom - 1) c = (X + ff + y) & 1 ? C.WHITE : C.CYAN; // fringe
        else if (d < 3) c = CURTAIN[mod(y - ff * 2, 8)][mod(X, 8)]; // falling sheet
        else {
          // inside the tube: deep shadow, the odd light streak
          const sh = CURTAIN[mod(y - ff, 8)][mod(X * 3, 8)];
          c = sh === C.WHITE && (y & 1) ? C.LIGHTBLUE : C.BLUE;
        }
        bmp[y * W + x] = c;
      }
    }

    // ---- lip spray feathering off the crest near the peak ----
    if (d < curl + 22) {
      const hgt = 3 - Math.floor((d / (curl + 22)) * 3);
      for (let y = lip - hgt; y < lip; y += 1) {
        const c = foamTile[mod(y + ff, 16)][mod(X + ff, 16)];
        if (c === C.WHITE && y > HORIZON + 1) bmp[y * W + x] = c;
      }
    }

    // ---- foreground chop, foamy in front of the break ----
    const foamy = Math.max(0, 1 - d / (curl + 34));
    for (let y = TROUGH; y < H - 10; y += 1) {
      let c = CHOP[(y - TROUGH) % CHOP.length][mod(x + chopShift, 32)];
      if (foamy > 0 && BAYER[((y & 3) << 2) | (x & 3)] < foamy) {
        c = foamTile[mod(y + ff, 16)][mod(X + ff * 3, 16)];
      }
      bmp[y * W + x] = c;
    }
  }

  // ---- wake and spray, bitmap layer ----
  for (const m of g.trail) {
    const grid = FX.trail[Math.min(FX.trail.length - 1, Math.floor(m.t * 6))];
    blitFx(vic, grid, Math.round(m.X - camX) - 2, Math.round(m.y), false);
  }
  for (const e of g.fx) {
    const frames = FX[e.kind];
    const i = Math.floor(e.t * 12);
    if (i >= frames.length) continue;
    blitFx(vic, frames[i], Math.round(e.X - camX), Math.round(e.y), e.flip);
  }

  // ---- surfer / wipeout, sprite layer ----
  const st = g.state;
  if (g.wipe) {
    const { rider, board, waterY } = g.wipe;
    const bx = board.X - camX;
    if (board.floating) {
      const bob = Math.floor(g.anim * 4) % 2;
      blitSprite(vic, BOARD_ROT[frameOf(board.rot)], bx, waterY + bob, false);
    } else {
      blitSprite(vic, BOARD_ROT[frameOf(board.rot)], bx, board.y, false);
    }
    if (!rider.sunk) {
      blitSprite(vic, FALL_ROT[frameOf(rider.rot)], rider.X - camX, rider.y, false);
    } else if (st === 'Recovering') {
      const bob = Math.floor(g.anim * 6) % 2;
      vic.sprite(SWIM, Math.round(rider.X - camX) - S / 2, waterY - S / 2 - 1 + bob, COLORS);
    }
  } else {
    const frames = POSES[g.pose];
    const sx = g.X - camX;
    const sy = st === 'Airborne' || st === 'LosingBalance' ? g.y - 1 : TROUGH - g.u - 1;
    const flip = g.drawFacing < 0;
    blitSprite(vic, facingFrame(frames, g.drawAng, g.drawFacing), sx, sy, flip);
  }

  // ---- popups ----
  if (g.popup) {
    const t = g.popup.text;
    vic.text(t, Math.round(W / 2 - vic.textWidth(t) / 2), 22, C.BLUE);
  }

  // ---- CASIO HUD, as on the BMX screen ----
  const secs = Math.max(0, SESSION - g.t);
  const clock = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  vic.hudBox('CASIO', W / 2 - 24);
  // last ten seconds: the display blinks
  if (secs > 10 || Math.floor(g.anim * 3) % 2 === 0) vic.hudBox(clock, W / 2 + 20);

  vic.orect(0, H - 10, W, 10, C.BLACK);
  vic.text(`SPD ${Math.round(g.s)}`, 3, H - 8, C.YELLOW);
  const d = g.X - wave.breakX;
  const mult = d < 0 ? '' : d < curl + 10 ? 'X2' : d < 52 ? 'X1.5' : '';
  if (mult && !g.wipe && st !== 'Entering') vic.text(mult, W / 2 - vic.textWidth(mult) / 2, H - 8, C.LIGHTGREEN);
  const sc = `${Math.round(g.score)}`;
  vic.text(sc, W - vic.textWidth(sc) - 3, H - 8, C.YELLOW);
}
