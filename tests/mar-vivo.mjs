import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/rota-mare.js';
import { map as enseada } from '../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import { estadoMar, animacaoMar } from '../js/game/mar-vivo.js';
import { CLIMAS, CORRENTE, criarClima, atualizarClima, neblinaDoClima } from '../js/game/clima.js';
import { criarEstadoNado, atualizarNado, podeNadar, controlarMergulhoFixo } from '../js/game/nado.js';
import { getCoastFieldForMap } from '../js/engine/coast-field.js';
import { loadMap } from '../js/game/map-manager.js';
import { state } from '../js/game/state.js';
import { findNearestInteraction, getInteractionPrompt } from '../js/game/interactions.js';
import { moveWithCollision, getBlockingObject } from '../js/game/collision.js';

for (const name of ['onda-crista','onda-larga','chuva-mar','barco-pescador','barco-carga','boia-sinal','coral-leque','medusa-luz','ruina-submersa','peixes-luz']) {
  const p=`assets/sprites/mar-vivo/${name}.png`;
  assert(existsSync(p) && statSync(p).size < 200_000, `arte ausente ou pesada: ${p}`);
}
for (const m of [map,enseada]) for (const p of m.ondasMar) assert(podeNadar(m,p.x,p.y),'ondas somente na água');
for (const p of map.fundoMar) assert(podeNadar(map,p.x,p.y), 'decoração submersa somente na água');
assert(estadoMar({mar:1,chuva:1}).amplitude > estadoMar({mar:0}).amplitude);
assert(estadoMar({mar:1}).visibilidade < estadoMar({mar:0}).visibilidade);
assert.deepEqual(animacaoMar(1,0,{mar:.8},true),animacaoMar(1,999,{mar:.8},true),'respeita movimento reduzido');
assert.notDeepEqual(animacaoMar(1,0,{mar:.8}),animacaoMar(1,1,{mar:.8}));
assert(CORRENTE.includes('neblina'),'neblina participa do ciclo');
assert.equal(neblinaDoClima({atual:'nublado',proximo:'neblina',fracao:0}),0);
assert.equal(neblinaDoClima({atual:'neblina',proximo:'brisa',fracao:0}),1);
assert.equal(neblinaDoClima({atual:'neblina',proximo:'brisa',fracao:1}),0);
assert.equal(neblinaDoClima({atual:'nublado',proximo:'neblina',fracao:.5}),.5);
for (let i=0;i<CORRENTE.length;i++) {
  const a=CLIMAS[CORRENTE[i]], b=CLIMAS[CORRENTE[(i+1)%CORRENTE.length]];
  assert(Math.abs(a.mar-b.mar)<=.26,'mudança entre faixas sem salto de ressaca direto para sol');
}
const clima=criarClima(1);
const visitados=new Set();
for (let i=0;i<7000;i++) { atualizarClima(clima,.1); visitados.add(clima.atual); }
assert(clima.mudancas>=9 && visitados.has('neblina'),'ciclo evolui até neblina');

const n=criarEstadoNado(), field=getCoastFieldForMap(map), arvore={nivel:4,provas:{},respeito:0};
const atualizar=(mergulhar,dt=.05)=>atualizarNado(n,{map,x:24.5,y:15.5,field,dt,arvore,mareAstral:true,mergulhoLivre:true,mergulhar});
n.ar=.01; n.profundidade=1.6; n.ativo=true; n.submerso=true;
assert(atualizar(true).engoliuAgua); assert(n.semFolego);
for(let i=0;i<25;i++) atualizar(false);
assert(!n.submerso && !n.semFolego && n.ar>=4,'sobe, respira e só então permite outro mergulho');
n.ar=.01; n.profundidade=1.6; n.ativo=true; n.submerso=true;
atualizar(true);
while(n.profundidade>1.25) atualizar(false,.01);
assert(n.semFolego,'não aceita novo mergulho imediatamente sem recuperar ar');
assert.equal(controlarMergulhoFixo(n,true,true),false,'Z não contorna exaustão');
atualizar(true,.01);assert(n.semFolego,'segurar mergulho não contorna exaustão');
for(let i=0;i<150;i++) atualizar(false,.01);
assert(!n.semFolego && n.ar>=4);

// A posição visual dos cascos é fixa, sem colisão ou transporte fictício.
globalThis.window={addEventListener(){},removeEventListener(){}};
state.save.loaded=false;state.progress={archetype:'mare_astral',flags:{rota_livre_enseada_aberta:true},nado:arvore};
await loadMap(map.id,'vindo_da_enseada');
for (const item of state.objects.filter(o=>o.flutuanteMar)) {
  assert.equal(item.bloqueia,false); assert.equal(getBlockingObject(item.x,item.y,.25,state.player),null);
  const nadador={x:item.x-.7,y:item.y}; moveWithCollision(map,nadador,.7,0,.25,podeNadar);
  assert(nadador.x>item.x-.05,'casco não interrompe o nado');
  Object.assign(state.player,{x:item.x,y:item.y});
  const interaction=findNearestInteraction();
  assert.equal(interaction?.data.id,item.id,`${item.id} acessível para leitura`);
  assert(getInteractionPrompt(interaction));
}
console.log('Mar vivo: dez artes leves, clima gradual, ondas, barcos, boia e respiro seguro OK.');
