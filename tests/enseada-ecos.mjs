import assert from 'node:assert/strict';
import { map as praia } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { WORLD_REGISTRY } from '../js/data/world-registry.js';

const forward = praia.portals.find(p => p.id === 'trilha_enseada');
const back = enseada.portals.find(p => p.id === 'enseada_retorno');
assert.equal(forward.destino.mapId, enseada.id);
assert.equal(back.destino.mapId, praia.id);
assert(WORLD_REGISTRY[enseada.id]);
const start = enseada.spawnPoints[forward.destino.spawnId];
const end = praia.spawnPoints[back.destino.spawnId];
assert(start && end);
assert.equal(enseada.walkMask[Math.floor(start.y)][Math.floor(start.x)], '.');
assert.equal(praia.walkMask[Math.floor(end.y)][Math.floor(end.x)], '.');
assert.equal(praia.walkMask[forward.y][forward.x], '.');
assert.equal(enseada.walkMask[back.y][back.x], '.');
const seen = new Set(), queue = [[Math.floor(start.x), Math.floor(start.y)]];
while (queue.length) {
  const [x,y] = queue.shift(), key = `${x},${y}`;
  if (seen.has(key) || enseada.walkMask[y]?.[x] !== '.') continue;
  seen.add(key);
  queue.push([x+1,y], [x-1,y], [x,y+1], [x,y-1]);
}
for (const item of enseada.collectibles) assert(seen.has(`${item.x},${item.y}`), `${item.id} inacessível`);
assert(seen.has(`${back.x},${back.y}`));
assert.equal(enseada.collectibles.filter(i => i.id.startsWith('enseada_rastro_')).length, 3);
assert(enseada.objects.filter(o => o.bloqueia).every(o => o.hitbox && o.sprite === 'vegetacao_tropical'));
console.log('Enseada: ida, volta e três vestígios acessíveis OK.');

// As descobertas persistem em flags separadas e não reescrevem a missão do metrô.
const { state } = await import('../js/game/state.js');
const { loadMap } = await import('../js/game/map-manager.js');
const { collectItem } = await import('../js/game/collectibles.js');
const element = () => ({ dataset: {}, classList: { add() {}, remove() {} }, addEventListener() {}, textContent: '', innerHTML: '' });
const elements = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, element()]));
globalThis.document = { getElementById: id => elements[id] };
globalThis.window = { addEventListener() {} };
state.save.loaded = false; state.save.activeSlot = null;
state.progress = { flags: {}, inventory: [], activeQuest: { id: 'embarque_dimensional', status: 'active' } };
assert(await loadMap(enseada.id, 'vindo_da_praia'));
for (const [index, item] of state.collectibles.filter(i => i.id.startsWith('enseada_rastro_')).entries()) {
  assert(collectItem(item));
  assert.equal(Boolean(state.progress.flags.enseada_ecos_mapeada), index === 2);
}
assert.equal(state.progress.activeQuest.id, 'embarque_dimensional');
assert.equal(state.progress.inventory.length, 3);
console.log('Enseada: descoberta salva sem substituir missão ativa OK.');
