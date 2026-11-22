import { desenharCopasFundos } from './docas-foliage.js';
import { fundosForaDoAjuste } from './docas-oeste-pontual.js';
import { FRAMES_FECHAMENTO } from '../data/worlds/arquipelago-rotas-perdidas/docas-fechamento.js';
import { getSprite } from './sprites.js';

export const APOIOS_FECHAMENTO=Object.freeze({
 casinha:Object.freeze({frame:'casinha-esquerda',x:337,y:369,w:123,h:88,foot:451}),
 encosta:Object.freeze({frame:'encosta-viva',x:425,y:165,w:423,h:225,foot:388}),
 margemSul:Object.freeze({frame:'margem-rochosa',x:1053,y:600,w:197,h:56,foot:643}),
 margemLeste:Object.freeze({frame:'margem-rochosa',x:1280,y:539,w:128,h:55,foot:581}),
});
export const PECAS_FIEIS=Object.freeze({
 abrigo:Object.freeze({sprite:'docas_fiel_abrigo',box:Object.freeze([337,369,123,88]),foot:451}),
 fundos:Object.freeze({sprite:'docas_fiel_fundos',box:Object.freeze([374,142,480,258]),foot:385}),
 costa:Object.freeze({sprite:'docas_fiel_costa',box:Object.freeze([807,567,390,205]),foot:620}),
});
export function costaFielPronta(){return !!getSprite(PECAS_FIEIS.costa.sprite)&&!!getSprite('docas_acabamento_rocha');}
export function desenharCostaFiel(ctx,s){
 const p=PECAS_FIEIS.costa,img=getSprite(p.sprite);if(!img)return false;
 ctx.save();ctx.scale(s,s);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,...p.box);ctx.restore();return true;
}
// Only the flawed shore connection is replaced; deck, boats, collision and
// world registration continue to use CAIS_SUL unchanged.
export function desenharAcessoFiel(ctx,cais,peca,s){
 const img=getSprite('docas_fiel_acesso');if(!img)return false;
 const u=cais.escala*s;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 ctx.drawImage(img,cais.x*s+peca.x*u,cais.y*s+peca.y*u,peca.w*u,peca.h*u);ctx.restore();return true;
}
export const BOIAS_FECHAMENTO=Object.freeze([
 Object.freeze({x:1214,y:696,size:35,phase:0}),
 Object.freeze({x:1274,y:766,size:34,phase:1.6}),
 Object.freeze({x:1434,y:572,size:32,phase:3.2}),
]);
export function fechamentoPronto(map){return !!map.meta.docasEncaixe&&!!getSprite('docas_fechamento');}
export function desenharPecaFechamento(ctx,id,s,t=0,reduced=false){
 const p=APOIOS_FECHAMENTO[id],frame=p&&FRAMES_FECHAMENTO[p.frame],img=getSprite('docas_fechamento');
 if(!frame||!img)return false;
 ctx.save();ctx.scale(s,s);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 if(id==='encosta'&&!getSprite('docas_fiel_fundos')&&!reduced){ctx.translate(p.x+p.w/2,p.foot);ctx.transform(1,0,Math.sin(t*.7)*.0035,1,0,0);ctx.translate(-p.x-p.w/2,-p.foot);}
 if(id==='casinha'){
  ctx.fillStyle='rgba(8,12,24,.32)';ctx.beginPath();ctx.ellipse(p.x+p.w*.51,p.foot-1,53,10,-.04,0,Math.PI*2);ctx.fill();
 }
 const fundos=id==='encosta'&&getSprite('docas_fiel_fundos');
 const cabana=id==='casinha'&&(getSprite('docas_fiel_abrigo')||getSprite('docas_acabamento_cabana'));
 if(fundos){
  desenharCopasFundos(ctx,fundosForaDoAjuste(fundos),PECAS_FIEIS.fundos.box,t,reduced);
  const pulse=reduced?.14:.14+.035*Math.sin(t*1.4);ctx.fillStyle=`rgba(164,255,205,${pulse})`;
  for(const x of [639,666,697]){ctx.beginPath();ctx.ellipse(x,327,5,6,0,0,Math.PI*2);ctx.fill();}
 }else if(cabana)ctx.drawImage(cabana,p.x,p.y,p.w,p.h);
 else ctx.drawImage(img,...frame.rect,p.x,p.y,p.w,p.h);
 if(id==='casinha'&&getSprite('docas_fiel_abrigo')){
  const a=reduced?.06:.06+.025*Math.sin(t*1.4);const g=ctx.createRadialGradient(344,429,0,344,429,26);g.addColorStop(0,`rgba(222,60,242,${a})`);g.addColorStop(1,'rgba(190,32,220,0)');ctx.fillStyle=g;ctx.fillRect(318,403,52,52);
 }
 if(id==='casinha'&&!getSprite('docas_fiel_abrigo')){
  ctx.globalAlpha=reduced?.14:.14+.035*Math.sin(t*1.4);ctx.fillStyle='#e6dd96';
  for(const [x,y] of [[.77,.66]]){const g=ctx.createRadialGradient(p.x+p.w*x,p.y+p.h*y,0,p.x+p.w*x,p.y+p.h*y,10);g.addColorStop(0,'#d5ffc2');g.addColorStop(1,'rgba(139,255,190,0)');ctx.fillStyle=g;ctx.fillRect(p.x+p.w*x-10,p.y+p.h*y-10,20,20);}
 }
 ctx.restore();return true;
}
export function desenharMargensFechamento(ctx,s){
 const img=getSprite('docas_acabamento_rocha');
 if(!img){for(const id of ['margemSul','margemLeste'])desenharPecaFechamento(ctx,id,s,0,true);return;}
 ctx.save();ctx.scale(s,s);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
 // Rear/top surface beneath the watchtower feet (1355,456), then the
 // front face down to the water. Neither piece adds collision geometry.
 ctx.drawImage(img,1276,444,129,76);
 // Continuous southern bank supporting the annex, behind its pilings.
 if(!desenharCostaFiel(ctx,1))ctx.drawImage(img,1013,595,151,58);
 ctx.restore();
}
export function desenharVidaEncosta(ctx,s,t,reduced){
 ctx.save();ctx.scale(s,s);
 for(let i=0;i<9;i++){
  const x=454+i*41+(reduced?0:Math.sin(t*.24+i)*4),y=307+(i%3)*23+(reduced?0:Math.cos(t*.3+i)*3);
  ctx.fillStyle=`rgba(157,203,207,${reduced?.22:.15+.15*(1+Math.sin(t+i*2))/2})`;ctx.fillRect(x,y,1,1);
 }
 // Two small shoreline crabs: ambient silhouettes, not new quest actors.
 for(const [i,cx,cy] of [[0,1007,558],[1,1298,541]]){
  const x=cx+(reduced?0:Math.sin(t*.25+i)*3);ctx.fillStyle='#734f73';ctx.beginPath();ctx.ellipse(x,cy,2.5,1.6,0,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#b18b9b';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(x-4,cy-1);ctx.lineTo(x-2,cy);ctx.moveTo(x+4,cy-1);ctx.lineTo(x+2,cy);ctx.stroke();
 }ctx.restore();
}
export function desenharBoiasFechamento(ctx,s,t,reduced){
 const img=getSprite('docas_mar_boia');if(!img)return;
 ctx.save();ctx.scale(s,s);
 for(const p of BOIAS_FECHAMENTO){
  const bob=reduced?0:Math.sin(t*.85+p.phase)*1.6,frame=reduced?0:Math.floor(t*4+p.phase)%8;
  ctx.save();ctx.translate(p.x,p.y+bob);ctx.rotate(reduced?0:Math.sin(t*.75+p.phase)*.024);
  ctx.drawImage(img,frame*160,0,160,160,-p.size/2,-p.size*.8,p.size,p.size);
  const glow=ctx.createRadialGradient(0,-p.size*.55,0,0,-p.size*.55,p.size*.6);glow.addColorStop(0,'rgba(255,205,113,.28)');glow.addColorStop(1,'rgba(255,205,113,0)');ctx.fillStyle=glow;ctx.fillRect(-p.size*.6,-p.size*1.15,p.size*1.2,p.size*1.2);
  ctx.restore();ctx.strokeStyle='rgba(202,125,216,.28)';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(p.x,p.y+5,p.size*.58,p.size*.18,0,.2,Math.PI*1.8);ctx.stroke();
 }ctx.restore();
}

export const DETALHES_MARGEM=Object.freeze([
 {id:'lote11_arbusto-costeiro',x:1374,y:488,w:34},
 {id:'lote11_arbusto-costeiro',x:1309,y:477,w:25},
 {id:'lote6_rochedos',x:1327,y:503,w:31},
 {id:'lote6_cristal-violeta',x:1355,y:519,w:18},
 {id:'lote7_coral-pedra',x:1381,y:531,w:24},
].map(Object.freeze));
export function itensMargemFechamento(s){return DETALHES_MARGEM.map(p=>({fechamentoProp:p,y:p.y*s}));}
export function desenharDetalheMargem(ctx,p,s,t,reduced){
 const img=getSprite('docas_'+p.id);if(!img)return;
 const h=p.w*img.height/img.width;
 ctx.save();ctx.scale(s,s);ctx.fillStyle='rgba(8,12,24,.22)';ctx.beginPath();ctx.ellipse(p.x,p.y-1,p.w*.38,p.w*.08,0,0,Math.PI*2);ctx.fill();
 ctx.drawImage(img,p.x-p.w/2,p.y-h,p.w,h);
 if(p.id.includes('cristal')){ctx.globalAlpha=reduced?.16:.16+.05*Math.sin(t*1.3);const g=ctx.createRadialGradient(p.x,p.y-h*.45,0,p.x,p.y-h*.45,p.w);g.addColorStop(0,'#d565ec');g.addColorStop(1,'rgba(182,62,235,0)');ctx.fillStyle=g;ctx.fillRect(p.x-p.w,p.y-h*.45-p.w,p.w*2,p.w*2);}
 ctx.restore();
}
