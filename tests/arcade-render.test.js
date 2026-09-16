import test from 'node:test';
import assert from 'node:assert/strict';
import { Vic, DISPLAY_W, H, PAL } from '../src/arcade/engine.js';
import { arcadeScenes } from './fixtures/arcadeScenes.js';
import { createBmx } from '../src/arcade/bmx.js';
import { createSurf } from '../src/arcade/surf.js';
import { FINISH_X, groundRow } from '../src/arcade/bmxTrack.js';
import { POSES, BIKE_ROT, TUMBLE_ROT, SIT, GETUP, S } from '../src/arcade/bmxSprites.js';

for (const { name, game } of arcadeScenes()) {
  test(`${name} renders deterministic palette pixels without changing physics`, () => {
    const before = JSON.stringify(game._g);
    const vic = new Vic();
    game.draw(vic);
    assert.ok(vic.bmp.every(c => c < 16));
    assert.ok(vic.ovl.every(c => c < 16 || c === 255));
    assert.ok(vic.hiresOvl.every(c => c < 16 || c === 255));
    const first = vic.compose();
    game.draw(vic);
    assert.deepEqual(vic.compose(), first);
    assert.equal(JSON.stringify(game._g), before);
    assert.equal(first.length, DISPLAY_W * H * 4);
    const colors = new Set(PAL.map(hex => parseInt(hex.slice(1), 16)));
    for (let p = 0; p < first.length; p += 4) {
      assert.equal(first[p + 3], 255);
      assert.ok(colors.has((first[p] << 16) | (first[p + 1] << 8) | first[p + 2]));
    }
  });
}

test('BMX poses keep a stable hires frame and stay inside its rotation canvas', () => {
  const frames = [...Object.values(POSES).flat(), ...BIKE_ROT, ...TUMBLE_ROT, SIT, GETUP];
  for (const grid of frames) {
    assert.equal(grid.length, S);
    assert.ok(grid.every(row => row.length === S * 2));
    assert.ok(grid.some(row => /[1-9]/.test(row)));
    assert.ok(/^\.+$/.test(grid[0]), 'sprite clips at its top edge');
    assert.ok(/^\.+$/.test(grid.at(-1)), 'sprite clips at its bottom edge');
  }
});

test('BMX updates and draws at course slopes and canyon edges', () => {
  const vic = new Vic();
  for (let wx = 0; wx < FINISH_X; wx += 17) {
    const game = createBmx({ keys: new Set(['ArrowRight']), end() {} });
    const g = game._g;
    g.wx = wx;
    g.my = groundRow(wx) - 8;
    g.speed = 48;
    for (let frame = 0; frame < 4; frame += 1) game.update(1 / 60);
    game.draw(vic);
    assert.ok(Number.isFinite(g.my));
    assert.ok(vic.bmp.every(c => c < 16));
  }
});

test('surf continues through steering, aerial attempts and recovery', () => {
  const keys = new Set();
  const game = createSurf({ keys, end() {} });
  const vic = new Vic();
  for (let frame = 0; frame < 2400; frame += 1) {
    keys.clear();
    keys.add(frame % 240 < 120 ? 'ArrowUp' : 'ArrowDown');
    if (frame % 360 < 100) keys.add('ArrowLeft');
    if (frame % 180 < 60) keys.add(' ');
    game.update(1 / 60);
    if (frame % 30 === 0) {
      game.draw(vic);
      assert.ok(vic.bmp.every(c => c < 16));
      assert.ok(vic.ovl.every(c => c < 16 || c === 255));
      assert.ok(Number.isFinite(game._g.X));
    }
  }
});
