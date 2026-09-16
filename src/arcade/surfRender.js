// Draws the surf screen from the wave model. Artwork follows the model;
// the model never looks at the artwork.
//
// Four bitmap colors cover sky, sea, wave and effects. The surfer is
// composited separately. Water and foam use discrete animation frames.

import { W, H, C } from './engine.js';
import { HORIZON, TROUGH, SESSION } from './surfWave.js';
import {
  S, N_ROT, COLORS, POSES, BOARD_ROT, FALL_ROT, SWIM, mirrored,
  FX, FX_COLORS, FOAM_MASS, FACE_TILES, FACE_BANDS, CURTAIN, FAR_SEA, CHOP, FOAM_EDGE,
} from './surfSprites.js';

const TAU = Math.PI * 2;
const frameOf = (ang) => ((Math.round((ang / TAU) * N_ROT) % N_ROT) + N_ROT) % N_ROT;
const mod = (a, n) => ((a % n) + n) % n;

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
  // Keeping cyan as the VIC background lets every ocean cell use the same
  // three bitmap colours: blue, light blue and white. This avoids the
  // colour-clash remapper turning a clean face into stippled noise.
  vic.bg = C.CYAN;
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
  const massTile = FOAM_MASS[(ff >> 3) % FOAM_MASS.length];
  const faceTile = FACE_TILES[(wf >> 2) % FACE_TILES.length];
  const faceBands = FACE_BANDS[(wf >> 3) % FACE_BANDS.length];

  // One flat ocean field gives the hand-authored shapes a firm silhouette.
  vic.rect(0, HORIZON, W, H - 10 - HORIZON, C.BLUE);

  for (let x = 0; x < W; x += 1) {
    const X = camX + x;
    const d = X - wave.breakX;
    const faceH = wave.faceH(d);
    const lip = Math.round(TROUGH - faceH);

    // ---- distant sea: a few horizontal marks above the swell ----
    for (let y = HORIZON; y < Math.max(HORIZON, lip); y += 1) {
      const row = FAR_SEA[mod(y - HORIZON + (wf >> 2), FAR_SEA.length)];
      const c = row[mod(x + farShift + y * 3, row.length)];
      if (c !== C.BLUE) bmp[y * W + x] = c;
    }

    if (d < 0) {
      // ---- the breaking shoulder on the LEFT ----
      // The top follows the same face height as the model, then slumps away
      // from the break. The foam block is deepest at the pitching pocket.
      const slump = Math.min(1, -d / 96);
      const top = Math.round(
        TROUGH - wave.faceH(0) + 26 * slump
        + FOAM_EDGE[mod(X + (ff >> 1), FOAM_EDGE.length)],
      );
      const end = Math.min(TROUGH + 18, H - 10);
      for (let y = top; y < end; y += 1) {
        const mass = massTile[mod(y - top + ff, massTile.length)];
        const c = mass[mod(X + Math.floor((y - top) / 8) + (ff >> 1), mass.length)];
        if (c !== C.BLUE) bmp[y * W + x] = c;
      }

      // A bright diagonal lip sweeps into the break and closes over the
      // dark pocket. It is an authored curve, not a dithered gradient.
      if (d > -42) {
        const q = (d + 42) / 42;
        const arc = Math.round(top - 3 - 7 * Math.sin(q * Math.PI));
        for (let k = -1; k <= 1; k += 1) {
          const yy = arc + k;
          if (yy > HORIZON + 1 && yy < end) bmp[yy * W + x] = k === 0 ? C.WHITE : C.CYAN;
        }
      }

      // The lower foam front curls upward as it approaches the break.
      if (d > -54) {
        const q = (d + 54) / 54;
        const front = Math.round(TROUGH + 18 - 36 * q);
        for (let k = -1; k <= 1; k += 1) {
          const yy = front + k;
          if (yy > top && yy < H - 10) bmp[yy * W + x] = k === 0 ? C.WHITE : C.CYAN;
        }
      }

      // Blue tube under the overhang: this narrow hollow gives the
      // breaking mass its readable California Games curl.
      if (d > -12) {
        const q = (d + 12) / 12;
        const opening = Math.sqrt(1 - (1 - q) ** 2);
        const tubeTop = Math.round(top + 34 - 20 * opening);
        const tubeBottom = Math.round(top + 34 + 20 * opening);
        for (let y = tubeTop; y < tubeBottom; y += 1) bmp[y * W + x] = C.BLUE;
        if (tubeTop > top && tubeTop < end) bmp[tubeTop * W + x] = C.WHITE;
      }
      continue;
    }

    // ---- clean playable face on the RIGHT ----
    const faceTop = Math.max(lip, HORIZON + 2);
    for (let y = faceTop; y < TROUGH; y += 1) {
      const row = faceTile[mod(y - faceTop + (wf >> 2), faceTile.length)];
      const c = row[mod(x + farShift + y * 2, row.length)];
      if (c !== C.BLUE) bmp[y * W + x] = c;

      const band = faceBands[mod(y - faceTop + (wf >> 2), faceBands.length)];
      const bc = band[mod(x + (y - faceTop) * 2, band.length)];
      if (y < faceTop + 16) {
        bmp[y * W + x] = bc === C.BLUE ? C.LIGHTBLUE : C.CYAN;
      } else if (y < faceTop + 32 && bc !== C.BLUE) {
        bmp[y * W + x] = C.LIGHTBLUE;
      }
    }

    // A continuous crest is the visual boundary of the playable face.
    for (let k = -1; k <= 1; k += 1) {
      const yy = lip + k;
      if (yy > HORIZON + 1 && yy < TROUGH) bmp[yy * W + x] = k === 0 ? C.WHITE : C.CYAN;
    }

    // Curved, bright lip and a dark pocket directly beneath it. Both are
    // anchored to wave.faceH(), so the art follows the physical surface.
    const tube = curl + 18;
    if (d < tube) {
      const q = Math.max(0, Math.min(1, d / tube));
      const arc = Math.round(lip - 5 * Math.sin(q * Math.PI));
      for (let k = -1; k <= 2; k += 1) {
        const yy = arc + k;
        if (yy > HORIZON + 1 && yy < TROUGH) bmp[yy * W + x] = k < 1 ? C.WHITE : C.CYAN;
      }
      const pocketDepth = Math.round(8 + 17 * (1 - q));
      for (let y = arc + 3; y < Math.min(TROUGH, arc + pocketDepth); y += 1) {
        const sh = CURTAIN[mod(y - arc + ff, CURTAIN.length)][mod(X + ff, 8)];
        bmp[y * W + x] = sh === C.WHITE || sh === C.CYAN ? C.LIGHTBLUE : C.BLUE;
      }
    }

    // ---- restrained foreground chop ----
    for (let y = TROUGH; y < H - 10; y += 1) {
      const c = CHOP[mod(y - TROUGH + ff, CHOP.length)][mod(x + chopShift, 32)];
      if (c !== C.BLUE) bmp[y * W + x] = c;
    }
  }

  // Set the explicit three-colour bitmap palette before the engine's final
  // constraint pass. Cyan is the background, leaving blue/light-blue/white.
  for (let cy = 0; cy < H / 8; cy += 1) {
    for (let cx = 0; cx < W / 4; cx += 1) {
      vic.setCellPalette(cx, cy, [C.BLUE, C.LIGHTBLUE, C.WHITE]);
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
