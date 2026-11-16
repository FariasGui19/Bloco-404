// node --experimental-default-type=module tests/estacao-encaixe.mjs
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { map as station } from '../js/data/worlds/arquipelago-rotas-perdidas/estacao-666.js';
import { map as coast } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { canStandAt } from '../js/game/collision.js';
import { findNearestInteraction } from '../js/game/interactions.js';
import { usePortal } from '../js/game/portals.js';

globalThis.window = { addEventListener() {}, removeEventListener() {} };
const visual = station.objects.find(o => o.id === 'saida_estacao_666_visual');
const exit = station.portals.find(o => o.id === 'voltar_enseada_666');
assert.equal(visual.x + .5, 1, 'eclusa deve estar no plano da parede x=1');
assert.equal(visual.y, exit.y, 'eclusa e interação devem apontar para a mesma seção');
assert(visual.larguraPx >= 95 && visual.camada === 'fundo');
assert(Math.hypot(station.spawnPoints.vindo_da_enseada.x-(exit.x+.5),station.spawnPoints.vindo_da_enseada.y-(exit.y+.5)) > exit.interactionDistance);
const mountain = coast.objects.find(o => o.id === 'enseada_macico_leste');
// Arte aprovada: a montanha angular da referência (`estacao-integrada`).
// A v2 (`estacao-66-completa`, com a base arredondada) foi rejeitada.
assert.equal(mountain.sprite, 'enseada_estacao_integrada');
assert.equal(mountain.camada, 'fundo');
assert.equal(mountain.larguraPx, 860, 'penhasco ampliado');
const visualPortal = coast.portals.find(p => p.id === 'acesso_estacao_666');
// Em pixels isométricos, a porta da arte fica a ~16% da largura à direita do
// centro e a Soleira a ~8,8% da largura ACIMA da base do sprite. A montanha
// aprovada (`estacao-integrada`, 530x275) tem a base arenosa inteira e o mar
// encosta direto na rocha da direita. Objetos e portal recebem ambos meio tile
// na renderização e na interação, então o deslocamento cancela.
const dx = ((visualPortal.x - visualPortal.y) - (mountain.x - mountain.y)) * 32;
const dy = ((visualPortal.x + visualPortal.y) - (mountain.x + mountain.y)) * 16;
assert(Math.abs(dx - mountain.larguraPx * .1594) < 8, 'portal alinhado horizontalmente com a porta');
assert(Math.abs(dy - mountain.larguraPx * -.0881) < 8, 'portal alinhado verticalmente com a soleira');
assert(!coast.caminhosAreia.some(([x,y]) => x === 22.5 && y === 11.75), 'manchas de areia antigas removidas');
assert(coast.objects.some(o => o.id.startsWith('enseada_parede_estacao_') && o.bloqueia));
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
const entrancePortal = state.portals.find(p => p.id === 'acesso_estacao_666');
const returnSpawn = coast.spawnPoints.vindo_da_estacao_666;
assert(canStandAt(coast, entrancePortal.x + .5, entrancePortal.y + .5, .25, state.player), 'soleira acessível');
assert(canStandAt(coast, returnSpawn.x, returnSpawn.y, .25, state.player), 'retorno seguro');
assert(Math.hypot(returnSpawn.x - entrancePortal.x - .5, returnSpawn.y - entrancePortal.y - .5) > entrancePortal.interactionDistance, 'retorno fora do alcance imediato');
for (const wall of state.objects.filter(o => o.id.startsWith('enseada_parede_estacao_'))) {
  assert(!canStandAt(coast, wall.x, wall.y, .2, state.player), `${wall.id} deve bloquear`);
}
// Da saída à porta há caminho real sem atravessar a fundação.
const seen = new Set(), queue = [[Math.round(returnSpawn.x * 2), Math.round(returnSpawn.y * 2)]]; let entradaAlcancada = false;
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
// A porta mantém o bloqueio por sinal e realiza ida e retorno reais.
globalThis.document = { getElementById: () => null };
state.world.portalLockUntil = 0;
state.progress.flags.frequencia666Registrada = false;
assert.equal(await usePortal(entrancePortal), false, 'entrada fechada sem sinal');
state.progress.flags.frequencia666Registrada = true;
assert.equal(await usePortal(entrancePortal), true, 'entrada liberada com sinal');
assert.equal(state.world.currentMapId, 'estacao_limiar_666');
state.world.portalLockUntil = 0;
const back = state.portals.find(p => p.id === 'voltar_enseada_666');
assert.equal(await usePortal(back), true, 'retorno à Enseada');
assert.equal(state.world.currentMapId, 'ilha_enseada_ecos');
assert(canStandAt(coast, state.player.x, state.player.y, .25, state.player), 'retorno pousa em local seguro');
console.log('Encaixe e acesso da Estação 66.6 OK.');
// A estação se move como um grupo: a porta mantém sua posição relativa,
// a mata tem colisão e a praia não foi sobreposta à força por um sprite.
// A montanha foi reconectada à referência com o mar encostando na rocha;
// o grupo inteiro (arte, paredes, soleira) se desloca junto.
// Setor Norte revisado: a montanha subiu para a porta e o cone ficarem
// livres acima da linha das palmeiras, e a borda rochosa direita encosta
// no mar sem faixa de grama cortando a base.
assert(Math.abs(mountain.x - 16.2) < 1e-8 && Math.abs(mountain.y - 21.8) < 1e-8);
const mata = coast.objects.find(o => o.id === 'enseada_mata_juncao_estacao');
assert(mata?.bloqueia && mata.hitbox && mata.camada !== 'fundo');
// O chão da ilha vem inteiro do traçado da arte (`enseada-chao.js`), não de
// mancha elíptica: a grama da junção é a mesma célula de grama da referência.
assert(coast.celulasGrama?.length, 'grama da junção precisa seguir a superfície do mapa');
const gramaJuncao = coast.celulasGrama
  .reduce((n, linha) => n + linha.filter(Boolean).length, 0);
assert(gramaJuncao > 800, `grama traçada da arte ausente (${gramaJuncao} células)`);
