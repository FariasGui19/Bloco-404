import assert from'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';
import{INTERATIVOS_DOCAS_LOTE7 as pieces}from'../js/data/worlds/arquipelago-rotas-perdidas/docas-interativos-lote7.js';
import{estadoInterativoDocas,desenharInterativoDocas}from'../js/engine/docas-interativos.js';
import{poseInfectadoDocas}from'../js/engine/docas-infectados.js';
import{atualizarAmeacasCromaticas,criarAmeacaCromatica}from'../js/game/mare-cromatica-ameacas.js';
import{docas,cabanaOeste,cabanaLeste,galpao}from'../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import{loadSprites}from'../js/engine/sprites.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-interativos-lote7/manifest.json')),main=readFileSync('js/main.js','utf8');assert.equal(m.count,10);assert.equal(readdirSync('assets/source-art/docas-interativos-lote7').filter(n=>n.endsWith('.png')).length,10);assert.equal(Object.keys(pieces).length,7);
for(const r of m.assets){assert.equal(createHash('sha256').update(readFileSync('assets/source-art/docas-interativos-lote7/'+r.id+'.png')).digest('hex'),r.sourceSha256);assert(main.includes('assets/sprites/docas-interativos-lote7/'+r.id+'.png'));const b=readFileSync('assets/sprites/docas-interativos-lote7/'+r.id+'.png');assert.equal(b[25],6);assert(r.size.every(n=>n<=512));}
let count=0;for(const map of[cabanaOeste,cabanaLeste,galpao])for(const o of map.objects.filter(o=>o.docasInterativo)){count++;assert.equal(o.docasInterativo,pieces[o.id]);assert.equal(o.bloqueia,false);assert(o.interacao?.distancia>0);}assert.equal(count,9);
const st={progress:{flags:{},mareCromatica:{fragmentos:[],fitas:[]}},world:{currentMapId:galpao.id},player:{x:0,y:0}};
const tape={id:'cromatica_fita_casa',x:2,y:4,docasInterativo:pieces.cromatica_fita_casa};assert(estadoInterativoDocas(tape,st).empty);st.progress.mareCromatica.fitas.push('casa');assert(estadoInterativoDocas(tape,st).done);assert(!estadoInterativoDocas(tape,st).empty);
const key={id:'docas_chave',x:2,y:6,docasInterativo:pieces.docas_chave};assert(!estadoInterativoDocas(key,st).done);st.progress.flags.docas_chave=true;assert(estadoInterativoDocas(key,st).done);
assert.equal(poseInfectadoDocas({health:0,deathVisual:.5}).phase,'queda');assert.equal(poseInfectadoDocas({health:50,alertVisual:.3}).phase,'alerta');assert.equal(poseInfectadoDocas({health:50,cooldown:2.1}).phase,'recuperacao');
const e={health:0,cromaticaEnemy:true,x:0,y:0},rt=criarAmeacaCromatica(docas);let hits=0;for(let i=0;i<20;i++)atualizarAmeacasCromaticas(docas,rt,[e],{x:2,y:2},{},.1,()=>true,()=>hits++);assert.equal(e.deathVisual,0);assert.equal(e.health,0);assert.equal(hits,0);
// Cache built once; subsequent frames never re-reduce the high-res source.
const oldImage=globalThis.Image,oldDoc=globalThis.document;let builds=0,depth=0;
globalThis.Image=class{width=512;height=256;set src(v){queueMicrotask(()=>this.onload());}};
const ctx=new Proxy({save(){depth++},restore(){depth--}},{get:(o,k)=>k in o?o[k]:()=>{}});
try{await loadSprites([{id:pieces.docas_chave.sprite,src:'test-double'}]);globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){builds++}}}}}};const before=JSON.stringify(st);for(let i=0;i<60;i++)assert(desenharInterativoDocas(ctx,key,st));assert.equal(builds,1);assert.equal(depth,0);assert.equal(JSON.stringify(st),before);}finally{globalThis.Image=oldImage;globalThis.document=oldDoc;}
console.log('Lote 7: ten original assets, nine unchanged interactive placements, progress-aware status, three enemy phases, bounded death fade and one raster build for 60 frames OK.');
