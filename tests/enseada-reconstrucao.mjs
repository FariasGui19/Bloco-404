import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { createBeachSurface } from '../js/engine/beach-surface.js';

// O verde é opcional e nunca altera a máscara da superfície.
const rows = Array.from({ length: 13 }, (_, y) =>
  Array.from({ length: 13 }, (_, x) => x === 0 || y === 0 || x === 12 || y === 12 ? 'Y' : 'S').join(''));
const areia = createBeachSurface(rows, 2);
const grama = createBeachSurface(rows, 2, { gramaInterior: true });
const pixel = (surface, x, y) => Array.from(surface.pixels.slice((y * surface.width + x) * 4, (y * surface.width + x) * 4 + 4));
assert.deepEqual(pixel(areia, 3, 3), pixel(grama, 3, 3), 'orla mantém a areia');
assert(pixel(grama, 13, 13)[1] > pixel(grama, 13, 13)[0], 'interior deve ficar verde');
assert(pixel(areia, 13, 13)[0] > pixel(areia, 13, 13)[1], 'padrão continua sendo areia');
for (let i = 3; i < areia.pixels.length; i += 4) assert.equal(areia.pixels[i], grama.pixels[i]);
assert.equal(map.meta.gramaInterior, true);

const main = readFileSync('js/main.js', 'utf8');
const ids = new Set();
for (const object of map.objects) {
  assert(!ids.has(object.id), `id duplicado: ${object.id}`);
  ids.add(object.id);
  for (const sprite of [object.sprite, object.spriteB].filter(Boolean)) {
    const escaped = sprite.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = main.match(new RegExp(`id:\\s*['"]${escaped}['"],\\s*src:\\s*['"]([^'"]+)['"]`));
    assert(match, `sprite não registrado: ${sprite}`);
    assert(existsSync(match[1]), `arquivo ausente: ${match[1]}`);
  }
}
// As interações preservadas devem continuar na mesma massa de terra da chegada.
const seen = new Set(), queue = [[Math.floor(map.spawnPoints.vindo_da_praia.x), Math.floor(map.spawnPoints.vindo_da_praia.y)]];
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i], key = `${x},${y}`;
  if (seen.has(key) || map.walkMask[y]?.[x] !== '.') continue;
  seen.add(key);
  queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
}
for (const object of map.objects.filter(o => o.interacao)) {
  assert(seen.has(`${Math.floor(object.x)},${Math.floor(object.y)}`), `interação fora da ilha principal: ${object.id}`);
}
assert(seen.has(`${Math.floor(map.spawnPoints.vindo_do_mar.x)},${Math.floor(map.spawnPoints.vindo_do_mar.y)}`), 'retorno do mar isolado');
const barco = map.objects.find(o => o.id === 'barco_expedicao_enseada');
assert(barco?.interacao && barco.renderizar === false, 'barco deve ser interativo sem duplicar o veleiro do cais');
console.log('Reconstrução da Enseada: superfície, sprites e acessibilidade básica OK.');
