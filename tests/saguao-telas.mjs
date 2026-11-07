import assert from 'node:assert/strict';
import { drawHubScreenFx } from '../js/engine/hub-screen-fx.js';
import { map } from '../js/data/worlds/hub-404/saguao.js';
const mk = () => {
  const calls = []; const ctx = { calls };
  for (const method of ['save','restore','beginPath','moveTo','lineTo','closePath','clip','stroke','ellipse','translate','rotate','arc','fill']) ctx[method] = (...args) => calls.push([method, ...args]);
  return ctx;
};
for (const id of ['totem','metro']) {
  const first = mk(), second = mk();
  drawHubScreenFx(first,id,0); drawHubScreenFx(second,id,1.7);
  assert.equal(first.calls[0][0], 'save');
  assert.equal(first.calls.at(-1)[0], 'restore');
  const clip = first.calls.findIndex(c => c[0] === 'clip');
  assert(clip >= 0);
  assert(first.calls.every((c,i) => !['stroke','fill'].includes(c[0]) || i > clip), 'animação confinada na superfície');
  assert.notDeepEqual(first.calls, second.calls, 'superfície realmente anima');
}
assert(!map.objects.find(o => o.id === 'hub_painel_decor').espelhar, 'painel aponta para o lado correto');
for (const id of ['saguao_vaso_novo','saguao_bebedouro']) {
  const item = map.objects.find(o => o.id === id);
  assert(item.scale >= .4 && item.anchorY === 1 && item.bloqueia && item.hitbox.width >= .5);
}
console.log('Saguão: FX recortados, painel orientado e mobiliário ancorado OK.');
