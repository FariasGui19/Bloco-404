import { PECAS_ENCAIXE } from '../data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js';
import { getSprite } from './sprites.js';
import { poseCentral } from './docas-central.js';

export function encaixeAtivo(map){return !!map.meta.docasEncaixe&&['estruturas','relevo','vida','refino'].every(id=>getSprite('docas_encaixe_'+id));}
export const ESTRUTURAS_ENCAIXADAS=new Set(['cabana-oeste','central_fundos','galpao','cabana-leste','torre','farol','camara','porta']);
// Replace obsolete decorations, not collision objects. Keep west coast, dock,
// boat atlases and all gameplay entities on their existing rendering paths.
export function substituidaPeloEncaixe(st){
 return ESTRUTURAS_ENCAIXADAS.has(st.id)||st.id==='escada'||
  (st.x/2.5>=480&&st.y/2.5<625&&(/^(lote\d+_|central_carga|vila04_|mata$)/).test(st.id));
}
// Surgical presentation registration. The source/physics map remains immutable.
export const AJUSTES_DOCAS={
 'palmeira-a':{oculta:true}, 'palmeira-b':{oculta:true},
 'palmeira-d':{oculta:true}, 'palmeira-e':{oculta:true}, 'arvore-seca':{oculta:true},
 'cristal-c':{box:[962,558,45,40],foot:598},
 'caixa-c':{dx:-20,dy:-15}, 'barril-c':{dx:-10,dy:-26},
 'caixas-b':{dx:-20,dy:-10},
};
export function registroEncaixe(id){
 const p=PECAS_ENCAIXE[id];if(!p)return null;
 const a=AJUSTES_DOCAS[id]??{},[x,y,w,h]=a.box??p.plant;
 return {x:x+(a.dx??0),y:y+(a.dy??0),w,h,foot:a.foot??p.foot+(a.dy??0),oculta:!!a.oculta};
}
export function pecasCostaAjustadas(costa){
 return [...costa.rochas,...costa.vegetacao.map(p=>{
  if(p.id!=='cristais')return p;
  // A 70px cluster on the exposed western rock, clear of the annex roof.
  const w=p.w*.5,h=p.h*.5,pe=(434-costa.y)/costa.escala;
  return {...p,w,h,x:(294-costa.x)/costa.escala-w/2,y:pe-h,pe};
 })];
}
export function caixaEncaixe(id,s){
 const p=PECAS_ENCAIXE[id];if(!p)return null;
 const {x,y,w,h,foot}=registroEncaixe(id);return {x:x*s,y:y*s,w:w*s,h:h*s,foot:foot*s};
}
export function itensEncaixe(s){
 return Object.entries(PECAS_ENCAIXE).filter(([id,p])=>p.layer==='object'&&!registroEncaixe(id).oculta).map(([id])=>({encaixe:id,y:registroEncaixe(id).foot*s}));
}
const LUZES={
 'cabana-oeste':[[594,443,9,'#9dffc0'],[620,435,9,'#f6d6a0'],[579,459,6,'#ffd3a0']],
 central_fundos:[[645,324,8,'#b9ffd5'],[678,315,8,'#c0ffce'],[711,305,7,'#c0ffce']],
 galpao:[[836,413,13,'#65efff'],[877,426,16,'#6df5ff']],
 'cabana-leste':[[1181,478,9,'#c0ffd0'],[1203,465,8,'#baffd2'],[1237,457,7,'#aaffe0']],
 torre:[[1355,322,13,'#ff2865']],farol:[[905,48,17,'#ffdd9d']],
 camara:[[1238,117,40,'#53fff3']],porta:[[967,133,9,'#a8fff1']],
 'anexo-cais':[[1048,574,7,'#acffc7']],
 'cristal-a':[[835,286,27,'#d14cff']],
 'cristal-b':[[1136,404,26,'#cb38ff']],
 'cristal-c':[[1047,775,29,'#d34cff']],
};
function halo(ctx,x,y,r,color,alpha){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
 ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
export function desenharEncaixe(ctx,id,s,t,reduced){
 const frame=PECAS_ENCAIXE[id],img=frame&&getSprite(`docas_encaixe_${frame.sheet}`);if(!img)return false;
 const dest=registroEncaixe(id);if(dest.oculta)return true;
 const [sx,sy,sw,sh]=frame.rect,{x,y,w,h,foot}=dest,p=poseCentral(t,reduced,x*.03);
 ctx.save();ctx.scale(s,s);
 const foliage=id.startsWith('palmeira');
 if(foliage){ctx.translate(x+w*.5,foot);ctx.transform(1,0,p.vento*.6,1,0,0);ctx.translate(-x-w*.5,-foot);}
 ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);ctx.restore();
 ctx.save();ctx.scale(s,s);
 const source=frame.sourcePlant??(id==='cristal-c'?[frame.plant[0],frame.plant[1]+181,frame.plant[2],frame.plant[3]]:frame.plant);
 for(const [lx,ly,r,color] of LUZES[id]??[]){
  // Translate AND scale emitters with their object, never leave a halo at
  // the old source location (the previous crystal glow was 181px too low).
  halo(ctx,x+(lx-source[0])*w/source[2],y+(ly-source[1])*h/source[3],r*w/source[2],color,id==='torre'?p.vigia*.7:p.luz*(id.startsWith('cristal')?.32:.22));
 }
 if(id==='galpao'){
  ctx.strokeStyle=`rgba(193,255,251,${p.luz*.45})`;ctx.lineWidth=.7;
  for(const [cx,cy] of [[836,413],[877,426]]){const scan=reduced?0:Math.sin(t*2+cx)*3;ctx.beginPath();ctx.moveTo(cx-5,cy+scan);ctx.lineTo(cx+5,cy+scan+2);ctx.stroke();}
 }
 ctx.restore();return true;
}
export function desenharRelevoEncaixe(ctx,s,t,reduced){
 for(const [id,p] of Object.entries(PECAS_ENCAIXE))if(p.layer==='ground')desenharEncaixe(ctx,id,s,t,reduced);
}
export function desenharContatosEncaixe(ctx,s){
 ctx.save();ctx.scale(s,s);ctx.fillStyle='rgba(20,13,32,.24)';
 for(const [x,y,rx,ry] of [[585,494,83,17],[662,377,66,12],[876,459,65,13],[1200,516,75,15],[1355,456,24,7],[1071,605,47,9]]){
  ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.06,0,Math.PI*2);ctx.fill();
 }
 for(const id of ['cristal-c','caixa-c','barril-c','caixas-b']){const p=registroEncaixe(id);ctx.beginPath();ctx.ellipse(p.x+p.w*.5,p.foot,p.w*.37,Math.max(2,p.w*.09),0,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
// Low, elongated banks follow the same wind clock as the crowns. Restrained
// opacity leaves doors, crates and the navigable courtyard readable.
export function desenharNevoaEncaixe(ctx,s,t,reduced){
 const mist=getSprite('docas_fx_faixas-nevoa');if(!mist)return;
 ctx.save();ctx.scale(s,s);ctx.globalAlpha=.085;
 for(const [i,x,y,w] of [[0,552,493,230],[1,978,565,240],[2,1177,317,180]]){
  const drift=poseCentral(t,reduced,i*1.7).nevoa;
  ctx.drawImage(mist,x-w/2+drift,y,w,23);
 }ctx.restore();
}

export function desenharBrumaFundoEncaixe(ctx,s,t,reduced){
 ctx.save();ctx.scale(s,s);
 for(const [i,x,y,rx,ry] of [[0,681,217,225,86],[1,1370,276,135,135]]){
  const drift=poseCentral(t,reduced,i).nevoa;
  ctx.save();ctx.translate(x+drift,y);ctx.scale(rx,ry);
  const g=ctx.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,'rgba(112,105,163,.23)');g.addColorStop(1,'rgba(112,105,163,0)');ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
 }ctx.restore();
}

function materialReparo(ctx,id,s){
 const p=PECAS_ENCAIXE[id],img=p&&getSprite(`docas_encaixe_${p.sheet}`);if(!img)return null;
 const tile=document.createElement('canvas');tile.width=Math.ceil(p.plant[2]*s);tile.height=Math.ceil(p.plant[3]*s);
 tile.getContext('2d').drawImage(img,...p.rect,0,0,tile.width,tile.height);
 return ctx.createPattern(tile,'repeat');
}
// This pass is INSIDE the existing terrain clip. It colours only the exposed
// grey joins; the dock and the water are never turned into new dry floor.
export function repararSoloDireito(ctx,s){
 const material=materialReparo(ctx,'solo-reparo',s);if(!material)return;
 ctx.save();ctx.fillStyle=material;ctx.globalAlpha=.85;
 ctx.fillRect(840*s,520*s,560*s,122*s);ctx.fillRect(1280*s,445*s,125*s,90*s);ctx.restore();
}
export function repararFacesDireitas(ctx,map){
 const s=map.geometriaDocas.escala,material=materialReparo(ctx,'rocha-reparo',s);if(!material)return;
 const polys=map.geometriaDocas.terraPolys;
 // Sample the union before replacing the current path with each face.
 const onLand=(x,y)=>polys.some(poly=>{let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }return inside;});
 ctx.save();ctx.fillStyle=material;
 for(const poly of polys)for(let i=0;i<poly.length;i++){
  const a=poly[i],b=poly[(i+1)%poly.length],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2;
  if(mx<850||my<510||onLand(mx,my+8))continue;
  ctx.beginPath();ctx.moveTo(a[0]*s,a[1]*s);ctx.lineTo(b[0]*s,b[1]*s);ctx.lineTo(b[0]*s,(b[1]+24)*s);ctx.lineTo(a[0]*s,(a[1]+24)*s);ctx.closePath();ctx.fill();
 }ctx.restore();
}
