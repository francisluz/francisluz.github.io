// BMX on the VIC engine, rebuilt after the California Games C64 event.
//
// - the course is hand-authored modular segments (bmxTrack.js); physics
//   reads the invisible heightfield, never the drawn pixels
// - the bike rides on two wheel contacts; the ground angle comes from
//   rear/front contact heights, so the wheels visibly follow slopes
// - the rider is discrete sprite frames with pre-rendered 15° rotation
//   steps (bmxSprites.js); nothing is tweened
// - the track face below the riding surface is drawn from the terrain
//   height: burnt orange with repeated dark vertical stripes
//
// Controls: RIGHT pedals, LEFT brakes, UP jumps, DOWN wheelies.
// Airborne: LEFT/RIGHT rotate. Land with both wheels on the slope.

import { W, H, C } from './engine.js';
import { drawBmxLandscape } from './bmxRender.js';
import {
  S, N_ROT, AXLE_DX, WHEEL_R, FOOT_Y, COLORS, POSES, BIKE_ROT,
  TUMBLE_ROT, SIT, GETUP,
} from './bmxSprites.js';
import {
  BASE, CANYON_FLOOR, FINISH_X, groundRow, holeAt, solidAfter,
} from './bmxTrack.js';

const PXS = 48; // player screen x (30% of 160)
const WHEELBASE = AXLE_DX * 2; // fat px between axles
const GRAVITY = 300;
const MAX_SPEED = 82;
const PX_PER_M = 4;
const TIME_LIMIT = 150; // the Casio is unforgiving
const TAU = Math.PI * 2;

