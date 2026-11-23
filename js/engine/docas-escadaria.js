// Register visible nosings directly to the walking corridor. No independent
// offset/scale can drift away from the lighthouse collision mask.
export function desenharDegrausFarol(ctx,map){
 const nav=map.navegacaoDocas,stair=nav?.pisos.find(p=>p.id==='escadaria-farol');if(!stair)return;
 const s=nav.escala;
 ctx.save();ctx.scale(s,s);ctx.beginPath();stair.poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
 const spine=[[1017,180],[1021,205],[1037,235],[1065,260],[1100,278],[1132,288]];
 for(let i=1;i<spine.length;i++){
  const [x,y]=spine[i-1],[X,Y]=spine[i],dx=X-x,dy=Y-y,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len,n=Math.ceil(len/7);
  for(let j=0;j<n;j++){
   const f=(j+.5)/n,cx=x+dx*f,cy=y+dy*f;
   ctx.strokeStyle='rgba(9,17,24,.42)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cx-nx*20,cy-ny*20);ctx.lineTo(cx+nx*20,cy+ny*20);ctx.stroke();
   ctx.strokeStyle='rgba(160,173,160,.32)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(cx-nx*20,cy-ny*20-1);ctx.lineTo(cx+nx*20,cy+ny*20-1);ctx.stroke();
  }
 }
 ctx.restore();
}
