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
  const x = cais.x*escala + peca.x*unit;
  const y = cais.y*escala + peca.y*unit;
  // A amplitude é menor que a folga do recorte junto aos reflexos. O cais,
  // suas amarras e o ponto de interação não se deslocam com o casco.
  const bob = peca.balanco && t !== null ? Math.sin(t*.85+peca.x*.01)*peca.balanco*unit : 0;
  ctx.drawImage(img, x, y+bob, peca.w*unit, peca.h*unit);
  if (peca.id === 'pesqueiro') {
    // Posições lidas na mesma planta que a textura da cabine e da lanterna.
    ctx.save();
    const pulse = t === null ? .2 : .18 + Math.sin(t*1.2)*.04;
    for (const [lx,ly,raio,rgb] of [[407,258,27,'255,151,77'],[408,356,25,'255,151,77'],[201,232,16,'255,69,140']]) {
      const gx=x+(lx-peca.x)*unit, gy=y+bob+(ly-peca.y)*unit, r=raio*unit;
      const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r);
      g.addColorStop(0,`rgba(${rgb},${pulse})`);
      g.addColorStop(1,`rgba(${rgb},0)`);
      ctx.fillStyle=g;
      ctx.fillRect(gx-r,gy-r,r*2,r*2);
    }
    ctx.restore();
  }
}
