// =====================================================================
// SELOS DE MÓDULO — a identidade visual de cada arquétipo
//
// O criador reclamou: "os gates de cada arquétipo ali estão, todos parecem
// só uma barreira pequena e padrão". O `drawBridgeThreshold` já desenhava
// um traço diferente por módulo, mas era fino, baixo e sumia contra a
// rocha: na prática os seis gates liam igual.
//
// Este módulo resolve a IDENTIDADE, não a mecânica:
//   - uma COR por módulo, coerente com o resto do jogo;
//   - um SÍMBOLO por módulo (não um traço genérico);
//   - um PORTAL de energia acima do deck, que se abre quando o gate é
//     vencido (a flag `gate_<id>` some do desenho).
//
// Mecânica de abrir/fechar continua em `gates.js`. Aqui só se decide
// "que cara esse módulo tem" e como desenhar essa cara.
// =====================================================================

export const MODULOS = Object.freeze({
  mare_astral: {
    nome: 'MARÉ ASTRAL',
    // Azul-turquesa vivo, o mesmo do arco de espuma e do fôlego.
    cor: '#35E6D3',
    corFraca: 'rgba(53,230,211,.16)',
    corForte: 'rgba(53,230,211,.62)',
    simbolo: 'onda',
    // Como a energia se comporta: ondulando (fluxo) ou firme (cinética).
    pulsar: 'fluxo',
  },
  nucleo_dez_forma: {
    nome: 'NÚCLEO 10X',
    cor: '#9CEFA2',
    corFraca: 'rgba(156,239,162,.14)',
    corForte: 'rgba(156,239,162,.58)',
    simbolo: 'fenda',
    pulsar: 'cinetico',
  },
  lamina_dominio_anciao: {
    nome: 'LÂMINA DO DOMÍNIO',
    cor: '#EDB85A',
    corFraca: 'rgba(237,184,90,.14)',
    corForte: 'rgba(237,184,90,.58)',
    simbolo: 'rachadura',
    pulsar: 'estatico',
  },
  motor_bio_forja: {
    nome: 'MOTOR BIO-FORJA',
    cor: '#CE9C5F',
    corFraca: 'rgba(206,156,95,.14)',
    corForte: 'rgba(206,156,95,.55)',
    simbolo: 'condutor',
    pulsar: 'mecanico',
  },
  neutro: {
    nome: 'ARQUIPÉLAGO',
    cor: '#9FBdC4',
    corFraca: 'rgba(159,189,196,.12)',
    corForte: 'rgba(159,189,196,.45)',
    simbolo: 'anel',
    pulsar: 'estatico',
  },
});

const POR_ARQUETIPO = {
  mare_astral: 'mare_astral',
  nucleo_dez_forma: 'nucleo_dez_forma',
  lamina_dominio_anciao: 'lamina_dominio_anciao',
  motor_bio_forja: 'motor_bio_forja',
};

/**
 * Descobre a identidade de um gate a partir dos requisitos declarados.
 * Um gate que aceita dois módulos (ex.: Maré OU 10X) usa a variante
 * combinada — é o caso real de `travessia_mare_eco`.
 */
export function identidadeDoGate(object) {
  const anyOf = object?.gate?.anyOf ?? [];
  const arquétipos = new Set();
  for (const req of anyOf) {
    if (req?.arquetipo && POR_ARQUETIPO[req.arquetipo]) arquétipos.add(req.arquetipo);
  }
  // Requisito por HABILIDADE: mapeia a habilidade para o módulo dono.
  const porHabilidade = {
    golpe_ruptura: 'lamina_dominio_anciao',
    passo_corrente: 'mare_astral',
    forma_veloz: 'nucleo_dez_forma',
  };
  for (const req of anyOf) {
    if (req?.habilidade && porHabilidade[req.habilidade]) {
      arquétipos.add(porHabilidade[req.habilidade]);
    }
  }

  const lista = [...arquétipos];
  if (lista.length === 0) return { ...MODULOS.neutro, id: 'neutro', arquétipos: [] };
  if (lista.length === 1) {
    return { ...MODULOS[lista[0]], id: lista[0], arquétipos: lista };
  }
  // Combinado: usa a primeira cor, mas o desenho sabe que são duas.
  return {
    ...MODULOS[lista[0]],
    id: 'combinado',
    arquétipos: lista,
    nome: lista.map(id => MODULOS[id].nome).join(' / '),
  };
}

// ---------------------------------------------------------------------
// DESENHO
// ---------------------------------------------------------------------

/**
 * Desenha o selo do gate no canvas já em espaço de tela.
 *
 * `ctx` deve estar transladado para o centro do deck (o mesmo ponto que
 * `drawBridgeThreshold` usa). `t` é o tempo em segundos, `vitoria` diz se
 * o gate já foi vencido (desenha apagado, sem portal).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} id identidade de `identidadeDoGate`
 * @param {object} geometria { halfWidth, axis } do bridgeGateGeometry
 * @param {number} t tempo
 * @param {boolean} vitoria
 */
