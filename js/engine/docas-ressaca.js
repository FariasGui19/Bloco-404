import { getSprite } from './sprites.js';
import { desenharTentaculo02 } from './docas-tentaculo-02.js';

export const FOLHAS_RESSACA={
  onda:{w:224,h:104,quadros:12,colunas:6,base:[114,78],partes:['onda-forma','onda-crista','onda-quebra','onda-refluxo']},
  tentaculo:{w:192,h:160,quadros:15,colunas:5,base:[72,141],partes:['tentaculo-emerge','tentaculo-dobra','tentaculo-alcance','tentaculo-recolhe']},
  proa:{w:144,h:96,quadros:24,colunas:6,base:[72,74],partes:['proa']},
  popa:{w:144,h:96,quadros:24,colunas:6,base:[72,74],partes:['popa']},
};
export const SPRITES_RESSACA=Object.values(FOLHAS_RESSACA).flatMap(info=>info.partes.map(id=>({id:`docas_ressaca_${id}`,src:`assets/sprites/docas-ressaca/${id}.webp`})));
export const CICLO_RESSACA=6.4;
const TAU=2*Math.PI;
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const volta=x=>x-Math.floor(x);

// Frente de onda com atraso espacial. A proa, a popa, o bote e as cristas
// consultam esta mesma maré (em coordenadas da planta, não da câmera).
export function faseRessaca(x,y,t){
  return t===null?.27:volta(t/CICLO_RESSACA-x*.0028+y*.00134+.57);
}
export function nivelRessaca(p){
  const a=(p-.36)*TAU;
  return .76*Math.cos(a)+.24*Math.cos(a*2);
}
export function progressoImpacto(p,atraso=0){
  return clamp((p-.39-atraso)/.31,0,1);
}
export function desenharFolhaRessaca(ctx,id,x,y,w,h,p,alpha=1,angulo=0){
  const info=FOLHAS_RESSACA[id];
  if(!info)return false;
  const total=info.quadros*info.partes.length;
  const index=Math.min(total-1,Math.floor(clamp(p,0,1)*total));
  const f=index%info.quadros,img=getSprite(`docas_ressaca_${info.partes[Math.floor(index/info.quadros)]}`);
  if(!img)return false;
  if(alpha<=.012)return true;
  const ax=info.base[0]*w/info.w;
  const ay=info.base[1]*h/info.h;
  ctx.save();ctx.translate(x,y);if(angulo)ctx.rotate(angulo);
  ctx.globalAlpha*=alpha;
  ctx.drawImage(img,f%info.colunas*info.w,Math.floor(f/info.colunas)*info.h,info.w,info.h,-ax,-ay,w,h);
  ctx.restore();return true;
}

// Same footprint contract on the shore, at sea or in a future map: x/y are
// the insertion in the water, not the center of the frame.
export function desenharTentaculoRessaca(ctx,x,y,escala,progresso,alpha=1){
  if(desenharTentaculo02(ctx,x,y,escala,progresso,alpha))return true;
  const {w,h}=FOLHAS_RESSACA.tentaculo;
  return desenharFolhaRessaca(ctx,'tentaculo',x,y,w*escala,h*escala,progresso,alpha);
}
