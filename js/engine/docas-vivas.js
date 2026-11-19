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
    const shift=y=>Math.sin(Math.PI*y/h)*(2.7*Math.sin(.51*y/18-t*1.24)+1.4*Math.sin(y/85+t*.74));
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
  for(const [x,y,w,shift] of ONDAS){
    const p=t===null?.38:faseDocas(t,8.3,shift);
    fxDocas(ctx,'ondulacao',x+p*34,y+p*12,w*(.80+p*.35),w*.26,p, .56*Math.sin(p*Math.PI),.11);
  }
  for(const [x,y,w,shift,ang] of COSTA){
    const p=t===null?.25:faseDocas(t,6.6,shift);
    const a=Math.sin(Math.PI*p)**1.6;
    fxDocas(ctx,'espuma',x+6*p,y+9-15*p,w*(.65+.38*p),w*.27,p,.57*a,ang);
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
    const p=faseDocas(t,6.6,shift);
    if(p<.22){const e=p/.22;fxDocas(ctx,'respingos',x+e*13,y-Math.sin(e*Math.PI)*15,38,23,e,.48*Math.sin(e*Math.PI));}
  }
  ctx.restore();
}

export function poseNavio(peca,t) {
  if(!peca.balanco||t===null)return {bob:0,lean:0,drift:0};
  const swell=t*1.25+peca.x*.014;
  const factor=peca.id==='pesqueiro'?1.9:1.45;
  return {bob:peca.balanco*factor*(Math.sin(swell)+.22*Math.sin(swell*2.05)),
    lean:Math.sin(swell-.65)*(peca.id==='pesqueiro'?.013:.021),drift:.95*Math.sin(swell+.8)};
}

export function desenharMarCais(ctx,cais,s,t) {
  const u=cais.escala*s;ctx.save();ctx.translate(cais.x*s,cais.y*s);ctx.scale(u,u);
  for(let i=0;i<3;i++){
    const step=t===null?.44:faseDocas(t,5.5,i*.29);
    fxDocas(ctx,'reflexo-ambar',206+i*99+Math.sin(step*6.28)*7,586-i*19,99-i*8,51+i*3,step,.27*Math.sin(step*Math.PI),-.12);
  }
  for(const [x,y,w,ang,i] of [[153,578,144,.16,0],[320,570,161,-.16,1],[510,504,132,-.42,2],[1071,436,108,-.43,3],[1189,295,59,-.28,4]]){
    const p=t===null?.36:faseDocas(t,6.2,i*.19);
    fxDocas(ctx,i===1?'caustica':'espuma',x-4*p,y+7*p,w,w*.24,p,.35*Math.sin(p*Math.PI),ang);
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
