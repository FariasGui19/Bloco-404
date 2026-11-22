import { getSprite } from './sprites.js';
import { OESTE_PONTUAL_FRAMES } from '../data/worlds/arquipelago-rotas-perdidas/docas-oeste-pontual.js';
import { fxDocas, faseDocas } from './docas-vivas.js';

// Explicit local presentation envelope. Every suppression, replacement,
// reflection and mist pass is clipped here. No physics or world data changes.
export const RECORTE_OESTE=Object.freeze([
 [85,344],[155,300],[212,270],[310,235],[348,205],[518,205],
 [526,274],[488,316],[463,334],[463,458],[479,485],
 [432,535],[280,535],[170,518],[78,485],
].map(Object.freeze));
// One displaced wreckage prop crosses the envelope at the front edge.
export const DECOR_OESTE_REMOVIDO=Object.freeze({id:'lote5_destrocos',box:Object.freeze([430,480,40,50])});
export const PLANTA_OESTE=Object.freeze([85,210,435,310]);
export const PES_OESTE=Object.freeze({arvore:385,palmeiras:423,cristais:451,abrigo:453,cerca:490});
export function oestePontualPronto(map){return !!map.meta.docasEncaixe&&!!getSprite('docas_oeste_pontual')&&!!getSprite('docas_oeste_pontual_fundos');}
function path(ctx,s){RECORTE_OESTE.forEach(([x,y],i)=>i?ctx.lineTo(x*s,y*s):ctx.moveTo(x*s,y*s));ctx.closePath();}
export function recortarOeste(ctx,s){ctx.beginPath();path(ctx,s);ctx.clip();}
export function preservarForaOeste(ctx,s){
 ctx.beginPath();ctx.rect(-10000*s,-10000*s,30000*s,30000*s);path(ctx,s);ctx.clip('evenodd');
}
export function limparSoloOeste(ctx,s){
 ctx.save();recortarOeste(ctx,s);ctx.globalCompositeOperation='destination-out';
 // Clear only the old rear plateau. Keep the front beach/path joining the
 // neighbouring house; a full polygon cut would slice a triangle from it.
 const fade=ctx.createLinearGradient(0,380*s,0,438*s);fade.addColorStop(0,'rgba(0,0,0,1)');fade.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=fade;ctx.fillRect(70*s,190*s,470*s,260*s);ctx.restore();
}
export function itensOestePontual(s){return Object.entries(PES_OESTE).map(([id,foot])=>({oestePontual:id,y:foot*s}));}
export function desenharOestePontual(ctx,id,s,t=0,reduced=false){
 const frame=OESTE_PONTUAL_FRAMES[id],img=getSprite('docas_oeste_pontual');if(!frame||!img)return;
 const [x,y,right,bottom]=frame.sourceBox,[px,py,pw,ph]=PLANTA_OESTE,w=right-x,h=bottom-y;
 ctx.save();recortarOeste(ctx,s);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // Pivot at the registered roots: depth/feet and clipping stay unchanged.
 if(!reduced&&(id==='palmeiras'||id==='arvore')){
  const root=PES_OESTE[id]*s,pivot=(id==='palmeiras'?274:412)*s;
  ctx.translate(pivot,root);ctx.transform(1,0,Math.sin(t*.65+(id==='arvore'?1.7:0))*(id==='palmeiras'?.024:.011),1,0,0);ctx.translate(-pivot,-root);
 }
 ctx.drawImage(img,...frame.rect,(px+x*pw/1216)*s,(py+y*ph/864)*s,w*pw/1216*s,h*ph/864*s);ctx.restore();
}
export function desenharAtmosferaOestePontual(ctx,s,t,reduced){
 ctx.save();recortarOeste(ctx,s);ctx.scale(s,s);
 // Crystal reflection sits against the palm roots and left shed wall, not
 // at the removed standalone crystal's former position.
 const pulse=reduced?.22:.22+.04*Math.sin(t*1.1);
 ctx.save();ctx.translate(313,444);ctx.scale(64,25);
 const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(220,37,244,${pulse})`);g.addColorStop(1,'rgba(176,22,210,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 ctx.save();ctx.translate(385+(reduced?0:Math.sin(t*.11)*5),285);ctx.scale(124,68);
 const haze=ctx.createRadialGradient(0,0,0,0,0,1);haze.addColorStop(0,'rgba(168,157,207,.16)');haze.addColorStop(1,'rgba(145,134,189,0)');ctx.fillStyle=haze;ctx.fillRect(-1,-1,2,2);ctx.restore();
 ctx.save();ctx.translate(390,495);ctx.scale(62,20);
 const join=ctx.createRadialGradient(0,0,0,0,0,1);join.addColorStop(0,'rgba(165,151,202,.16)');join.addColorStop(1,'rgba(145,134,189,0)');ctx.fillStyle=join;ctx.fillRect(-1,-1,2,2);ctx.restore();
 const clock=reduced?null:t;
 for(const [i,x,y,w,h,a] of [[0,367,295,245,94,.32],[1,271,481,260,49,.26],[2,134,403,105,80,.13]]){
  const drift=reduced?0:Math.sin(t*.12+i*1.7)*8;
  fxDocas(ctx,'nevoa',x+drift,y,w,h,faseDocas(clock,17,i*.19),a);
 }
 ctx.restore();
}

// Preprocessed at native resolution; the original pixels outside this nook
// remain byte-identical, including the distant rear cabin and its vegetation.
export function fundosForaDoAjuste(img){
 return (getSprite('docas_oeste_pontual')&&getSprite('docas_oeste_pontual_fundos'))||img;
}
