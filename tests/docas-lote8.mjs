import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
for(const nome of ['boia-antiga','rede-pesca','mastro','cesto','madeiras','arbusto','placa','ampola','corais','lampiao']){
 const b=readFileSync(`assets/sprites/docas-lote8/${nome}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${nome} RGBA`);assert(docas.estruturasDocas.some(s=>s.id==='lote8_'+nome),`${nome} integrado`);
}
console.log('Docas lote 8: dez peças estáticas integradas.');
