import { getSprite } from './sprites.js';
import { plantaCais } from '../data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { faseRessaca } from './docas-ressaca.js';

export const QUADROS_CASCOS = 16;
export const FOLHAS_CASCOS = Object.fromEntries(['pesqueiro','bote'].flatMap(id => [
  [id, { w:id==='pesqueiro'?610:254, h:id==='pesqueiro'?568:148 }],
  ...['proa','popa','reflexo','mar'].map(fx => [`${fx}-${id}`,{w:192,h:80}]),
]));
export const SPRITES_CASCOS = Object.keys(FOLHAS_CASCOS).map(id => ({
  id:`docas_cascos_${id}`, src:`assets/sprites/docas-cascos/${id}.webp`,
}));
export function quadroCasco(peca,t) {
  if(t===null)return 0;
  const [x,y]=plantaCais([peca.x+peca.w*.53,peca.pe]);
  return Math.floor(faseRessaca(x,y,t)*QUADROS_CASCOS)%QUADROS_CASCOS;
}
function folha(ctx,id,f,x,y,w,h,alpha=1) {
  const info=FOLHAS_CASCOS[id], img=getSprite(`docas_cascos_${id}`);
  if(!info||!img)return false;
  ctx.save();ctx.globalAlpha*=alpha;
  ctx.drawImage(img,(f%4)*info.w,Math.floor(f/4)*info.h,info.w,info.h,x,y,w,h);
  ctx.restore();return true;
}
// Applied inside the existing vessel transform: bob/lean never counted twice.
// Caller retains the original PNG fallback while an atlas is unavailable.
export function desenharCascoNovo(ctx,peca,t) {
  return folha(ctx,peca.id,quadroCasco(peca,t),peca.x,peca.y,peca.w,peca.h);
}
export function desenharAguaCasco(ctx,peca,t,frente=false) {
  if(!['pesqueiro','bote'].includes(peca.id))return;
  const f=quadroCasco(peca,t), ship=peca.id==='pesqueiro';
  const {x,y,w,h}=peca;
  if(!frente){
    folha(ctx,`mar-${peca.id}`,f,x-w*.08,y+h*.84,w*1.12,h*.24,.75);
    folha(ctx,`reflexo-${peca.id}`,f,x+w*.22,y+h*.93,w*.5,h*.24,ship?.65:.45);
  }else{
    folha(ctx,`proa-${peca.id}`,f,x+w*.76,y+h*.65,w*.32,h*.16,.72);
    folha(ctx,`popa-${peca.id}`,f,x-w*.08,y+h*.9,w*.4,h*.13,.6);
  }
}

// This composition is already keyed and registered. Do not pass it through
// sprite-clean: its two deliberately separated pieces are dock and vessel,
// not stray neighboring characters. Animation moves only the hull pixels.
export function desenharEmbarquePesqueiro(ctx,object,ix,iy,t){
  const base=getSprite('enseada_cais_barco');
  const atlas=t===null?null:getSprite('enseada_cais_pesqueiro_folha');
  if(!base)return false;
  const w=object.larguraPx,h=w*base.height/base.width;
  const frame=t===null?0:Math.floor(((t%6.4)+6.4)%6.4/.8);
  const img=atlas??base;
  ctx.drawImage(img,atlas?frame*base.width:0,0,base.width,base.height,
    ix-w*(object.pivotX??.5),iy-h*(object.pivotY??.97),w,h);
  return true;
}
