import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FRAMES_FECHAMENTO} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-fechamento.js';
import {APOIOS_FECHAMENTO,BOIAS_FECHAMENTO,DETALHES_MARGEM,itensMargemFechamento,fechamentoPronto} from '../js/engine/docas-fechamento.js';
import {aguaLivreDocas,ganhoMarPerimetral,celulasMarPerimetral} from '../js/engine/docas-mar-perimetral.js';
import {PECAS_ENCAIXE} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const m=JSON.parse(readFileSync('assets/sprites/docas-fechamento/manifest.json'));
assert.deepEqual(m.frames,FRAMES_FECHAMENTO);assert.equal(Object.keys(m.frames).length,3);
const png=readFileSync('assets/sprites/docas-fechamento/atlas.png');assert.equal(png.readUInt32BE(0),0x89504e47);assert.equal(png[25],6);
assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],m.size);
for(const [name,f] of Object.entries(m.frames)){
 const [x,y,w,h]=f.rect;assert(x>=8&&y>=8&&x+w<=m.size[0]-8&&y+h<=m.size[1]-8);
 assert.equal(createHash('sha256').update(readFileSync(`assets/source-art/docas-fechamento/${name}.png`)).digest('hex'),f.sourceSha256);
}
assert.equal(fechamentoPronto(docas),false,'missing generated atlas preserves old renderer');
// No new art may enter the next-stage lighthouse/portal zone.
for(const p of Object.values(APOIOS_FECHAMENTO))assert(p.x+p.w<866||p.y>220);
assert.equal(APOIOS_FECHAMENTO.casinha.foot,451);
assert.equal(BOIAS_FECHAMENTO.length,3);
assert.equal(itensMargemFechamento(2.5).length,5);
for(const p of DETALHES_MARGEM){assert(p.y>220);assert(!aguaLivreDocas(docas,p.x,p.y,0),'detail rooted on existing land');}
for(const b of BOIAS_FECHAMENTO)assert(aguaLivreDocas(docas,b.x,b.y,5),'buoy on water, not fake floor');
const hashes={farol:'872491523955bebacb4b95bcdcb31772b3203eac0b079ca10e8709d5b88d94a2',camara:'408fdb300881dd41d0df254c74385ab082cd3358c6a8ed4434bd5c722665457e',porta:'611188824ad48759a8b1570845c8e3b144bf844fe0aafd62253f43d615e59466'};
for(const [id,h] of Object.entries(hashes))assert.equal(createHash('sha256').update(JSON.stringify(PECAS_ENCAIXE[id])).digest('hex'),h,'protected '+id);
assert(!aguaLivreDocas(docas,875,420,1),'workshop ground excluded');
assert(aguaLivreDocas(docas,-200,-300));assert(aguaLivreDocas(docas,1500,720));
assert.equal(ganhoMarPerimetral(500,700),0,'no extra wave sheets on finished boat water');
assert.equal(ganhoMarPerimetral(1550,500),1);assert.equal(ganhoMarPerimetral(500,-100),1);
const cells=celulasMarPerimetral({left:-400,right:1800,top:-300,bottom:1000});assert(cells.length>100&&cells.length<=360);
assert(cells.some(c=>c.x<0)&&cells.some(c=>c.x>1400)&&cells.some(c=>c.y<0)&&cells.some(c=>c.y>880));
assert.deepEqual(cells,celulasMarPerimetral({left:-400,right:1800,top:-300,bottom:1000}),'deterministic grid');
assert(celulasMarPerimetral({left:-1e5,right:1e5,top:-1e5,bottom:1e5}).length<=360,'bounded budget');
console.log('Fechamento: três artes, apoios/boias, fallback, oceano nos quatro lados, orçamento e topo protegido OK.');
