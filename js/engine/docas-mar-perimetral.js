// Same authored swell, caustic and mist sheets as the working dock. World
// grid is viewport bounded and independent of camera/mission/save time.
import { desenharFolhaRessaca, faseRessaca } from './docas-ressaca.js';
import { fxDocas, faseDocas } from './docas-vivas.js';

function dentro(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
export function aguaLivreDocas(map,x,y,margin=14){
 const polys=[...map.geometriaDocas.polys,...map.geometriaDocas.bloqueios];
 return ![[0,0],[-margin,0],[margin,0],[0,-margin],[0,margin]].some(([dx,dy])=>polys.some(p=>dentro(x+dx,y+dy,p)));
}
// Extra authored wave layers feather to zero inside the already-finished
// western dock-water sector. Never repaint or disturb its boat contact FX.
export function ganhoMarPerimetral(x,y){
 const dx=Math.max(100-x,0,x-920),dy=Math.max(510-y,0,y-900);
 return Math.min(1,Math.hypot(dx,dy)/180);
}
const hash=(x,y)=>((Math.imul(x,73856093)^Math.imul(y,19349663))>>>0)/4294967296;
export function celulasMarPerimetral(bounds){
 const result=[];
 outer:for(let row=Math.floor(bounds.top/88)-1;row<=Math.ceil(bounds.bottom/88)+1;row++){
  for(let col=Math.floor(bounds.left/148)-1;col<=Math.ceil(bounds.right/148)+1;col++){
   if(result.length>=360)break outer;
   const n=hash(col,row),x=col*148+n*58,y=row*88+hash(row,col)*31;
   result.push({x,y,n,w:72+n*53});
  }
 }return result;
}
export function desenharMarPerimetral(ctx,map,s,t,reduced,bounds){
 const b={left:bounds.left/s,right:bounds.right/s,top:bounds.top/s,bottom:bounds.bottom/s},clock=reduced?null:t;
 ctx.save();ctx.scale(s,s);
 // Even-odd holes protect every existing land/deck polygon. These layers
 // also precede cliff art, buildings and ships in the real map renderer.
 // Intersect each polygon's complement separately. A single even-odd
 // path would accidentally repaint water where two land polygons overlap.
 for(const poly of [...map.geometriaDocas.polys,...map.geometriaDocas.bloqueios]){
  ctx.beginPath();ctx.rect(b.left-5,b.top-5,b.right-b.left+10,b.bottom-b.top+10);
  poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip('evenodd');
 }
 for(const [x,y,r,color] of [[1100,550,750,'rgba(29,79,138,.20)'],[280,90,450,'rgba(30,63,129,.18)'],[1370,610,420,'rgba(44,61,145,.21)']]){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(14,38,80,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 for(const c of celulasMarPerimetral(b)){
  const gain=ganhoMarPerimetral(c.x,c.y);if(gain<.01||!aguaLivreDocas(map,c.x,c.y,c.w*.42))continue;
  const p=clock===null?.27:faseRessaca(c.x,c.y,clock),drift=reduced?0:Math.sin(t*.48+c.n*7)*3;
  const alpha=gain*(reduced?.23:.36*Math.sin(p*Math.PI));
  desenharFolhaRessaca(ctx,'onda',c.x+drift+p*12,c.y-p*4,c.w,c.w*.24,p,alpha,.05);
  if(c.n>.51){const cp=faseDocas(clock,5.3,c.n);fxDocas(ctx,'caustica',c.x,c.y+9,c.w*.95,c.w*.28,cp,gain*.13);}
  if(c.n>.79)fxDocas(ctx,'nevoa',c.x+(reduced?0:Math.sin(t*.16+c.n)*15),c.y-12,225,50,faseDocas(clock,13,c.n),gain*.12);
 }
 ctx.restore();
}
