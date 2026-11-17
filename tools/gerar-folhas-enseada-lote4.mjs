// Quadros derivados das artes existentes. Instalar @napi-rs/canvas somente para QA/geração.
import fs from 'node:fs';
import {createCanvas, loadImage} from '@napi-rs/canvas';
globalThis.document = {createElement: () => createCanvas(1,1)};
const {getFrame} = await import('../js/engine/sprite-clean.js');
const itens = [
 ['carrilhao','assets/sprites/enseada-lote2/sino-bambu-frontal.png','carrilhao'],
 ['bambu','assets/sprites/enseada-lote2/bambus-oeste.png','planta'],
 ['arbusto-florido','assets/sprites/enseada-nordeste/arbusto-florido.png','planta'],
 ['arbustos','assets/sprites/enseada-norte/arbustos-densos.png','planta'],
];
const margem=24, n=8, dir='assets/sprites/enseada-animacao-lote4';
fs.mkdirSync(dir,{recursive:true});
for(const [name,path,mode] of itens){
 const c=getFrame(await loadImage(path),0,0,1,1).crop, w=c.w, h=c.h, fw=w+2*margem;
 const sheet=createCanvas(fw*n,h), out=sheet.getContext('2d');
 if(mode==='carrilhao'){
  // A estrutura é fixa; cada tubo gira ao redor de sua própria suspensão.
  // Os quatro recortes nunca tocam nas colunas ou na travessa horizontal.
  const strips=[[162,228],[283,353],[407,476],[528,598]];
  const hinge=116;
  for(let k=0;k<n;k++){
   const temp=createCanvas(w,h), ctx=temp.getContext('2d');ctx.drawImage(c.canvas,0,0);
   for(const [left,right] of strips)ctx.clearRect(left,hinge,right-left,h-hinge);
   strips.forEach(([left,right],i)=>{
    const angle=.025*(Math.sin(k*Math.PI/4+i*.65)-Math.sin(i*.65));
    ctx.save();ctx.beginPath();ctx.rect(150,hinge,470,h-hinge);ctx.clip();
    ctx.translate((left+right)/2,hinge);ctx.rotate(angle);
    ctx.drawImage(c.canvas,left,hinge,right-left,h-hinge,-(right-left)/2,0,right-left,h-hinge);
    ctx.restore();
   });
   out.drawImage(temp,k*fw+margem,0);
  }
 }else{
  const src=c.canvas.getContext('2d').getImageData(0,0,w,h).data;
  for(let k=0;k<n;k++){
   const dst=out.createImageData(fw,h), d=dst.data, phase=Math.sin(k*Math.PI/4);
   for(let y=0;y<h;y++)for(let x=0;x<fw;x++){
    const v=y/h, local=x-margem;
    // Movimento cai gradualmente a zero no pé. Limite de 22px evita
    // distorção excessiva das artes grandes quando desenhadas pequenas.
    const weight=Math.max(0,1-v/.78)**1.5;
    const sx=Math.round(local-phase*Math.min(22,Math.max(3,w*.03))*weight);
    if(sx<0||sx>=w)continue;
    const s=(y*w+sx)*4,t=(y*fw+x)*4;
    d[t]=src[s];d[t+1]=src[s+1];d[t+2]=src[s+2];d[t+3]=src[s+3];
   }
   out.putImageData(dst,k*fw,0);
  }
 }
 fs.writeFileSync(`${dir}/${name}.png`,sheet.toBuffer('image/png'));
 console.log(name,w,h);
}
