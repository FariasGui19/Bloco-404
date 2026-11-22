import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SPRITES_TRAVESSIA,MARCOS_TRAVESSIA} from '../js/data/travessia-lote1.js';
assert.equal(SPRITES_TRAVESSIA.length,10);assert.equal(new Set(SPRITES_TRAVESSIA).size,10);
for(const name of SPRITES_TRAVESSIA){
 for(const suffix of ['','-folha']){
  const path=`assets/sprites/travessia-lote1/${name}${suffix}.png`;assert(existsSync(path),path);
  const b=readFileSync(path);assert.equal(b.readUInt32BE(0),0x89504e47,'PNG válido');
  if(suffix){assert.equal(b.readUInt32BE(16),1280,`${name} deve ter 8 quadros de 160`);assert.equal(b.readUInt32BE(20),160);}
 }
}
for(const marker of MARCOS_TRAVESSIA){assert(SPRITES_TRAVESSIA.includes(marker.tipo));assert(Number.isFinite(marker.x)&&Number.isFinite(marker.y));}
console.log('Lote marítimo: dez peças, transparências preparadas e folhas 8×160 presentes.');
