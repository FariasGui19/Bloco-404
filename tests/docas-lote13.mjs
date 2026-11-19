import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const names=['brasa','brilho-ambar','brilho-ciano','chama','faixas-nevoa','fumaca','linha-crt','onda-ciano','onda-magenta','redemoinho'];
const main=readFileSync('js/main.js','utf8'),renderer=readFileSync('js/engine/docas-view.js','utf8');
for(const name of names){
 const b=readFileSync(`assets/sprites/docas-lote13/${name}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${name} RGBA`);
 assert(main.includes(`docas_fx_${name}`),`${name} registrado`);assert(renderer.includes(`docas_fx_${name}`)||renderer.includes(`'${name}'`),`${name} utilizado`);
}
const sheet=readFileSync('assets/sprites/docas-lote13/chama-folha.png');assert.equal(sheet.readUInt32BE(16),1024);assert.equal(sheet.readUInt32BE(20),128);assert.equal(sheet[25],6);
assert(renderer.includes('state.progress?.flags?.docas_fogueira_acesa'),'fogo só deve aparecer quando aceso');
assert(renderer.includes('frame=reduced?0:Math.floor(t*7)%8'),'chama respeita movimento reduzido');
console.log('Docas lote 13: dez camadas de efeitos e folha de chama ancorada ao estado da fogueira.');
