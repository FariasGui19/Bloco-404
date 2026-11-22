import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {map} from '../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
globalThis.document={createElement:()=>createCanvas(1,1)};
const {getFrame}=await import('../../js/engine/sprite-clean.js');
const main=fs.readFileSync('js/main.js','utf8');
const src=id=>main.match(new RegExp(`id: '${id}', src: '([^']+)'`))?.[1];
const ids=['enseada_vegetacao_5','enseada_vegetacao_6','carrilhao_vento_enseada','bambus_portico_oeste',...Array.from({length:6},(_,i)=>`arbusto_anotado_oeste_${i+1}`)];
for(const id of ids){
 const o=map.objects.find(o=>o.id===id),a=o.animacaoFolha;
 const base=getFrame(await loadImage(src(o.sprite)),0,0,1,1).crop;
 const sheet=await loadImage(src(a.sprite)),w=base.w+2*a.margem,h=base.h;
 assert.equal(sheet.width,w*8);assert.equal(sheet.height,h);
 const canvas=createCanvas(sheet.width,h),ctx=canvas.getContext('2d');ctx.drawImage(sheet,0,0);
 const px=ctx.getImageData(0,0,sheet.width,h).data, original=base.canvas.getContext('2d').getImageData(0,0,base.w,h).data;
 let diferencas=0;
 for(let y=0;y<h;y++)for(let x=0;x<base.w;x++)for(let k=0;k<4;k++){
  const i=(y*sheet.width+x+a.margem)*4+k, ref=(y*base.w+x)*4+k;
  assert.equal(px[i],original[ref],`${id}: quadro inicial`);
  if(px[i]!==px[i+2*w*4])diferencas++;
  // As colunas e a travessa são imóveis; demais objetos mantêm a base.
  const fixo=id==='carrilhao_vento_enseada' ? x<150||x>620||y<116 : y>=Math.ceil(h*.8);
  if(fixo) assert.equal(px[i],px[i+2*w*4],`${id}: suporte deslocado`);
 }
 assert.ok(diferencas>20,`${id}: sem movimento`); console.log(id,diferencas,'valores alterados');
}
