// node --experimental-default-type=module tests/estacao-encaixe.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map as station } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-666.js';
import { map as coast } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction } from '../js/game/interactions.js';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
const visual = station.objects.find(o => o.id === 'saida_estacao_666_visual');
const exit = station.portals.find(o => o.id === 'voltar_enseada_666');
assert.equal(visual.x + .5, 1, 'eclusa deve estar no plano da parede x=1');
assert.equal(visual.y, exit.y, 'eclusa e interação devem apontar para a mesma seção');
assert(visual.larguraPx >= 95 && visual.camada === 'fundo');
assert(Math.hypot(station.spawnPoints.vindo_da_enseada.x-(exit.x+.5),station.spawnPoints.vindo_da_enseada.y-(exit.y+.5)) > exit.interactionDistance);
const entrance = coast.objects.find(o => o.id === 'porta_estacao_666_visual');
assert(entrance.larguraPx >= 280 && entrance.depthOffset < 0);
for (const file of ['abrigo-ampliado','fx-vortice','fx-vapor','fx-centelha','fx-sinal','fx-baliza','fx-poeira']) assert(existsSync(`assets/sprites/frequencia-666/${file}.png`));
state.save.loaded = false; state.progress.flags = { frequencia666Registrada: true };
await loadMap('estacao_limiar_666', 'vindo_da_enseada');
Object.assign(state.player,{x:exit.x+.5,y:exit.y+.5});
assert(canStandAt(station,state.player.x,state.player.y,.25,state.player));
assert.equal(findNearestInteraction()?.data.id, exit.id, 'saída é alcançável e selecionável');
for (const obj of state.objects.filter(o => o.id !== 'saida_estacao_666_visual')) {
  assert(obj.bloqueia && obj.hitbox, `${obj.id} deve ter pegada sólida`);
  assert(!canStandAt(station,obj.x,obj.y,.25,state.player), `${obj.id} não permite atravessar o centro`);
}
await loadMap('ilha_enseada_ecos', 'vindo_da_estacao_666');
assert(!canStandAt(coast,16.3,11,.25,state.player),'o corpo do abrigo não é atravessável');
assert(canStandAt(coast,18.5,10.5,.25,state.player),'escadaria e entrada seguem acessíveis');
assert(canStandAt(coast,16.5,13.5,.25,state.player),'retorno da estação continua seguro');
// Da saída ao degrau, há um caminho real de meia célula apesar da fundação.
const entrancePortal = state.portals.find(p => p.id === 'acesso_estacao_666');
const seen = new Set(), queue = [[33,27]]; let entradaAlcancada = false;
for (let i=0;i<queue.length;i++) {
  const [ix,iy] = queue[i], key=`${ix},${iy}`; if (seen.has(key)) continue;
  if (!canStandAt(coast,ix/2,iy/2,.25,state.player)) continue;
  seen.add(key); Object.assign(state.player,{x:ix/2,y:iy/2});
  if (findNearestInteraction()?.data.id === entrancePortal.id) entradaAlcancada = true;
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) queue.push([ix+dx,iy+dy]);
}
assert(entradaAlcancada,'porta acessível a partir do retorno sem atravessar a estrutura');
const receptor = state.objects.find(o => o.id === 'terminal_frequencia_666');
assert(!canStandAt(coast,receptor.x,receptor.y,.25,state.player));
Object.assign(state.player,{x:receptor.x+.8,y:receptor.y});
assert(canStandAt(coast,state.player.x,state.player.y,.25,state.player));
assert.equal(findNearestInteraction()?.data.id,receptor.id,'terminal continua selecionável');
console.log('Encaixe e acesso da Estação 66.6 OK.');
