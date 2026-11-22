// Extrai sprites gerados, removendo apenas o branco conectado ao fundo.
const {createCanvas,loadImage}=require('@napi-rs/canvas');
const fs=require('fs');
async function open(path){const i=await loadImage(path),c=createCanvas(i.width,i.height),g=c.getContext('2d');g.drawImage(i,0,0);return {c,g};}
async function clean(source,dest){const {c,g}=await open(source),w=c.width,h=c.height,id=g.getImageData(0,0,w,h),a=id.data,seen=new Uint8Array(w*h),stack=new Int32Array(w*h);let n=0;
function add(i){if(i<0||i>=w*h||seen[i])return;const p=i*4;if(a[p]>228&&a[p+1]>228&&a[p+2]>228){seen[i]=1;stack[n++]=i;}}
for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}
while(n){const i=stack[--n],x=i%w;a[i*4+3]=0;if(x)add(i-1);if(x<w-1)add(i+1);if(i>=w)add(i-w);if(i<w*(h-1))add(i+w)}g.putImageData(id,0,0);if(dest) fs.writeFileSync(dest,c.toBuffer('image/png'));return c;}
(async()=>{await clean('assets/sprites/enseada-centro/ilha-grama-gerada.png','assets/sprites/enseada-centro/ilha-grama.png');
await clean('assets/sprites/enseada-centro/cairn-fonte.png','assets/sprites/enseada-centro/cairn.png');
const c=await clean('assets/sprites/enseada-centro/borboletas-originais.png',null);
for(const [name,x,y,w,h] of [['azul-a',320,130,230,225],['azul-b',710,315,235,225],['dourada',405,515,245,225]]){let out=createCanvas(w,h);out.getContext('2d').drawImage(c,x,y,w,h,0,0,w,h);fs.writeFileSync(`assets/sprites/enseada-centro/borboleta-${name}.png`,out.toBuffer('image/png'));}})();
