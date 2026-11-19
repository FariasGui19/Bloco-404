import { getSprite } from './sprites.js';

export function desenharPecaCosta(ctx, origem, peca, escala) {
  const img=getSprite(`docas_costa_${peca.id}`);
  const u=origem.escala*escala;
  if(img)ctx.drawImage(img,origem.x*escala+peca.x*u,origem.y*escala+peca.y*u,peca.w*u,peca.h*u);
}

// Underpainting keeps the foam's blue-violet depths continuous through
// the transparent joins, without colouring the dock, rocks or dry ground.
export function iluminarAguaOeste(ctx,costa,escala) {
  const u=costa.escala*escala;
  ctx.save();ctx.translate(costa.x*escala,costa.y*escala);ctx.scale(u,u);
  for(const [x,y,rx,ry,rgb,alpha] of [
    [440,450,460,183,'30,84,149',.31], [673,512,208,113,'41,73,144',.46],
    [210,586,282,186,'81,29,139',.24], [490,810,362,120,'34,45,133',.20],
  ]){
    ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
    const g=ctx.createRadialGradient(0,0,.02,0,0,1);
    g.addColorStop(0,`rgba(${rgb},${alpha})`);
    g.addColorStop(.52,`rgba(${rgb},${alpha*.6})`);
    g.addColorStop(1,`rgba(${rgb},0)`);
    ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  ctx.restore();
}

// Fade the wet band into dry sand. The caller has already clipped it to
// terraPolys, so even the purple sheen doesn't masquerade as extra floor.
export function sombrearAreiaOeste(ctx,costa,escala) {
  const u=costa.escala*escala;
  ctx.save();ctx.translate(costa.x*escala,costa.y*escala);ctx.scale(u,u);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  costa.margem.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  for(const [w,a] of [[24,.06],[16,.085],[8,.12],[3,.12]]){
    ctx.lineWidth=w;ctx.strokeStyle=`rgba(26,32,63,${a})`;ctx.stroke();
  }
  ctx.restore();
}

export function quadroTentaculo(peca,t) {
  if(t===null)return 0;
  return Math.floor((t%peca.duracao)/peca.duracao*peca.quadros);
}

// Polylines are broken naturally by their varying segment widths and phase;
// no straight parallel strokes across the beach or the deck.
const correntezas=[
  [[88,275],[112,292],[143,307],[159,308],[171,320],[197,330],[217,331],[223,338],[251,337],[268,329],[287,335],[308,332]],
  [[195,350],[215,356],[237,353],[256,362],[278,360],[292,369],[313,364],[343,378],[353,376],[379,387]],
  [[348,368],[377,383],[393,389],[399,405],[423,415],[448,421],[462,418],[477,425],[504,414]],
  [[278,421],[305,429],[317,440],[333,440],[350,454],[370,452],[384,464],[412,466]],
  [[523,432],[544,437],[554,447],[579,454],[592,450],[617,470],[641,473]],
  [[667,481],[682,489],[700,494],[720,503],[735,496],[747,491],[771,479],[776,464]],
];
const rastroTentaculo=[[0,2],[-21,-3],[-34,-7],[-29,-12],[-16,-15],[7,-19],[24,-17],[42,-13],[54,-5],[48,5],[32,11],[12,10],[1,15],[-20,13],[-38,7]];

function trilha(ctx,pts,dx,dy,t,seed,color,alpha,width) {
  ctx.lineWidth=width;
  for(let i=0;i<pts.length-1;i++){
    const p=pts[i],q=pts[i+1],phase=seed+i*.62;
    const a=t===null?alpha:alpha*(.66+.34*Math.sin(t*2.05+phase));
    const d=t===null?0:Math.sin(t*1.55+phase)*1.65;
    ctx.strokeStyle=`rgba(${color},${a})`;
    ctx.beginPath();ctx.moveTo(dx+p[0],dy+p[1]+d);
    ctx.quadraticCurveTo(dx+(p[0]+q[0])/2,dy+(p[1]+q[1])/2+d+1.6,dx+q[0],dy+q[1]+d);
    ctx.stroke();
  }
}

export function desenharMareOeste(ctx,costa,escala,t) {
  const u=costa.escala*escala;
  ctx.save();ctx.translate(costa.x*escala,costa.y*escala);ctx.scale(u,u);
  ctx.lineCap='round';
  for(let i=0;i<correntezas.length;i++){
    const linha=correntezas[i],cor=i%4===1?'237,98,220':'153,222,246';
    trilha(ctx,linha,0,3,t,i,cor,.22,1.7);
    trilha(ctx,linha,-5,10,t,i+2,cor,.09,.85);
  }
  const p=costa.tentaculo,[bx,by]=p.base;
  for(let i=0;i<3;i++){
    const onda=t===null ? .28+i*.31 : (t*.41+i/3)%1;
    const perto=.65+onda*1.35;
    const translucido=(1-onda)*.8;
    const contorno=rastroTentaculo.map(([x,y],j)=>[x*perto+Math.sin(i+j)*3,y*perto+Math.cos(i+j)*2]);
    trilha(ctx,contorno,bx,by,t,i,'235,79,227',translucido,2.1-onda*.9);
  }
  const img=getSprite('docas_costa_tentaculo');
  if(img){
    const frame=quadroTentaculo(p,t);
    const fw=img.width/p.colunas,fh=img.height/Math.ceil(p.quadros/p.colunas);
    ctx.drawImage(img,frame%p.colunas*fw,Math.floor(frame/p.colunas)*fh,fw,fh,p.x,p.y,p.w,p.h);
  }
  // Near lip drawn over the anchored root, plus short spray driven by each swell.
  trilha(ctx,[[-34,-3],[-22,2],[-13,1],[-7,5],[4,4],[11,8],[21,3],[31,1],[38,-4]],bx,by+4,t,3,'193,225,255',.66,2.5);
  if(t!==null){
    for(let i=0;i<11;i++){
      const p=(t*.8+i*.37)%1;
      const x=bx+(i*37%53-26)*(1+.5*p)+Math.sin(i*4.9)*21;
      const y=by-3-p*(1-p)*(14+i%5*4);
      ctx.fillStyle=`rgba(187,209,255,${.32*(1-p)})`;
      ctx.fillRect(x,y,1.2+i%3*.42,1.1+i%3*.36);
    }
  }
  const fog=getSprite('docas_fx_faixas-nevoa');
  if(fog){
    // Low bank stays under the props and stops well short of the staircase.
    for(const [x,y,w,h,alpha,phase] of [[14,275,308,90,.17,0],[359,339,390,87,.30,2],[25,651,311,94,.16,5]]){
      const drift=t===null?0:Math.sin(t*.26+phase)*28;
      ctx.globalAlpha=t===null?alpha:alpha*(.88+.12*Math.sin(t*.46+phase));
      ctx.drawImage(fog,x+drift,y,w,h);
    }
  }
  ctx.restore();
}
