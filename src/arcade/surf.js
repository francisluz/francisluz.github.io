// SURF on the VIC engine, rebuilt after the California Games C64 event.
//
// - the wave is an invisible model (surfWave.js): face height, pocket,
//   lip and a break point that peels along the wave. The renderer
//   (surfRender.js) draws tiles that follow it; physics never reads pixels
// - the surfer lives on the face as (X along the wave, u rows up the
//   face, heading, speed). Dropping trades height for speed, climbing
//   trades it back, and the pocket hands out energy
// - explicit state machine: Entering, Riding, BottomTurn, TopTurn,
//   Cutback, LipHit, Airborne, Landing, LosingBalance, Wipeout,
//   Underwater, Recovering
// - sprites are discrete pre-rotated frames (surfSprites.js)
//
// Controls: arrows steer the board (UP climbs, DOWN drops, LEFT/RIGHT
// pick the direction, so reversing is a cutback). SPACE carves harder.
// Airborne: LEFT/RIGHT spin. Land pointing along your fall.

import { createWave, Zone, TROUGH, SESSION } from './surfWave.js';
import { drawSurf } from './surfRender.js';

const TAU = Math.PI * 2;
// speed per second pointing straight down (or up) a unit-steep face.
// Dropping pays more than climbing costs: that surplus is what makes
// linking turns build speed, the loop the whole game is built on.
const DROP_GAIN = 92;
const CLIMB_COST = 56;
const AIR_GRAVITY = 175;
const MAX_SPEED = 135;
const MIN_AERIAL_SPEED = 42;
const MIN_AERIAL_LIFT = 22;
const TURN_RATE = 3.3;
const HARD_TURN_RATE = 5.6;
const SPIN_RATE = 7.5;
const ANIM_HZ = 12;

export const State = {
  Entering: 'Entering',
  Riding: 'Riding',
  BottomTurn: 'BottomTurn',
  TopTurn: 'TopTurn',
  Cutback: 'Cutback',
  LipHit: 'LipHit',
  Airborne: 'Airborne',
  Landing: 'Landing',
  LosingBalance: 'LosingBalance',
  Wipeout: 'Wipeout',
  Underwater: 'Underwater',
  Recovering: 'Recovering',
};

// states that ride the face with the normal surfing physics
const ON_FACE = new Set([
  State.Riding, State.BottomTurn, State.TopTurn, State.Cutback, State.LipHit, State.Landing,
]);

const norm = (a) => {
  let d = a % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};

