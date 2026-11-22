// Presentation only: plant coordinates, no RNG, input, save or collision writes.
export const JANELAS_CENTRAIS={
 'cabana-oeste':[[.13,.60],[.245,.64]],
 'cabana-leste':[[.10,.55],[.205,.63],[.35,.60],[.47,.50],[.59,.43]],
 central_fundos:[[.29,.61],[.40,.67]],
 galpao:[[.51,.53],[.53,.60],[.435,.62]],
};
export function poseCentral(t,reduced=false,seed=0){
 const clock=reduced?0:t;
 return {luz:reduced?.58:.58+.12*Math.sin(clock*1.3+seed)+.025*Math.sin(clock*6.1+seed),
  vigia:reduced?.65:.35+.65*((Math.sin(clock*2.2)+1)/2)**3,
  vento:reduced?0:Math.sin(clock*.75+seed)*.009,
  nevoa:reduced?0:Math.sin(clock*.19+seed)*18};
}
export function desenharLuzesCentrais(ctx,st,box,t,reduced){
 const {x,y,w,h}=box,p=poseCentral(t,reduced,st.x*.01);
 const glow=(px,py,r,color,a)=>{
  const g=ctx.createRadialGradient(px,py,0,px,py,r);
  g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(px-r,py-r,r*2,r*2);ctx.restore();
 };
 for(const [u,v] of JANELAS_CENTRAIS[st.id]??[])
  glow(x+w*u,y+h*v,w*.105,st.id==='galpao'?'#66edff':'#ffc982',p.luz*.44);
 if(st.id==='torre')glow(x+w*.5,y+h*.032,w*.24,'#ff244f',p.vigia*.72);
 if(st.id==='galpao'){
  // Scan lines stay within the actual three CRT faces of the blue workshop.
  ctx.save();ctx.strokeStyle=`rgba(159,255,250,${p.luz*.65})`;ctx.lineWidth=1;
  for(const [u,v] of JANELAS_CENTRAIS.galpao){
   const scan=reduced?0:Math.sin(t*1.6+u*10)*h*.008;
   ctx.beginPath();ctx.moveTo(x+w*(u-.021),y+h*v+scan);ctx.lineTo(x+w*(u+.021),y+h*(v-.008)+scan);ctx.stroke();
  }ctx.restore();
 }
}
export function desenharPatioCentral(ctx,s,t,reduced,mist){
 ctx.save();ctx.scale(s,s);
 // Worn tracks connect the existing entrances. No new walkable surface.
 const paths=[[[651,565],[743,520],[852,491],[974,460],[1032,415]],[[735,518],[711,444],[703,390]],[[973,461],[1085,503],[1188,530]]];
 ctx.lineCap='round';ctx.lineJoin='round';
 for(const points of paths){
  ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle='rgba(54,36,49,.15)';ctx.lineWidth=15;ctx.stroke();
  ctx.strokeStyle='rgba(206,172,151,.13)';ctx.lineWidth=9;ctx.stroke();
 }
 // Elliptical compass seal lies flat in the isometric courtyard.
 ctx.save();ctx.translate(916,519);ctx.scale(1,.37);
 ctx.strokeStyle='rgba(95,83,111,.75)';ctx.lineWidth=2;
 for(const r of [25,34,40]){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(8,-7);ctx.lineTo(30,0);ctx.lineTo(8,7);ctx.lineTo(0,29);ctx.lineTo(-8,7);ctx.lineTo(-30,0);ctx.lineTo(-8,-7);ctx.closePath();ctx.stroke();ctx.restore();
 if(mist){ctx.globalAlpha=.065;for(const [i,x,y] of [[0,720,477],[1,1015,547]]){
  const drift=poseCentral(t,reduced,i*2).nevoa;ctx.drawImage(mist,x-100+drift,y,200,18);
 }}
 ctx.restore();
}
// Existing doors get feedback only near their real interaction radius.
// Never adds an interaction, changes priority, or invents collectible rewards.
export function desenharAcessosCentrais(ctx,map,state,t,reduced){
 for(const door of map.portals??[]){
  const distance=Math.hypot(door.x-state.player.x,door.y-state.player.y);
  if(distance>(door.interactionDistance??1.5)+.5)continue;
  const selected=state.interaction?.active?.data?.id===door.id;
  const p=poseCentral(t,reduced,door.x);
  ctx.save();ctx.strokeStyle=selected?'#d7fff1':'rgba(122,225,230,.65)';
  ctx.globalAlpha=p.luz;ctx.lineWidth=selected?2:1;
  ctx.beginPath();ctx.ellipse((door.x+.5)*64,(door.y+.5)*22,17+p.luz*3,6,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
}
