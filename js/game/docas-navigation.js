// Continuous circular-foot collision for the approved side-view harbor.
// Opt-in only. Other maps retain tile/walkMask collision unchanged.
const cache=new WeakMap();
const RAYS=Object.freeze(Array.from({length:32},(_,i)=>[Math.cos(i*Math.PI/16),Math.sin(i*Math.PI/16)]));
function prepare(nav){
 if(cache.has(nav))return cache.get(nav);
 const convert=area=>{const poly=area.poly.map(([x,y])=>[x*nav.escala/64,y*nav.escala/22]);return {poly,minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minY:Math.min(...poly.map(p=>p[1])),maxY:Math.max(...poly.map(p=>p[1]))};};
 const result={floors:nav.pisos.map(convert),solids:nav.obstaculos.map(convert)};cache.set(nav,result);return result;
}
function inside(x,y,p){
 if(x<p.minX||x>p.maxX||y<p.minY||y>p.maxY)return false;
 let yes=false;for(let i=0,j=p.poly.length-1;i<p.poly.length;j=i++){
  const a=p.poly[i],b=p.poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;
}
function hits(x,y,r,p){
 if(x+r<p.minX||x-r>p.maxX||y+r<p.minY||y-r>p.maxY)return false;
 if(inside(x,y,p))return true;
 for(let i=0,j=p.poly.length-1;i<p.poly.length;j=i++){
  const a=p.poly[j],b=p.poly[i],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
  const t=len?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/len)):0;
  if((x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2<r*r)return true;
 }return false;
}
export function podePisarDocas(nav,x,y,radius=0){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<0)return false;
 const {floors,solids}=prepare(nav);const floor=(a,b)=>floors.some(p=>inside(a,b,p));
 if(!floor(x,y)||solids.some(p=>hits(x,y,radius,p)))return false;
 return radius===0||RAYS.every(([dx,dy])=>floor(x+dx*radius,y+dy*radius));
}
