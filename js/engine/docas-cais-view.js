import { poseNavio, desenharRigging, desenharContatoCasco } from './docas-vivas.js';
import { getSprite } from './sprites.js';

export function desenharReflexosCais(ctx, cais, escala) {
  const img = getSprite('docas_cais_sul_reflexos');
  if (img) ctx.drawImage(img, cais.x*escala, cais.y*escala,
    cais.largura*cais.escala*escala, cais.altura*cais.escala*escala);
}

export function desenharPecaCais(ctx, cais, peca, escala, t) {
  const img = getSprite(`docas_cais_sul_${peca.id}`);
  if (!img) return;
  const unit = cais.escala*escala;
  ctx.save();ctx.translate(cais.x*escala,cais.y*escala);ctx.scale(unit,unit);
  if(peca.balanco){
    const {bob,lean,drift}=poseNavio(peca,t);
    const px=peca.x+peca.w*.53,py=peca.pe;
    ctx.translate(px+drift,py+bob);ctx.rotate(lean);ctx.translate(-px,-py);
  }
  if(peca.id==='pesqueiro')desenharRigging(ctx,t);
  ctx.drawImage(img,peca.x,peca.y,peca.w,peca.h);
  if(peca.balanco)desenharContatoCasco(ctx,peca,t,true);
  if (peca.id === 'pesqueiro') {
    const pulse = t === null ? .2 : .20 + Math.sin(t*1.2)*.04 + Math.sin(t*2.2)*.017;
    for (const [lx,ly,r,rgb] of [[407,258,29,'255,151,77'],[408,356,28,'255,151,77'],[201,232,16,'255,69,140']]) {
      const g=ctx.createRadialGradient(lx,ly,0,lx,ly,r);
      g.addColorStop(0,`rgba(${rgb},${pulse})`);g.addColorStop(1,`rgba(${rgb},0)`);
      ctx.fillStyle=g;ctx.fillRect(lx-r,ly-r,r*2,r*2);
    }
  }
  ctx.restore();
}
