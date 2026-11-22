import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PECAS_INTERIORES_LOTE2} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote2.js';
import {INTERIORES_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-interiores.js';
import {cabanaOeste,cabanaLeste,galpao} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {desenharLuzMobiliaDocas} from '../js/engine/docas-interiores.js';
const manifest=JSON.parse(readFileSync('assets/sprites/docas-interiores-lote2/manifest.json'));
assert.equal(manifest.count,10);assert.equal(PECAS_INTERIORES_LOTE2.length,10);
assert.equal(readdirSync('assets/source-art/docas-interiores-lote2').filter(n=>n.endsWith('.png')).length,10);
assert.equal(new Set(PECAS_INTERIORES_LOTE2.map(p=>p.sprite)).size,10);
const main=readFileSync('js/main.js','utf8');
for(const piece of PECAS_INTERIORES_LOTE2){
 const record=manifest.assets.find(a=>a.id===piece.name);assert(record);
 const bytes=readFileSync(`assets/source-art/docas-interiores-lote2/${piece.name}.png`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sourceSha256);
 const png=readFileSync(`assets/sprites/docas-interiores-lote2/${piece.name}.png`);
 assert.equal(png.readUInt32BE(0),0x89504e47);assert.equal(png[25],6,'RGBA');
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],record.size);
 assert(main.includes(`id: '${piece.sprite}'`));assert(main.includes(`assets/sprites/docas-interiores-lote2/${piece.name}.png`));
 assert(piece.width>0&&piece.width<=110&&piece.maxHeight>0&&piece.maxHeight<=90);
 if(piece.screen)for(const [u,v] of piece.screen)assert(u>=0&&u<=1&&v>=0&&v<=1);
}
// Lock pre-batch positions, dimensions and furniture count (not merely a
// global count that could hide a displaced mission corridor).
const protectedProps={
 mare_cromatica_cabana_oeste:'63174eb4e732fe455ce995c2dd0ff30cfdb4f1e909b82f09f34b90cef0119223',
 mare_cromatica_cabana_leste:'a4eaec4d641b4352cecb2a0b4921807a9b89e4dbee68e8689714d1c4ceef6368',
 mare_cromatica_galpao:'2fd49a3bd6f788dc7790357dbbe83821c70383eabe7557d16d769feeb40e937a',
};
let placements=0,painted=0;
for(const map of [cabanaOeste,cabanaLeste,galpao]){
 const room=INTERIORES_DOCAS[map.id];assert.equal(createHash('sha256').update(JSON.stringify(room.props)).digest('hex'),protectedProps[map.id]);
 const props=map.objects.filter(o=>o.docasProp);assert.equal(props.length,room.props.length);
 for(const [i,o]of props.entries()){
  const [kind,x,y,w,h]=room.props[i];assert.equal(o.docasProp,kind);assert.equal(o.x,x);assert.equal(o.y,y);assert.deepEqual(o.docasSize,[w,h]);
  assert.deepEqual(o.hitbox,{offsetX:-w/2,offsetY:-h/2,width:w,height:h});
  if(PECAS_INTERIORES_LOTE2.includes(o.docasVisual)){placements++;assert.equal(o.docasAsset,o.docasVisual.sprite);}
  if(o.docasAsset)painted++;
 }
}
assert.equal(placements,11,'one rack painting used in two existing racks');assert.equal(painted,18,'batch 3 completes the four remaining procedural props');
// FX only change the lit equipment, never impart glow to beds/storage.
let calls=0,depth=0;const ctx=new Proxy({save(){depth++;},restore(){depth--;},createRadialGradient(){calls++;return {addColorStop(){}};}},{get:(o,k)=>k in o?o[k]:()=>{}});
for(const visual of PECAS_INTERIORES_LOTE2){const old=calls;desenharLuzMobiliaDocas(ctx,{x:2,y:3,docasVisual:visual},0,0,60,80,2,false);assert.equal(calls-old,visual.light?1:0,visual.name+' emission only when authored');}
assert.equal(depth,0);
console.log('Interiores lote 2: exactly ten keyed/registered assets; eleven replacements, unchanged footprints/density; eighteen painted placements including batch 3 and bounded, equipment-only FX OK.');
