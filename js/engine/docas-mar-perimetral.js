// Same authored swell, caustic and mist sheets as the working dock. World
// grid is viewport bounded and independent of camera/mission/save time.
import { desenharFolhaRessaca, faseRessaca } from './docas-ressaca.js';
import { getSprite } from './sprites.js';
import { fxDocas, faseDocas } from './docas-vivas.js';

// Authored geometry is immutable. Cache world-cell classification, not time.
const waterCache=new WeakMap(),clipCache=new WeakMap(),cellCache=new Map();
function dentro(x,y,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
 const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
}return inside;}
export function aguaLivreDocas(map,x,y,margin=14){
 let memo=waterCache.get(map);if(!memo){memo=new Map();waterCache.set(map,memo);}
 const key=x+','+y+','+margin;if(memo.has(key))return memo.get(key);
 const polys=[...map.geometriaDocas.polys,...map.geometriaDocas.bloqueios];
 const result=![[0,0],[-margin,0],[margin,0],[0,-margin],[0,margin]].some(([dx,dy])=>polys.some(p=>dentro(x+dx,y+dy,p)));
 if(memo.size>=4096)memo.delete(memo.keys().next().value);memo.set(key,result);return result;
}
// Extra authored wave layers feather to zero inside the already-finished
// western dock-water sector. Never repaint or disturb its boat contact FX.
export function ganhoMarPerimetral(x,y){
 const dx=Math.max(100-x,0,x-920),dy=Math.max(510-y,0,y-900);
 return Math.min(1,Math.hypot(dx,dy)/180);
}
const hash=(x,y)=>((Math.imul(x,73856093)^Math.imul(y,19349663))>>>0)/4294967296;
export function celulasMarPerimetral(bounds){
 const key=[Math.floor(bounds.top/88),Math.ceil(bounds.bottom/88),Math.floor(bounds.left/148),Math.ceil(bounds.right/148)].join(',');
 if(cellCache.has(key))return cellCache.get(key);
 const result=[];
 outer:for(let row=Math.floor(bounds.top/88)-1;row<=Math.ceil(bounds.bottom/88)+1;row++){
  for(let col=Math.floor(bounds.left/148)-1;col<=Math.ceil(bounds.right/148)+1;col++){
   if(result.length>=360)break outer;
   const n=hash(col,row),x=col*148+n*140,y=row*88+hash(row,col)*83;
   result.push({x,y,n,w:72+n*53});
  }
 }if(cellCache.size>=8)cellCache.delete(cellCache.keys().next().value);cellCache.set(key,result);return result;
}
export function desenharMarPerimetral(ctx,map,s,t,reduced,bounds){
 const b={left:bounds.left/s,right:bounds.right/s,top:bounds.top/s,bottom:bounds.bottom/s},clock=reduced?null:t;
 ctx.save();ctx.scale(s,s);
 // Even-odd holes protect every existing land/deck polygon. These layers
 // also precede cliff art, buildings and ships in the real map renderer.
 // Intersect each polygon's complement separately. A single even-odd
 // path would accidentally repaint water where two land polygons overlap.
 let paths=clipCache.get(map);
 if(typeof Path2D!=='undefined'){
  if(!paths){paths=[...map.geometriaDocas.polys,...map.geometriaDocas.bloqueios].map(poly=>{const path=new Path2D();path.rect(-100000,-100000,200000,200000);poly.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));path.closePath();return path;});clipCache.set(map,paths);}
  for(const path of paths)ctx.clip(path,'evenodd');
 }else for(const poly of [...map.geometriaDocas.polys,...map.geometriaDocas.bloqueios]){
  ctx.beginPath();ctx.rect(b.left-5,b.top-5,b.right-b.left+10,b.bottom-b.top+10);
  poly.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip('evenodd');
 }
 for(const [x,y,r,color] of [[1100,550,750,'rgba(29,79,138,.20)'],[280,90,450,'rgba(30,63,129,.18)'],[1370,610,420,'rgba(90,36,143,.27)'],[700,70,880,'rgba(77,34,123,.20)']]){
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(14,38,80,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 const mar=getSprite('docas_fiel_mar');
 for(const c of celulasMarPerimetral(b)){
  const gain=ganhoMarPerimetral(c.x,c.y);if(gain<.01||!aguaLivreDocas(map,c.x,c.y,c.w*.42))continue;
  const p=clock===null?.27:faseRessaca(c.x,c.y,clock),drift=reduced?0:Math.sin(t*.48+c.n*7)*3;
  if(mar){
   const variant=Math.floor(c.n*4),width=180+c.n*115,height=width*.43;
   ctx.save();ctx.translate(c.x+drift,c.y-p*3);ctx.scale(c.n>.5?-1:1,1);ctx.rotate((c.n-.5)*.18);ctx.globalAlpha=gain*(.23+.08*Math.sin(p*Math.PI));
   ctx.drawImage(mar,variant%2*400,Math.floor(variant/2)*200,400,200,-width/2,-height/2,width,height);ctx.restore();
  }
  const alpha=gain*(reduced?.23:.36*Math.sin(p*Math.PI));
  // Translucent mineral reflections follow the same swell as the painted
  // crest. Curves stay in world coordinates and are clipped off all land.
  ctx.save();
  const glow=ctx.createRadialGradient(c.x,c.y,0,c.x,c.y,c.w*.8);
  glow.addColorStop(0,`rgba(164,25,191,${gain*.18})`);glow.addColorStop(1,'rgba(90,15,132,0)');
  ctx.fillStyle=glow;ctx.fillRect(c.x-c.w,c.y-c.w,c.w*2,c.w*2);
  ctx.strokeStyle=`rgba(224,66,235,${gain*(.30+.38*Math.sin(p*Math.PI))})`;
  ctx.lineWidth=.7;ctx.beginPath();
  for(let j=0;j<=20;j++){
   const u=j/20,x=c.x+(u-.5)*c.w*1.3;
   const y=c.y+Math.sin(u*13+c.n*11+p*2)*2.4+Math.sin(u*5+c.n)*4-p*4;
   if(j===0||Math.sin(j*2.7+c.n*37)>.6)ctx.moveTo(x,y);else ctx.lineTo(x,y);
  }if(!mar)ctx.stroke();ctx.restore();
  desenharFolhaRessaca(ctx,'onda',c.x+drift+p*12,c.y-p*4,c.w,c.w*.24,p,alpha,.05);
  if(c.n>.51){const cp=faseDocas(clock,5.3,c.n);fxDocas(ctx,'caustica',c.x,c.y+9,c.w*.95,c.w*.28,cp,gain*.13);}
  if(c.n>.79)fxDocas(ctx,'nevoa',c.x+(reduced?0:Math.sin(t*.16+c.n)*15),c.y-12,225,50,faseDocas(clock,13,c.n),gain*.12);
 }
 if(getSprite('docas_fiel_costa'))for(const [x,y,w] of [[992,739,130],[1126,774,174]]){
  const gain=ganhoMarPerimetral(x,y),p=faseRessaca(x,y,clock);
  ctx.save();ctx.translate(x,y);ctx.scale(w/2,w*.13);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(207,31,229,${gain*.23})`);g.addColorStop(1,'rgba(158,20,208,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  desenharFolhaRessaca(ctx,'onda',x,y,w,w*.25,p,gain*.55,-.07);
 }
 ctx.restore();
}

// Reference-guided banks at the back sea, western beach and east cliffs.
// No fog across the central interaction courtyard or the reserved upper art.
export const BANCOS_BRUMA=Object.freeze([
 [390,205,410,100,.16],[695,170,310,75,.12],
 [124,405,140,170,.20],[335,548,360,72,.19],
 [1432,300,210,155,.21],[1402,493,155,92,.17],
 [1160,640,360,68,.19],[925,807,420,90,.17],
]);
export function desenharBrumaCosteira(ctx,s,t,reduced){
 const clock=reduced?null:t;
 ctx.save();ctx.scale(s,s);
 for(let i=0;i<BANCOS_BRUMA.length;i++){
  const [x,y,w,h,a]=BANCOS_BRUMA[i];
  const dx=reduced?0:Math.sin(t*.11+i*1.7)*14;
  fxDocas(ctx,'nevoa',x+dx,y,w,h,faseDocas(clock,17,i*.137),a);
 }
 ctx.restore();
}
