// Surfer, board and water-effect sprites, composed once at load.
//
// Poses are joint skeletons drawn into a fat-pixel grid, then
// pre-rotated in 15° steps (like the BMX rider). The game only blits
// whole frames: no tweening, no smooth rotation. Every pose keeps the
// board centre at the grid centre, so swapping poses never makes the
// rider jump.
//
// Scale: the board is 21 fat px (42 hires) long and the rider stands
// about 30 rows tall — small against the ocean, like the original.

import { C, rotationFrames } from './engine.js';
import { mk, px, line, ellipse, toStrings, mirror } from './pixelArt.js';

export const S = 64;
export const N_ROT = 24;
const CX = S / 2;
const CY = S / 2; // board centre row; the rail sits one row below

// 1=hair/trunks, 2=lit skin, 3=board deck, 4=rail stripe, 5=shaded skin
export const COLORS = [C.BLACK, C.LIGHTRED, C.YELLOW, C.RED, C.ORANGE];
const K = 1, SK = 2, Y = 3, R = 4, SH = 5;

const board = (g) => {
  line(g, CX - 9, CY - 1, CX + 8, CY - 1, Y);
  line(g, CX - 10, CY, CX + 9, CY, Y);
  px(g, CX + 10, CY - 2, Y); // nose rocker
  px(g, CX + 9, CY - 2, Y);
  line(g, CX - 9, CY + 1, CX + 7, CY + 1, R);
};

const at = (p) => [CX + p[0], CY + p[1]];

// joints are offsets from the board centre
const body = (g, j) => {
  const hip = at(j.hip);
  const sh = at(j.sh);
  const head = at(j.head);
  // back arm and back leg sit in shade behind the torso
  line(g, ...sh, ...at(j.be), SH, 2);
  line(g, ...at(j.be), ...at(j.bh), SH, 2);
  line(g, ...hip, ...at(j.bk), SH, 2);
  line(g, ...at(j.bk), ...at(j.bf), SH, 2);
  // torso: chest broader than the waist
  line(g, ...hip, ...sh, SK, 2);
  line(g, (hip[0] + sh[0]) / 2 - 1, (hip[1] + sh[1]) / 2 - 1, sh[0] - 1, sh[1] + 1, SK, 3);
  ellipse(g, hip[0], hip[1], 2, 2, K); // trunks
  line(g, ...hip, ...at(j.fk), SK, 2);
  line(g, ...at(j.fk), ...at(j.ff), SK, 2);
  line(g, hip[0], hip[1], (hip[0] + at(j.fk)[0]) / 2, (hip[1] + at(j.fk)[1]) / 2, K, 2);
  ellipse(g, head[0], head[1], 1, 3, SK);
  px(g, head[0] + 2, head[1], SK); // nose
  // hair: crown and the back of the head, toward the tail of the board
  line(g, head[0] - 1, head[1] - 3, head[0] + 1, head[1] - 3, K);
  line(g, head[0] - 2, head[1] - 2, head[0] + 1, head[1] - 2, K);
  line(g, head[0] - 1, head[1] - 2, head[0] - 1, head[1] + 1, K);
  line(g, ...sh, ...at(j.fe), SK, 2);
  line(g, ...at(j.fe), ...at(j.fh), SK, 2);
};

const FEET = { bf: [-5, -2], ff: [4, -2] };

