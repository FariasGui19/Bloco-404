import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const nomes=['cristal','arvore','palmeira','caixotes','barris','resina','fitas','tentaculo','esporos','rede'];
for(const id of nomes){
  const img=readFileSync(`assets/sprites/docas-lote3/${id}-folha.png`);
  assert.equal(img.readUInt32BE(0),0x89504e47);assert.equal(img.readUInt32BE(16),2048);assert.equal(img.readUInt32BE(20),256);assert.equal(img[25],6,'folha RGBA');
  assert(docas.estruturasDocas.some(o=>o.id==='lote3_'+id),`${id} integrado`);
}
assert(docas.estruturasDocas.filter(o=>o.id.startsWith('lote3_')).every(o=>o.camada==='objeto'&&Number.isFinite(o.y)&&o.largura>0),'elementos ordenados pelo pé');
console.log('Docas lote 3: dez folhas RGBA, dimensões e integração em profundidade OK.');
