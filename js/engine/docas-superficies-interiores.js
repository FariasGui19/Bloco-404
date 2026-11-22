import {SUPERFICIES_INTERIORES_LOTE4} from '../data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote4.js';
import {SUPERFICIES_INTERIORES_LOTE3} from '../data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote3.js';
import {CONFIG} from '../config.js';
import {getSprite} from './sprites.js';
import {rajadaDocas,tempoVisualDocas} from './docas-animation.js';
const p=(x,y)=>[(x-y)*CONFIG.TILE_W/2,(x+y)*CONFIG.TILE_H/2];
export function planoDetalheDocas(s){
 if(s.plane==='floor'){
  const [x,y,w,h]=s.box;return [p(x,y),p(x+w,y),p(x+w,y+h),p(x,y+h)];
 }
 const [lo,hi,bottom,top]=s.box;
 const a=s.plane==='left'?p(1,lo):p(lo,1),b=s.plane==='left'?p(1,hi):p(hi,1);
 return [[a[0],a[1]-top],[b[0],b[1]-top],[b[0],b[1]-bottom],[a[0],a[1]-bottom]];
}
export function uvPlanoDocas(q,u,v){return [q[0][0]+(q[1][0]-q[0][0])*u+(q[3][0]-q[0][0])*v,q[0][1]+(q[1][1]-q[0][1])*u+(q[3][1]-q[0][1])*v];}
export function desenharSuperficiesDocas(ctx,map,state,plane){
 const {t,reduced}=tempoVisualDocas(state);
 for(const s of [...SUPERFICIES_INTERIORES_LOTE3,...SUPERFICIES_INTERIORES_LOTE4]){
  if(s.room!==map.meta?.docasTema||(s.plane==='floor')!==(plane==='floor'))continue;
  const img=getSprite(s.sprite);if(!img)continue;
  const q=planoDetalheDocas(s),[a,b,,d]=q;
  ctx.save();ctx.transform((b[0]-a[0])/img.width,(b[1]-a[1])/img.width,(d[0]-a[0])/img.height,(d[1]-a[1])/img.height,a[0],a[1]);
  ctx.globalAlpha=s.alpha??1;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  if(s.draft&&!reduced){
   // Hook/top 35% are rigid; only the empty coat hem catches a faint draft.
   const bands=20;
   for(let i=0;i<bands;i++){const f=i/bands,sh=img.height/bands,weight=Math.max(0,(f-.35)/.65)**2,dx=rajadaDocas(t,1.2)*img.width*.018*weight;
    ctx.drawImage(img,0,i*sh,img.width,sh,dx,i*sh,img.width,sh+.05);}
  }else ctx.drawImage(img,0,0);
  ctx.restore();
  if(s.drip){
   const [x,y]=uvPlanoDocas(q,.55,.45),f=reduced?.4:(t*.27)%1;
   ctx.save();ctx.strokeStyle=`rgba(123,168,155,${.16*(1-f)})`;ctx.lineWidth=.6;ctx.beginPath();ctx.ellipse(x,y,2+f*12,1+f*4,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  if(s.signal){
   const [x,y]=uvPlanoDocas(q,.72,.25),a=reduced?.24:.24+.05*Math.sin(t*1.9);
   ctx.save();ctx.fillStyle=`rgba(187,51,34,${a})`;ctx.beginPath();ctx.arc(x,y,1.2,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  if(s.lamp){
   const [u,v,r]=s.lamp,[x,y]=uvPlanoDocas(q,u,v),alpha=reduced?.13:.13+.016*Math.sin(t*2.7)+.008*Math.sin(t*4.13+.8);
   ctx.save();const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,191,106,${alpha})`);g.addColorStop(1,'rgba(255,178,91,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
   // Flame breathes in its glass, but the bracket/lantern never swings.
   ctx.fillStyle=`rgba(255,224,159,${reduced?.18:.18+.035*Math.sin(t*3.1)})`;ctx.beginPath();ctx.ellipse(x,y,.75,reduced?1.05:1.05+.14*Math.sin(t*2.7),0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
}
