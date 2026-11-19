import { plantaCais } from '../data/worlds/arquipelago-rotas-perdidas/cais-sul.js';
import { desenharFolhaRessaca, faseRessaca, nivelRessaca, progressoImpacto } from './docas-ressaca.js';
import { getSprite } from './sprites.js';

const IDS=['ondulacao','espuma','caustica','nevoa','respingos','ventosa','fumaca','reflexo-ambar','bandeirola','cintila'];
const COLS=4, FRAMES=16, FW=160, FH=96;
export const SPRITES_DOCAS_VIVAS=IDS.map(id=>({id:`docas_vivas_${id}`,src:`assets/sprites/docas-vivas/${id}.webp`}));
export const faseDocas=(t,d,offset=0)=>t===null?0:((t/d+offset)%1+1)%1;

// No allocations or new canvases while a sprite plays. Subframe movement is
// continuous, while the paint follows a short authored deformation loop.
export function fxDocas(ctx,id,x,y,w,h,p,alpha=.6,angulo=0) {
  const img=getSprite(`docas_vivas_${id}`);
  if(!img||alpha<.018)return;
  const f=Math.min(FRAMES-1,Math.floor(p*FRAMES));
  ctx.save();ctx.translate(x,y);if(angulo)ctx.rotate(angulo);
  ctx.globalAlpha*=alpha;
  ctx.drawImage(img,f%COLS*FW,Math.floor(f/COLS)*FH,FW,FH,-w/2,-h/2,w,h);
  ctx.restore();
}

export function desenharSuperficieOeste(ctx,costa,s,t) {
  const img=getSprite('docas_costa_mar');if(!img)return;
  const u=costa.escala*s;
  ctx.save();ctx.translate(costa.x*s,costa.y*s);ctx.scale(u,u);
  if(t===null)ctx.drawImage(img,0,0,costa.mar.w,costa.mar.h);
  else {
    // Vertices of adjacent strips share the same shear at the boundary;
    // highlights bend with the swell instead of leaving horizontal cut lines.
    const n=20,w=costa.mar.w,h=costa.mar.h;
    const shift=y=>Math.sin(Math.PI*y/h)*(5.8*Math.sin(.49*y/18-t*1.54)+2.2*Math.sin(y/85+t*.74));
    const matrix=ctx.getTransform();
    // Shared boundaries snap to device pixels. Without this, Canvas blends
    // two fractional transparent edges into faint horizontal seams.
    const snap=y=>(Math.round(y*matrix.d+matrix.f)-matrix.f)/matrix.d;
    let dy=shift(0);
    for(let i=0;i<n;i++){
      const row0=Math.floor(i*img.height/n),row1=Math.floor((i+1)*img.height/n);
      const py=snap(row0*h/img.height),ph=snap(row1*h/img.height)-py,next=shift(row1*h/img.height);
      if(ph<=0){dy=next;continue;}
      ctx.save();ctx.transform(1,0,(next-dy)/ph,1,dy,py);
      ctx.drawImage(img,0,row0,img.width,row1-row0,0,0,w,ph);
      ctx.restore();dy=next;
    }
  }
  ctx.restore();
}

const ONDAS=[[81,350,128,.17],[197,372,134,.43],[279,396,148,.62],[363,469,133,.78],
  [72,518,185,.74],[274,559,152,.25],[155,666,187,.06],[231,746,163,.32],
  [416,839,180,.59],[609,774,164,.87],[691,548,106,.09],[756,622,143,.52],
  [519,478,129,.74],[60,238,145,.45]];
const COSTA=[[128,282,87,.1,.22],[184,323,101,.42,.05],[278,336,102,.24,.06],
  [429,409,116,.56,.28],[523,426,89,.77,.34],[681,496,84,.48,.38],[750,490,82,.5,-.45]];
const MAGENTA=[[239,329,94,.27],[149,598,120,.67],[261,576,83,.35],[735,499,100,.87],
  [299,807,191,.2],[374,800,123,.85],[91,430,98,.2]];
const NEVOA=[[96,272,270,102,.14],[538,360,466,120,.42],[132,724,342,140,.72],[650,763,273,75,.55]];
const ESPIRROS=[[154,289,.13],[198,322,.53],[432,411,.65],[736,494,.31]];

export function desenharCorrentesOeste(ctx,costa,s,t) {
  const u=costa.escala*s;ctx.save();ctx.translate(costa.x*s,costa.y*s);ctx.scale(u,u);
  const fase=(x,y)=>faseRessaca(costa.x+x*costa.escala,costa.y+y*costa.escala,t);
  for(const [x,y,w,shift] of ONDAS){
    const p=t===null?.25:fase(x,y);
    const a=Math.sin(p*Math.PI);
    desenharFolhaRessaca(ctx,'onda',x+p*32,y-p*14,w*(.86+p*.33),w*.29,p,.69*a,.075+shift*.14);
  }
  for(const [x,y,w,shift,ang] of COSTA){
    const p=t===null?.27:fase(x,y);
    const a=Math.sin(Math.PI*p)**1.5;
    desenharFolhaRessaca(ctx,'onda',x+6*p,y+14-18*p,w*(.69+.44*p),w*.35,p,.89*a,ang);
    const splash=progressoImpacto(p,.025+shift*.025);
    fxDocas(ctx,'espuma',x-2+splash*9,y+4,w*.75,w*.22,splash,.33*Math.sin(splash*Math.PI),ang);
  }
  for(const [x,y,w,shift] of MAGENTA){
    const p=t===null?.42:faseDocas(t,5.3,shift);
    fxDocas(ctx,'caustica',x+15*p,y+p*6,w,w*.38,p,.26*Math.sin(p*Math.PI), .14);
  }
  for(const [x,y,w,h,shift] of NEVOA){
    const sway=t===null?0:Math.sin(t*.18+shift*6)*39;
    fxDocas(ctx,'nevoa',x+sway,y,w,h,faseDocas(t,13,shift),.27);
  }
  if(t!==null)for(const [x,y,shift] of ESPIRROS){
    const e=progressoImpacto(fase(x,y),shift*.085);
    fxDocas(ctx,'respingos',x+e*13,y-Math.sin(e*Math.PI)*15,38,23,e,.51*Math.sin(e*Math.PI));
  }
  ctx.restore();
}

