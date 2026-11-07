import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { input } from '../js/engine/input.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { getArchetypeAbilities, updateAbilities } from '../js/game/abilities.js';

state.save.loaded = false;
state.save.activeSlot = null;
function reachable(sx, sy) {
  const map = state.world.currentMap, queue = [[Math.round(sx * 4), Math.round(sy * 4)]];
  const seen = new Set([queue[0].join(',')]);
  for (let i = 0; i < queue.length; i++) {
    const [x, y] = queue[i];
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const a = x + dx, b = y + dy, k = `${a},${b}`;
      if (a < 0 || b < 0 || a >= 192 || b >= 192 || seen.has(k)) continue;
      if (canStandAt(map, a / 4, b / 4, 0.25, state.player)) { seen.add(k); queue.push([a,b]); }
    }
  }
  return seen;
}
function dash(x,y,facing) {
  Object.assign(state.player, { x,y,facing,energy:100,ability:{cooldowns:{},dash:null} });
  input.pressed.add('q'); updateAbilities(0); input.pressed.clear();
  for (let i=0; i<20 && state.player.ability.dash; i++) updateAbilities(0.03);
}
for (const archetype of ['mare_astral','nucleo_dez_forma']) {
  state.progress = { archetype, abilities: getArchetypeAbilities(archetype), flags: {}, inventory: [] };
  await loadMap('ilha_praia_inicial');
  const first=state.objects.find(o=>o.id==='travessia_mare_eco');
  const second=state.objects.find(o=>o.id==='passagem_mare_eco');
  let seen=reachable(8,7.5);
  assert(seen.has('69,46'), `${archetype}: aproximação do primeiro gate`);
  assert(!seen.has('120,36'), 'não se pode acessar a ilha B andando sem atravessar');
  dash(17.25,11.5,'right');
  assert(state.player.x > first.x + .85, `primeira travessia ${state.player.x}`);
  assert(state.progress.flags.gate_travessia_mare_eco);
  assert(first.bloqueia && !first.oculto);
  seen=reachable(state.player.x,state.player.y);
  assert(seen.has('146,73'), 'aproximação da segunda travessia a partir da ilha B');
  dash(36.5,18.25,'down');
  assert(state.player.y > second.y + .85, `segunda travessia ${state.player.y}`);
  assert(state.progress.flags.gate_passagem_mare_eco);
  seen=reachable(state.player.x,state.player.y);
  assert(seen.has('120,124'), 'acesso à ilha central');
  assert(seen.has('120,176'), 'acesso ao farol');
  dash(36.5,20.75,'up');
  assert(state.player.y < second.y - .85, 'retorno pela segunda travessia');
  dash(19.75,11.5,'left');
  assert(state.player.x < first.x - .85, 'retorno pela primeira travessia');
}
console.log('Praia: rotas de Maré e 10X, ida e volta e farol OK.');
