import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const names=['banco','boias','engrenagem','flores','pescaria','placa','postes','tronco','vasos','anfora'];
const main=readFileSync('js/main.js','utf8');
for(const name of names){
 const b=readFileSync(`assets/sprites/docas-lote9/${name}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${name} RGBA`);
 const st=docas.estruturasDocas.find(s=>s.id==='lote9_'+name);assert(st,`${name} presente`);assert(main.includes(`docas_lote9_${name}`));
 const x=st.x/ESCALA_DOCAS,y=st.y/ESCALA_DOCAS;
 function inside(p){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
 assert(docas.geometriaDocas.polys.some(inside),`${name} ancorado no piso/deck`);
}
console.log('Docas lote 9: dez peças RGBA registradas e ancoradas.');
