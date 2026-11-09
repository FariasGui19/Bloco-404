import assert from 'node:assert/strict';
import { map } from '../js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js';
import { beachRailEnd } from '../js/engine/renderer.js';
const raw=map.objects.find(o=>o.id==='trilho_dimensional_principal');
const rail={...raw,x:raw.x+.5,y:raw.y+.5};
const frame={w:100,h:40};
const end=beachRailEnd(rail,frame);
assert.equal(end.x, (rail.x-rail.y)*32+rail.ajusteX-rail.larguraPx/2);
assert.equal(end.y, (rail.x+rail.y)*16+rail.ajusteY-rail.larguraPx/2*rail.skewY-rail.larguraPx*.4*rail.pivotY);
assert.equal(beachRailEnd({...rail,ajusteX:rail.ajusteX+15},frame).x,end.x+15);
assert.equal(beachRailEnd({...rail,ajusteY:rail.ajusteY+20},frame).y,end.y+20);
for(const id of ['plataforma_pilar_oeste','plataforma_pilar_leste']) {
 const pillar=map.objects.find(o=>o.id===id);
 assert(pillar && !pillar.bloqueia); assert.equal(pillar.sprite,'praia_plataforma_kit');
 assert.equal(pillar.y,5); assert('RPSM'.includes(map.aguaPraia[pillar.y][pillar.x]));
}
assert(!map.objects.some(o=>o.id==='praia_luz_estacao'), 'luz antiga sobreposta ao pilar');
assert(map.objects.some(o=>o.id==='terminal_embarque_trem' && o.bloqueia));
console.log('Estação: tunnel at rail crop, beacons on platform and terminal preserved.');
