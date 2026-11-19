import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
import {ordenarProfundidadeDocas} from '../js/engine/docas-view.js';
const names=['algas','ancoradouro','barricada','bau','coral','farolete','fogueira','guincho','placa-lore','tambores'];
const main=readFileSync('js/main.js','utf8');
for(const name of names){
 const b=readFileSync(`assets/sprites/docas-lote10/${name}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${name} RGBA`);
 const st=docas.estruturasDocas.find(s=>s.id==='lote10_'+name);assert(st,`${name} presente`);assert(main.includes(`docas_lote10_${name}`));
 const x=st.x/ESCALA_DOCAS,y=st.y/ESCALA_DOCAS;
 function inside(p){let v=false;for(let i=0,j=p.length-1;i<p.length;j=i++){let [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)v=!v;}return v;}
 assert(docas.geometriaDocas.polys.some(inside),`${name} ancorado no piso/deck`);
 assert.deepEqual(ordenarProfundidadeDocas([{id:'frente',y:st.y+1},{id:name,y:st.y},{id:'atras',y:st.y-1}]).map(o=>o.id),['atras',name,'frente']);
}
for(const id of ['docas_mural_vigia','docas_fogueira'])assert(docas.objects.some(o=>o.id===id&&o.interacao));
console.log('Docas lote 10: dez peças RGBA registradas, ancoradas e ordenadas; dois registros narrativos.');
