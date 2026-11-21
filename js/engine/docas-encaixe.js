import { PECAS_ENCAIXE } from '../data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js';
import { getSprite } from './sprites.js';
import { poseCentral } from './docas-central.js';

export function encaixeAtivo(map){return !!map.meta.docasEncaixe&&['estruturas','relevo','vida'].every(id=>getSprite('docas_encaixe_'+id));}
export const ESTRUTURAS_ENCAIXADAS=new Set(['cabana-oeste','central_fundos','galpao','cabana-leste','torre','farol','camara','porta']);
// Replace obsolete decorations, not collision objects. Keep west coast, dock,
// boat atlases and all gameplay entities on their existing rendering paths.
export function substituidaPeloEncaixe(st){
 return ESTRUTURAS_ENCAIXADAS.has(st.id)||st.id==='escada'||
  (st.x/2.5>=480&&st.y/2.5<625&&(/^(lote\d+_|central_carga|vila04_|mata$)/).test(st.id));
}
export function caixaEncaixe(id,s){
 const p=PECAS_ENCAIXE[id];if(!p)return null;
 const [x,y,w,h]=p.plant;return {x:x*s,y:y*s,w:w*s,h:h*s,foot:p.foot*s};
}
export function itensEncaixe(s){
 return Object.entries(PECAS_ENCAIXE).filter(([,p])=>p.layer==='object').map(([id,p])=>({encaixe:id,y:p.foot*s}));
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
 const [sx,sy,sw,sh]=frame.rect,[x,y,w,h]=frame.plant,p=poseCentral(t,reduced,x*.03);
 ctx.save();ctx.scale(s,s);
 const foliage=id.startsWith('palmeira');
 if(foliage){ctx.translate(x+w*.5,frame.foot);ctx.transform(1,0,p.vento*.6,1,0,0);ctx.translate(-x-w*.5,-frame.foot);}
 ctx.drawImage(img,sx,sy,sw,sh,x,y,w,h);ctx.restore();
 ctx.save();ctx.scale(s,s);
 for(const [lx,ly,r,color] of LUZES[id]??[])
  halo(ctx,lx,ly,r,color,id==='torre'?p.vigia*.7:p.luz*(id.startsWith('cristal')?.32:.22));
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
 }ctx.restore();
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
