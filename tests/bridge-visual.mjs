import assert from 'node:assert/strict';
import { bridgeThresholdGeometry } from '../js/engine/bridge-geometry.js';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
for (const [id, axis, center] of [
  ['travessia_mare_eco','x',12], ['passagem_mare_eco','y',37],
  ['caverna_alagada','y',31], ['fenda_estreita','x',32], ['teleferico_quebrado','y',8],
]) {
  const raw = map.objects.find(o => o.id === id);
  const result = bridgeThresholdGeometry(map.aguaPraia, { ...raw, x: raw.x+.5, y: raw.y+.5 }, axis);
  assert(result, `${id} sem deck`);
  assert.equal(axis === 'x' ? result.y : result.x, center, id);
  assert(Math.abs(result.halfWidth - .92) < 1e-9, id);
}
console.log('Limiar visual acompanha centro e bordas dos dois tiles do deck.');
