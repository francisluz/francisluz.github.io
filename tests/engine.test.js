import test from 'node:test';
import assert from 'node:assert/strict';
import { C, DISPLAY_W, H, W, Vic, decodeSprite } from '../src/arcade/engine.js';

const rgbaAt = (rgba, x, y) => Array.from(rgba.slice((y * DISPLAY_W + x) * 4, (y * DISPLAY_W + x + 1) * 4));

test('rect and circle clipping never fill across an offscreen row', () => {
  const vic = new Vic();
  vic.clear(C.BLACK);
  vic.rect(-10, 4, 3, 2, C.RED);
  vic.circle(-10, 8, 2, C.RED);
  assert.equal(vic.bmp.some((c) => c === C.RED), false);
  vic.rect(2, 4, 3, 2, C.RED);
  assert.deepEqual(Array.from(vic.bmp.slice(4 * W, 4 * W + 6)), [C.BLACK, C.BLACK, C.RED, C.RED, C.RED, C.BLACK]);
});

test('cell constraints are computed into a separate buffer', () => {
  const vic = new Vic();
  vic.bg = C.BLACK;
  vic.clear(C.BLACK);
  vic.pset(0, 0, C.RED);
  vic.pset(1, 0, C.CYAN);
  vic.pset(2, 0, C.GREEN);
  vic.pset(3, 0, C.YELLOW);
  const source = vic.bmp.slice();
  const constrained = vic.applyCellConstraint();
  assert.deepEqual(vic.bmp, source);
  assert.equal(constrained.length, W * H);
  const cell = [];
  for (let y = 0; y < 8; y += 1) cell.push(...constrained.slice(y * W, y * W + 4));
  assert.equal(new Set(cell).size, 4);
  assert.notDeepEqual(constrained, source);
  assert.deepEqual(vic.applyCellConstraint(), constrained);
});

test('explicit cell palette and raster backgrounds reset on clear', () => {
  const vic = new Vic();
  vic.clear(C.BLACK);
  vic.setCellPalette(0, 0, [C.RED]);
  vic.pset(0, 0, C.ORANGE);
  vic.applyCellConstraint();
  assert.equal(vic.constrained[0], C.RED);
  vic.rasterBackground(8, 9, C.YELLOW);
  assert.equal(vic.rasterBg[8], C.YELLOW);
  assert.equal(vic.bmp[8 * W], C.BLACK);
  vic.clear(C.GREEN);
  assert.equal(vic.cellPalettes[0], null);
  assert.equal(vic.rasterBg[8], C.BLUE);
  assert.equal(vic.bmp[8 * W], C.GREEN);
});

test('hires overlay composes as one display pixel while bitmap stays doubled', () => {
  const vic = new Vic();
  vic.clear(C.BLACK);
  vic.pset(1, 0, C.RED);
  vic.hpset(1, 0, C.CYAN);
  const rgba = vic.compose();
  assert.deepEqual(rgbaAt(rgba, 0, 0), [0, 0, 0, 255]);
  assert.deepEqual(rgbaAt(rgba, 1, 0), [0x67, 0xb6, 0xbd, 255]);
  assert.deepEqual(rgbaAt(rgba, 2, 0), [0x88, 0x39, 0x32, 255]);
  assert.deepEqual(rgbaAt(rgba, 3, 0), [0x88, 0x39, 0x32, 255]);
});

test('text is cleared with the hires overlay and preserves world-space width', () => {
  const vic = new Vic();
  vic.clear(C.BLACK);
  assert.equal(vic.textWidth('AB'), 6);
  vic.text('A', 0, 0, C.WHITE);
  assert.deepEqual(Array.from(vic.hiresOvl.slice(0, 6)), [255, C.WHITE, C.WHITE, C.WHITE, 255, 255]);
  assert.equal(vic.hiresOvl.some((c) => c !== 255), true);
  vic.clear(C.BLACK);
  assert.equal(vic.hiresOvl.some((c) => c !== 255), false);
});

test('hardware sprite decoder handles hires and multicolor bit meanings', () => {
  const bytes = new Uint8Array(63);
  bytes[0] = 0b10100011;
  const hires = decodeSprite(bytes, { color: C.RED });
  assert.equal(hires.length, 21);
  assert.equal(hires[0].length, 24);
  assert.deepEqual(hires[0].slice(0, 8), [C.RED, 255, C.RED, 255, 255, 255, C.RED, C.RED]);

  bytes[0] = 0b00011011;
  const multi = decodeSprite(bytes, { multicolor: true, color: C.YELLOW, sharedColors: [C.CYAN, C.GREEN] });
  assert.deepEqual(multi[0].slice(0, 8), [255, 255, C.CYAN, C.CYAN, C.YELLOW, C.YELLOW, C.GREEN, C.GREEN]);
});

test('raster changes retain the same three cell registers across a scanline split', () => {
  const vic = new Vic();
  vic.bg = C.BLACK;
  vic.clear(C.BLACK);
  vic.setCellPalette(0, 0, [C.RED, C.CYAN, C.GREEN]);
  vic.rasterBackground(4, 8, C.YELLOW);
  vic.rect(0, 4, 4, 4, C.YELLOW);
  for (let y = 0; y < 8; y += 1) {
    vic.pset(0, y, C.RED);
    vic.pset(1, y, C.CYAN);
    vic.pset(2, y, C.GREEN);
  }
  const out = vic.applyCellConstraint();
  assert.deepEqual(Array.from(out.slice(0, 4)), [C.RED, C.CYAN, C.GREEN, C.BLACK]);
  assert.deepEqual(Array.from(out.slice(4 * W, 4 * W + 4)), [C.RED, C.CYAN, C.GREEN, C.YELLOW]);
});
