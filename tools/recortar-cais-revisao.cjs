// Recorta o fundo magenta, inclusive as aberturas da malha da rede.
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('node:fs');
(async()=>{
 for(const nome of ['cais-barco','pedras','rede']){
  const img=await loadImage(`assets/sprites/enseada-cais-revisao/${nome}-fonte.png`);
  const w=img.width,h=img.height,c=createCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,w,h),a=data.data;
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
   const i=(y*w+x)*4,r=a[i],g=a[i+1],b=a[i+2];
   const magenta=Math.min(r-g,b-g);
   if(magenta>80 && r>150 && b>150){
     const alpha=Math.max(0,Math.min(1,(150-magenta)/70));
     a[i+3]=Math.round(a[i+3]*alpha);
     if(alpha>0){a[i]=Math.max(0,Math.min(255,(r-255*(1-alpha))/alpha));a[i+2]=Math.max(0,Math.min(255,(b-255*(1-alpha))/alpha));}
   }
   if(a[i+3]>32){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  }
  ctx.putImageData(data,0,0);
  if(maxX<minX)throw Error(`arte vazia: ${nome}`);
  const out=createCanvas(maxX-minX+1,maxY-minY+1),o=out.getContext('2d');
  o.drawImage(c,minX,minY,out.width,out.height,0,0,out.width,out.height);
  fs.writeFileSync(`assets/sprites/enseada-cais-revisao/${nome}.png`,out.toBuffer('image/png'));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