// x, y são os contatos aproximados da linha d'água em coordenadas do cais.
const HULL={pesqueiro:{proa:[591,398],popa:[113,544]},bote:{proa:[1146,382],popa:[972,431]},
  'boia-rede':{proa:[592,495],popa:[581,497]}};
function fasesCasco(peca,t){
  const {proa,popa}=HULL[peca.id];
  const [ax,ay]=plantaCais(proa),[bx,by]=plantaCais(popa);
  return [faseRessaca(ax,ay,t),faseRessaca(bx,by,t)];
}
export function poseNavio(peca,t) {
  if(!peca.balanco||t===null||!HULL[peca.id])return {bob:0,lean:0,drift:0};
  const [p,q]=fasesCasco(peca,t),bow=nivelRessaca(p),stern=nivelRessaca(q);
  const scale=peca.id==='pesqueiro'?4.2:2.9;
  return {bob:-peca.balanco*scale*(bow*.57+stern*.43),
    lean:(stern-bow)*(peca.id==='pesqueiro'?.014:.018),drift:1.55*Math.sin(p*Math.PI*2)};
}

export function desenharContatoCasco(ctx,peca,t,frente){
  if(t===null||!HULL[peca.id]||peca.id==='boia-rede')return;
  const [p,q]=fasesCasco(peca,t), hull=HULL[peca.id],bote=peca.id==='bote';
  const [x,y]=frente?hull.proa:hull.popa;
  const fase=progressoImpacto(frente?p:q,frente?0:.034);
  desenharFolhaRessaca(ctx,frente?'proa':'popa',x,y+(frente?3:9),
    frente?(bote?54:97):(bote?84:126),frente?(bote?27:57):(bote?28:40),fase,
    frente?.72:.65,frente?-.15:.08);
}

export function desenharMarCais(ctx,cais,s,t) {
  const u=cais.escala*s;ctx.save();ctx.translate(cais.x*s,cais.y*s);ctx.scale(u,u);
  for(const peca of cais.pecas)if(peca.balanco)desenharContatoCasco(ctx,peca,t,false);
  const casco=cais.pecas.find(peca=>peca.id==='pesqueiro');
  const reflexo=casco?poseNavio(casco,t):{lean:0,drift:0,bob:0};
  for(let i=0;i<3;i++){
    const [x,y]=plantaCais([206+i*99,586-i*19]);
    const step=faseRessaca(x,y,t);
    fxDocas(ctx,'reflexo-ambar',206+i*99+Math.sin(step*6.28)*7+reflexo.drift,586-i*19-reflexo.bob*.4,99-i*8,51+i*3,step,.27*Math.sin(step*Math.PI),-.12-reflexo.lean);
  }
  for(const [x,y,w,ang,i] of [[153,578,144,.16,0],[320,570,161,-.16,1],[510,504,132,-.42,2],[1071,436,108,-.43,3],[1189,295,59,-.28,4]]){
    const [mx,my]=plantaCais([x,y]);const p=faseRessaca(mx,my,t);
    fxDocas(ctx,i===1?'caustica':'espuma',x-4*p,y+7*p,w,w*.24,p,.35*Math.sin(p*Math.PI),ang);
  }
  for(const [x,y,w,ang] of [[228,599,155,.05],[436,552,146,-.24],[924,477,105,-.22],[1126,400,113,.13],[1228,307,125,-.18]]){
    const [mx,my]=plantaCais([x,y]);const p=faseRessaca(mx,my,t);
    desenharFolhaRessaca(ctx,'onda',x+p*10,y-p*7,w,w*.32,p,.55*Math.sin(p*Math.PI),ang);
  }
  // Short bursts hit the feet of the fixed piles just behind the deck art.
  if(t!==null)for(const [x,y,largura] of [[661,486,53],[777,462,48],[1183,302,48]]){
    const [mx,my]=plantaCais([x,y]);const p=progressoImpacto(faseRessaca(mx,my,t),.018);
    const e=Math.sin(p*Math.PI);
    fxDocas(ctx,'espuma',x-9+p*19,y+3,largura*1.5,19,p,.52*e,-.2);
    fxDocas(ctx,'respingos',x+p*12,y-7-14*e,largura,33,p,.47*e,-.13);
  }
  ctx.restore();
}

export function desenharRigging(ctx,t) {
  // Called in the boat's transformed local plane: exhaust, flag and cabin
  // lights follow the hull in the same pass, not a free-floating overlay.
  fxDocas(ctx,'bandeirola',409,44,59,30,faseDocas(t,1.8),.84,.1);
  for(let i=0;i<3;i++){
    const p=t===null?.28+i*.22:faseDocas(t,5.8,i/3);
    fxDocas(ctx,'fumaca',322-p*76,130-p*46,56+p*84,35+p*48,p,.47*Math.sin(p*Math.PI));
  }
}