const norm = (a) => {
  let d = a % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

const frameOf = (ang) => ((Math.round((ang / TAU) * N_ROT) % N_ROT) + N_ROT) % N_ROT;

export function createBmx({ keys, end }) {
  const g = {
    wx: 8, // rear wheel contact x
    speed: 0,
    my: BASE - WHEEL_R, // axle-midpoint row
    vy: 0,
    gv: 0, // vertical rate while grounded (rows/s)
    ang: 0,
    spin: 0,
    air: false,
    started: false,
    t: 0,
    lives: 3,
    tricks: 0,
    wheelieAcc: 0,
    compress: 0,
    pedalPh: 0,
    camY: 0,
    popup: null,
    crash: null,
    dust: [],
    jumpHeld: false,
    lockL: false,
    lockR: false,
    airT: 0,
    over: false,
  };

  const say = (text, ttl = 1.8) => { g.popup = { text, ttl }; };
  say('HOLD RIGHT TO PEDAL', 3);

  const distM = () => Math.round(Math.min(g.wx, FINISH_X) / PX_PER_M);
  const score = () => Math.round(distM() * 2 + g.tricks);

  const puffDust = (x, y, n) => {
    for (let i = 0; i < n; i += 1) {
      g.dust.push({
        x: x + (Math.random() - 0.5) * 4,
        y: y - Math.random() * 2,
        vx: -20 - Math.random() * 20,
        vy: -14 - Math.random() * 22,
        ttl: 0.4 + Math.random() * 0.4,
      });
    }
  };

  const startCrash = (reason) => {
    say(reason, 2.2);
    g.crash = {
      t: 0,
      rx: g.wx + AXLE_DX, ry: g.my + WHEEL_R, rvx: g.speed * 0.55, rvy: Math.min(g.vy, 0) - 50,
      bx: g.wx + AXLE_DX, by: g.my, bvx: g.speed * 1.5 + 14, bvy: Math.min(g.vy, 0) - 70,
      bspin: 0, brest: false,
    };
    puffDust(g.wx + AXLE_DX, g.my + WHEEL_R, 6);
    g.air = false;
    g.spin = 0;
    g.wheelieAcc = 0;
  };

  const finish = (flags) => {
    if (g.over) return;
    g.over = true;
    end({ score: score(), dist: distM(), ...flags });
  };

  const bankWheelie = () => {
    if (g.wheelieAcc >= 10) {
      const pts = Math.round(g.wheelieAcc);
      g.tricks += pts;
      say(`WHEELIE +${pts}`, 1.3);
    }
    g.wheelieAcc = 0;
  };

  // rotated axle offsets while airborne (visual-space rotation, fat x)
  const contacts = () => {
    const cos = Math.cos(g.ang);
    const sin = Math.sin(g.ang);
    const rcx = g.wx + AXLE_DX - AXLE_DX * cos;
    const fcx = g.wx + AXLE_DX + AXLE_DX * cos;
    const rcy = g.my - WHEELBASE * sin + WHEEL_R;
    const fcy = g.my + WHEELBASE * sin + WHEEL_R;
    return { rcx, rcy, fcx, fcy };
  };

  // Ground reference under a pair of wheel contacts. A wheel hanging
  // over a gap must not read the canyon floor as terrain, so the slope
  // is taken from the solid side and extrapolated across the edge.
  // Returns null when nothing solid is under the bike at all.
  const groundRef = (rcx, fcx) => {
    const rHole = holeAt(rcx);
    const fHole = holeAt(fcx);
    if (rHole && fHole) return null;
    let sR = rcx;
    let sF = fcx;
    if (fHole) { sR = rcx - WHEELBASE; sF = rcx; }
    else if (rHole) { sR = fcx; sF = fcx + WHEELBASE; }
    const gyR = groundRow(rHole ? fcx : rcx);
    const gyF = gyR + (groundRow(sF) - groundRow(sR));
    return { gyR, gyF, ang: Math.atan2(gyF - gyR, WHEELBASE * 2) };
  };

  const land = ({ rcx, fcx }) => {
    const ref = groundRef(rcx, fcx);
    if (!ref) {
      startCrash('INTO THE CANYON!');
      return;
    }
    // a wheel can reach solid ground while the bike itself has already
    // sunk past that surface: that is a vertical face, not a landing
    if (g.my + WHEEL_R - Math.min(ref.gyR, ref.gyF) > 10) {
      startCrash('EAT DIRT!');
      return;
    }
    const { gyR, gyF } = ref;
    const target = ref.ang;
    const diff = norm(g.ang - target);
    if (Math.abs(diff) > 0.95 || g.vy > 330) {
      startCrash(diff > 0.4 ? 'OVER THE BARS!' : 'CASED IT!');
      return;
    }
    const flips = Math.floor(Math.abs(g.spin) / TAU);
    if (flips > 0) {
      const pts = flips * 250;
      g.tricks += pts;
      say(`${g.spin < 0 ? 'BACK' : 'FRONT'}FLIP X${flips} +${pts}`, 1.6);
    }
    if (Math.abs(diff) > 0.55 || g.vy > 240) {
      g.speed *= 0.55;
      g.compress = 0.35;
      puffDust(rcx, gyR, 5);
    } else {
      g.compress = 0.18;
      puffDust(rcx, gyR, 2);
    }
    g.air = false;
    g.wx = rcx;
    g.ang = target;
    g.spin = 0;
    g.vy = 0;
    g.my = (gyR + gyF) / 2 - WHEEL_R;
    g.gv = 0;
  };

  const updateCrash = (dt) => {
    const c = g.crash;
    c.t += dt;
    // rider ragdoll
    c.rvy += GRAVITY * dt;
    c.rx += c.rvx * dt;
    c.ry += c.rvy * dt;
    const rg = holeAt(c.rx) ? CANYON_FLOOR : groundRow(c.rx);
    if (c.ry > rg) {
      c.ry = rg;
      c.rvy = 0;
      c.rvx *= 1 - 4 * dt;
      if (c.rvx > 14 && Math.random() < 0.5) puffDust(c.rx, rg, 1);
    }
    // bike tumbles further
    c.bvy += GRAVITY * dt;
    c.bx += c.bvx * dt;
    c.by += c.bvy * dt;
    if (!c.brest) c.bspin += 9 * dt;
    const bg = holeAt(c.bx) ? CANYON_FLOOR : groundRow(c.bx);
    if (c.by > bg - WHEEL_R) {
      c.by = bg - WHEEL_R;
      if (Math.abs(c.bvy) > 55) {
        c.bvy = -c.bvy * 0.4;
        c.bvx *= 0.65;
        puffDust(c.bx, bg, 3);
      } else {
        c.bvy = 0;
        c.bvx *= 1 - 5 * dt;
        c.brest = true;
      }
    }
    if (c.t > 3.0) {
      g.lives -= 1;
      g.crash = null;
      if (g.lives <= 0) {
        finish({ wiped: true });
        return;
      }
      g.wx = solidAfter(c.rx);
      g.speed = 10;
      g.vy = 0;
      g.ang = 0;
      g.air = false;
      g.my = groundRow(g.wx + AXLE_DX) - WHEEL_R;
    }
  };

  const update = (dt) => {
    if (g.over) return;
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;
    for (const d of g.dust) {
      d.ttl -= dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vy += 60 * dt;
    }
    g.dust = g.dust.filter((d) => d.ttl > 0);

    if (g.started) g.t += dt;
    if (g.t > TIME_LIMIT) {
      finish({ timeup: true });
      return;
    }

    if (g.crash) {
      updateCrash(dt);
      return;
    }

    const pedal = keys.has('ArrowRight');
    const brake = keys.has('ArrowLeft');
    const jump = keys.has('ArrowUp') || keys.has(' ');
    const down = keys.has('ArrowDown');

    if (!g.air) {
      // ---- grounded ----
      const ref0 = groundRef(g.wx, g.wx + WHEELBASE);
      const slope0 = ref0 ? (ref0.gyF - ref0.gyR) / (WHEELBASE * 2) : 0;
      let acc = -4 - g.speed * 0.14 + slope0 * 75;
      if (pedal) acc += 30;
      if (brake) acc -= 85;
      g.speed = Math.max(0, Math.min(MAX_SPEED, g.speed + acc * dt));
      if (!g.started && g.speed > 2) g.started = true;
      g.wx += g.speed * dt;
      if (pedal) g.pedalPh += g.speed * dt * 0.16;
      if (g.compress > 0) g.compress -= dt;

      const takeOff = (vy) => {
        g.air = true;
        g.airT = 0;
        g.vy = vy;
        g.spin = 0;
        g.lockL = brake;
        g.lockR = pedal;
      };

      const ref = groundRef(g.wx, g.wx + WHEELBASE);
      const newMy = ref ? (ref.gyR + ref.gyF) / 2 - WHEEL_R : 0;

      if (down && g.speed > 18 && ref) g.wheelieAcc += 26 * dt;
      else bankWheelie();

      if (ref && jump && !g.jumpHeld && g.speed > 6) {
        // pressed on solid ground, including right on a ramp's lip
        takeOff(-(100 + g.speed * 0.55));
      } else if (!ref || newMy - g.my > 7) {
        // ground fell away: carry the lip's own vertical momentum
        takeOff(Math.max(-220, Math.min(60, g.gv * 1.3)));
      } else {
        g.gv = (newMy - g.my) / Math.max(dt, 1e-4);
        g.my = newMy;
        g.ang = ref.ang;
      }
      g.jumpHeld = jump;
    } else {
      // ---- airborne ----
      g.speed = Math.max(0, g.speed - g.speed * 0.06 * dt);
      g.wx += g.speed * dt;
      g.vy += GRAVITY * dt;
      g.my += g.vy * dt;
      // keys still held from before takeoff don't rotate until released
      if (!brake) g.lockL = false;
      if (!pedal) g.lockR = false;
      const rot = 7.0 * dt;
      if (brake && !g.lockL) { g.ang -= rot; g.spin -= rot; }
      if (pedal && !g.lockR) { g.ang += rot; g.spin += rot; }
      g.jumpHeld = jump;

      g.airT += dt;
      const cts = contacts();
      const gr = holeAt(cts.rcx) ? CANYON_FLOOR : groundRow(cts.rcx);
      const gf = holeAt(cts.fcx) ? CANYON_FLOOR : groundRow(cts.fcx);
      if (g.airT > 0.12 && g.vy > 0 && (cts.rcy >= gr || cts.fcy >= gf)) {
        land(cts);
        if (g.crash || g.over) return;
      }
    }

    if (g.wx >= FINISH_X) {
      g.tricks += Math.max(0, Math.round((TIME_LIMIT - g.t) * 4)); // time bonus
      finish({ finished: true });
      return;
    }

    // camera: horizontal always, vertical only for big airs
    const targetY = Math.max(-52, Math.min(0, g.my - 88));
    g.camY += (targetY - g.camY) * Math.min(1, 5 * dt);
  };

  // ------------------------------------------------------------- drawing

  const draw = (vic) => {
    vic.border = C.LIGHTBLUE;
    vic.bg = C.ORANGE;
    vic.clear(C.LIGHTBLUE);

    const camX = g.wx - PXS;
    const camXi = Math.floor(camX);
    const oy = Math.round(-g.camY);
    drawBmxLandscape(vic, camX, oy);

    // ---- finish banner ----
    const fx = FINISH_X - camXi;
    if (fx > -34 && fx < W + 34) {
      const gy = groundRow(FINISH_X) + oy;
      const top = gy - 40;
      vic.rect(fx - 13, top, 2, 40, C.WHITE); // posts
      vic.rect(fx + 13, top, 2, 40, C.WHITE);
      vic.rect(fx - 13, top, 28, 1, C.BLACK);
      // checkered banner, 2x2 blocks so the pattern survives at this size
      for (let cy = 0; cy < 4; cy += 1) {
        for (let cx = 0; cx < 12; cx += 1) {
          vic.rect(fx - 11 + cx * 2, top + 1 + cy * 2, 2, 2,
            (cx + cy) % 2 ? C.BLACK : C.WHITE);
        }
      }
    }

    // ---- dust ----
    for (const d of g.dust) vic.pset(d.x - camX, d.y + oy, C.LIGHTGREY);

    // ---- rider / crash sprites (hardware-sprite layer) ----
    if (g.crash) {
      const c = g.crash;
      // at rest the bike lies upside down, wheels up, as in the sheet
      vic.hsprite(
        BIKE_ROT[c.brest ? N_ROT / 2 : frameOf(c.bspin)],
        Math.round((c.bx - camX) * 2) - S, Math.round(c.by + oy) - S / 2, COLORS,
      );
      // rider: tumbles while he is moving, then sits up, then stands
      let riderGrid;
      if (c.t > 2.25) riderGrid = GETUP;
      else if (c.t > 1.55) riderGrid = SIT;
      else riderGrid = TUMBLE_ROT[frameOf(-c.t * 7)];
      vic.hsprite(
        riderGrid,
        Math.round((c.rx - camX) * 2) - S,
        Math.round(c.ry + oy) - FOOT_Y,
        COLORS,
      );
    } else {
      let pose;
      let ang = g.ang;
      let mx = g.wx + AXLE_DX;
      let my = g.my;
      if (g.air) {
        pose = 'air';
      } else if (g.compress > 0 || (keys.has('ArrowUp') && g.speed > 6)) {
        pose = 'crouch';
      } else if (keys.has('ArrowDown') && g.speed > 18) {
        // wheelie: nose up, pivoting on the rear wheel contact
        pose = 'coast';
        ang = -0.42;
        const gyR = groundRow(g.wx);
        mx = g.wx + AXLE_DX * Math.cos(ang);
        my = gyR - WHEEL_R + WHEELBASE * Math.sin(ang);
      } else if (keys.has('ArrowRight') && g.speed < MAX_SPEED - 1) {
        pose = `pedal${Math.floor(g.pedalPh) % 4}`;
      } else {
        pose = 'coast';
      }
      vic.hsprite(
        POSES[pose][frameOf(ang)],
        Math.round((mx - camX) * 2) - S, Math.round(my + oy) - S / 2, COLORS,
      );
    }

    if (g.popup) {
      vic.text(g.popup.text, W / 2 - vic.textWidth(g.popup.text) / 2, 52, C.WHITE);
    }

    // ---- CASIO HUD, fixed to the screen ----
    const secs = Math.max(0, TIME_LIMIT - g.t);
    const clock = `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
    vic.hudBox('CASIO', W / 2 - 24);
    vic.hudBox(clock, W / 2 + 20);
    for (let i = 0; i < g.lives; i += 1) {
      vic.orect(W - 9 - i * 8, 5, 6, 1, C.RED);
      vic.opset(W - 9 - i * 8, 7, C.BLACK);
      vic.opset(W - 5 - i * 8, 7, C.BLACK);
    }
    vic.orect(0, H - 10, W, 10, C.BLACK);
    vic.text(`SPD ${Math.round(g.speed)}`, 3, H - 8, C.YELLOW);
    const mid = `${distM()}M`;
    vic.text(mid, W / 2 - vic.textWidth(mid) / 2, H - 8, C.WHITE);
    const sc = `${score()}`;
    vic.text(sc, W - vic.textWidth(sc) - 3, H - 8, C.YELLOW);
  };

  // _g exposes the rider state so a course can be driven headlessly
  // (drop the bike at a world x, step update(), assert) without a canvas
  return { update, draw, score, _g: g };
}
