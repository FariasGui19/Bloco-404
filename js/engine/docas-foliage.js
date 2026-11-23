import {rajadaDocas} from './docas-animation.js';
// Rear palms were baked into the approved background bitmap. Animate only
// the crown band above the roofline; the cabin, stairs and roots stay rigid.
export function desenharCopasFundos(ctx,img,box,t,reduced){
 const [x,y,w,h]=box;
 if(reduced){ctx.drawImage(img,x,y,w,h);return;}
 const crownHeight=96,rows=32,sourceH=img.height*crownHeight/h;
 for(let i=0;i<rows;i++){
  const f=i/rows,b=(i+1)/rows,weight=(1-f)**1.4;
  const dx=rajadaDocas(t,f*.7)*3.8*weight;
  ctx.drawImage(img,0,f*sourceH,img.width,(b-f)*sourceH,x+dx,y+f*crownHeight,w,(b-f)*crownHeight+.12);
 }
 ctx.drawImage(img,0,sourceH,img.width,img.height-sourceH,x,y+crownHeight,w,h-crownHeight);
}
