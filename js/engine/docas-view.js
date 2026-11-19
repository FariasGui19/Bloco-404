import { desenharTentaculoRessaca, volta } from './docas-ressaca.js';
import { desenharSuperficieOeste, desenharCorrentesOeste, desenharMarCais } from './docas-vivas.js';
import { getSprite } from './sprites.js';
import { SIDE_DEPTH_STEP } from './camera.js';
import { CONFIG } from '../config.js';
import { criarOndasCais } from './docas-mar.js';
import { desenharPecaCosta, desenharMareOeste, iluminarAguaOeste, sombrearAreiaOeste } from './docas-costa-view.js';
import { ESCADA_OESTE } from '../data/worlds/arquipelago-rotas-perdidas/costa-oeste-docas.js';
import { desenharReflexosCais, desenharPecaCais } from './docas-cais-view.js';
// A planta é geometria, não o PNG da referência. O terreno é rasterizado
// uma vez; entidades e estruturas permanecem ordenadas pela posição do pé.
let terreno=null,terrenoMap=null,espumaCosta=[],ondasCais=[];
// Ordem usa o pé projetado, nunca o topo do sprite. Empates preservam a ordem de entrada.
export function ordenarProfundidadeDocas(items){return items.sort((a,b)=>a.y-b.y);}
function construirTerreno(map) {
  const s=map.geometriaDocas.escala,w=map.layout[0].length*64,h=map.layout.length*SIDE_DEPTH_STEP;
  espumaCosta=[];ondasCais=criarOndasCais(map.geometriaDocas.terraPolys??map.geometriaDocas.polys);
  const out=document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');
  const areia=getSprite('docas_areia'),costa=map.costaOeste;
  const naPraia=(x,y)=>costa && x<650*s && y>(costa.y+85*costa.escala)*s;
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
      // A praia oeste tem declive raso, espuma e rochas próprias, nunca a
      // parede vertical usada nos platôs. Só pulamos os seus segmentos.
      if(naPraia(mx,my))continue;
      // Apenas a face voltada para a câmera fica visível; amostra abaixo da borda.
      if(g.isPointInPath(mx,my+8))continue;
      const x0=(a[0]+(b[0]-a[0])*f0)*s,y0=(a[1]+(b[1]-a[1])*f0)*s;
      const x1=(a[0]+(b[0]-a[0])*f1)*s,y1=(a[1]+(b[1]-a[1])*f1)*s;
      espumaCosta.push({x:mx,y:my+24*s,dx:dx/len,dy:dy/len,phase:(i*13+k*7)%19});
      const d=24*s;g.fillStyle=facePattern||'#292b35';g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.lineTo(x1,y1+d);g.lineTo(x0,y0+d);g.closePath();g.fill();pathAll();
    }
  }
  for(const p of map.relevoDocas??[])if(p.camada==='base'){
    const img=getSprite(p.sprite?'docas_'+p.sprite:'docas_relevo_'+p.id);if(img)g.drawImage(img,(p.x-p.w/2)*s,(p.y-p.h)*s,p.w*s,p.h*s);
  }
  if(map.caisSul)desenharPecaCais(g,map.caisSul,map.caisSul.rocha,s,null);
  pathAll();g.fillStyle='#37313a';g.fill();g.save();g.clip();
  const areiaNova=getSprite('docas_lote5_areia'),terra=getSprite('docas_lote5_terra'),pedras=getSprite('docas_lote5_pedras');
  const fundo=areiaNova||areia;g.globalAlpha=.88;g.fillStyle=fundo?g.createPattern(fundo,'repeat'):'#48404a';g.fillRect(0,0,w,h);g.globalAlpha=1;
  // Clareamento arenoso localizado na chegada, recortado pelo terreno real.
  const luzCosta=g.createRadialGradient(820*s,549*s,5*s,820*s,549*s,175*s);
  luzCosta.addColorStop(0,'rgba(190,145,147,.44)');luzCosta.addColorStop(1,'rgba(190,145,147,0)');
  g.fillStyle=luzCosta;g.fillRect(500*s,360*s,490*s,460*s);
  // Áreas de terra gastas, limitadas à superfície e sem mudar colisões.
  if(terra){g.save();g.globalAlpha=.32;g.fillStyle=g.createPattern(terra,'repeat');for(const [x,y,rx,ry] of [[585,510,180,95],[910,535,220,90],[1210,515,160,75],[1190,220,160,70]]){g.beginPath();g.ellipse(x*s,y*s,rx*s,ry*s,0,0,Math.PI*2);g.fill();}g.restore();}
  if(costa){
    desenharPecaCosta(g,costa,costa.areia,s);
    sombrearAreiaOeste(g,costa,s);
  }
  // Textura recortada, levemente irregular, quebra a linha artificial da margem.
  g.save();g.fillStyle='rgba(25,27,30,.44)';
  for(const poly of map.geometriaDocas.terraPolys??map.geometriaDocas.polys)for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.floor(len/12));
    for(let k=0;k<n;k++){const f=(k+.5)/n,x=(a[0]+(b[0]-a[0])*f)*s,y=(a[1]+(b[1]-a[1])*f)*s;
      if(naPraia(x,y))continue;
      g.beginPath();g.ellipse(x,y,(3+(i*7+k*13)%8)*s,(2+(i*3+k*7)%4)*s,0,0,Math.PI*2);g.fill();}
  }g.restore();
  // Caminhos gastos conectam o desembarque às portas e à subida.
  const caminhos=[[[854,542],[865,520]],[[854,542],[770,514],[665,510],[575,500]],[[865,520],[1050,535],[1190,525]],[[900,510],[1000,450],[1050,365],[1110,275]]];
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
function desenharEstrutura(ctx,st,t,reduced,state){
 if(st.id==='lote3_tentaculo'&&desenharTentaculoRessaca(ctx,st.x,st.y,st.largura/192,reduced?0:volta(t/6+st.x*.004)))return;
 const img=getSprite('docas_'+st.id);if(!img)return;const folha=st.id.startsWith('lote3_'),w=st.largura,h=folha?w:w*img.height/img.width,x=st.x-w/2,y=st.y-h;
 if(st.camada!=='chao'&&!st.id.startsWith('lote5_')&&!st.id.startsWith('lote6_')&&!st.id.startsWith('lote7_')&&!st.id.startsWith('lote8_')&&!st.id.startsWith('lote9_')&&!st.id.startsWith('lote10_')&&!st.id.startsWith('lote11_')&&!st.id.startsWith('lote12_')&&!st.id.startsWith('cais_')&&!['cabana-oeste','cabana-leste','galpao','torre','farol','camara','porta'].includes(st.id)){ctx.save();ctx.fillStyle='rgba(7,8,15,.12)';ctx.beginPath();ctx.ellipse(st.x,st.y-3,w*.37,Math.max(5,w*.07),0,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.save();
 if((st.id==='lote9_flores'||st.id==='lote11_gramineas'||st.id==='lote12_flora') && !reduced){ctx.translate(st.x,st.y);ctx.rotate(Math.sin(t*.8+st.x)*.012);ctx.translate(-st.x,-st.y);}
 if(folha){
   const frame=reduced?0:Math.floor(t*4+(st.x%7)/7)%8;
   ctx.drawImage(img,frame*256,0,256,256,x,y,w,h);
 } else ctx.drawImage(img,x,y,w,h);
 ctx.restore();
 const glow=(gx,gy,r,color,alpha)=>{ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(gx-r,gy-r,r*2,r*2);ctx.restore();};
 const pulso=reduced?.55:.46+.10*Math.sin(t*1.2);
 // Sobreposições discretas acompanham as fontes reais, nunca o chão inteiro.
 if(st.id==='galpao'){
   const crt=getSprite('docas_fx_linha-crt');if(crt){ctx.save();ctx.globalAlpha=reduced?.08:.07+.03*Math.sin(t*2.1);for(const [sx,sy,sw,sh] of [[.478,.50,.06,.06],[.50,.583,.06,.055],[.422,.60,.045,.055]])ctx.drawImage(crt,x+w*sx,y+h*sy,w*sw,h*sh);ctx.restore();}
 }
 if(st.id==='camara'){
   const spark=getSprite('docas_fx_brilho-ciano');if(spark){ctx.save();ctx.globalAlpha=reduced?.07:.07+.025*Math.sin(t*1.3);ctx.drawImage(spark,x+w*.37,y+h*.30,w*.25,h*.30);ctx.restore();}
 }
 if(st.id==='cabana-oeste'||st.id==='cabana-leste')glow(x+w*.51,y+h*.66,w*.10,'#91e9a1',pulso*.25);
 if(st.id==='galpao')glow(x+w*.5,y+h*.62,w*.12,'#60f3ff',pulso*.30);
 if(st.id==='escada')glow(x+w*.7,y+h*.58,w*.08,'#df80f7',pulso*.20);
 if(st.id==='torre')glow(st.x,y+h*.08,24,'#ff7185',pulso*.6);
 if(st.id==='farol')glow(st.x,y+h*.08,25,'#fff1b8',pulso*.6);
 if(st.id==='camara')glow(st.x,y+h*.47,w*.16,'#76fff0',pulso*.34);
 if(st.id==='porta')glow(st.x,y+h*.5,w*.18,'#bd88db',pulso*.24);
 // Luzes de vigia e coral respiram lentamente, sem alterar a arte de base.
 if(st.id==='lote10_fogueira' && state.progress?.flags?.docas_fogueira_acesa){
   const fx=x+w*.5,fy=y+h*.50,unit=Math.max(2,w*.045);
   glow(fx,fy,w*.48,'#ff9b45',pulso*.32);
   const brasa=getSprite('docas_fx_brasa'),flame=getSprite('docas_fx_chama');
   ctx.save();ctx.imageSmoothingEnabled=false;
   const smoke=getSprite('docas_fx_fumaca');
   if(smoke){const drift=reduced?0:Math.sin(t*.8)*unit*.6;ctx.globalAlpha=.13;ctx.drawImage(smoke,fx-unit*1.4+drift,fy-unit*12,unit*2.8,unit*9);ctx.globalAlpha=1;}
   if(brasa){ctx.globalAlpha=.65;ctx.drawImage(brasa,fx-w*.15,fy-w*.06,w*.30,w*.18);ctx.globalAlpha=1;}
   if(flame){const size=w*.85,frame=reduced?0:Math.floor(t*7)%8;ctx.drawImage(flame,frame*128,0,128,128,fx-size/2,fy-size*.80,size,size);}
   if(!reduced)for(let i=0;i<4;i++){const p=(t*.32+i*.25+(st.x%7)*.04)%1;ctx.fillStyle=`rgba(255,181,95,${(1-p)*.65})`;ctx.fillRect(fx+Math.sin(i*4+p*5)*unit*1.5,fy-p*unit*9,Math.max(1,unit*.3),Math.max(1,unit*.4));}
   ctx.restore();
 }
 if(st.id==='cais_cristais')glow(st.x,y+h*.5,w*.48,'#ef6cfa',pulso*.45);
 if(st.id==='lote12_lampiao')glow(st.x,y+h*.62,w*.7,'#ffd395',pulso*.30);
 if(st.id==='lote12_residuos'||st.id==='lote12_corais')glow(st.x,y+h*.62,w*.34,'#df83f5',pulso*.22);
 if(st.id==='lote11_lanterna-chao')glow(st.x,y+h*.42,w*.8,'#ffd395',pulso*.28);
 if(st.id==='lote11_cogumelos'||st.id==='lote11_totem')glow(st.x,y+h*.52,w*.35,'#78dff3',pulso*.22);
 if(st.id==='lote10_farolete')glow(st.x,y+h*.23,w*.75,'#ffd395',pulso*.35);
 if(st.id==='lote10_coral')glow(st.x,y+h*.48,w*.35,'#e583ff',pulso*.22);
 if(st.id==='lote10_coral'&&!reduced){for(let i=0;i<2;i++){const phase=(t*.12+i*.5+(st.x%11)*.03)%1;ctx.fillStyle=`rgba(219,150,255,${.28*(1-phase)})`;ctx.fillRect(st.x+(i?1:-1)*w*.15,y+h*.45-phase*h*.3,2,2);}}
 if(st.id==='lote8_lampiao')glow(st.x,y+h*.5,w*.5,'#ffce85',.14);
 if(st.id==='lote8_ampola'||st.id==='lote8_corais')glow(st.x,y+h*.6,w*.3,st.id==='lote8_ampola'?'#79f8ef':'#da7aff',.10);
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
  const reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches,t=reduced?0:now/1000;
  const clock=reduced?null:t,sCais=map.geometriaDocas.escala,oeste=map.costaOeste;
  const esquerda=camX-w/(2*zoom),direita=camX+w/(2*zoom),topo=camY-(h/2+115)/zoom,base=camY+(h/2-115)/zoom;
  const costaVisivel=oeste && esquerda<(oeste.x+oeste.mar.w*oeste.escala)*sCais && direita>oeste.x*sCais
    && base>oeste.y*sCais && topo<(oeste.y+oeste.mar.h*oeste.escala)*sCais;
  const cais=map.caisSul,pecasCais=[];
  if(costaVisivel){
    iluminarAguaOeste(ctx,oeste,sCais);
    desenharSuperficieOeste(ctx,oeste,sCais,clock);
    desenharCorrentesOeste(ctx,oeste,sCais,clock);
  }
  // Ship-water FX must sit above the opaque west sea paint, but below land,
  // deck and depth-sorted entities. Otherwise the new swell is hidden.
  if(cais && esquerda<(cais.x+cais.largura*cais.escala)*sCais && base>cais.y*sCais){
    desenharReflexosCais(ctx,cais,sCais);
    desenharMarCais(ctx,cais,sCais,clock);
  }
  if(terreno){
    const x=Math.max(0,Math.floor(camX-w/(2*zoom)-4)),y=Math.max(0,Math.floor(camY-(h/2+115)/zoom-4));
    const x1=Math.min(terreno.width,Math.ceil(camX+w/(2*zoom)+4)),y1=Math.min(terreno.height,Math.ceil(camY+(h/2-115)/zoom+4));
    if(x1>x && y1>y)ctx.drawImage(terreno,x,y,x1-x,y1-y,x,y,x1-x,y1-y);
  }
  // Sulcos de água e espuma deslocam-se pelo mar sem efeito estroboscópico.
  ctx.strokeStyle='rgba(87,183,192,.16)';ctx.lineWidth=2;
  for(let i=0;i<90;i++){const x=(i*137+t*(3+i%3))%(terreno.width+100),y=(i*191)%terreno.height;ctx.beginPath();ctx.arc(x,y,7+i%10,.15,2.5);ctx.stroke();}
  // Ondulações quebradas no mar do cais, com geometria e quantidade fixas.
  for(const wave of ondasCais){
    const x=wave.x*sCais,y=wave.y*sCais;if(Math.abs(x-camX)>w/(2*zoom)+100||Math.abs(y-camY)>h/zoom+100)continue;
    const drift=reduced?0:Math.sin(t*.65+wave.fase)*5,alpha=reduced?.25:.24+.06*Math.sin(t*.8+wave.fase);
    ctx.strokeStyle=wave.cor<.22?`rgba(234,83,200,${alpha*.85})`:`rgba(147,217,235,${alpha})`;
    ctx.lineWidth=wave.cor<.15?2:1.4;ctx.beginPath();ctx.moveTo(x+drift,y);ctx.lineTo(x+wave.largura*sCais*.35+drift,y-2);ctx.lineTo(x+wave.largura*sCais*.65+drift,y);ctx.lineTo(x+wave.largura*sCais+drift,y-2);ctx.stroke();
  }
  // Espuma baixa junto à base da falésia, não sobre o piso transitável.
  // A lista é calculada uma vez com o mesmo contorno do terreno.
  ctx.save();ctx.lineWidth=2;
  for(const p of espumaCosta){
    if(Math.abs(p.x-camX)>w/(2*zoom)+30||Math.abs(p.y-camY)>h/zoom+30)continue;
    const wave=reduced?0:Math.sin(t*.9+p.phase*.6);
    const local=p.x>700*sCais&&p.x<830*sCais&&p.y>590*sCais&&p.y<700*sCais;
    ctx.strokeStyle=local?`rgba(173,229,239,${.32+.06*wave})`:`rgba(138,218,221,${.10+.04*wave})`;
    ctx.beginPath();ctx.moveTo(p.x-p.dx*8,p.y-p.dy*8+3+wave*3);ctx.lineTo(p.x+p.dx*8,p.y+p.dy*8+3+wave*3);ctx.stroke();
  }
  ctx.restore();
  // Névoa baixa limitada ao mar do cais; passa atrás do barco e do deck.
  const fogCais=getSprite('docas_fx_faixas-nevoa');
  if(fogCais){const s=map.geometriaDocas.escala;ctx.save();ctx.globalAlpha=.12;for(const [x,y,k] of [[175,730,0],[500,780,1],[780,705,2]]){const dx=reduced?0:Math.sin(t*.12+k)*18;ctx.drawImage(fogCais,x*s+dx,y*s,155*s,28*s);}ctx.restore();}
  // Pequenos reflexos afastados da máscara de terra, sem substituir o mar.
  for(const [id,mx,my,size,phase] of [...(map.costaOeste?[]:[['onda-magenta',205,555,54,1]]),['redemoinho',1400,590,62,2]]){
    const img=getSprite('docas_fx_'+id),s=map.geometriaDocas.escala;if(!img)continue;
    const px=mx*s,py=my*s,sz=size*s;if(Math.abs(px-camX)>w/(2*zoom)+sz||Math.abs(py-camY)>h/zoom+sz)continue;
    ctx.save();ctx.globalAlpha=reduced?.18:.17+.035*Math.sin(t*.8+phase);ctx.drawImage(img,px-sz/2,py-sz*.20,sz,sz*.40);ctx.restore();
  }
  for(const m of map.marDocas??[]){
    const x=m.x*map.geometriaDocas.escala,y=m.y*map.geometriaDocas.escala,size=m.tamanho*map.geometriaDocas.escala;
    if(Math.abs(x-camX)>w/(2*zoom)+size*2||Math.abs(y-camY)>h/zoom+size*2)continue;
    if(m.id==='tentaculo'&&desenharTentaculoRessaca(ctx,x,y+size*.21,size/192,reduced?0:volta(t/6+m.x*.003),.91))continue;
    const img=getSprite('docas_mar_'+m.id);if(!img)continue;
    const frame=reduced?0:Math.floor(t*4)%8,bob=m.id==='boia'&&!reduced?Math.sin(t*.85+m.x)*4:0;
    ctx.save();ctx.globalAlpha=m.id==='oleo'?.56:.85;
    ctx.drawImage(img,frame*160,0,160,160,x-size/2,y-size/2+bob,size,size);ctx.restore();
    if(m.id==='boia'){ctx.save();ctx.globalAlpha=reduced?.22:.16+.06*Math.sin(t*1.1+m.x);const g=ctx.createRadialGradient(x,y-size*.23+bob,0,x,y-size*.23+bob,size*.24);g.addColorStop(0,'#ffe1a0');g.addColorStop(1,'rgba(255,215,130,0)');ctx.fillStyle=g;ctx.fillRect(x-size*.24,y-size*.47+bob,size*.48,size*.48);ctx.restore();}

  }
  if(costaVisivel)desenharMareOeste(ctx,oeste,sCais,clock);
  // Primeiro o piso (deck e degraus); estacas dianteiras usam o Y do ponto
  // em que atravessam as tábuas, não o Y em que somem na água.
  const drawCais=peca=>desenharPecaCais(ctx,cais,peca,sCais,clock);
  if(cais)for(const peca of cais.pecas){
    const unit=cais.escala*sCais,x=cais.x*sCais+(peca.x+peca.w/2)*unit;
    const y=cais.y*sCais+(peca.y+peca.h/2)*unit;
    if(Math.abs(x-camX)>w/(2*zoom)+peca.w*unit/2 ||
       Math.abs(y-camY)>(h/2+115)/zoom+peca.h*unit/2)continue;
    if(peca.pe===undefined){
      if(oeste && peca.id==='escada-mare')desenharPecaCosta(ctx,cais,ESCADA_OESTE,sCais);
      drawCais(peca);
    }
    else pecasCais.push({peca,y:cais.y*sCais+peca.pe*unit});
  }
  for(const st of map.estruturasDocas)if(st.camada==='chao')desenharEstrutura(ctx,st,t,reduced,state);
  const pecasOeste=costaVisivel?[...oeste.rochas,...oeste.vegetacao].map(peca=>({pecaOeste:peca,y:(oeste.y+peca.pe*oeste.escala)*sCais})):[];
  const objs=ordenarProfundidadeDocas([...pecasCais,...pecasOeste,...map.estruturasDocas.filter(st=>st.camada!=='chao').map(st=>({estrutura:st,y:st.y})),...(state.trainingTargets??[]).filter(e=>e.health>0).map(e=>({entidade:e,y:e.y*SIDE_DEPTH_STEP})),...(state.cromaticaRuntime?.visao?[{entidade:state.cromaticaRuntime.visao,y:state.cromaticaRuntime.visao.y*SIDE_DEPTH_STEP}]:[]),{entidade:state.player,y:state.player.y*SIDE_DEPTH_STEP}]);
  for(const item of objs){
    if(item.pecaOeste){desenharPecaCosta(ctx,oeste,item.pecaOeste,sCais,clock);continue;}
    if(item.peca){drawCais(item.peca);continue;}
    if(item.estrutura){const st=item.estrutura,margin=st.largura*4;if(Math.abs(st.x-camX)<w/(2*zoom)+margin&&Math.abs(st.y-camY)<h/zoom+margin)desenharEstrutura(ctx,st,t,reduced,state);continue;}
    const e=item.entidade,x=e.x*CONFIG.TILE_W,y=e.y*SIDE_DEPTH_STEP;
    if(e===state.player){drawPlayer(e,x,y);continue;}
    if(e.renderType==='cromaticaVisao'){const img=getSprite('cromatica_nulo');if(img){ctx.save();ctx.globalAlpha=Math.min(.75,e.tempo/1.2);ctx.drawImage(img,x-18,y-65,36,65);ctx.restore();}continue;}
    const img=getSprite('cromatica_infectado');ctx.save();ctx.fillStyle='rgba(8,8,18,.6)';ctx.beginPath();ctx.ellipse(x,y,14,5,0,0,Math.PI*2);ctx.fill();
    if(e.windup>0){const phase=reduced?.5:Math.max(0,Math.min(1,1-e.windup/.65));ctx.fillStyle='rgba(240,120,168,.12)';ctx.strokeStyle='#ffc4e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,20+phase*4,9+phase*2,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    if(img){const fw=img.width/8,clock=e.clock??0,fr=reduced?0:Math.floor(clock*(e.cromaticaMovendo?6:2))%8;
      const bob=reduced?0:e.cromaticaMovendo?Math.sin(clock*8)*2:Math.sin(clock*1.8)*.8;
      const lean=reduced?0:e.windup>0?-.035*Math.sin((1-e.windup/.65)*Math.PI):e.cromaticaMovendo?.018*Math.sin(clock*6):0;
      ctx.translate(x,y);if(e.cromaticaFaceDireita)ctx.scale(-1,1);ctx.rotate(lean);ctx.globalAlpha=e.hitTimer>0?.68:1;ctx.imageSmoothingEnabled=false;ctx.drawImage(img,fr*fw,0,fw,img.height,-36,-96-bob,72,96);
    }ctx.restore();
  }
  const farol=map.estruturasDocas.find(o=>o.id==='farol'),lamp=getSprite('docas_farol');
  if(farol&&lamp){const y=farol.y-farol.largura*lamp.height/lamp.width+35;ctx.save();ctx.translate(farol.x,y);ctx.rotate(2.8+Math.sin(t*.28)*.26);ctx.fillStyle='rgba(242,234,184,.07)';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(650,-55);ctx.lineTo(650,55);ctx.closePath();ctx.fill();ctx.restore();}
  for(const o of state.objects??[]){if(!o.interacao)continue;const dist=Math.hypot(o.x-state.player.x,o.y-state.player.y);if(dist>2.2)continue;ctx.save();const selected=state.interaction?.active?.data?.id===o.id;const pulse=reduced?0:Math.sin(t*2.4)*.5;ctx.strokeStyle=selected?'rgba(199,255,234,.9)':'rgba(188,246,231,.5)';ctx.lineWidth=selected?2:1;ctx.beginPath();ctx.ellipse(o.x*64,o.y*22,12+(selected?pulse*2:0),4+(selected?pulse*.6:0),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
  const mist=getSprite('docas_fx_faixas-nevoa');
  if(mist){ctx.save();ctx.globalAlpha=.045;for(let i=0;i<3;i++){const fx=((i*1000+t*(4+i))%(terreno.width+800))-400;ctx.drawImage(mist,fx,850+i*390,460,58);}ctx.restore();}
  ctx.fillStyle='rgba(179,175,215,.04)';for(let i=0;i<9;i++){const x=((i*451+t*(4+i%3))%(terreno.width+400))-200,y=500+i*160;ctx.beginPath();ctx.ellipse(x,y,230,20,0,0,Math.PI*2);ctx.fill();}
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='rgba(10,4,23,.06)';ctx.fillRect(0,0,w,h);
}
