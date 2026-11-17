import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { moveWithCollision } from '../js/game/collision.js';
import { podeNadar, aguaDoDegrau } from '../js/game/nado.js';
import { findNearestInteraction } from '../js/game/interactions.js';
import { usePortal } from '../js/game/portals.js';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
globalThis.document = { getElementById: () => null };
state.save.loaded = false;
await loadMap('ilha_enseada_ecos');
// O portal NE fica isolado: a travessia é nadando, não por pedras invisíveis.
Object.assign(state.player, { x: 35.5, y: 8.5 });
const route = [[36.5,8.5],[36.5,7.5],[36.5,6.5],[36.5,5.5],[36.5,4.5]];
for (const [x,y] of route) {
  assert(moveWithCollision(map, state.player, x-state.player.x, y-state.player.y, .25, aguaDoDegrau(4)));
  assert(Math.hypot(state.player.x-x,state.player.y-y)<.001, `passagem bloqueada em ${x},${y}`);
  assert(podeNadar(map,x,y), 'acesso isolado deve permanecer nadável');
}
assert('YyDdX'.includes(map.aguaPraia[7][35]), 'mar preservado sob a travessia');
assert(podeNadar(map, 33.5, 6.5), 'água adjacente continua nadável');
assert.equal(findNearestInteraction()?.data.id, 'rota_correntes');
const portal = state.portals.find(p => p.id === 'rota_correntes');
state.world.portalLockUntil = 0;
assert(await usePortal(portal));
assert.equal(state.world.currentMapId, 'mar_caminho_das_correntes');
state.world.portalLockUntil = 0;
assert(await usePortal(state.portals.find(p => p.id === 'correntes_enseada')));
assert.equal(state.world.currentMapId, 'ilha_enseada_ecos');
assert(podeNadar(map, state.player.x, state.player.y), 'retorno acontece na água');
assert.equal(map.objects.filter(o => o.id.startsWith('boia_ne_')).length, 5);
console.log('Travessia nadando, interação e retorno do Caminho das Correntes OK.');
