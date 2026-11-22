import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadSprites } from '../js/engine/sprites.js';
import { CICLO_RESSACA, FOLHAS_RESSACA, SPRITES_RESSACA, desenharFolhaRessaca, desenharTentaculoRessaca, faseRessaca, nivelRessaca, progressoImpacto } from '../js/engine/docas-ressaca.js';
import { poseNavio } from '../js/engine/docas-vivas.js';
import { CAIS_SUL } from '../js/data/worlds/arquipelago-rotas-perdidas/cais-sul.js';

assert.equal(SPRITES_RESSACA.length,10);
assert.equal(new Set(SPRITES_RESSACA.map(sprite=>sprite.id)).size,10);
let total=0;
for(const info of Object.values(FOLHAS_RESSACA))for(const name of info.partes){
  const file=readFileSync(`assets/sprites/docas-ressaca/${name}.webp`);
  assert.equal(file.toString('ascii',8,16),'WEBPVP8L');
  const flags=file.readUInt32LE(21);
  assert(flags&(1<<28),`${name} preserva alfa`);
  assert.equal((flags&0x3fff)+1,info.w*info.colunas);
  assert.equal(((flags>>>14)&0x3fff)+1,info.h*Math.ceil(info.quadros/info.colunas));
  total+=info.quadros;
}
assert.equal(total,156);
const near=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} ≈ ${b}`);
for(const t of [-2,0,1,3,10])near(faseRessaca(610,710,t),faseRessaca(610,710,t+CICLO_RESSACA));
assert.equal(faseRessaca(610,710,null),faseRessaca(800,155,null),'repouso independe da posição/relógio');
assert(faseRessaca(100,250,0)>faseRessaca(150,250,0),'crista propaga para leste');
assert(nivelRessaca(.36)>nivelRessaca(.54));
assert.equal(progressoImpacto(.36),0,'o casco é levantado antes de espirrar');
assert(progressoImpacto(.55)>0&&progressoImpacto(.55)<1);
assert.equal(progressoImpacto(.81),1,'espuma final já dispersada');
const barco=CAIS_SUL.pecas.find(p=>p.id==='pesqueiro'),bote=CAIS_SUL.pecas.find(p=>p.id==='bote');
for(const peca of [barco,bote]){
  const poses=Array.from({length:50},(_,i)=>poseNavio(peca,i*CICLO_RESSACA/50));
  assert(poses.some(p=>p.bob< -1)&&poses.some(p=>p.bob>1));
  assert(poses.some(p=>p.lean<0)&&poses.some(p=>p.lean>0));
  const inicio=poseNavio(peca,0),fim=poseNavio(peca,CICLO_RESSACA);
  for(const chave of Object.keys(inicio))near(inicio[chave],fim[chave]);
  assert.deepEqual(poseNavio(peca,null),{bob:0,lean:0,drift:0});
}
assert.notDeepEqual(poseNavio(barco,2),poseNavio(bote,2),'embarcações amostram pontos diferentes da onda');

// Renderer contract: chapters are seamless in source coordinates and share one
// destination waterline, regardless of how far the creature reaches.
globalThis.Image=class{set src(src){this.url=src;this.onload();}};
await loadSprites(SPRITES_RESSACA);
const draws=[],origens=[];
const ctx={save(){},restore(){this.globalAlpha=1;},translate(...args){origens.push(args);},globalAlpha:1,drawImage(img,...args){draws.push([img.url,...args]);}};
for(const p of [0,.2499,.25,.5,.75,1])assert(desenharTentaculoRessaca(ctx,180,93,.5,p));
assert(draws[1][0].endsWith('tentaculo-emerge.webp'));
assert(draws[2][0].endsWith('tentaculo-dobra.webp'));
assert(draws[3][0].endsWith('tentaculo-alcance.webp'));
assert(draws[5][0].endsWith('tentaculo-recolhe.webp'));
for(const d of draws)assert.deepEqual(d.slice(-4),[-36,-70.5,96,80]);
for(const origem of origens)assert.deepEqual(origem,[180,93]);
assert(desenharFolhaRessaca(ctx,'proa',0,0,50,35,.5,0));
assert.equal(draws.length,6,'não desenha quadros invisíveis');
console.log('Ressaca: dez folhas RGBA, 156 quadros, ciclos contínuos, raiz e repouso fixos.');
