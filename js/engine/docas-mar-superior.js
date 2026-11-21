// Northern ocean extension: presentation only, no hazards, collision or save.
import { desenharTentaculo02 } from './docas-tentaculo-02.js';
export const TENTACULOS_SUPERIORES=Object.freeze([
 {x:157,y:250,size:.70,phase:.13,alpha:.9},
 {x:274,y:190,size:.38,phase:.59,alpha:.68},
 {x:1475,y:433,size:.48,phase:.36,alpha:.78},
].map(Object.freeze));
export function faseMarSuperior(t,reduced,offset=0){return reduced?.24:((t/9+offset)%1+1)%1;}
export function limitesMarSuperior(bounds,s){
 return {left:bounds.left/s,right:bounds.right/s,top:bounds.top/s,bottom:bounds.bottom/s};
}
export function desenharMarSuperior(ctx,s,t,reduced,bounds){
 const b=limitesMarSuperior(bounds,s),clock=reduced?0:t;
 ctx.save();ctx.scale(s,s);ctx.lineWidth=.65;
 // Grid follows world coordinates, not terrain.width/height, including
 // negative Y. Panning north cannot reveal a frozen/empty rectangular band.
 let count=0;
 for(let row=Math.floor(b.top/34);row<=Math.floor(Math.min(b.bottom,310)/34);row++){
  for(let col=Math.floor(b.left/89);col<=Math.floor(b.right/89);col++){
   if(++count>1200)break;
   const y=row*34,x=col*89+(row%2)*25;
   if((y>125&&x>430&&x<1420)||(y>70&&x>820&&x<1400))continue;
   const phase=row*2.7+col*1.9,drift=Math.sin(clock*.35+phase)*4;
   ctx.strokeStyle=`rgba(99,156,194,${.08+.035*Math.sin(clock*.5+phase)})`;
   ctx.beginPath();ctx.moveTo(x+drift,y);ctx.quadraticCurveTo(x+12+drift,y-2,x+26+drift,y);ctx.stroke();
  }
  if(count>1200)break;
 }
 // Low horizon banks use feathered ellipses, never an opaque sky panel.
 for(const [i,x,y,rx,ry] of [[0,360,100,340,86],[1,1320,-40,450,75]]){
  const dx=reduced?0:Math.sin(clock*.12+i)*16;
  ctx.save();ctx.translate(x+dx,y);ctx.scale(rx,ry);
  const fog=ctx.createRadialGradient(0,0,0,0,0,1);fog.addColorStop(0,'rgba(107,113,167,.17)');fog.addColorStop(1,'rgba(107,113,167,0)');ctx.fillStyle=fog;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }
 for(const limb of TENTACULOS_SUPERIORES){
  if(limb.x+150<b.left||limb.x-150>b.right||limb.y+80<b.top||limb.y-150>b.bottom)continue;
  const p=faseMarSuperior(t,reduced,limb.phase),r=limb.size*57;
  // Explicit waterline: flattened rings and broken reflections make the
  // root emerge from the sea instead of looking like a floating cutout.
  ctx.save();ctx.translate(limb.x,limb.y);ctx.strokeStyle='rgba(224,65,239,.58)';ctx.lineWidth=.8;
  for(let i=0;i<3;i++){
   const wave=reduced?.4:((p+i/3)%1),radius=r*(.65+wave*.75);
   ctx.globalAlpha=(1-wave)*limb.alpha;ctx.beginPath();ctx.ellipse(0,1,radius,radius*.22,0,.15,Math.PI*1.9);ctx.stroke();
  }ctx.restore();
  desenharTentaculo02(ctx,limb.x,limb.y,limb.size,p,limb.alpha);
  ctx.save();ctx.strokeStyle='rgba(247,106,239,.45)';ctx.lineWidth=.65;
  for(let i=0;i<3;i++){const y=limb.y+5+i*4,dx=Math.sin(clock*.6+i)*3;ctx.beginPath();ctx.moveTo(limb.x-r*.4+dx,y);ctx.lineTo(limb.x+r*.3+dx,y-1);ctx.stroke();}ctx.restore();
 }
 // Three distant gulls, looping above the northern water. No gameplay actors.
 for(let i=0;i<3;i++){
  const x=430+((clock*8+i*113)%360),y=85+i*17+Math.sin(clock*.3+i)*4,flap=reduced?1:Math.sin(clock*3+i)*2;
  ctx.strokeStyle='rgba(173,185,211,.48)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-4,y-flap);ctx.quadraticCurveTo(x-2,y-2,x,y);ctx.quadraticCurveTo(x+2,y-2,x+4,y-flap);ctx.stroke();
 }
 // Small bioluminescent schools remain well offshore, away from objectives.
 for(let i=0;i<7;i++){
  const x=345+Math.sin(clock*.16+i*.2)*27+i*6,y=222+Math.cos(clock*.19+i*.25)*7;
  ctx.fillStyle=`rgba(113,205,226,${.12+.1*(1+Math.sin(clock*.8+i))/2})`;
  ctx.fillRect(x,y,1.7,.65);
 }
 ctx.restore();
}
