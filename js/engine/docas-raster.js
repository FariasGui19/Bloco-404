// Shared bounded downsample cache. Animation advances normally; only the
// expensive high-resolution-to-small-sprite resize is amortized.
const images=new WeakMap(),fifo=[];let pixels=0;
const MAX_PIXELS=2*1024*1024; // 8 MiB RGBA globally, not per enemy.
export function desenharRasterDocas(ctx,img,sx,sy,sw,sh,dx,dy,dw,dh){
 if(typeof document==='undefined'||dw>=sw||dh>=sh){ctx.drawImage(img,sx,sy,sw,sh,dx,dy,dw,dh);return;}
 const w=Math.max(1,Math.min(512,Math.ceil(dw*2))),h=Math.max(1,Math.min(512,Math.ceil(dh*2))),key=[sx,sy,sw,sh,w,h].join(',');
 let cache=images.get(img);if(!cache){cache=new Map();images.set(img,cache);}
 let c=cache.get(key);
 if(!c){
  c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.drawImage(img,sx,sy,sw,sh,0,0,w,h);cache.set(key,c);fifo.push({cache,key,size:w*h});pixels+=w*h;
  while(pixels>MAX_PIXELS&&fifo.length>1){const old=fifo.shift();old.cache.delete(old.key);pixels-=old.size;}
 }
 ctx.drawImage(c,0,0,w,h,dx,dy,dw,dh);
}
