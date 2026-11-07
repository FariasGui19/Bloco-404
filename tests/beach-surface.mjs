import assert from 'node:assert/strict';
import { createBeachSurface } from '../js/engine/beach-surface.js';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';

for (const map of [praia, enseada]) {
  const rows = map.aguaPraia, scale = 8;
  const surface = createBeachSurface(rows, scale);
  assert.equal(surface.width, rows[0].length * scale);
  assert.equal(surface.height, rows.length * scale);
  for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
    for (const [dx,dy] of [[0,0], [3,4], [7,7]]) {
      const pos = (((y*scale+dy)*surface.width)+(x*scale+dx))*4;
      const alpha = surface.pixels[pos+3];
      if ('SMT'.includes(rows[y][x])) assert(alpha > 0, `areia ausente em ${x},${y}`);
      else assert.equal(alpha, 0, `areia indevida em ${x},${y}: ${rows[y][x]}`);
    }
  }
  assert.deepEqual(createBeachSurface(rows, scale).pixels, surface.pixels, 'determinística');
  for (const object of map.objects.filter(o => o.sprite === 'costa_rochosa')) {
    assert('YyDdX'.includes(rows[object.y]?.[object.x] ?? ' '), `${object.id} deve ficar em água não caminhável`);
    assert.equal(object.bloqueia, false);
  }
}
console.log('Praias: areia contínua respeita máscaras, pontes e água.');
