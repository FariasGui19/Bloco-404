import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { updateLobbyVisitor } from '../js/game/viajante-saguao.js';

state.progress = { flags: {}, inventory: [], archetype: 'motor_bio_forja' };
await loadMap('hub_saguao', 'inicio');
const map = state.world.currentMap, player = state.player;
const visitor = state.actors.find(a => a.tipo === 'viajante_ambiental');
assert(visitor && visitor.solido === false && visitor.interacao?.dialogue.length === 2);
assert.equal(state.actors.filter(a => a.id === 'recepcionista').length, 1);
assert.equal(state.objects.find(o => o.id === 'totem').moduleSystem.id, 'destination_panel');
const original = { ...state.progress.flags };
player.x = 2; player.y = 2;
let minX = Infinity, maxX = -Infinity;
for (let i = 0; i < 1600; i++) {
  updateLobbyVisitor(visitor, player, map, .033);
  minX = Math.min(minX, visitor.x); maxX = Math.max(maxX, visitor.x);
  assert(canStandAt(map, visitor.x, visitor.y, .2, visitor), 'viajante não atravessa paredes ou móveis');
}
assert(maxX - minX > 3, 'percorre a rota nos dois sentidos');
visitor.visitorRuntime.wait = 0;
player.x = visitor.x + .3; player.y = visitor.y;
const at = { x: visitor.x, y: visitor.y };
updateLobbyVisitor(visitor, player, map, .1);
assert.deepEqual({ x: visitor.x, y: visitor.y }, at, 'espera quando jogador está muito próximo');
assert.deepEqual(state.progress.flags, original, 'vida ambiental não altera progresso');
// Busca em malha fina, considerando hitboxes dos móveis e portais de interação.
state.actors = []; // exclui atores móveis: eles cedem ou mudam de lugar
const step = .25, W = map.layout[0].length * 4, H = map.layout.length * 4;
const walk = (x,y) => canStandAt(map, x, y, .25, player);
const sp = map.spawnPoints.inicio;
const start = [Math.round(sp.x/step), Math.round(sp.y/step)];
const queue = [start], seen = new Set([start.join(',')]);
for (let i = 0; i < queue.length; i++) {
  const [x,y] = queue[i];
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx=x+dx, ny=y+dy, key=`${nx},${ny}`;
    if (nx<0 || ny<0 || nx>=W || ny>=H || seen.has(key) || !walk(nx*step,ny*step)) continue;
    seen.add(key); queue.push([nx,ny]);
  }
}
for (const portal of map.portals) {
  const radius = portal.interactionDistance ?? 1.35;
  assert(queue.some(([x,y]) => Math.hypot(x*step-(portal.x+.5),y*step-(portal.y+.5)) <= radius), `${portal.id} deve continuar acessível`);
}
for (const [id, spawn] of Object.entries(map.spawnPoints)) {
  assert(seen.has(`${Math.round(spawn.x/step)},${Math.round(spawn.y/step)}`), `spawn ${id} continua conectado`);
}
console.log('Saguão vivo: rota segura, espera, progresso e conectividade de spawns e portais OK.');
