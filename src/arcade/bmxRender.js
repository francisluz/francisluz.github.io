import { W, H, C } from './engine.js';
import { CANYON_FLOOR, groundRow, holeAt, canyonTopRow } from './bmxTrack.js';

const mod = (n, d) => ((n % d) + d) % d;
const RIDGE = [2, 2, 3, 4, 4, 6, 5, 7, 6, 5, 4, 4, 3, 2, 3, 3, 4, 5, 5, 4, 3, 2, 2, 1, 2, 4, 5, 5, 6, 4, 3, 3];
const SAND = [
  '................', '...x............', '..........x.....', '................',
  '.x..............', '.......x......x.', '................', '....x.......x...',
];
const ROCK = ['...bb....', '..booob..', 'bboooobbb', '.bbbbbb..'];
const SCRUB = ['..g..g..', '...gg...', '.gggggg.', '...bb...'];
const DECOR = { b: C.BROWN, o: C.ORANGE, g: C.GREEN };

function stamp(vic, rows, x, y) {
  rows.forEach((row, j) => [...row].forEach((c, i) => {
    if (c !== '.') vic.pset(x + i, y + j, DECOR[c]);
  }));
}

function cactus(vic, x, y, h) {
  vic.rect(x + 1, y - h, 2, h, C.BLACK);
  vic.rect(x, y - h, 2, h - 1, C.GREEN);
  vic.rect(x - 3, y - h + 7, 4, 2, C.GREEN);
  vic.rect(x - 3, y - h + 3, 1, 5, C.GREEN);
  vic.rect(x + 2, y - h + 11, 4, 2, C.BLACK);
  vic.rect(x + 2, y - h + 10, 3, 2, C.GREEN);
  vic.rect(x + 4, y - h + 5, 1, 6, C.GREEN);
  vic.rect(x - 2, y, 6, 1, C.BLACK);
  // Reserve the cactus silhouette's colors before remapping nearby sand.
  for (let cy = Math.floor((y - h) / 8); cy <= Math.floor(y / 8); cy += 1) {
    for (let cx = Math.floor((x - 3) / 4); cx <= Math.floor((x + 5) / 4); cx += 1) {
      vic.setCellPalette(cx, cy, [C.YELLOW, C.GREEN, C.BLACK]);
    }
  }
}

// The wheel-contact height runs through the road, ten rows below its
// back edge. Its front edge and wall are scenery, never collision data.
export function drawBmxLandscape(vic, camX, oy) {
  const camXi = Math.floor(camX);
  const horizon = 29 + Math.round(oy * 0.2);
  vic.rect(0, horizon, W, H - horizon, C.YELLOW);

  for (let x = 0; x < W; x += 1) {
    const rx = x + Math.floor(camX * 0.2);
    const ridge = RIDGE[mod(rx, RIDGE.length)];
    vic.col(x, horizon - ridge, horizon, C.DARKGREY);
    if (ridge > 3) vic.col(x, horizon - ridge + 2, horizon - 1, C.BROWN);
    if (mod(rx, 5) === 0) vic.pset(x, horizon - 2, C.ORANGE);
    const back = (holeAt(camXi + x) ? canyonTopRow(camXi + x) : groundRow(camXi + x)) + oy - 10;
    for (let y = horizon + 22; y < back; y += 1) {
      const tx = mod(x + Math.floor(camX * 0.65) + Math.floor(y / 8) * 5, 16);
      const ty = mod(y, 8);
      if (SAND[ty][tx] === 'x' && (y > horizon + 46 || (tx & 3) === 0)) {
        vic.pset(x, y, C.BROWN);
      }
      if (y > horizon + 56 && SAND[mod(y + 3, 8)][mod(tx + 7, 16)] === 'x') {
        vic.pset(x, y, C.LIGHTGREY);
      }
    }
  }

  const scroll = Math.floor(camX * 0.65);
  const first = Math.floor(scroll / 25) - 1;
  for (let k = first; k < first + 10; k += 1) {
    const x = k * 25 - scroll + mod(k * 7, 11);
    const y = horizon + 35 + mod(k * 19, 53);
    const ground = (holeAt(camXi + x) ? canyonTopRow(camXi + x) : groundRow(camXi + x)) + oy;
    if (y + 6 < ground - 10) stamp(vic, mod(k, 4) === 0 ? SCRUB : ROCK, x, y);
  }
  const cactusScroll = Math.floor(camX * 0.55);
  const start = Math.floor(cactusScroll / 72) - 1;
  for (let k = start; k < start + 5; k += 1) {
    const x = k * 72 - cactusScroll + 24;
    const y = horizon + 65 + mod(k * 13, 34);
    const ground = (holeAt(camXi + x) ? canyonTopRow(camXi + x) : groundRow(camXi + x)) + oy;
    if (y < ground - 12) cactus(vic, x, y, 22 + mod(k * 5, 9));
  }

  for (let x = 0; x < W; x += 1) {
    const wx = camXi + x;
    if (holeAt(wx)) {
      const top = canyonTopRow(wx) + oy - 10;
      vic.col(x, top, H, C.DARKGREY);
      if (mod(wx, 4) === 0) vic.col(x, top + 3, H, C.BROWN);
      vic.col(x, CANYON_FLOOR + oy, H, C.BLACK);
      continue;
    }
    const gy = groundRow(wx) + oy;
    const back = gy - 10;
    const front = gy + 26;
    const stripe = mod(wx, 4);
    const steep = groundRow(wx + 2) - groundRow(wx - 2) > 3;
    vic.col(x, back, front, steep ? C.BROWN : C.ORANGE);
    vic.pset(x, back, C.DARKGREY);
    // Short posts mark the back edge; the long stripes belong to the wall.
    if (stripe === 0) vic.col(x, back + 1, back + 5, C.BROWN);
    for (let y = back + 8; y < front - 2; y += 1) {
      if (SAND[mod(y - gy, 8)][mod(wx, 16)] === 'x') vic.pset(x, y, C.BROWN);
    }
    vic.pset(x, front, C.DARKGREY);
    vic.col(x, front + 1, H, stripe === 0 ? C.DARKGREY : stripe === 1 ? C.BROWN : C.ORANGE);
    if (holeAt(wx - 1) || holeAt(wx + 1)) vic.col(x, back, H, C.DARKGREY);
  }
}
