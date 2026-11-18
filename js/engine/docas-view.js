import { getSprite } from './sprites.js';
import { SIDE_DEPTH_STEP } from './camera.js';
import { CONFIG } from '../config.js';
// A planta é geometria, não o PNG da referência. O terreno é rasterizado
// uma vez; entidades e estruturas permanecem ordenadas pela posição do pé.
let terreno=null,terrenoMap=null;
// Ordem usa o pé projetado, nunca o topo do sprite. Empates preservam a ordem de entrada.
export function ordenarProfundidadeDocas(items){return items.sort((a,b)=>a.y-b.y);}
function construirTerreno(map) {
  const s=map.geometriaDocas.escala,w=map.layout[0].length*64,h=map.layout.length*SIDE_DEPTH_STEP;
  const out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');
  const agua=getSprite('docas_agua'),areia=getSprite('docas_areia');
  g.fillStyle=agua?g.createPattern(agua,'repeat'):'#071d2c';g.fillRect(0,0,w,h);
  const pathAll=()=>{g.beginPath();for(const poly of map.geometriaDocas.terraPolys??map.geometriaDocas.polys){poly.forEach(([x,y],i)=>i?g.lineTo(x*s,y*s):g.moveTo(x*s,y*s));g.closePath();}};
  // Faces sob as margens externas, antes do piso: a superfície continua
  // na posição usada pela colisão. Segmentos internos nunca viram penhasco.
  // Padrão rochoso na face, em vez de uma parede lisa ou repetição de
  // pequenas ilhotas sobre a linha da margem.
  const face=getSprite('docas_lote5_falesia')||getSprite('docas_relevo_falesia-frente');let facePattern=null;
  if(face){const tile=document.createElement('canvas');tile.width=240;tile.height=100;tile.getContext('2d').drawImage(face,0,0,240,100);facePattern=g.createPattern(tile,'repeat');}
  pathAll();
  for(const poly of map.geometriaDocas.terraPolys??map.geometriaDocas.polys)for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],dx=(b[0]-a[0])*s,dy=(b[1]-a[1])*s,len=Math.hypot(dx,dy);if(!len)continue;
    const count=Math.max(1,Math.ceil(len/35));
    for(let k=0;k<count;k++){
      const f0=k/count,f1=(k+1)/count,f=(f0+f1)/2;
      const mx=(a[0]+(b[0]-a[0])*f)*s,my=(a[1]+(b[1]-a[1])*f)*s;
      // Apenas a face voltada para a câmera fica visível; amostra abaixo da borda.
      if(g.isPointInPath(mx,my+8))continue;
      const x0=(a[0]+(b[0]-a[0])*f0)*s,y0=(a[1]+(b[1]-a[1])*f0)*s;
      const x1=(a[0]+(b[0]-a[0])*f1)*s,y1=(a[1]+(b[1]-a[1])*f1)*s;
      const d=24*s;g.fillStyle=facePattern||'#292b35';g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.lineTo(x1,y1+d);g.lineTo(x0,y0+d);g.closePath();g.fill();pathAll();
    }
  }
  for(const p of map.relevoDocas??[])if(p.camada==='base'){
    const img=getSprite(p.sprite?'docas_'+p.sprite:'docas_relevo_'+p.id);if(img)g.drawImage(img,(p.x-p.w/2)*s,(p.y-p.h)*s,p.w*s,p.h*s);
  }
  pathAll();g.fillStyle='#37313a';g.fill();g.save();g.clip();
  const areiaNova=getSprite('docas_lote5_areia'),terra=getSprite('docas_lote5_terra'),pedras=getSprite('docas_lote5_pedras');
  const fundo=areiaNova||areia;g.globalAlpha=.88;g.fillStyle=fundo?g.createPattern(fundo,'repeat'):'#48404a';g.fillRect(0,0,w,h);g.globalAlpha=1;
  // Áreas de terra gastas, limitadas à superfície e sem mudar colisões.
  if(terra){g.save();g.globalAlpha=.32;g.fillStyle=g.createPattern(terra,'repeat');for(const [x,y,rx,ry] of [[585,510,180,95],[910,535,220,90],[1210,515,160,75],[1190,220,160,70]]){g.beginPath();g.ellipse(x*s,y*s,rx*s,ry*s,0,0,Math.PI*2);g.fill();}g.restore();}
  // Textura recortada, levemente irregular, quebra a linha artificial da margem.
  g.save();g.fillStyle='rgba(25,27,30,.44)';
  for(const poly of map.geometriaDocas.terraPolys??map.geometriaDocas.polys)for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.floor(len/12));
    for(let k=0;k<n;k++){const f=(k+.5)/n,x=(a[0]+(b[0]-a[0])*f)*s,y=(a[1]+(b[1]-a[1])*f)*s;
      g.beginPath();g.ellipse(x,y,(3+(i*7+k*13)%8)*s,(2+(i*3+k*7)%4)*s,0,0,Math.PI*2);g.fill();}
  }g.restore();
  // Caminhos gastos conectam o desembarque às portas e à subida.
  const caminhos=[[[620,650],[690,590],[770,550],[865,520]],[[770,550],[665,520],[575,500]],[[865,520],[1050,535],[1190,525]],[[900,510],[1000,450],[1050,365],[1110,275]]];
  g.lineCap='round';g.lineJoin='round';for(const pts of caminhos){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x*s,y*s):g.moveTo(x*s,y*s));g.strokeStyle='rgba(22,22,25,.35)';g.lineWidth=31*s;g.stroke();if(pedras){g.strokeStyle=g.createPattern(pedras,'repeat');g.globalAlpha=.32;g.lineWidth=21*s;g.stroke();g.globalAlpha=1;}}
  // Peças de chão e suportes são recortados ao contorno do terreno;
  // a passagem e as portas continuam definidas pela máscara, não pela arte.
  for(const p of map.relevoDocas??[])if(p.camada==='piso'){
    const img=getSprite(p.sprite?'docas_'+p.sprite:'docas_relevo_'+p.id);if(img)g.drawImage(img,(p.x-p.w/2)*s,(p.y-p.h)*s,p.w*s,p.h*s);
  }
  const suporte=getSprite('docas_relevo_pilar');
  if(suporte)for(const st of map.estruturasDocas){
    if(!['cabana-oeste','cabana-leste','galpao','torre','farol','camara','porta'].includes(st.id))continue;
    const bw=st.largura*.78,bh=Math.min(st.largura*.28,65*s);
    g.drawImage(suporte,st.x-bw/2,st.y-bh*.68,bw,bh);
  }
  let seed=404;for(let i=0;i<4200;i++){seed=(1664525*seed+1013904223)>>>0;const x=seed%w;seed=(1664525*seed+1013904223)>>>0;const y=seed%h;g.fillStyle=i%4===0?'rgba(18,17,25,.35)':'rgba(165,146,142,.15)';g.fillRect(x,y,2+i%4,1+i%2);}g.restore();
  return out;
}
function desenharEstrutura(ctx,st,t,reduced){
 const img=getSprite('docas_'+st.id);if(!img)return;const folha=st.id.startsWith('lote3_'),w=st.largura,h=folha?w:w*img.height/img.width,x=st.x-w/2,y=st.y-h;
 if(st.camada!=='chao'&&!st.id.startsWith('lote5_')&&!st.id.startsWith('lote6_')&&!st.id.startsWith('lote7_')&&!['cabana-oeste','cabana-leste','galpao','torre','farol','camara','porta'].includes(st.id)){ctx.save();ctx.fillStyle='rgba(7,8,15,.12)';ctx.beginPath();ctx.ellipse(st.x,st.y-3,w*.37,Math.max(5,w*.07),0,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.save();
 if(st.id==='barco' && !reduced){ctx.translate(st.x,st.y);ctx.rotate(Math.sin(t*.65)*.012);ctx.translate(-st.x,-st.y);}
 if(folha){
   const frame=reduced?0:Math.floor(t*4+(st.x%7)/7)%8;
   ctx.drawImage(img,frame*256,0,256,256,x,y,w,h);
 } else ctx.drawImage(img,x,y,w,h);
 ctx.restore();
 if(st.id==='barco'){
   // Fumaça leve e bounded: três partículas procedurais, sem alocação em runtime.
   if(!reduced)for(let i=0;i<3;i++){const phase=(t*.28+i/3)%1;ctx.fillStyle=`rgba(166,174,176,${(1-phase)*.16})`;ctx.beginPath();ctx.arc(x+w*.53+phase*12,y+h*.23-phase*35,3+phase*5,0,Math.PI*2);ctx.fill();}
 }
 const glow=(gx,gy,r,color,alpha)=>{ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(gx-r,gy-r,r*2,r*2);ctx.restore();};
 const pulso=reduced?.55:.46+.10*Math.sin(t*1.2);
 if(st.id==='pier')glow(x+w*.12,y+h*.37,22,'#ffc17a',pulso*.55);
 if(st.id==='cabana-oeste'||st.id==='cabana-leste')glow(x+w*.51,y+h*.66,w*.10,'#91e9a1',pulso*.25);
 if(st.id==='galpao')glow(x+w*.5,y+h*.62,w*.12,'#60f3ff',pulso*.30);
 if(st.id==='escada')glow(x+w*.7,y+h*.58,w*.08,'#df80f7',pulso*.20);
 if(st.id==='torre')glow(st.x,y+h*.08,24,'#ff7185',pulso*.6);
 if(st.id==='farol')glow(st.x,y+h*.08,25,'#fff1b8',pulso*.6);
 if(st.id==='camara')glow(st.x,y+h*.47,w*.16,'#76fff0',pulso*.34);
 if(st.id==='porta')glow(st.x,y+h*.5,w*.18,'#bd88db',pulso*.24);
 if(st.id==='lote6_cristal-violeta'||st.id==='lote6_corais'||st.id==='lote6_runa')glow(st.x,y+h*.6,w*.25,'#ec7cff',.10);
 if(st.id==='lote6_luminaria')glow(st.x,y+h*.35,w*.5,'#ffcd88',.13);
 if(st.id==='lote5_poste')glow(x+w*.35,y+h*.55,w*.4,'#ffc67b',pulso*.25);
 if(st.id==='lote3_cristal'||st.id==='lote3_resina'||st.id==='lote3_esporos')glow(st.x,y+h*.62,w*.18,st.id==='lote3_resina'?'#f8c67a':'#7af6e3',pulso*.28);
 if(st.id==='lote3_esporos'&&!reduced){for(let i=0;i<3;i++){const phase=(t*.13+i/3+(st.x%13)*.01)%1;ctx.fillStyle=`rgba(143,255,231,${(1-phase)*.5})`;ctx.fillRect(st.x+Math.sin(i*3+phase*4)*w*.12,y+h*.6-phase*h*.38,2,2);}}
}

export function renderDocas(ctx,map,state,camX,camY,w,h,zoom,dpr,now,drawPlayer) {
  if(terrenoMap!==map){terreno=construirTerreno(map);terrenoMap=map;}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#071622';ctx.fillRect(0,0,w,h);
  ctx.setTransform(dpr*zoom,0,0,dpr*zoom,dpr*(w/2-camX*zoom),dpr*(h/2+115-camY*zoom));
  // Mar preenche também além do limite do canvas cacheado, evitando uma
  // faixa chapada no zoom afastado ou próximo das bordas do mapa.
  const mar=getSprite('docas_agua');if(mar){ctx.fillStyle=ctx.createPattern(mar,'repeat');ctx.fillRect(camX-w/(2*zoom)-8,camY-(h/2+115)/zoom-8,w/zoom+16,h/zoom+16);}
  if(terreno){
    const x=Math.max(0,Math.floor(camX-w/(2*zoom)-4)),y=Math.max(0,Math.floor(camY-(h/2+115)/zoom-4));
    const x1=Math.min(terreno.width,Math.ceil(camX+w/(2*zoom)+4)),y1=Math.min(terreno.height,Math.ceil(camY+(h/2-115)/zoom+4));
    if(x1>x && y1>y)ctx.drawImage(terreno,x,y,x1-x,y1-y,x,y,x1-x,y1-y);
  }
  const reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,t=reduced?0:now/1000;
  // Sulcos de água e espuma deslocam-se pelo mar sem efeito estroboscópico.
  ctx.strokeStyle='rgba(87,183,192,.16)';ctx.lineWidth=2;
  for(let i=0;i<90;i++){const x=(i*137+t*(3+i%3))%(terreno.width+100),y=(i*191)%terreno.height;ctx.beginPath();ctx.arc(x,y,7+i%10,.15,2.5);ctx.stroke();}
  for(const m of map.marDocas??[]){
    const img=getSprite('docas_mar_'+m.id);if(!img)continue;
    const x=m.x*map.geometriaDocas.escala,y=m.y*map.geometriaDocas.escala,size=m.tamanho*map.geometriaDocas.escala;
    if(Math.abs(x-camX)>w/(2*zoom)+size||Math.abs(y-camY)>h/zoom+size)continue;
    const frame=reduced?0:Math.floor(t*4)%8;ctx.save();ctx.globalAlpha=m.id==='oleo'?.56:.85;
    ctx.drawImage(img,frame*160,0,160,160,x-size/2,y-size/2,size,size);ctx.restore();
  }
  for(const st of map.estruturasDocas)if(st.camada==='chao')desenharEstrutura(ctx,st,t,reduced);
  const objs=ordenarProfundidadeDocas([...map.estruturasDocas.filter(st=>st.camada!=='chao').map(st=>({estrutura:st,y:st.y})),...(state.trainingTargets??[]).filter(e=>e.health>0).map(e=>({entidade:e,y:e.y*SIDE_DEPTH_STEP})),...(state.cromaticaRuntime?.visao?[{entidade:state.cromaticaRuntime.visao,y:state.cromaticaRuntime.visao.y*SIDE_DEPTH_STEP}]:[]),{entidade:state.player,y:state.player.y*SIDE_DEPTH_STEP}]);
  for(const item of objs){
    if(item.estrutura){const st=item.estrutura,margin=st.largura*4;if(Math.abs(st.x-camX)<w/(2*zoom)+margin&&Math.abs(st.y-camY)<h/zoom+margin)desenharEstrutura(ctx,st,t,reduced);continue;}
    const e=item.entidade,x=e.x*CONFIG.TILE_W,y=e.y*SIDE_DEPTH_STEP;
    if(e===state.player){drawPlayer(e,x,y);continue;}
    if(e.renderType==='cromaticaVisao'){const img=getSprite('cromatica_nulo');if(img){ctx.save();ctx.globalAlpha=Math.min(.75,e.tempo/1.2);ctx.drawImage(img,x-18,y-65,36,65);ctx.restore();}continue;}
    const img=getSprite('cromatica_infectado');ctx.save();ctx.fillStyle='rgba(8,8,18,.6)';ctx.beginPath();ctx.ellipse(x,y,14,5,0,0,Math.PI*2);ctx.fill();if(e.windup>0){ctx.strokeStyle='#ffc4e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,20,9,0,0,Math.PI*2);ctx.stroke();}if(img){const fw=img.width/8,fr=Math.floor((e.clock??0)*5)%8;ctx.drawImage(img,fr*fw,0,fw,img.height,x-30,y-78,60,78);}ctx.restore();
  }
  const farol=map.estruturasDocas.find(o=>o.id==='farol'),lamp=getSprite('docas_farol');
  if(farol&&lamp){const y=farol.y-farol.largura*lamp.height/lamp.width+35;ctx.save();ctx.translate(farol.x,y);ctx.rotate(2.8+Math.sin(t*.28)*.26);ctx.fillStyle='rgba(242,234,184,.07)';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(650,-55);ctx.lineTo(650,55);ctx.closePath();ctx.fill();ctx.restore();}
  for(const o of state.objects??[]){if(!o.interacao)continue;const dist=Math.hypot(o.x-state.player.x,o.y-state.player.y);if(dist>2.2)continue;ctx.save();ctx.strokeStyle='rgba(188,246,231,.8)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(o.x*64,o.y*22,12,4,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  ctx.fillStyle='rgba(179,175,215,.04)';for(let i=0;i<9;i++){const x=((i*451+t*(4+i%3))%(terreno.width+400))-200,y=500+i*160;ctx.beginPath();ctx.ellipse(x,y,230,20,0,0,Math.PI*2);ctx.fill();}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='rgba(10,4,23,.06)';ctx.fillRect(0,0,w,h);
}
