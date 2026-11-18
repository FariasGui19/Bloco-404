import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {canStandAt} from '../js/game/collision.js';
import {state} from '../js/game/state.js';
const nomes=['margem-areia','margem-rochas','raiz-costa','coral-pedra','estacas','passagem','lajotas','talude','cais-degrau','rocha-alta'];
for(const nome of nomes){const b=readFileSync(`assets/sprites/docas-lote7/${nome}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${nome} RGBA`);assert(docas.relevoDocas.some(o=>o.sprite==='lote7_'+nome)||docas.estruturasDocas.some(o=>o.id==='lote7_'+nome),`${nome} integrado`);}
assert.equal(docas.geometriaDocas.terraPolys.length,docas.geometriaDocas.polys.length-1);
assert.equal(docas.geometriaDocas.deckPoly,docas.geometriaDocas.polys[0]);
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
const pos=(x,y)=>[x*ESCALA_DOCAS/64,y*ESCALA_DOCAS/22];
state.world.currentMap=docas;state.objects=[];state.actors=[];
assert(docas.geometriaDocas.deckPoly && inside(620,650,docas.geometriaDocas.deckPoly));
assert(!docas.geometriaDocas.terraPolys.some(p=>inside(620,650,p)),'deck deve ficar visualmente sobre o mar');
assert(canStandAt(docas,...pos(620,650),.25),'spawn permanece no deck');
for(const [x,y] of [[490,680],[710,680],[600,700]])assert(!canStandAt(docas,...pos(x,y),.25),`água fora do deck deve bloquear em ${x},${y}`);
console.log('Lote 7: dez peças, píer sobre água e colisão das bordas OK.');
