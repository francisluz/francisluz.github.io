// The BMX course: hand-authored modular segments compiled into a
// terrain heightfield (rows above BASE, one entry per world fat px).
// Physics reads the heightfield, never the drawn pixels. Ramps are
// quantised into 3-px stair blocks so every slope is visibly
// pixel-stepped, never a smooth curve.

export const BASE = 150; // ground row at height 0
export const CANYON_FLOOR = 184;
export const HOLE = -9999;

// ------------------------------------------------- hand-authored course
// Section 1 teaches momentum, section 2 introduces jumping, section 3
// demands speed and clean landings.
const COURSE = [
  // --- opening third: momentum ---
  { t: 'flat', len: 200 },
  { t: 'roll', len: 200, amp: 5, wl: 50 },
  { t: 'flat', len: 60 },
  { t: 'up', len: 170, rise: 24 },
  { t: 'down', len: 130, drop: 28 },
  { t: 'flat', len: 90 },
  { t: 'roll', len: 180, amp: 8, wl: 60 },
  { t: 'up', len: 150, rise: 24 },
  { t: 'down', len: 170, drop: 30 },
  { t: 'flat', len: 70 },

  // --- middle third: jumping ---
  { t: 'kick', len: 32, h: 13 }, // first kicker, lands back at grade
  { t: 'down', len: 70, drop: 8 },
  { t: 'flat', len: 110 },
  { t: 'roll', len: 150, amp: 7, wl: 60 },
  { t: 'up', len: 120, rise: 22 },
  { t: 'table', up: 22, top: 44, down: 22, h: 12 }, // first tabletop
  { t: 'flat', len: 90 },
  { t: 'down', len: 120, drop: 18 },
  { t: 'up', len: 220, rise: 56 }, // long climb to the elevated deck
  { t: 'flat', len: 110 },
  { t: 'kick', len: 30, h: 12 }, // big jump off the platform...
  { t: 'gap', len: 40 }, // ...over a gap
  { t: 'flat', len: 60 },
  { t: 'down', len: 240, drop: 50 }, // long downhill payoff
  { t: 'roll', len: 170, amp: 6, wl: 46 },

  // --- final third: speed and accurate landings ---
  { t: 'flat', len: 50 },
  { t: 'table', up: 24, top: 56, down: 24, h: 16 }, // steep tabletop
  { t: 'flat', len: 90 },
  { t: 'roll', len: 140, amp: 7, wl: 44 },
  { t: 'up', len: 90, rise: 16 },
  { t: 'gap', len: 34 }, // the canyon jump
  { t: 'flat', len: 70 },
  { t: 'down', len: 110, drop: 16 },
  { t: 'kick', len: 28, h: 11 }, // last kicker
  { t: 'down', len: 80, drop: 10 },
  { t: 'roll', len: 160, amp: 5, wl: 40 },
  { t: 'flat', len: 200 }, // final sprint
];

const hs = [];
{
  let h = 0;
  // ramps sampled at 3-px block starts -> chunky stair-stepped slopes
  const push = (n, f) => {
    for (let i = 0; i < n; i += 1) {
      hs.push(f ? Math.round(f(Math.floor(i / 3) * 3)) : h);
    }
  };
  for (const s of COURSE) {
    const h0 = h;
    switch (s.t) {
      case 'flat':
        push(s.len, null);
        break;
      case 'up':
        push(s.len, (i) => h0 + (s.rise * i) / s.len);
        h = h0 + s.rise;
        break;
      case 'down':
        push(s.len, (i) => h0 - (s.drop * i) / s.len);
        h = h0 - s.drop;
        break;
      case 'roll':
        push(s.len, (i) => h0 + s.amp * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / s.wl)));
        break;
      case 'kick':
        // curved ramp to a lip; height snaps back after, leaving a cliff
        push(s.len, (i) => h0 + s.h * ((i / s.len) ** 1.5));
        break;
      case 'table': {
        push(s.up, (i) => h0 + (s.h * i) / s.up);
        h = h0 + s.h;
        push(s.top, null);
        const h1 = h;
        push(s.down, (i) => h1 - (s.h * i) / s.down);
        h = h0;
        break;
      }
      case 'gap':
        for (let i = 0; i < s.len; i += 1) hs.push(HOLE);
        break;
      default:
        break;
    }
  }
  for (let i = 0; i < 400; i += 1) hs.push(h); // run-out past the finish
}

export const LEN = hs.length;
export const FINISH_X = LEN - 320;

export const heightAt = (wx) => {
  const i = Math.max(0, Math.min(LEN - 1, Math.round(wx)));
  return hs[i];
};

export const holeAt = (wx) => heightAt(wx) === HOLE;

// For every gap column, the row where the canyon opening begins: the
// lower of the two ledges, so no canyon pixel is ever drawn above solid
// ground on either side. Precomputed once.
const canyonTop = new Int16Array(LEN);
for (let i = 0; i < LEN; i += 1) {
  if (hs[i] !== HOLE) continue;
  let l = i;
  while (l > 0 && hs[l] === HOLE) l -= 1;
  let r = i;
  while (r < LEN - 1 && hs[r] === HOLE) r += 1;
  canyonTop[i] = Math.max(BASE - hs[l], BASE - hs[r]);
}

export const canyonTopRow = (wx) =>
  canyonTop[Math.max(0, Math.min(LEN - 1, Math.round(wx)))];

// ground row for physics: canyon floor inside gaps
export const groundRow = (wx) => {
  const h = heightAt(wx);
  return h === HOLE ? CANYON_FLOOR : BASE - h;
};

// first x at/after wx with a comfortable run of solid ground (respawns)
export const solidAfter = (wx) => {
  let x = Math.max(0, Math.round(wx));
  let run = 0;
  while (x < LEN - 1 && run < 36) {
    run = holeAt(x) ? 0 : run + 1;
    x += 1;
  }
  return x - run + 6;
};
