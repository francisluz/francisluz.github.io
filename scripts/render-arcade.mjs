import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { resolve } from 'node:path';
import { Vic, DISPLAY_W, H } from '../src/arcade/engine.js';
import { arcadeScenes } from '../tests/fixtures/arcadeScenes.js';

// PNG encoding keeps reference captures reproducible without browser packages.
function chunk(type, data) {
  const payload = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const byte of payload) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([length, payload, checksum]);
}
function png(rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(DISPLAY_W, 0);
  header.writeUInt32BE(H, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc((DISPLAY_W * 4 + 1) * H);
  for (let y = 0; y < H; y += 1) rows.set(rgba.subarray(y * DISPLAY_W * 4, (y + 1) * DISPLAY_W * 4), y * (DISPLAY_W * 4 + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
const out = resolve(process.argv[2] || 'artifacts/c64');
await mkdir(out, { recursive: true });
for (const { name, game } of arcadeScenes()) {
  const vic = new Vic();
  game.draw(vic);
  await writeFile(resolve(out, `${name}.png`), png(vic.compose()));
  console.log(`${name}.png`);
}
