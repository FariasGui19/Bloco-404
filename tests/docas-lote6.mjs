import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {docas,ESCALA_DOCAS} from '../js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js';
const nomes=['cerca','arvore-seca','cristal-violeta','corais','bote','empilhado','runa','armadilha','rochedos','luminaria'];
for(const nome of nomes){const b=readFileSync(`assets/sprites/docas-lote6/${nome}.png`);assert.equal(b.readUInt32BE(0),0x89504e47);assert.equal(b[25],6,`${nome} RGBA`);assert(nome==='bote'?docas.marDocas.some(x=>x.id==='bote-cais'):docas.estruturasDocas.some(x=>x.id==='lote6_'+nome),`${nome} integrado`);}
assert(docas.objects.some(o=>o.id==='docas_marca_navegantes'&&o.interacao),'marca de lore acessível');
function inside(x,y,p){let yes=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const [a,b]=p[i],[c,d]=p[j];if((b>y)!==(d>y)&&x<(c-a)*(y-b)/(d-b)+a)yes=!yes;}return yes;}
for(let y=0;y<docas.layout.length;y++)for(let x=0;x<docas.layout[y].length;x++){
 const px=(x+.5)*64/ESCALA_DOCAS,py=(y+.5)*22/ESCALA_DOCAS;
 const floor=docas.geometriaDocas.polys.some(p=>inside(px,py,p))&&!docas.geometriaDocas.bloqueios.some(p=>inside(px,py,p));
 assert.equal(docas.layout[y][x]===0,floor,'desenho e colisão usam o mesmo contorno');
}
console.log('Lote 6: dez peças, marca narrativa e contorno coerente com colisão OK.');