export function createSurf({ keys, end }) {
  const wave = createWave();

  const g = {
    wave,
    state: State.Entering,
    stateT: 0,
    anim: 0, // always-running clock for water and sprite cycles
    t: 0, // session clock, starts when the surfer first stands
    started: false,
    over: false,

    X: 0,
    u: 0,
    y: 0,
    vx: 0,
    vy: 0,
    s: 0,
    th: 0,
    facing: 1,
    turnRate: 0,
    hard: false,

    spin: 0,
    airT: 0,
    airFacing: 1,
    launchMult: 1,

    score: 0,
    wipeouts: 0,
    maneuvers: 0,
    popup: null,
    fx: [],
    trail: [],
    trailT: 0,
    sprayT: 0,
    insideT: 0,
    pitchT: 0,
    bogT: 0,

    // maneuver tracking
    dir: 'flat',
    dirMinF: 1,
    dirMaxF: 0,
    cutFrom: null,

    wipe: null,
    camX: 0,
    screenX: 70,

    pose: 'paddle1',
    drawAng: 0,
    drawFacing: 1,
    drawAir: false,
    animAcc: 0,
  };

  const say = (text, ttl = 1.5) => { g.popup = { text, ttl }; };
  const input = () => ({
    left: keys.has('ArrowLeft'),
    right: keys.has('ArrowRight'),
    up: keys.has('ArrowUp'),
    down: keys.has('ArrowDown'),
    action: keys.has(' '),
  });

  const fx = (kind, X, y, flip = false) => g.fx.push({ kind, X, y, t: 0, flip });

  const pocketMult = (d) => {
    if (d < 0) return 1;
    if (d < wave.p.curl + 10) return 2;
    if (d < 52) return 1.5;
    if (d < 125) return 1.1;
    return 1;
  };

  const award = (name, base) => {
    const mult = pocketMult(g.X - wave.breakX);
    const pts = Math.round(base * mult);
    g.score += pts;
    g.maneuvers += 1;
    say(`${name} ${pts}`);
  };

  const setState = (s) => {
    g.state = s;
    g.stateT = 0;
  };

  const finish = () => {
    if (g.over) return;
    g.over = true;
    end({ score: Math.round(g.score), wipeouts: g.wipeouts, timeup: true });
  };

  // ------------------------------------------------------------ states

  const enterWave = () => {
    setState(State.Entering);
    g.X = wave.breakX + 60;
    g.u = wave.faceH(60) * 0.1;
    g.th = 0;
    g.s = 0;
    g.facing = 1;
    g.insideT = 0;
    g.pitchT = 0;
    g.bogT = 0;
    g.dir = 'flat';
    g.cutFrom = null;
    g.wipe = null;
  };

  const startRiding = () => {
    setState(State.Riding);
    g.th = 0.45;
    g.s = 58;
    g.facing = 1;
    if (!g.started) {
      g.started = true;
      say('GO!', 1);
    }
  };

  const loseBalance = (reason) => {
    if (g.state === State.LosingBalance || g.state === State.Wipeout) return;
    say(reason, 1.8);
    g.vx = (g.s * Math.cos(g.th)) / 2;
    g.vy = g.s * Math.sin(g.th);
    if (g.state !== State.Airborne) g.y = TROUGH - g.u;
    g.wipeouts += 1;
    setState(State.LosingBalance);
  };

  const startWipeout = () => {
    const waterY = Math.min(TROUGH - 3, g.y + 18);
    g.wipe = {
      rider: { X: g.X, y: g.y - 6, vx: g.vx * 0.45, vy: Math.min(g.vy, 0) * 0.3 - 75, rot: g.th, sunk: false },
      board: { X: g.X, y: g.y, vx: g.vx * 1.15 + g.facing * 12, vy: Math.min(g.vy, 0) * 0.4 - 105, rot: g.th, spin: 11 * g.facing, floating: false },
      waterY,
    };
    setState(State.Wipeout);
  };

  const launch = () => {
    g.vx = (g.s * Math.cos(g.th)) / 2;
    g.vy = Math.max(-125, g.s * Math.sin(g.th) - 25); // the lip throws you
    g.y = TROUGH - g.u;
    g.spin = 0;
    g.airT = 0;
    g.airFacing = g.facing;
    g.launchMult = pocketMult(g.X - wave.breakX);
    fx('sprayLarge', g.X - g.facing * 4, g.y - 4, g.facing < 0);
    setState(State.Airborne);
  };

  // --------------------------------------------------- riding physics

  const steer = (dt, inp, ws) => {
    const dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    g.hard = inp.action;
    let rate = inp.action ? HARD_TURN_RATE : TURN_RATE;
    if (ws.zone === Zone.WHITEWATER) rate *= 0.45;
    let turn = 0;
    if (dx || dy) {
      // UP/DOWN alone climb or drop in the direction you already face
      const target = dx ? Math.atan2(dy * 0.9, dx) : Math.atan2(dy, g.facing * 0.55);
      let diff = norm(target - g.th);
      if (Math.abs(diff) > 2.6) {
        // reversing: swing through the open part of the face
        const viaUp = ws.f < 0.5;
        const sign = g.facing > 0 ? (viaUp ? -1 : 1) : (viaUp ? 1 : -1);
        diff = sign * Math.abs(diff);
      }
      turn = Math.max(-rate * dt, Math.min(rate * dt, diff));
    } else if (inp.action) {
      // SPACE alone snaps the board back toward the pocket's fall line
      turn = Math.max(-rate * dt, Math.min(rate * dt, norm((g.facing > 0 ? 0.5 : Math.PI - 0.5) - g.th)));
    }
    g.th = norm(g.th + turn);
    g.turnRate = turn / Math.max(dt, 1e-4);
    const c = Math.cos(g.th);
    if (c > 0.25) g.facing = 1;
    else if (c < -0.25) g.facing = -1;
    return Math.abs(turn);
  };

  const trackManeuvers = (ws) => {
    const sn = Math.sin(g.th);
    const dir = sn > 0.35 ? 'down' : sn < -0.35 ? 'up' : null;
    if (dir && dir !== g.dir) {
      if (g.dir === 'down' && dir === 'up' && g.dirMinF < 0.35 && g.s > 40) {
        award('BOTTOM TURN', 50);
        setState(State.BottomTurn);
        fx('spraySmall', g.X - g.facing * 6, TROUGH - g.u - 3, g.facing < 0);
      } else if (g.dir === 'up' && dir === 'down' && g.dirMaxF > 0.7) {
        award('TOP TURN', 75);
        setState(State.TopTurn);
        fx('sprayLarge', g.X - g.facing * 5, TROUGH - g.u - 6, g.facing < 0);
      }
      g.dir = dir;
      g.dirMinF = ws.f;
      g.dirMaxF = ws.f;
    }
    g.dirMinF = Math.min(g.dirMinF, ws.f);
    g.dirMaxF = Math.max(g.dirMaxF, ws.f);

    // cutback: turn back toward the break from out on the face, then
    // turn around again to keep riding
    if (g.facing < 0 && g.cutFrom === null) {
      g.cutFrom = { t: g.anim, d: ws.d };
      fx('sprayLarge', g.X + 5, TROUGH - g.u - 5, false);
    } else if (g.facing > 0 && g.cutFrom !== null) {
      if (g.anim - g.cutFrom.t > 0.25 && g.cutFrom.d > 28 && g.s > 25) {
        award('CUTBACK', 150);
        setState(State.Cutback);
        fx('spraySmall', g.X - 6, TROUGH - g.u - 3, false);
      }
      g.cutFrom = null;
    }
  };

  const ride = (dt) => {
    const inp = input();
    let ws = wave.sample(g.X, g.u);
    const turned = steer(dt, inp, ws);
    const sn = Math.sin(g.th);

    g.s += (sn > 0 ? DROP_GAIN : CLIMB_COST) * ws.steepness * sn * dt;
    g.s += wave.push(ws.d, ws.f) * dt;
    g.s -= (2 + 0.12 * g.s) * dt;
    g.s -= turned * (inp.action ? 6 : 2);
    if (ws.zone === Zone.WHITEWATER) g.s -= 38 * dt;
    g.s = Math.max(0, Math.min(MAX_SPEED, g.s));

    // out of speed pointing up the face: the nose falls back down,
    // whatever the stick says
    if (Math.sin(g.th) < 0.2 && g.s < 22 && g.u > 2) {
      const down = g.facing > 0 ? 1.1 : Math.PI - 1.1;
      const d = norm(down - g.th);
      const r = (1.5 + 4 * (1 - g.s / 22)) * dt;
      g.th = norm(g.th + Math.max(-r, Math.min(r, d)));
      g.s = Math.max(g.s, 8);
    }

    g.X += ((g.s * Math.cos(g.th)) / 2) * dt;
    g.u -= g.s * sn * dt;

    ws = wave.sample(g.X, g.u);
    const flat = g.facing > 0 ? 0 : Math.PI;

    // bottom of the wave: the board can't go deeper, it planes out
    if (g.u < 0) {
      g.u = 0;
      if (Math.sin(g.th) > 0) {
        const d = norm(flat - g.th);
        g.th = norm(g.th + Math.max(-4 * dt, Math.min(4 * dt, d)));
        g.s -= 12 * dt;
      }
    }

    // top of the wave: launch with enough speed, otherwise stall on the lip
    if (g.u >= ws.faceH) {
      const lift = -g.s * Math.sin(g.th);
      if (ws.d > wave.p.curl && g.s > MIN_AERIAL_SPEED && lift > MIN_AERIAL_LIFT) {
        launch();
        return;
      }
      g.u = ws.faceH;
      if (Math.sin(g.th) < 0) {
        const d = norm(flat + g.facing * 0.3 - g.th);
        g.th = norm(g.th + Math.max(-3.5 * dt, Math.min(3.5 * dt, d)));
        g.s -= 30 * dt;
        if (g.state === State.Riding) {
          setState(State.LipHit);
          fx('spraySmall', g.X, TROUGH - g.u - 4, g.facing < 0);
        }
      }
    }

    if (g.state !== State.Riding && g.stateT > (g.state === State.Landing ? 0.22 : 0.3)) {
      setState(State.Riding);
    }

    trackManeuvers(ws);

    // ---- hazards ----
    if (ws.d < 0) {
      g.insideT += dt;
      g.th = norm(g.th + (Math.random() - 0.5) * 6 * dt);
      if (g.insideT > 0.8) { loseBalance('CAUGHT INSIDE!'); return; }
    } else {
      g.insideT = Math.max(0, g.insideT - 2 * dt);
    }
    if (ws.d < wave.p.curl && ws.f > 0.55) {
      g.pitchT += dt;
      if (g.pitchT > 0.35) { loseBalance('OVER THE FALLS!'); return; }
    } else {
      g.pitchT = 0;
    }
    if (g.s < 10 && g.u < 4) {
      g.bogT += dt;
      if (g.bogT > 1.8) { loseBalance('BOGGED DOWN!'); return; }
    } else {
      g.bogT = 0;
    }

    // ---- ride points: faster and closer to the break pays more ----
    g.score += 12 * pocketMult(ws.d) * (0.4 + g.s / 100) * dt;

    // ---- wake and spray ----
    g.trailT -= dt;
    if (g.s > 30 && g.trailT <= 0) {
      g.trailT = 0.07;
      g.trail.push({ X: g.X - g.facing * 8, y: TROUGH - g.u + 1, t: 0 });
      if (g.trail.length > 14) g.trail.shift();
    }
    g.sprayT -= dt;
    if (Math.abs(g.turnRate) > 2.4 && g.s > 35 && g.sprayT <= 0) {
      g.sprayT = inp.action ? 0.1 : 0.16;
      fx('spraySmall', g.X - g.facing * 9, TROUGH - g.u - 4, g.facing < 0);
    }
  };

  // ------------------------------------------------------ airborne

  const air = (dt) => {
    const inp = input();
    g.airT += dt;
    g.vy += AIR_GRAVITY * dt;
    g.X += g.vx * dt;
    g.y += g.vy * dt;

    const velAng = Math.atan2(g.vy, g.vx * 2);
    if (inp.left || inp.right) {
      const r = ((inp.right ? 1 : 0) - (inp.left ? 1 : 0)) * SPIN_RATE * (inp.action ? 1.35 : 1) * dt;
      g.th += r;
      g.spin += r;
    } else {
      // left alone, the board settles along the fall (either end first)
      let d = norm(velAng - g.th);
      if (Math.abs(d) > Math.PI / 2) d = norm(d + Math.PI);
      g.th += Math.max(-3.6 * dt, Math.min(3.6 * dt, d));
    }

    const d = g.X - wave.breakX;
    if (g.airT > 0.15 && g.vy > 0 && g.y >= TROUGH - wave.faceH(d)) {
      const fwd = Math.abs(norm(g.th - velAng));
      const rev = Math.abs(norm(g.th - velAng - Math.PI));
      const diff = Math.min(fwd, rev);
      if (d < 0) { loseBalance('LANDED IN THE FOAM!'); return; }
      if (diff > 0.8) { loseBalance(Math.abs(g.spin) > 2 ? 'OVER ROTATED!' : 'FLAT LANDING!'); return; }
      if (g.vy > 340) { loseBalance('TOO BIG!'); return; }

      // ---- clean enough: score the aerial ----
      const halves = Math.floor((Math.abs(g.spin) + 0.5) / Math.PI);
      const base = 200 + 250 * halves;
      const name = halves ? `${halves * 180} AERIAL` : 'AERIAL';
      const clean = diff < 0.35;
      const pts = Math.round(base * (clean ? 1.5 : 1) * g.launchMult);
      g.score += pts;
      g.maneuvers += 1;
      say(`${clean ? 'CLEAN ' : ''}${name} ${pts}`, 1.8);

      g.u = Math.max(0, TROUGH - g.y);
      g.th = norm(velAng);
      g.facing = Math.cos(g.th) >= 0 ? 1 : -1;
      g.s = Math.min(MAX_SPEED, Math.hypot(g.vx * 2, g.vy) * 0.75);
      g.dir = 'down';
      g.dirMinF = 1;
      g.dirMaxF = 1;
      g.cutFrom = null;
      fx('splash', g.X - 7, TROUGH - g.u - 4);
      setState(State.Landing);
    }
  };

  // ------------------------------------------------------- crashes

  const losing = (dt) => {
    g.X += g.vx * dt;
    g.y += g.vy * dt;
    if (g.stateT > 0.14) startWipeout();
  };

  const tumble = (dt) => {
    const w = g.wipe;
    const r = w.rider;
    const b = w.board;
    if (!r.sunk) {
      r.vy += 260 * dt;
      r.X += r.vx * dt;
      r.y += r.vy * dt;
      r.rot += 9 * g.facing * dt;
      if (r.vy > 0 && r.y >= w.waterY) {
        r.sunk = true;
        fx('splash', r.X - 7, w.waterY - 5);
      }
    }
    if (!b.floating) {
      b.vy += 260 * dt;
      b.X += b.vx * dt;
      b.y += b.vy * dt;
      b.rot += b.spin * dt;
      if (b.vy > 0 && b.y >= w.waterY + 2) {
        b.floating = true;
        b.y = w.waterY + 2;
        b.rot = Math.round(b.rot / Math.PI) * Math.PI;
        fx('splash', b.X - 7, w.waterY - 3);
      }
    } else {
      // float and get dragged along by the foam
      b.vx *= 1 - 2 * dt;
      b.X += b.vx * dt;
      if (b.X < wave.breakX) b.X += wave.p.breakSpeed * dt;
    }
  };

  const wiping = (dt) => {
    tumble(dt);
    if (g.wipe.rider.sunk || g.stateT > 1.1) {
      g.wipe.rider.sunk = true;
      setState(State.Underwater);
    }
  };

  const bubbleT = { v: 0 };
  const underwater = (dt) => {
    tumble(dt);
    const r = g.wipe.rider;
    bubbleT.v -= dt;
    if (bubbleT.v <= 0) {
      bubbleT.v = 0.22;
      fx('bubbles', r.X - 3 + (Math.random() - 0.5) * 6, g.wipe.waterY - 4);
    }
    if (g.stateT > 1.0) setState(State.Recovering);
  };

  const recovering = (dt) => {
    tumble(dt);
    if (g.stateT > 0.55) enterWave();
  };

  const entering = (dt) => {
    g.X += (wave.p.breakSpeed * wave.surge + 3) * dt;
    const ws = wave.sample(g.X, g.u);
    if (g.stateT < 1.0) g.u = Math.min(ws.faceH * 0.3, g.u + ws.faceH * 0.22 * dt);
    if (g.stateT > 1.3) startRiding();
  };

  const STATE_UPDATE = {
    [State.Entering]: entering,
    [State.Riding]: ride,
    [State.BottomTurn]: ride,
    [State.TopTurn]: ride,
    [State.Cutback]: ride,
    [State.LipHit]: ride,
    [State.Landing]: ride,
    [State.Airborne]: air,
    [State.LosingBalance]: losing,
    [State.Wipeout]: wiping,
    [State.Underwater]: underwater,
    [State.Recovering]: recovering,
  };

  // ---------------------------------------------------- animation

  const choosePose = () => {
    const inp = input();
    const st = g.state;
    g.drawAir = false;
    if (st === State.Entering) {
      g.drawAng = 0;
      g.drawFacing = 1;
      g.pose = g.stateT > 1.0 ? 'popup' : Math.floor(g.anim * 5) % 2 ? 'paddle1' : 'paddle2';
      return;
    }
    if (st === State.LosingBalance) {
      g.pose = Math.floor(g.anim * ANIM_HZ) % 2 ? 'wobble1' : 'wobble2';
      return;
    }
    if (st === State.Airborne) {
      g.drawAir = true;
      g.drawFacing = g.airFacing;
      g.pose = g.airT < 0.1 ? 'crouch' : 'air';
      // airborne rotation is quantized to 45° steps
      g.drawAng = Math.round(g.th / (Math.PI / 4)) * (Math.PI / 4);
      return;
    }
    if (!ON_FACE.has(st)) return;
    g.drawFacing = g.facing;
    // riding tilt: the board leans with the heading, damped and clamped
    // so a steep climb still reads as a surfer, not a toppled sprite
    const local = g.facing > 0 ? g.th : norm(Math.PI - g.th);
    const tilt = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, local * 0.7));
    g.drawAng = g.facing > 0 ? tilt : Math.PI - tilt;
    const sn = Math.sin(g.th);
    if (st === State.Landing) g.pose = 'crouch';
    else if (st === State.TopTurn || st === State.LipHit) g.pose = 'snap';
    else if (st === State.BottomTurn || st === State.Cutback) g.pose = 'carve';
    else if (Math.abs(g.turnRate) > 2.8 || (g.hard && Math.abs(g.turnRate) > 1)) g.pose = 'carve';
    else if (g.insideT > 0.15) g.pose = Math.floor(g.anim * ANIM_HZ) % 2 ? 'wobble1' : 'wobble2';
    else if (inp.down && sn > 0.2) g.pose = 'crouch';
    else if (sn > 0.35) g.pose = 'leanFwd';
    else if (sn < -0.35) g.pose = 'leanBack';
    else g.pose = Math.floor(g.anim * 1.5) % 2 ? 'ride2' : 'ride';
  };

  // ---------------------------------------------------------- update

  const update = (dt) => {
    if (g.over) return;
    g.anim += dt;
    g.stateT += dt;
    if (g.started) g.t += dt;
    if (g.popup && (g.popup.ttl -= dt) <= 0) g.popup = null;

    if (g.t >= SESSION) {
      finish();
      return;
    }

    // while the rider is under, the whitewater rolls on over them
    let extra = 0;
    if (g.wipe && g.wipe.rider.X > wave.breakX - 28) extra = 45;
    wave.update(dt, g.t, extra);

    STATE_UPDATE[g.state](dt);

    for (const e of g.fx) e.t += dt;
    g.fx = g.fx.filter((e) => e.t < 0.6);
    for (const m of g.trail) m.t += dt;
    g.trail = g.trail.filter((m) => m.t < 0.5);

    // camera: mostly still. The surfer sits right of centre, drifting
    // further right out on the shoulder and left when deep in the pocket
    const focusX = g.wipe ? g.wipe.rider.X : g.X;
    const gap = focusX - wave.breakX;
    const target = Math.max(88, Math.min(112, 68 + gap * 0.5));
    g.screenX += (target - g.screenX) * Math.min(1, 2.2 * dt);
    g.camX = focusX - g.screenX;

    g.animAcc += dt;
    if (g.animAcc >= 1 / ANIM_HZ) {
      g.animAcc %= 1 / ANIM_HZ;
      choosePose();
    }
  };

  const draw = (vic) => drawSurf(vic, g);

  enterWave();
  g.screenX = 98;
  g.camX = g.X - g.screenX;
  say('PADDLE IN...', 1.3);

  return { update, draw, score: () => Math.round(g.score), _g: g, State };
}
