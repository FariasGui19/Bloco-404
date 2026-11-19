import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const names=['rocha-musgo','raizes','rede','estacas','caixote','vasilhame','flora','lampiao','residuos','corais'];
const main=readFileSync('js/main.js','utf8');
function inside(x,y,p){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
for(const name of names){
 const b=readFileSync(`assets/sprites/docas-lote12/${name}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${name} RGBA`);
 const st=docas.estruturasDocas.find(s=>s.id==='lote12_'+name);assert(st,`${name} presente`);assert(main.includes(`docas_lote12_${name}`));
 assert(docas.geometriaDocas.polys.some(p=>inside(st.x/ESCALA_DOCAS,st.y/ESCALA_DOCAS,p)),`${name} tem pé sobre piso/deck`);
}
assert(docas.objects.some(o=>o.id==='docas_poca_mare'&&o.interacao));
console.log('Docas lote 12: dez peças RGBA ancoradas e registro da poça.');
