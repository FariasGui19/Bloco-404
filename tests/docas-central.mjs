import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {poseCentral,JANELAS_CENTRAIS,desenharAcessosCentrais,desenharLuzesCentrais,desenharPatioCentral} from '../js/engine/docas-central.js';
// Snapshots of protected data from 68ba219. Only presentation may change here.
const protectedData={
 layout:'af4b1cc32691fd0d282bb022505fd95f3b04d265727a1a0233bf4a294e3d44d6',
 geometriaDocas:'05c56bc15dcf165d84819a4237a1843d7e5cf136e13c7c3059a0ba48f092cde7',
 caisSul:'f7945bcf7d8dbad288ca9fe7d12a87f5d0567c72eb977c7ba48bdc2571887ac8',
 costaOeste:'c0c4cefefc4565a7c3ea13ed05a34dc049caae126c82a8221b5d3867a0ca9e83',
 spawnPoints:'016836a1b8becc01a57d3e77c00bd46e5dfab6ec44a4217e8caf8e1c04ead752',
 objects:'c71645905a1ddbe63e04eca66b2225a4806d65dd04f552e4b4167e274a03fe70',
 portals:'9021533aefca7ecc0a6be8e386bcb6c46e7c405bfbd74b9fc6bbef0e0f441844',
 marDocas:'6bb97ffa85908e9da28a9cf6347a7e1e4e58a99cfd202690392df2ffee4a0ee6',
};
for(const [key,hash] of Object.entries(protectedData))assert.equal(createHash('sha256').update(JSON.stringify(docas[key])).digest('hex'),hash,`${key} unchanged`);
assert.equal(docas.estruturasDocas.find(s=>s.id==='galpao').sprite,'central_console');
assert.equal(docas.estruturasDocas.find(s=>s.id==='central_fundos').sprite,'galpao');
assert.equal(Object.keys(JANELAS_CENTRAIS).length,4);
assert.notDeepEqual(poseCentral(0),poseCentral(2));
assert.deepEqual(poseCentral(0,true),poseCentral(100,true));
for(let i=0;i<500;i++){
 const p=poseCentral(i/25);assert(p.luz>0&&p.luz<1);assert(p.vigia>=.35&&p.vigia<=1);assert(Math.abs(p.vento)<=.009);
}
let depth=0,ellipses=0,gradients=0;
const ctx=new Proxy({save(){depth++;},restore(){depth--;assert(depth>=0);},ellipse(){ellipses++;},createRadialGradient(){gradients++;return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:()=>{};}});
const state={player:{x:-100,y:-100},progress:{flags:{}},interaction:null};
const before=JSON.stringify(state);
desenharAcessosCentrais(ctx,docas,state,3,false);assert.equal(ellipses,0,'distant doors do not shine');
const door=docas.portals[0];state.player={x:door.x,y:door.y};
const close=JSON.stringify(state);desenharAcessosCentrais(ctx,docas,state,3,false);assert.equal(ellipses,1);assert.equal(JSON.stringify(state),close);
for(const st of docas.estruturasDocas)desenharLuzesCentrais(ctx,st,{x:0,y:0,w:100,h:100},2,false);
assert(gradients>=12);desenharPatioCentral(ctx,2.5,3,false,{});assert.equal(depth,0,'Canvas state balanced');
state.player={x:-100,y:-100};assert.equal(JSON.stringify(state),before,'no gameplay writes');
console.log('Área central: fontes/poses, luz reduzida estável, feedback de portas e oito contratos protegidos intactos.');
