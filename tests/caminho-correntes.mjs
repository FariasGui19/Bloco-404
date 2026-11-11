import assert from 'node:assert/strict';
import {map} from '../js/data/worlds/arquipelago-rotas-perdidas/caminho-correntes.js';
import {map as enseada} from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import {WORLD_REGISTRY} from '../js/data/world-registry.js';
import {atualizarRotaCorrentes} from '../js/game/rota-correntes.js';
import {getQuestState} from '../js/game/quests.js';
import {getVidaAquatica} from '../js/game/vida-aquatica.js';
assert(WORLD_REGISTRY[map.id]);
const entrada = enseada.portals.find(p => p.destino.mapId === map.id);
const retorno = map.portals.find(p => p.destino.mapId === enseada.id);
assert(entrada && retorno);
for (const [m, p] of [[enseada, entrada], [map, retorno]]) assert('SM'.includes(m.aguaPraia[Math.floor(p.y)][Math.floor(p.x)]));
assert('SM'.includes(map.aguaPraia[24][5]));
assert(map.pontosCorrente.every(p => map.aguaPraia[Math.floor(p.y)][Math.floor(p.x)] === 'D'));
const vida = getVidaAquatica(map);
assert(vida.recifes.length && vida.cardumes.length >= 3);
// Cada baliza pertence ao mesmo mar contínuo, ligado à costa do spawn.
const filas = [[9,24]], visitados = new Set(['9,24']);
while (filas.length) {
  const [x,y] = filas.shift();
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx=x+dx, ny=y+dy, chave=`${nx},${ny}`;
    if (visitados.has(chave) || !'YD'.includes(map.aguaPraia[ny]?.[nx] ?? '?')) continue;
    visitados.add(chave); filas.push([nx,ny]);
  }
}
assert(map.pontosCorrente.every(p => visitados.has(`${Math.floor(p.x)},${Math.floor(p.y)}`))); 
const progress = {archetype:'mare_astral', flags:{}};
const player = {x:5.5,y:24.5,nado:{ativo:true,mareAstral:true,profundidade:1}};
assert(atualizarRotaCorrentes(map, player, progress));
assert.equal(getQuestState(progress, 'caminho_das_correntes').status, 'active');
for (const ponto of map.pontosCorrente) {
  Object.assign(player, {x:ponto.x,y:ponto.y});
  player.nado.profundidade = 1;
  assert.equal(atualizarRotaCorrentes(map,player,progress),null);
  player.nado.profundidade = 1.6;
  player.nado.mareAstral = false;
  assert.equal(atualizarRotaCorrentes(map,player,progress),null);
  player.nado.mareAstral = true;
  assert(atualizarRotaCorrentes(map,player,progress));
  assert.equal(atualizarRotaCorrentes(map,player,progress),null);
}
assert.equal(getQuestState(progress,'caminho_das_correntes').status,'completed');
assert.equal(progress.flags.caminho_das_correntes_concluido,true);
assert(progress.inventory.includes('mapa_das_correntes'));
const salvo = JSON.parse(JSON.stringify(progress));
assert.equal(atualizarRotaCorrentes(map,player,salvo),null);
assert.equal(salvo.inventory.filter(i=>i==='mapa_das_correntes').length,1);
console.log('Rota marítima: entrada, retorno, vida, profundidade, missão e persistência OK.');
