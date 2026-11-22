// Efeitos locais sobre as artes aprovadas. Coordenadas são relativas ao recorte
// visível de cada sprite; nenhuma transformação move apoios ou hitboxes.
export const ELEMENTOS_LOTE2 = Object.freeze([
  'rede_treino_praia_enseada', 'poleiro_aves_enseada',
  'travessia_pedras_agua', 'relogio_mare_enseada', 'torre_antena_enseada',
  'concha_praia_central_enseada', 'poste_cercado_sudeste', 'poste_lanterna_madeira',
  'lanterna_coral_sudeste', 'cais_enseada_visual',
]);
const detalhes = new Set(ELEMENTOS_LOTE2.slice(2));

// Quadros sempre voltam à arte base em movimento reduzido. A posição do
// objeto não altera a fase: fácil sincronizar e reproduzir na inspeção.
export function quadroEnseada(object, tempo, reduzido = false) {
  const quadros = object.quadrosAnimacao;
  if (reduzido || !Array.isArray(quadros) || !quadros.length) return object.sprite;
  const duracao = Math.max(.05, object.duracaoQuadro ?? .3);
  return quadros[Math.floor(Math.max(0, tempo) / duracao) % quadros.length] ?? object.sprite;
}

export function temDetalheEnseada(id) { return detalhes.has(id); }

export function desenharDetalheEnseada(ctx, object, crop, tempo, reduzido = false) {
  if (!detalhes.has(object.id) || !crop?.w || !crop?.h || !object.larguraPx) return;
  const t = reduzido ? 0 : tempo;
  const w = object.larguraPx, h = w * crop.h / crop.w;
  const boia = object.flutuacaoSuave ? Math.sin(t*2.1 + object.x*1.7 + object.y)*2.4 : 0;
  const x = (object.x-object.y)*32+(object.ajusteX ?? 0);
  const y = (object.x+object.y)*16+(object.ajusteY ?? 0)+boia;
  const px = object.pivotX ?? .5, py = object.pivotY ?? 1;
  ctx.save();
  ctx.translate(x,y); if(object.espelhar) ctx.scale(-1,1);
  ctx.translate(-w*px,-h*py);
  ctx.globalCompositeOperation = 'screen';
  const ponto = (u,v,rx,ry,alpha,cor) => {
    ctx.fillStyle = cor; ctx.globalAlpha = Math.max(0,Math.min(1,alpha));
    ctx.beginPath();ctx.ellipse(u*w,v*h,rx,ry,0,0,Math.PI*2);ctx.fill();
  };
  const brilho = .45 + .35*Math.sin(t*2.4);
  switch(object.id) {
    case 'travessia_pedras_agua':
      // As cinco inscrições acendem em sequência sem mexer nas lajes.
      [[.15,.10],[.31,.25],[.50,.42],[.67,.59],[.85,.73]].forEach(([u,v],i)=>
        ponto(u,v,2.6,1.5,.20+.30*(.5+.5*Math.sin(t*2.3-i*.8)),'#8dffff'));
      break;
    case 'relogio_mare_enseada': {
      // Ponteiro curto varre devagar o mostrador; o pé fica fixo.
      const a = t*.35;
      ctx.globalAlpha=.85;ctx.strokeStyle='#68441c';ctx.lineWidth=1.1;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(w*.37,h*.19);ctx.lineTo(w*.37+Math.sin(a)*w*.095,h*.19-Math.cos(a)*w*.095);ctx.stroke();
      ponto(.37,.19,1.1,1.1,.8,'#ffe39a'); break;
    }
    case 'torre_antena_enseada':
      ponto(.48,.025,3.4,3.4,brilho,'#ff4b24');
      ponto(.48,.025,1.2,1.2,.7,'#ffd2a2'); break;
    case 'concha_praia_central_enseada': {
      const f=.5+.5*Math.sin(t*1.8);ponto(.55,.70,2.6,2.6,.18+f*.36,'#d9ffff');
      ctx.strokeStyle='#ffffff';ctx.globalAlpha=f*.45;ctx.lineWidth=.8;
      ctx.beginPath();ctx.moveTo(w*.55-3,h*.70);ctx.lineTo(w*.55+3,h*.70);ctx.moveTo(w*.55,h*.70-3);ctx.lineTo(w*.55,h*.70+3);ctx.stroke();break;
    }
    case 'poste_cercado_sudeste': ponto(.72,.43,3.1,3.8,.18+brilho*.35,'#ffd276');break;
    case 'poste_lanterna_madeira': ponto(.56,.16,2.3,3.0,.18+brilho*.35,'#ffd276');break;
    case 'lanterna_coral_sudeste': ponto(.50,.65,3.0,3.5,.18+brilho*.35,'#ffd276');break;
    case 'cais_enseada_visual': {
      // Ondulações no mar junto ao casco, sem deslocar o cais nem a corda.
      for(let i=0;i<2;i++) {
        const f=(t*.24+i*.5)%1;ctx.globalAlpha=(1-f)*.35;ctx.strokeStyle='#bafff5';ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(w*(.85+f*.035),h*.96,3+f*10,1+f*3,0,0,Math.PI);ctx.stroke();
      }
      // Um reflexo breve na vela acompanha a luz do mar.
      ctx.globalAlpha=.1+.14*(.5+.5*Math.sin(t*1.5));ctx.strokeStyle='#fff9d9';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(w*.83,h*.34);ctx.lineTo(w*.86,h*.55);ctx.stroke();break;
    }
  }
  ctx.restore();
}