// facing right, riding left-to-right
const POSE_DEF = {
  ride: { ...FEET, bk: [-2, -8], fk: [5, -8], hip: [0, -13], sh: [1, -21], head: [2, -25], be: [-4, -19], bh: [-8, -17], fe: [5, -19], fh: [9, -18] },
  ride2: { ...FEET, bk: [-2, -8], fk: [5, -8], hip: [0, -13], sh: [1, -21], head: [2, -25], be: [-4, -20], bh: [-8, -20], fe: [5, -18], fh: [9, -16] },
  crouch: { ...FEET, bk: [-2, -6], fk: [6, -6], hip: [0, -10], sh: [2, -17], head: [3, -21], be: [-3, -15], bh: [-7, -13], fe: [5, -14], fh: [8, -11] },
  leanFwd: { ...FEET, bk: [-2, -7], fk: [5, -7], hip: [1, -12], sh: [4, -19], head: [6, -22], be: [0, -16], bh: [-4, -14], fe: [7, -16], fh: [10, -13] },
  leanBack: { ...FEET, bk: [-3, -7], fk: [4, -8], hip: [-1, -12], sh: [-2, -20], head: [-2, -24], be: [-6, -18], bh: [-9, -20], fe: [3, -19], fh: [7, -21] },
  carve: { ...FEET, bk: [-3, -5], fk: [5, -6], hip: [-1, -9], sh: [1, -15], head: [2, -19], be: [-4, -10], bh: [-7, -5], fe: [5, -15], fh: [9, -17] },
  snap: { ...FEET, bk: [-2, -7], fk: [5, -7], hip: [0, -12], sh: [0, -20], head: [0, -24], be: [3, -24], bh: [6, -27], fe: [-3, -23], fh: [-7, -26] },
  air: { ...FEET, bk: [-1, -9], fk: [5, -10], hip: [-1, -12], sh: [1, -19], head: [2, -23], be: [-4, -22], bh: [-7, -25], fe: [5, -22], fh: [8, -25] },
  wobble1: { ...FEET, bk: [-2, -8], fk: [5, -8], hip: [-1, -13], sh: [-3, -20], head: [-4, -24], be: [-6, -24], bh: [-6, -28], fe: [2, -24], fh: [5, -28] },
  wobble2: { ...FEET, bk: [-2, -8], fk: [5, -8], hip: [1, -13], sh: [3, -20], head: [4, -23], be: [0, -15], bh: [-4, -12], fe: [7, -22], fh: [11, -25] },
  popup: { bf: [-5, -2], bk: [-3, -2], ff: [3, -2], fk: [4, -7], hip: [-2, -7], sh: [1, -13], head: [3, -16], be: [0, -7], bh: [0, -2], fe: [2, -7], fh: [2, -2] },
  paddle1: { bf: [-10, -3], bk: [-7, -2], ff: [-10, -2], fk: [-7, -2], hip: [-4, -2], sh: [3, -3], head: [6, -5], be: [5, -1], bh: [5, 3], fe: [4, -1], fh: [3, 3] },
  paddle2: { bf: [-10, -3], bk: [-7, -2], ff: [-10, -2], fk: [-7, -2], hip: [-4, -2], sh: [3, -3], head: [6, -5], be: [1, -1], bh: [-1, 2], fe: [7, -2], fh: [9, 0] },
};

const buildPose = (def) => {
  const g = mk(S);
  board(g);
  body(g, def);
  return rotationFrames(toStrings(g), N_ROT, S);
};

export const POSES = {};
for (const [name, def] of Object.entries(POSE_DEF)) POSES[name] = buildPose(def);

const boardOnly = mk(S);
board(boardOnly);
export const BOARD_ROT = rotationFrames(toStrings(boardOnly), N_ROT, S);

// separated rider, sprawled, pre-rotated for the tumble
const fall = mk(S);
body(fall, {
  hip: [0, 0], sh: [4, -3], head: [7, -5], be: [3, -7], bh: [2, -11], fe: [7, -1], fh: [9, 2],
  bk: [-3, -3], bf: [-6, -5], fk: [-3, 2], ff: [-6, 4],
});
export const FALL_ROT = rotationFrames(toStrings(fall), N_ROT, S);

// head and a waving arm above the foam, centred on the waterline
const swim = mk(S);
ellipse(swim, CX, CY - 2, 1, 3, SK);
line(swim, CX - 1, CY - 5, CX + 1, CY - 5, K);
line(swim, CX - 1, CY - 4, CX - 1, CY - 2, K);
line(swim, CX + 2, CY, CX + 4, CY - 6, SK);
export const SWIM = toStrings(swim);

// mirrored frames for riding right-to-left, built on first use.
// Mirroring maps grid column x to S-1-x, so the centre shifts one fat
// px; the renderer compensates.
const mirrors = new Map();
export const mirrored = (grid) => {
  let m = mirrors.get(grid);
  if (!m) {
    m = mirror(grid);
    mirrors.set(grid, m);
  }
  return m;
};

// ------------------------------------------------------------- effects
// Hand-drawn pixel sprites, 1=white 2=cyan 3=light blue. Each lasts a
// handful of frames; nothing here is a particle emitter.

export const FX_COLORS = [C.WHITE, C.CYAN, C.LIGHTBLUE];

export const FX = {
  // kicked off the tail on a carve, drifts back over the face
  spraySmall: [
    ['..1.....', '.1.12...', '..111...', '...11...'],
    ['.1..2...', '1.1.1.1.', '.1.1.1..', '..1.1...'],
    ['1....2..', '..1...1.', '.2...1..', '2.1.....'],
    ['2.....1.', '.....2..', '1.......', '........'],
  ],
  // top turn / cutback fan
  sprayLarge: [
    ['.....1........', '...1.11..1....', '..11111.1.....', '...11111......', '....111.......'],
    ['..1..1..1.....', '.1.11.1..1.2..', '1.1111.11.....', '..11111.1.....', '...1.11.......', '....1.........'],
    ['.1...2...1....', '1..1..1.2..1..', '.1..1.1..1....', '2.1..1.1......', '..1.1.........', '...2..........'],
    ['2.....2....1..', '..1.......2...', '1....2..1.....', '..2.....1.....', '.1....2.......', '..............'],
  ],
  // board meets water: landing, rider or board hitting the surface
  splash: [
    ['......11......', '....111111....', '...11111111...', '..3111111113..'],
    ['...1..11..1...', '..1.111111.1..', '.1.11111111.1.', '.3.111111111.3', '33311111111333'],
    ['.1....1.....1.', '..1..1.1..1...', '1..1.1.1.1..1.', '..1.11111..1..', '.3311111113...', '33333313333333'],
    ['1...........1.', '...1..2..1....', '.2...1..1...2.', '.....2.2......', '..3.3.2.3.3...', '.3333333333333'],
    ['..............', '..2.......2...', '......2.......', '..............', '...3...3...3..', '..3.3.3.3.3.3.'],
  ],
  // bubbles rising while the rider is under the foam
  bubbles: [
    ['..1...', '.1.1..', '..1..1', '....1.', '.1....', '1.1...'],
    ['....1.', '.1.1.1', '1.1.1.', '.1....', '..1.1.', '.1.1..'],
    ['.1....', '1.1.1.', '.1.1.1', '...1..', '1.....', '......'],
  ],
  // wake mark left on the face behind the board
  trail: [['1111', '.22.'], ['1.12', '.2..'], ['.2.2', '....']],
};

