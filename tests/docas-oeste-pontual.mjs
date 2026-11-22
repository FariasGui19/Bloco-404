import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {OESTE_PONTUAL_FRAMES} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-oeste-pontual.js';
import {PLANTA_OESTE,RECORTE_OESTE,PES_OESTE,oestePontualPronto,desenharOestePontual} from '../js/engine/docas-oeste-pontual.js';
import {loadSprites} from '../js/engine/sprites.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-oeste-pontual/manifest.json'));
assert.deepEqual(m.frames,OESTE_PONTUAL_FRAMES);assert.deepEqual(m.scope,RECORTE_OESTE);assert.equal(Object.keys(m.frames).length,6);
assert.equal(createHash('sha256').update(readFileSync('assets/source-art/docas-oeste-pontual/composicao.png')).digest('hex'),m.sourceSha256);
assert(m.sourceSize[0]/PLANTA_OESTE[2]>2.7&&m.sourceSize[1]/PLANTA_OESTE[3]>2.7,'native source density');
assert(Object.isFrozen(RECORTE_OESTE)&&RECORTE_OESTE.every(Object.isFrozen));
assert(RECORTE_OESTE.every(([x,y])=>x<530&&y>=200&&y<=535),'only western nook');
assert.equal(oestePontualPronto({meta:{docasEncaixe:true}}),false,'old scene fallback');
const original=globalThis.Image;globalThis.Image=class{set src(s){queueMicrotask(()=>this.onload());}};
try{
 await loadSprites([{id:'docas_oeste_pontual',src:'test-double'},{id:'docas_oeste_pontual_fundos',src:'test-double'}]);
 assert(oestePontualPronto({meta:{docasEncaixe:true}}));assert(!oestePontualPronto({meta:{}}));
 for(const [id,f] of Object.entries(m.frames)){
  const calls=[],ctx=new Proxy({drawImage:(...a)=>calls.push(a)}, {get:(o,k)=>k in o?o[k]:()=>{}});
  desenharOestePontual(ctx,id,2.5);assert.equal(calls.length,1);
  const [x,y,right,bottom]=f.sourceBox,call=calls[0];
  assert.deepEqual(call.slice(1,5),f.rect,'atlas UV');
  assert.equal(call[7],(right-x)*435/1216*2.5,'bbox endpoint is not width');
  assert.equal(call[8],(bottom-y)*310/864*2.5,'bbox endpoint is not height');
 }
}finally{globalThis.Image=original;}
assert(PES_OESTE.arvore<PES_OESTE.palmeiras&&PES_OESTE.palmeiras<PES_OESTE.abrigo&&PES_OESTE.abrigo<PES_OESTE.cerca);
console.log('Oeste pontual: source hash, six native layers, exact registration, local envelope, independent fence depth and fallback OK.');
