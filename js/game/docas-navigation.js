// Opt-in continuous navigation. Cache the EXPOSED boundary of the floor
// union, not each polygon edge: overlapping landings must not become walls.
const cache=new WeakMap(),EPS=1e-7;
function inside(x,y,p){
 if(x<p.minX||x>p.maxX||y<p.minY||y>p.maxY)return false;
 let yes=false;for(let i=0,j=p.poly.length-1;i<p.poly.length;j=i++){
  const a=p.poly[i],b=p.poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])yes=!yes;
 }return yes;
}
function distance2(x,y,a,b){
 const dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
 const t=len?Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy)/len)):0;
 return (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2;
}
function edges(p){return p.poly.map((a,i)=>[a,p.poly[(i+1)%p.poly.length]]);}
const cross=(a,b,c,d)=>a*d-b*c;
function unionBoundary(floors){
 const all=floors.flatMap(edges),boundary=[];
 const floor=(x,y)=>floors.some(p=>inside(x,y,p));
 for(const [a,b] of all){
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<EPS)continue;
  const cuts=[0,1];
  for(const [c,d] of all){
   const ex=d[0]-c[0],ey=d[1]-c[1],den=cross(dx,dy,ex,ey),cx=c[0]-a[0],cy=c[1]-a[1];
   if(Math.abs(den)>EPS){
    const t=cross(cx,cy,ex,ey)/den,u=cross(cx,cy,dx,dy)/den;
    if(t>EPS&&t<1-EPS&&u>=-EPS&&u<=1+EPS)cuts.push(t);
   }else if(Math.abs(cross(cx,cy,dx,dy))<EPS){
    // Split collinear overlaps too, including T-junctions/shared landings.
    for(const p of [c,d]){const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(length*length);if(t>EPS&&t<1-EPS)cuts.push(t);}
   }
  }
  cuts.sort((a,b)=>a-b);
  for(let i=1;i<cuts.length;i++){
   const lo=cuts[i-1],hi=cuts[i];if(hi-lo<EPS)continue;
   const t=(lo+hi)/2,x=a[0]+t*dx,y=a[1]+t*dy,nx=-dy/length*1e-5,ny=dx/length*1e-5;
   if(floor(x+nx,y+ny)===floor(x-nx,y-ny))continue;
   boundary.push([[a[0]+lo*dx,a[1]+lo*dy],[a[0]+hi*dx,a[1]+hi*dy]]);
  }
 }
 return boundary;
}
function prepare(nav){
 if(cache.has(nav))return cache.get(nav);
 const convert=area=>{const poly=area.poly.map(([x,y])=>[x*nav.escala/64,y*nav.escala/22]);return {poly,minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minY:Math.min(...poly.map(p=>p[1])),maxY:Math.max(...poly.map(p=>p[1]))};};
 const floors=nav.pisos.map(convert),solids=nav.obstaculos.map(convert);
 const result={floors,solids,boundary:unionBoundary(floors)};cache.set(nav,result);return result;
}
function hits(x,y,r,p){
 if(x+r<p.minX||x-r>p.maxX||y+r<p.minY||y-r>p.maxY)return false;
 return inside(x,y,p)||edges(p).some(([a,b])=>distance2(x,y,a,b)<r*r-EPS);
}
export function podePisarDocas(nav,x,y,radius=0){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(radius)||radius<0)return false;
 const {floors,solids,boundary}=prepare(nav);
 if(!floors.some(p=>inside(x,y,p))||solids.some(p=>hits(x,y,radius,p)))return false;
 // Exact distance to exterior edges catches narrow notches between radial
 // probes. Interior seams are removed when the cache is built, not at runtime.
 return radius===0||!boundary.some(([a,b])=>distance2(x,y,a,b)<radius*radius-EPS);
}