// ------------------------------------------------------------- tiles
// Authored repeating blocks the wave renderer combines. Letters map to
// colours: '.' blue, ':' light blue, 'c' cyan, '#' white.

export const TILE_COLORS = { '.': C.BLUE, ':': C.LIGHTBLUE, c: C.CYAN, '#': C.WHITE };
const toTile = (rows) => rows.map((r) => [...r].map((ch) => TILE_COLORS[ch] ?? -1));

// A restrained face tile: diagonal ribs are the only texture on the
// shoulder. The second frame moves the ribs by one fat pixel.
export const FACE_TILES = [
  toTile([
    '................', '................', '......::........', '.....:::........',
    '....:::.........', '................', '................', '............::..',
    '...........:::..', '..........:::...', '................', '................',
    '....::..........', '...:::..........', '..:::...........', '................',
  ]),
  toTile([
    '................', '.....::.........', '....:::.........', '...:::..........',
    '................', '................', '...........::...', '..........:::...',
    '.........:::....', '................', '................', '...::...........',
    '..:::...........', '.:::............', '................', '................',
  ]),
];

// Long, separated face bands keep the shoulder dimensional without turning
// the rider's line into a field of dots.
export const FACE_BANDS = [
  toTile([
    '................', '................', '.....::::.......', '....::::........',
    '...::::.........', '................', '...........:::..', '..........::::..',
    '.........::::...', '................', '..:::...........', '.::::...........',
    '::::............', '................', '.............::.', '............::::',
  ]),
  toTile([
    '................', '....:::.........', '...::::.........', '..::::..........',
    '................', '..........:::...', '.........::::...', '........::::....',
    '................', '.:::............', '::::............', ':::.............',
    '................', '............:::.', '...........::::.', '..........::::..',
  ]),
];

// Large authored foam masses. Unlike the small spray tile, these fill the
// broken shoulder with broad diagonal sheets and white leading clusters.
export const FOAM_MASS = [
  toTile([
    '##cc..::##cc..::', '###cc..::###c..:', 'c###cc..::###cc.', '.c###cc..::###cc',
    'c.c###cc..::###c', '#c.c###cc..::###', '##c.c###cc..::##', '###c.c###cc..::#',
    'c###c.c###cc..::', ':c###c.c###cc..:', '::c###c.c###cc..', '.::c###c.c###cc.',
    '..::c###c.c###cc', 'c..::c###c.c###c', '#c..::c###c.c###', '##c..::c###c.c##',
  ]),
  toTile([
    'c##cc..::##cc..:', ':c###cc..::###c.', '.:c###cc..::###c', 'c.:c###cc..::###',
    '#c.:c###cc..::##', '##c.:c###cc..::#', '###c.:c###cc..::', 'c###c.:c###cc..:',
    ':c###c.:c###cc..', '.:c###c.:c###cc.', '..:c###c.:c###cc', 'c..:c###c.:c###c',
    '#c..:c###c.:c###', '##c..:c###c.:c##', '###c..:c###c.:c#', 'c###c..:c###c.:c',
  ]),
];

// The pocket is mostly blue. Vertical white/cyan bars and a few light-blue
// steps make the hollow visible without filling the playable face.
export const CURTAIN = toTile([
  '...#....', '...c....', '..:#....', '..:c....',
  '...#....', '...c....', '....:...', '....#...',
]);

// far sea between the horizon and the back of the wave
export const FAR_SEA = toTile([
  '................................',
  '................................',
  '......:::.......................',
  '................................',
  '................................',
  '..................:::...........',
  '................................',
  ':::.............................',
]);

// foreground chop in front of the trough
export const CHOP = toTile([
  '....::..............::..........',
  '...:::.............:::..........',
    '..:::................:::........',
    '................................',
    '........::..............::......',
    '.......:::.............:::......',
]);

// jagged top edge of the whitewater, rows below the foam line
export const FOAM_EDGE = [0, 1, 3, 2, 0, 0, 1, 4, 5, 3, 1, 0, 2, 3, 1, 0, 0, 2, 4, 2, 1, 3, 1, 0];
