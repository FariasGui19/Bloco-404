import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {PECAS_FIEIS,costaFielPronta} from '../js/engine/docas-fechamento.js';
import {ganhoMarPerimetral,celulasMarPerimetral} from '../js/engine/docas-mar-perimetral.js';
const hash=b=>createHash('sha256').update(b).digest('hex');
const base='assets/sprites/docas-fidelidade/';
const manifest=JSON.parse(readFileSync(base+'manifest.json'));
assert.equal(Object.keys(manifest).length,5,'five genuinely new generated sources');
for(const [id,m] of Object.entries(manifest))assert.equal(hash(readFileSync(`assets/source-art/docas-fidelidade/${id}.png`)),m.sourceSha256,id+' source provenance');
for(const p of Object.values(PECAS_FIEIS)){
 assert(Object.isFrozen(p)&&Object.isFrozen(p.box));
 const [x,y,w,h]=p.box;assert(x+w<866||y>220,'upper lighthouse and portal reserved');assert(p.foot>=385);
}
for(const [id,file] of [['abrigo','abrigo-oeste'],['fundos','fundos-enraizados'],['costa','costa-sudeste']]){
 const [w,h]=manifest[file].size,[,,dw,dh]=PECAS_FIEIS[id].box;
 assert(w/dw>=2.8&&h/dh>=2.8,id+' native density, no thumbnail enlargement');
}
assert.equal(PECAS_FIEIS.abrigo.foot,451);assert.equal(PECAS_FIEIS.fundos.foot,385);assert.equal(costaFielPronta(),false,'fallback without loaded artwork');
const main=readFileSync('js/main.js','utf8');for(const name of ['abrigo-oeste','fundos-enraizados','costa-sudeste','mar','solo','acesso-cais'])assert(main.includes(`assets/sprites/docas-fidelidade/${name}.png`),name+' is registered in real game');
assert.equal(ganhoMarPerimetral(500,700),0,'finished ship-water sector preserved');
assert(celulasMarPerimetral({left:-10000,right:10000,top:-10000,bottom:10000}).length<=360);
console.log('Fidelidade: five source hashes, native density, frozen placements, protected top, six real registrations and sea budget OK.');
