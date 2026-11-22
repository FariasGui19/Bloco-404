import {CONFIG} from '../config.js';
import {getSprite} from './sprites.js';
import {INTERIORES_DOCAS} from '../data/worlds/arquipelago-rotas-perdidas/docas-interiores.js';
import {tempoVisualDocas} from './docas-animation.js';
const p=(x,y)=>[(x-y)*CONFIG.TILE_W/2,(x+y)*CONFIG.TILE_H/2];
function poly(ctx,points,fill,stroke='#131b1c'){
 ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
}
function line(ctx,points,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
function slab(ctx,x,y,w,h,z,color,edge){
 const a=p(x,y),b=p(x+w,y),c=p(x+w,y+h),d=p(x,y+h),up=q=>[q[0],q[1]-z];
 poly(ctx,[d,c,up(c),up(d)],edge??'#282823');poly(ctx,[b,c,up(c),up(b)],'#202b2b');poly(ctx,[up(a),up(b),up(c),up(d)],color,'#111d20');
 return [up(a),up(b),up(c),up(d)];
}
function glow(ctx,x,y,r,color,alpha){ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();}
export function desenharPisoInteriorDocas(ctx,map,x,y){
 const room=INTERIORES_DOCAS[map.id];if(!room)return false;
 const a=p(x,y),b=p(x+1,y),c=p(x+1,y+1),d=p(x,y+1),shade=((x*13+y*17)%5)*2;
 poly(ctx,[a,b,c,d],room.floor,'#252c2b');
 if(room.wood){
  for(const f of [.25,.5,.75]){const A=p(x,y+f),B=p(x+1,y+f);line(ctx,[A,B],`rgba(15,20,20,${.3+shade*.025})`);line(ctx,[[A[0],A[1]+1],[B[0],B[1]+1]],'rgba(172,149,107,.13)');}
  for(const f of [.12,.87]){const [X,Y]=p(x+f,y+.15);ctx.fillStyle='#171e20';ctx.fillRect(X,Y,1.5,1);}
 }else{
  const A=p(x+.12,y+.12),B=p(x+.88,y+.12),C=p(x+.88,y+.88),D=p(x+.12,y+.88);poly(ctx,[A,B,C,D],(x+y)%3?'#2a3c40':'#304246','#425153');
  for(const q of [A,C]){ctx.fillStyle='#718183';ctx.fillRect(q[0],q[1],1.5,1);}
 }
 // Moisture stays near walls, never an opaque fog bank over the routes.
 if(x===1||y===1){const [X,Y]=p(x+.4,y+.4);ctx.fillStyle='rgba(53,99,85,.22)';ctx.beginPath();ctx.ellipse(X,Y,13,4,-.2,0,Math.PI*2);ctx.fill();}
 return true;
}
export function desenharParedesInteriorDocas(ctx,map,state){
 const room=INTERIORES_DOCAS[map.id];if(!room)return false;
 const cols=map.layout[0].length-1,rows=map.layout.length-1,{t,reduced}=tempoVisualDocas(state);
 ctx.save();
 function wall(x,y,X,Y){
  const a=p(x,y),b=p(X,Y),height=92;
  poly(ctx,[a,b,[b[0],b[1]-height],[a[0],a[1]-height]],room.wall,'#0d191c');
  // Horizontal weatherboards / corrugated steel, with a fixed footing.
  for(let z=9;z<height;z+=room.wood?9:14)line(ctx,[[a[0],a[1]-z],[b[0],b[1]-z]],room.wood?'#272d2b':'#14282e',1);
  line(ctx,[[a[0],a[1]-height],[b[0],b[1]-height]],room.accent,3);
  for(const q of [a,b]){line(ctx,[q,[q[0],q[1]-height]],'#172326',5);line(ctx,[[q[0]+1,q[1]-5],[q[0]+1,q[1]-height+4]],'#59605a',1);}
 }
 for(let x=1;x<cols;x++)wall(x,1,x+1,1);
 for(let y=1;y<rows;y++)wall(1,y,1,y+1);
 // Ocean-facing windows use the actual wall plane; slow sea light and rain.
 for(const [wx,wy] of [[3,1],[8,1]]){
  if(wx>=cols)continue;
  const a=p(wx+.05,wy),b=p(wx+.9,wy),top=72,bottom=34;
  poly(ctx,[[a[0],a[1]-bottom],[b[0],b[1]-bottom],[b[0],b[1]-top],[a[0],a[1]-top]],'#091d2a','#90836b');
  for(let i=0;i<4;i++){const f=(i+.4)/4,X=a[0]+(b[0]-a[0])*f,Y=a[1]+(b[1]-a[1])*f;line(ctx,[[X,Y-66],[X-3,Y-40]],`rgba(117,183,203,${.16+(reduced?0:.06*Math.sin(t*.7+i))})`);}
  line(ctx,[[(a[0]+b[0])/2,(a[1]+b[1])/2-bottom],[(a[0]+b[0])/2,(a[1]+b[1])/2-top]],'#70674f',2);
  glow(ctx,(a[0]+b[0])/2,(a[1]+b[1])/2-45,48,'#73b8ce',.11);
 }
 // Exit cutaway is intentionally low: no front wall hides feet or supplies.
 for(const [a,b] of [[p(1,rows),p(cols,rows)],[p(cols,rows),p(cols,1)]])line(ctx,[a,b],'#676454',3);
 const door=p((cols+1)/2,rows-.5);glow(ctx,door[0],door[1],33,'#b7b993',.15);
 ctx.restore();return true;
}
export function desenharChaoInteriorDocas(ctx,map,state){
 const room=INTERIORES_DOCAS[map.id];if(!room)return;
 const {t,reduced}=tempoVisualDocas(state),cols=map.layout[0].length-1,rows=map.layout.length-1;
 ctx.save();
 if(room.wood){
  // Worn runner and sea-salt marks leave the center of the room legible.
  const x=room.key==='pescador'?5.3:5.5,y=4.9;
  const corners=[p(x,y),p(x+1.8,y),p(x+1.8,7.9),p(x,7.9)];poly(ctx,corners,room.key==='pescador'?'#504d42':'#354f49','#857c60');
  for(let i=0;i<7;i++){const a=p(x+.1,5.1+i*.4),b=p(x+1.7,5.1+i*.4);line(ctx,[a,b],'rgba(195,164,105,.15)');}
 }else{
  const points=[[2,2],[2,6],[5,6],[5,3]].map(a=>p(...a));line(ctx,points,'#0c191e',6);line(ctx,points,'#52615c',2);
  for(let x=3;x<8;x+=.45){const a=p(x,6.7),b=p(x+.15,6.9);line(ctx,[a,b],'#a68e55',2);}
 }
 // Tiny dust motes drift above the floor, not over the interaction prompts.
 for(let i=0;i<12;i++){const [x,y]=p(1.7+(i*1.83)%(cols-2),2+(i*2.13)%(rows-2));const drift=reduced?0:Math.sin(t*.2+i)*4;ctx.fillStyle='rgba(199,202,169,.24)';ctx.fillRect(x+drift,y-12-(reduced?0:(t*1.7+i*3)%24),1,1);}
 ctx.restore();
}
export function desenharMobiliaDocas(ctx,o,state){
 if(!o.docasProp)return false;
 const {t,reduced}=tempoVisualDocas(state),[w,h]=o.docasSize,[px,py]=p(o.x,o.y),x=o.x-w/2,y=o.y-h/2;
 ctx.save();
 ctx.fillStyle='rgba(2,10,14,.4)';ctx.beginPath();ctx.ellipse(px,py+2,(w+h)*15,(w+h)*5,0,0,Math.PI*2);ctx.fill();
 const asset=o.docasAsset&&getSprite(o.docasAsset);
 if(asset){const width=(w+h)*42,height=width*asset.height/asset.width;
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(asset,px-width/2,py-height+3,width,height);
  glow(ctx,px-width*.28,py-height*.65,28,o.docasProp==='gerador'?'#89d9d9':'#e5ba76',reduced?.1:.1+.025*Math.sin(t*1.2));
  ctx.restore();return true;
 }
 const wood='#665441',trim='#b29a6b';
 function box(z=22,color=wood){return slab(ctx,x,y,w,h,z,color);}
 function grain(z){for(let i=1;i<5;i++){const a=p(x+w*.08,y+h*i/5),b=p(x+w*.93,y+h*i/5);line(ctx,[[a[0],a[1]-z],[b[0],b[1]-z]],'rgba(199,170,122,.25)');}}
 switch(o.docasProp){
 case 'beliche':{
  box(11,'#4a443b');slab(ctx,x+.08,y+.08,w-.16,h-.16,21,'#63746c');slab(ctx,x+.12,y+.12,w-.24,.32,25,'#b0ad8e');
  const a=p(x+w,y+.6),b=p(x+w,y+h-.05);poly(ctx,[[a[0],a[1]-21],[b[0],b[1]-21],[b[0],b[1]-7],[a[0],a[1]-7]],'#394f54','#243d43');
  break;}
 case 'estante':case 'rack':{
  box(64,o.docasProp==='rack'?'#304348':'#514635');
  for(const z of [12,29,46]){const a=p(x,y+h),b=p(x+w,y+h);line(ctx,[[a[0],a[1]-z],[b[0],b[1]-z]],trim,2);
   for(let i=0;i<4;i++){const X=a[0]+(b[0]-a[0])*(i+.5)/4,Y=a[1]+(b[1]-a[1])*(i+.5)/4-z;ctx.fillStyle=o.docasProp==='rack'?'#101e24':['#81836a','#556a60','#8a7053','#334a48'][i];ctx.fillRect(X-3,Y-10,6,8);if(o.docasProp==='rack'){ctx.fillStyle=i%2?'#b9d08c':'#8ca6c1';ctx.globalAlpha=.5+(reduced?0:.16*Math.sin(t*.9+i));ctx.fillRect(X,Y-5,2,2);ctx.globalAlpha=1;}}
  }break;}
 case 'barris':{
  for(const dx of [-10,10]){ctx.fillStyle=wood;ctx.fillRect(px+dx-8,py-28,16,25);ctx.fillStyle='#8a7653';ctx.beginPath();ctx.ellipse(px+dx,py-28,8,3,0,0,Math.PI*2);ctx.fill();for(const z of [5,19])line(ctx,[[px+dx-8,py-z],[px+dx+8,py-z]],'#253c40',3);}
  break;}
 case 'rede':{
  box(54,'#394a40');for(let i=0;i<7;i++){line(ctx,[[px-12+i*4,py-52],[px-18+i*4,py-4]],'#979573');line(ctx,[[px-16,py-9-i*6],[px+15,py-14-i*6]],'#69776a');}break;}
 case 'bau':box(19,'#596257');grain(19);line(ctx,[[px-20,py-6],[px+18,py-19]],trim,3);ctx.fillStyle=trim;ctx.fillRect(px-2,py-13,5,5);break;
 case 'gerador':{
  box(28,'#415356');for(let i=0;i<6;i++)line(ctx,[[px-16+i*4,py-25],[px-16+i*4,py-9]],'#17282e',2);
  ctx.fillStyle='#aa8354';ctx.fillRect(px-6,py-35,12,8);glow(ctx,px+17,py-22,22,'#8cdcc6',.14);break;}
 default:{
  box(22,o.docasProp==='radio'?'#465853':wood);grain(22);
  // Legs share the same world-plane footprint as collision.
  for(const [X,Y] of [p(x,y+h),p(x+w,y+h)])line(ctx,[[X,Y-19],[X,Y-2]],'#293a37',3);
  if(o.docasProp==='cartas'||o.docasProp==='mesa'){
   slab(ctx,x+.18,y+.17,w*.67,h*.65,23,'#ada383');for(let i=0;i<4;i++)line(ctx,[[px-14+i*5,py-24],[px-8+i*5,py-19]],'#68796d');
   ctx.strokeStyle='#485d61';ctx.beginPath();ctx.arc(px,py-23,5,0,Math.PI*2);ctx.stroke();
  }else if(o.docasProp==='radio'){
   ctx.fillStyle='#1b3035';ctx.fillRect(px-13,py-45,26,22);ctx.fillStyle='#b1c09d';ctx.fillRect(px-9,py-41,18,5);for(let i=0;i<4;i++)line(ctx,[[px-8,py-31+i*2],[px+4,py-31+i*2]],'#708578');line(ctx,[[px+8,py-44],[px+12,py-64]],'#a6b3a3');glow(ctx,px,py-37,24,'#acdbb3',reduced?.15:.15+.03*Math.sin(t*1.3));
  }else{
   for(let i=0;i<4;i++){line(ctx,[[px-14+i*9,py-33],[px-10+i*9,py-19]],'#9caa9c',2);ctx.fillStyle='#4a6b70';ctx.fillRect(px-15+i*9,py-24,4,5);}
  }break;}
 }
 ctx.restore();return true;
}
