import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {SPRITES_COSTA_OESTE} from '../js/data/worlds/arquipelago-rotas-perdidas/costa-oeste-docas.js';
const root='assets/sprites/docas-vila-04/';
const manifest=JSON.parse(readFileSync(root+'manifest.json'));
const main=readFileSync('js/main.js','utf8');
assert.equal(Object.keys(manifest.pieces).length,10);
for(const [name,piece] of Object.entries(manifest.pieces)){
 const png=readFileSync(root+piece.file);
 assert.equal(png.readUInt32BE(0),0x89504e47);
 assert.equal(png[25],6,`${name}: RGBA`);
 assert.deepEqual([png.readUInt32BE(16),png.readUInt32BE(20)],piece.size);
 assert(main.includes(root+piece.file)||SPRITES_COSTA_OESTE.some(s=>s.src===root+piece.file),`${name}: carregado no jogo`);
}
const cargo=docas.estruturasDocas.filter(s=>s.id==='vila04_carga');
assert.equal(cargo.length,3);
assert(cargo.every(s=>s.camada==='objeto'&&s.largura>0));
for(const [id,x,y,w] of [['cabana-oeste',585,478,150],['cabana-leste',1200,510,160],['galpao',875,468,145]]){
 const st=docas.estruturasDocas.find(s=>s.id===id);
 assert.deepEqual([st.x,st.y,st.largura],[x,y,w].map(n=>n*ESCALA_DOCAS),'âncoras e dimensões mantidas');
}
assert.equal(docas.portals.length,3,'três interiores continuam acessíveis');
console.log('Vila 04: dez PNGs RGBA registrados, carga estática sem atlas, prédios e portas preservados.');
