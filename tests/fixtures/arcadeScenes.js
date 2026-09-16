import { createBmx } from '../../src/arcade/bmx.js';
import { createSurf } from '../../src/arcade/surf.js';
import { groundRow } from '../../src/arcade/bmxTrack.js';

export function arcadeScenes() {
  const scenes = [];
  for (const [name, wx] of [['bmx-start', 8], ['bmx-slope', 620], ['bmx-high', 2660]]) {
    const game = createBmx({ keys: new Set(), end() {} });
    const g = game._g;
    g.wx = wx;
    g.my = (groundRow(wx) + groundRow(wx + 14)) / 2 - 8;
    g.ang = Math.atan2(groundRow(wx + 14) - groundRow(wx), 28);
    g.camY = Math.max(-52, Math.min(0, g.my - 88));
    g.popup = null;
    scenes.push({ name, game });
  }
  for (const [name, time, gap] of [['surf-face', 0, 60], ['surf-pocket', 50, 24], ['surf-shoulder', 80, 130]]) {
    const game = createSurf({ keys: new Set(), end() {} });
    const g = game._g;
    g.wave.update(0, time);
    g.state = 'Riding';
    g.t = time;
    g.anim = 2;
    g.pose = 'ride';
    g.drawFacing = 1;
    g.drawAng = 0;
    g.u = 45;
    g.X = g.wave.breakX + gap;
    g.screenX = 98;
    g.camX = g.X - g.screenX;
    g.popup = null;
    scenes.push({ name, game });
  }
  return scenes;
}
