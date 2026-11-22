import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const texturas=['areia','terra','pedras','falesia'],props=['conchas','destrocos','cordas','ancora','poste','capim'];
for(const id of [...texturas,...props]){
 const b=readFileSync(`assets/sprites/docas-lote5/${id}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${id} RGBA`);
 if(texturas.includes(id)){assert.equal(b.readUInt32BE(16),256);assert.equal(b.readUInt32BE(20),256);}
 else assert(docas.estruturasDocas.some(s=>s.id==='lote5_'+id),`${id} usado no mapa`);
}
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
for(const st of docas.estruturasDocas){if(['barco','pier','central_fundos'].includes(st.id))continue; // backdrops and the off-floor boat/pier
 const s=docas.geometriaDocas.escala;assert(docas.geometriaDocas.polys.some(p=>inside(st.x/s,st.y/s,p)),`${st.id} deve ter pé sobre terreno`);}
for(const id of ['docas_diario_pier','docas_diario_trilha'])assert(docas.objects.some(o=>o.id===id&&o.interacao),`${id} disponível`);
console.log('Docas lote 5: dez peças, pés sobre terreno e diários disponíveis OK.');
