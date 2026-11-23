import {AMBIENTE_DOCAS_LOTE6} from '../data/worlds/arquipelago-rotas-perdidas/docas-ambiente-lote6.js';
import {getSprite} from './sprites.js';
import {podePisarDocas} from '../game/docas-navigation.js';
export function posicaoCaranguejoDocas(map,p,t,reduced){
 const phase=reduced?0:t*.22,dx=reduced?0:Math.sin(phase)*4,dy=reduced?0:Math.sin(phase*.61)*2;
 const x=p.x+dx,y=p.y+dy,s=map.navegacaoDocas?.escala??2.5;
 return map.navegacaoDocas&&podePisarDocas(map.navegacaoDocas,x*s/64,y*s/22,.08)?[x,y]:[p.x,p.y];
}
export function desenharAmbienteLote6(ctx,map,s,t,reduced,bounds){
 for(const p of AMBIENTE_DOCAS_LOTE6){
  if(p.x*s+p.w*s<bounds.left||p.x*s-p.w*s>bounds.right||p.y*s+30*s<bounds.top||p.y*s-50*s>bounds.bottom)continue;
  const img=getSprite(p.sprite);if(!img)continue;
  const [x,y]=p.name==='caranguejo'?posicaoCaranguejoDocas(map,p,t,reduced):[p.x,p.y],w=p.w*s,h=w*img.height/img.width;
  ctx.drawImage(img,x*s-w/2,y*s-h*.85,w,h);
 }
}
