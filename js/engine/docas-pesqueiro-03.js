import { getSprite } from './sprites.js';
import { plantaCais } from '../data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { faseRessaca } from './docas-ressaca.js';

const PARTES=['subida','crista','descida','cavado'];
const AGUA=['mar-proa','mar-popa','espuma-costado','reflexo-ambar','reflexo-violeta','spray-proa'];
export const FOLHAS_PESQUEIRO_03=Object.fromEntries([
  ...PARTES.map(p=>[`casco-${p}`,{w:640,h:616,frames:12,columns:4}]),
  ...AGUA.map(p=>[p,{w:256,h:128,frames:24,columns:4}]),
]);
export const SPRITES_PESQUEIRO_03=Object.keys(FOLHAS_PESQUEIRO_03).map(id=>({id:`docas_p03_${id}`,src:`assets/sprites/docas-pesqueiro-03/${id}.webp`}));
export function pesqueiro03Pronto(){return SPRITES_PESQUEIRO_03.every(s=>getSprite(s.id));}
export function poseFolhaPesqueiro03(p){
  const f=Math.min(47,Math.floor(Math.max(0,Math.min(1,p))*48));
  return {id:`casco-${PARTES[Math.floor(f/12)]}`,frame:f%12};
}
function fase(x,y,t){const [a,b]=plantaCais([x,y]);return faseRessaca(a,b,t);}
function draw(ctx,id,f,x,y,w,h,alpha=1){
  const info=FOLHAS_PESQUEIRO_03[id],img=getSprite(`docas_p03_${id}`);
  if(!img)return false;
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.drawImage(img,f%4*info.w,Math.floor(f/4)*info.h,info.w,info.h,x,y,w,h);
  ctx.restore();return true;
}
// No extra heave/roll here: caller applies poseNavio exactly once to the hull.
export function desenharCascoPesqueiro03(ctx,peca,t){
  if(peca.id!=='pesqueiro'||!pesqueiro03Pronto())return false;
  const p=t===null?0:fase(peca.x+peca.w*.53,peca.pe,t);
  const {id,frame}=poseFolhaPesqueiro03(p),sx=peca.w/610,sy=peca.h/568;
  return draw(ctx,id,frame,peca.x-15*sx,peca.y-40*sy,640*sx,616*sy);
}
function water(ctx,id,x,y,w,h,t,alpha){
  const p=t===null?0:fase(x,y,t),f=Math.min(23,Math.floor(p*24));
  draw(ctx,id,f,x-w/2,y-h/2,w,h,alpha);
}
// Fixed water plane: these layers never rotate with the boat or the dock.
export function desenharMarPesqueiro03(ctx,t){
  if(!pesqueiro03Pronto())return false;
  water(ctx,'mar-proa',592,422,200,86,t,.72);
  water(ctx,'mar-popa',120,563,224,88,t,.68);
  water(ctx,'reflexo-ambar',265,592,180,88,t,.65);
  water(ctx,'reflexo-violeta',434,557,265,94,t,.58);
  water(ctx,'espuma-costado',347,516,610,200,t,.75);
  return true;
}
// Short spray follows the already transformed bow. It does not cover the deck.
export function desenharSprayPesqueiro03(ctx,peca,t){
  if(peca.id!=='pesqueiro'||!pesqueiro03Pronto())return false;
  water(ctx,'spray-proa',600,410,116,68,t,.7);
  return true;
}
