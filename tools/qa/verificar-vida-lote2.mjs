// QA opcional: compara pixels dos dez elementos em dois tempos e em redução
// de movimento. Requer @napi-rs/canvas; não é dependência do jogo.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {map} from '../../js/data/worlds/arquipelago-rotas-perdidas/enseada-ecos.js';
import {ELEMENTOS_LOTE2,quadroEnseada,desenharDetalheEnseada} from '../../js/engine/enseada-vida-lote2.js';
globalThis.document={createElement:()=>createCanvas(1,1)};
const {getFrame}=await import('../../js/engine/sprite-clean.js');
const main=fs.readFileSync('js/main.js','utf8');
const paths=new Map([...main.matchAll(/\{ id: '([^']+)', src: '([^']+)' \}/g)].map(([,id,path])=>[id,path]));
const cache=new Map();
async function frame(id) {
  if(!cache.has(id)) cache.set(id,getFrame(await loadImage(paths.get(id)),0,0,1,1).crop);
  return cache.get(id);
}
async function picture(obj,time,reduced) {
  const c=createCanvas(700,700),ctx=c.getContext('2d');
  const img=await frame(quadroEnseada(obj,time,reduced));
  const w=obj.larguraPx,h=w*img.h/img.w, x=350,y=520;
  ctx.translate(x,y);if(obj.espelhar)ctx.scale(-1,1);
  ctx.drawImage(img.canvas,-w*(obj.pivotX??.5),-h*(obj.pivotY??1),w,h);
  ctx.setTransform(1,0,0,1,350,520);
  desenharDetalheEnseada(ctx,{...obj,x:0,y:0},img,time,reduced);
  return ctx.getImageData(0,0,700,700).data;
}
function diff(a,b) {let n=0;for(let i=0;i<a.length;i+=4)if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])+Math.abs(a[i+3]-b[i+3])>5)n++;return n;}
for(const id of ELEMENTOS_LOTE2){
 const obj=map.objects.find(o=>o.id===id);
 const n=diff(await picture(obj,.36,false),await picture(obj,1.1,false));
 assert(n>0,`${id}: nenhum pixel varia`);
 assert.equal(diff(await picture(obj,.36,true),await picture(obj,1.1,true)),0,`${id}: movimento reduzido`);
 console.log(`${id}: ${n} pixels variam`);
}
// As duas estacas e suas cordas são exatamente iguais em todos os quadros.
const origem=await loadImage('assets/sprites/enseada-cais-revisao/rede.png');
function pixels(img){const c=createCanvas(img.width,img.height),g=c.getContext('2d');g.drawImage(img,0,0);return g.getImageData(0,0,img.width,img.height).data;}
const base=pixels(origem);
for(const nome of ['rede-alta','rede-baixa']) {
 const img=await loadImage(`assets/sprites/enseada-animacao-lote2/${nome}.png`),dados=pixels(img);
 for(let y=0;y<img.height;y++)for(let x=0;x<img.width;x++) if(x<245 || x>=830) {
   const i=(y*img.width+x)*4;
   assert(base[i]===dados[i]&&base[i+1]===dados[i+1]&&base[i+2]===dados[i+2]&&base[i+3]===dados[i+3], `${nome}: estaca ou corda mudou`);
 }
}
console.log('Postes e cordas da rede permanecem fixos nos quadros.');
