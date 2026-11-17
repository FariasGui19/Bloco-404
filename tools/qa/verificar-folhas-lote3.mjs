import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {map} from '../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import fs from 'node:fs';
globalThis.document={createElement:()=>createCanvas(1,1)};
const {getFrame}=await import('../../js/engine/sprite-clean.js');
const main=fs.readFileSync('js/main.js','utf8');
const src=id=>main.match(new RegExp(`id: '${id}', src: '([^']+)'`))?.[1];
for(const o of map.objects.filter(o=>o.animacaoFolha && !o.animacaoFolha.sprite.startsWith('enseada_folha4_'))) {
 const base=getFrame(await loadImage(src(o.sprite)),0,0,1,1).crop;
 const a=o.animacaoFolha, sheet=await loadImage(src(a.sprite));
 const w=base.w+2*a.margem,h=base.h;
 assert.equal(sheet.width,w*8);assert.equal(sheet.height,h);
 const canvas=createCanvas(sheet.width,h),ctx=canvas.getContext('2d');ctx.drawImage(sheet,0,0);
 const pixels=ctx.getImageData(0,0,sheet.width,h).data;
 const original=base.canvas.getContext('2d').getImageData(0,0,base.w,h).data;
 let changes=0;
 for(let y=0;y<h;y++)for(let x=0;x<base.w;x++)for(let k=0;k<4;k++){
  const off=(y*sheet.width+x+a.margem)*4+k;
  assert.equal(pixels[off],original[(y*base.w+x)*4+k],`${o.id}: quadro inicial difere`);
  if(pixels[off]!==pixels[off+2*w*4])changes++;
  if(y>=Math.ceil(h*.8))assert.equal(pixels[off],pixels[off+2*w*4],`${o.id}: base se move`);
 }
 assert.ok(changes>20,`${o.id}: quadro sem movimento`);
 console.log(o.id,changes,'valores alterados');
}
