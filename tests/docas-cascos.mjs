import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSprites } from '../js/engine/sprites.js';
import { CAIS_SUL } from '../js/data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { FOLHAS_CASCOS, SPRITES_CASCOS, quadroCasco, desenharCascoNovo, desenharAguaCasco } from '../js/engine/docas-cascos.js';
import { CICLO_RESSACA } from '../js/engine/docas-ressaca.js';

const manifest=JSON.parse(readFileSync('assets/sprites/docas-cascos/manifest.json'));
assert.equal(SPRITES_CASCOS.length,10);
assert.equal(Object.keys(manifest.sheets).length,10);
for(const {id,src} of SPRITES_CASCOS){
  const info=FOLHAS_CASCOS[id.replace('docas_cascos_','')];
  const file=readFileSync(src);
  assert.equal(file.toString('ascii',8,16),'WEBPVP8L');
  const flags=file.readUInt32LE(21);
  assert(flags&(1<<28),'RGBA');
  assert.equal((flags&0x3fff)+1,info.w*4);
  assert.equal(((flags>>>14)&0x3fff)+1,info.h*4);
}
const boat=CAIS_SUL.pecas.find(p=>p.id==='pesqueiro');
assert.equal(quadroCasco(boat,null),0);
for(const t of [-10,.18,2.13,88.2]){
  assert.equal(quadroCasco(boat,t),quadroCasco(boat,t+CICLO_RESSACA));
  assert(quadroCasco(boat,t)>=0&&quadroCasco(boat,t)<16);
}
const draws=[];
const ctx={globalAlpha:1,save(){},restore(){this.globalAlpha=1;},drawImage(...args){draws.push(args);}};
assert.equal(desenharCascoNovo(ctx,boat,1),false,'fallback before loading');
globalThis.Image=class{set src(src){this.url=src;this.onload();}};
await loadSprites(SPRITES_CASCOS);
for(const id of ['pesqueiro','bote']){
  const p=CAIS_SUL.pecas.find(p=>p.id===id);
  const before=JSON.stringify(p);
  assert(desenharCascoNovo(ctx,p,1));
  assert.deepEqual(draws.at(-1).slice(-4),[p.x,p.y,p.w,p.h]);
  desenharAguaCasco(ctx,p,1);desenharAguaCasco(ctx,p,1,true);
  assert.equal(JSON.stringify(p),before,'render never changes collision, feet or anchors');
  const d=draws.length;
  desenharAguaCasco(ctx,p,null);desenharAguaCasco(ctx,p,null,true);
  const fixed=draws.slice(d);
  for(const a of fixed)assert.deepEqual(a.slice(1,3),[0,0],'reduced motion freezes all sheets');
}
const d=draws.length;
desenharAguaCasco(ctx,{id:'deck'},1);
assert.equal(draws.length,d,'pier is not animated');
console.log('Cascos: 10 folhas / 160 quadros RGBA, ciclo, repouso, fallback e encaixe preservados.');