export function desenharSeloDeModulo(ctx, id, geometria, t, vitoria) {
  if (!ctx || !id || !geometria) return;
  const { halfWidth = 1, axis = 'x' } = geometria;
  // Meia-largura em px de tela, igual ao traço do deck.
  const half = Math.max(18, Math.min(46, halfWidth * 32));
  const aberto = vitoria ? 0.25 : 1;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // ---- Portal: anel de energia em pé, acima do deck ----
  // Este é o elemento que dá presença: um gate é uma PORTA, não um risco.
  const altura = 34;
  const pulso = id.pulsar === 'fluxo'
    ? .55 + .45 * Math.sin(t * 1.8)
    : id.pulsar === 'cinetico'
      ? .55 + .45 * Math.abs(Math.sin(t * 2.6))
      : id.pulsar === 'mecanico'
        ? .6 + .4 * (Math.sin(t * 7.5) > .55 ? 1 : .15)
        : .7;

  // Halo difuso (dá volume sem peso de sprite).
  const halo = ctx.createRadialGradient(0, -altura * .55, 2, 0, -altura * .55, half * 1.25);
  halo.addColorStop(0, id.corForte.replace(/[\d.]+\)$/, `${(.34 * pulso * aberto).toFixed(3)})`));
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, -altura * .55, half * 1.2, altura * .95, 0, 0, Math.PI * 2);
  ctx.fill();

  // Arco do portal.
  ctx.strokeStyle = id.cor;
  ctx.globalAlpha = (.82 * pulso + .18) * aberto;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(0, -altura * .5, half * .82, altura * .72, 0, Math.PI * 1.06, Math.PI * 1.94);
  ctx.stroke();

  // Duas colunas curtas descendo até o deck.
  ctx.globalAlpha = (.6 * aberto);
  ctx.lineWidth = 1.6;
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(lado * half * .78, -altura * .5);
    ctx.lineTo(lado * half * .78, -2);
    ctx.stroke();
  }

  // ---- Símbolo do módulo no centro do portal ----
  ctx.globalAlpha = (.95 * aberto);
  ctx.strokeStyle = id.cor;
  ctx.fillStyle = id.cor;
  ctx.lineWidth = 2;
  const cy = -altura * .62;

  if (id.simbolo === 'onda') {
    // Maré: onda dupla, deslizando.
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const px = -half * .45 + (half * .9 * i / 12);
      const py = cy + Math.sin(i * .8 + t * 2.2) * 3.2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha *= .45;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const px = -half * .45 + (half * .9 * i / 12);
      const py = cy + 7 + Math.sin(i * .8 + t * 2.2 + 1.2) * 3;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (id.simbolo === 'fenda') {
    // Núcleo 10X: fenda angular que abre e fecha.
    const ab = .35 + .3 * Math.abs(Math.sin(t * 2.2));
    ctx.beginPath();
    ctx.moveTo(-half * .42, cy - 8);
    ctx.lineTo(-half * .10, cy - 1 - ab * 6);
    ctx.lineTo(-half * .42 + 2, cy + 8);
    ctx.moveTo(half * .42, cy - 8);
    ctx.lineTo(half * .10, cy - 1 - ab * 6);
    ctx.lineTo(half * .42 - 2, cy + 8);
    ctx.stroke();
  } else if (id.simbolo === 'rachadura') {
    // Lâmina: rachadura em ziguezague, sólida (não anima — é pedra).
    ctx.beginPath();
    ctx.moveTo(-3, cy - 11);
    ctx.lineTo(1, cy - 5);
    ctx.lineTo(-4, cy - 1);
    ctx.lineTo(3, cy + 4);
    ctx.lineTo(-1, cy + 11);
    ctx.lineWidth = 2.6;
    ctx.stroke();
  } else if (id.simbolo === 'condutor') {
    // Bio-forja: dois bornes ligados por um condutor que faísca.
    ctx.beginPath();
    ctx.moveTo(-half * .45, cy); ctx.lineTo(-half * .12, cy);
    ctx.moveTo(half * .12, cy); ctx.lineTo(half * .45, cy);
    ctx.stroke();
    ctx.fillRect(-half * .5 - 2, cy - 4, 5, 8);
    ctx.fillRect(half * .5 - 3, cy - 4, 5, 8);
    if (Math.sin(t * 9) > .3) {
      ctx.beginPath();
      ctx.moveTo(-half * .1, cy);
      ctx.lineTo(0, cy - 3);
      ctx.lineTo(half * .1, cy);
      ctx.stroke();
    }
  } else {
    // Neutro: anel simples.
    ctx.beginPath();
    ctx.arc(0, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ---- Combinado: marquinha do segundo módulo ----
  if (id.arquétipos && id.arquétipos.length > 1) {
    const segundo = MODULOS[id.arquétipos[1]];
    if (segundo) {
      ctx.globalAlpha = (.7 * aberto);
      ctx.fillStyle = segundo.cor;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(-8 + i * 8, -altura * .55 + 14, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  ctx.restore();
}
