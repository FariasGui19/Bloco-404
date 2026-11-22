// Recorta as novas artes em magenta e mantém o letreiro legível.
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('node:fs');
(async()=>{
 for(const nome of ['montanha','recife-submerso']){
  const im=await loadImage(`assets/sprites/enseada-estacao-revisada/${nome}-fonte.png`);
  const w=im.width,h=im.height,c=createCanvas(w,h),ctx=c.getContext('2d');
  ctx.drawImage(im,0,0);
  if(nome==='montanha') {
   // O gerador trocou letras; reutiliza o letreiro aprovado na mesma placa.
   const ant=await loadImage('assets/sprites/enseada-estacao/estacao-integrada.png');
   ctx.imageSmoothingEnabled=false;
   ctx.drawImage(ant,300,127,90,26,782,334,232,56);
  }
  const data=ctx.getImageData(0,0,w,h),a=data.data;let l=w,t=h,r=-1,b=-1;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const i=(y*w+x)*4,red=a[i],green=a[i+1],blue=a[i+2],mag=Math.min(red-green,blue-green);
   if(mag>80 && red>150 && blue>150){
    const alpha=Math.max(0,Math.min(1,(150-mag)/70));a[i+3]=Math.round(a[i+3]*alpha);
    if(alpha>0){a[i]=Math.max(0,Math.min(255,(red-255*(1-alpha))/alpha));a[i+2]=Math.max(0,Math.min(255,(blue-255*(1-alpha))/alpha));}
   }
   // As manchas lilases são sombra artificial da geração, não recife.
   if(nome==='recife-submerso' && ((red>85 && blue>100 && red>green*1.12 && blue>green*1.18) || (red>55 && blue>green*1.23)))a[i+3]=0;
   // O leito azul fica translúcido; as pedras emersas mantêm cor sólida.
   if(nome==='recife-submerso' && green>red*1.18 && blue>red*1.15)a[i+3]=Math.round(a[i+3]*.72);
   if(a[i+3]>32){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y)}
  }
  ctx.putImageData(data,0,0);if(r<l)throw Error(`recorte vazio: ${nome}`);
  const out=createCanvas(r-l+1,b-t+1);out.getContext('2d').drawImage(c,l,t,out.width,out.height,0,0,out.width,out.height);
  fs.writeFileSync(`assets/sprites/enseada-estacao-revisada/${nome}.png`,out.toBuffer('image/png'));
  console.log(nome,{l,t,r,b,width:out.width,height:out.height});
 }
})().catch(e=>{console.error(e);process.exitCode=1});
