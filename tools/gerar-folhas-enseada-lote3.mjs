// Gera folhas de oito quadros a partir dos recortes aprovados. A base, os
// troncos e os apoios permanecem fixos; não inventa nem reposiciona vegetação.
// Dependência opcional para gerar: npm install --no-save --no-package-lock @napi-rs/canvas
import fs from 'node:fs';
import {createCanvas,loadImage} from '@napi-rs/canvas';
globalThis.document={createElement:()=>createCanvas(1,1)};
const {getFrame}=await import('../js/engine/sprite-clean.js');
const files=[
 ['arvore','assets/sprites/enseada-camp/arvore-referencia-a.png','copa'],
 ['palmeira-alta','assets/sprites/enseada-nordeste/palmeira-nordeste.png','copa'],
 ['palmeira-baixa','assets/sprites/enseada-norte/palmeira-baixa.png','copa'],
 ['palmeira-jovem','assets/sprites/enseada-6/palmeira-jovem.png','copa'],
 ['palmeira-media','assets/sprites/enseada-norte/palmeira-media.png','copa'],
 ['fogueira','assets/sprites/enseada-camp/fogueira.png','fogo'],
 ['biruta','assets/sprites/enseada-lote-10/07-biruta.png','biruta'],
 ['tenda','assets/sprites/enseada-camp/tenda-referencia.png','tenda'],
 ['algas','assets/sprites/enseada-2/banco-algas-douradas.png','copa'],
];
const dir='assets/sprites/enseada-animacao-lote3', margem=8, frames=8;
fs.mkdirSync(dir,{recursive:true});
for(const [name,path,mode] of files) {
 const image=await loadImage(path), crop=getFrame(image,0,0,1,1).crop;
 const w=crop.w,h=crop.h,cw=w+2*margem;
 const input=crop.canvas.getContext('2d').getImageData(0,0,w,h).data;
 const sheet=createCanvas(cw*frames,h), ctx=sheet.getContext('2d');
 for(let k=0;k<frames;k++){
  const dst=ctx.createImageData(cw,h), out=dst.data, phase=Math.sin(k*Math.PI/4);
  for(let y=0;y<h;y++)for(let x=0;x<cw;x++){
   const local=x-margem, u=local/w, v=y/h;let sx=local,sy=y;
   if(mode==='copa'||mode==='fogo') {
    // Apenas a copa/chama; a base ocupa o último terço e não se move.
    const limit=mode==='fogo'?.57:.72, strength=mode==='fogo'?.075:.055;
    const weight=Math.max(0,1-v/limit)**2;
    sx=Math.round(local-phase*Math.min(7,w*strength)*weight);
   } else if(mode==='biruta') {
    // Só a manga em tecido: o mastro e a base nunca são transladados.
    if(u>.30 && v<.36) sy=Math.round(y-phase*5*Math.min(1,(u-.30)/.45));
   } else if(mode==='tenda') {
    // Lona ondula entre as costuras; cantos, cabos e base são fixos.
    if(u>.10&&u<.90&&v>.08&&v<.72) {
      const weight=Math.sin(Math.PI*(u-.10)/.80)*Math.sin(Math.PI*(v-.08)/.64);
      sy=Math.round(y-phase*3*weight);
    }
   }
   if(sx<0||sx>=w||sy<0||sy>=h)continue;
   const si=(sy*w+sx)*4,di=(y*cw+x)*4;
   out[di]=input[si];out[di+1]=input[si+1];out[di+2]=input[si+2];out[di+3]=input[si+3];
  }
  ctx.putImageData(dst,k*cw,0);
 }
 fs.writeFileSync(`${dir}/${name}.png`,sheet.toBuffer('image/png'));
 console.log(name,`${w}x${h}`,`folha ${cw*frames}x${h}`);
}
