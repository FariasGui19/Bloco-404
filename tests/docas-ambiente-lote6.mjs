import assert from 'node:assert/strict';import{readFileSync,readdirSync}from'node:fs';import{createHash}from'node:crypto';
import{AMBIENTE_DOCAS_LOTE6 as pieces}from'../js/data/worlds/arquipelago-rotas-perdidas/docas-ambiente-lote6.js';
import{docas}from'../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import{podePisarDocas}from'../js/game/docas-navigation.js';import{posicaoCaranguejoDocas}from'../js/engine/docas-ambiente-lote6.js';
import{aguaLivreDocas,celulasMarPerimetral}from'../js/engine/docas-mar-perimetral.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-ambiente-lote6/manifest.json'));assert.equal(m.count,10);assert.equal(pieces.length,10);assert.equal(readdirSync('assets/source-art/docas-ambiente-lote6').filter(n=>n.endsWith('.png')).length,10);
const main=readFileSync('js/main.js','utf8');for(const p of pieces){const r=m.assets.find(a=>a.id===p.name);assert(r);assert.equal(createHash('sha256').update(readFileSync('assets/source-art/docas-ambiente-lote6/'+p.name+'.png')).digest('hex'),r.sourceSha256);assert(main.includes(`id: '${p.sprite}'`));const b=readFileSync('assets/sprites/docas-ambiente-lote6/'+p.name+'.png');assert.equal(b[25],6);assert(r.size.every(n=>n<=512));assert(podePisarDocas(docas.navegacaoDocas,p.x*2.5/64,p.y*2.5/22,.12),p.name+' on navigable ground');}
const crab=pieces.find(p=>p.name==='caranguejo');assert.deepEqual(posicaoCaranguejoDocas(docas,crab,0,true),posicaoCaranguejoDocas(docas,crab,100,true));assert.notDeepEqual(posicaoCaranguejoDocas(docas,crab,0,false),posicaoCaranguejoDocas(docas,crab,8,false));
for(let t=0;t<600;t++){const [x,y]=posicaoCaranguejoDocas(docas,crab,t,false);assert(podePisarDocas(docas.navegacaoDocas,x*2.5/64,y*2.5/22,.08));}
const bounds={left:0,right:1568,top:0,bottom:880};assert.strictEqual(celulasMarPerimetral(bounds),celulasMarPerimetral(bounds),'reuse grid until camera crosses a cell boundary');
assert.equal(aguaLivreDocas(docas,0,0),true);assert.equal(aguaLivreDocas(docas,620,650,0),false);
console.log('Lote 6: ten hashed RGBA originals, ten grounded nonsolid details, 600 crab floor samples, stable reduced motion and reusable sea cell cache OK.');
