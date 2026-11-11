// =====================================================================
// DESENHO DA FAUNA FERIDA
//
// Regras de arte herdadas: sem texto, sem moldura, sem sombra de chão na
// arte do bicho; uma folha = uma linha visual; personagem original fixo.
// Aqui o desenho é procedural (canvas), não sprite: cada bicho é um
// punhado de curvas. Isso mantém o peso do projeto e deixa a ANIMAÇÃO
// no código, que é o pedido "melhorar as animações".
//
// Cada bicho tem um estado visual que se lê de longe:
//   ferido    → corpo encolhido, cor dessaturada, tremor
//   aliviado  → corpo aberto, respiração lenta, ainda opaco
//   curado    → não é desenhado no mapa (já voltou para a vida)
//
// A ajuda deixa RASTRO: um fio de partículas na cor do módulo que agiu.
// É o feedback de que o socorro veio do módulo, não de um botão.
// =====================================================================

// Paleta dessaturada para o ferido; a curada não é desenhada.
const COR_SOFRIMENTO = '#8d9aa0';
const COR_TENSAO = '#b98a6b';

function pulso(t, fase, vel = 1) {
  return .5 + .5 * Math.sin(t * vel + fase);
}

/**
 * Desenha um bicho ferido em coordenadas de tela.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} bicho de `criarBichosFeridos`
 * @param {number} sx,sy centro em px de tela
 * @param {number} escala px por tile
 * @param {number} t tempo em segundos
 * @param {object} opts { destacado, corModulo }
 */
export function desenharBichoFerido(ctx, bicho, sx, sy, escala, t, opts = {}) {
  if (!bicho || bicho.estado === 'curado') return;
  const e = escala / 32; // 32 px = 1 tile de referência
  const ferido = bicho.estado === 'ferido';
  const resp = pulso(t, bicho.fase, ferido ? 3.1 : 1.05);
  // Ferido respira rápido e curto; aliviado respira fundo.
  const amplitude = ferido ? .035 : .09;
  const encolhe = ferido ? .86 : 1;
  const tremor = ferido ? Math.sin(t * 17 + bicho.fase) * .6 * e : 0;

  ctx.save();
  ctx.translate(sx + tremor, sy);
  ctx.scale(e * encolhe, e * encolhe * (1 + resp * amplitude));

  if (opts.destacado) {
    ctx.globalAlpha = .5;
    ctx.strokeStyle = opts.corModulo ?? '#9fffe3';
    ctx.lineWidth = 1.2 / e;
    ctx.setLineDash?.([3 / e, 3 / e]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash?.([]);
    ctx.globalAlpha = 1;
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (bicho.tipo === 'tartaruga') desenharTartaruga(ctx, t, ferido);
  else if (bicho.tipo === 'golfinho') desenharGolfinho(ctx, t, ferido);
  else if (bicho.tipo === 'caranguejo') desenharCaranguejo(ctx, t, ferido);
  else if (bicho.tipo === 'passaro') desenharPassaro(ctx, t, ferido);
  else if (bicho.tipo === 'estrela') desenharEstrela(ctx, t, ferido);
  else if (bicho.tipo === 'arraia') desenharArraia(ctx, t, ferido);
  else if (bicho.tipo === 'cavalo_marinho') desenharCavaloMarinho(ctx, t, ferido);
  else if (bicho.tipo === 'peixe_palhaco') desenharPeixePalhaco(ctx, t, ferido);

  ctx.restore();
}

function desenharPeixePalhaco(ctx, t, ferido) {
  ctx.fillStyle = ferido ? '#9c8c72' : '#e49a50';
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-12, -4); ctx.lineTo(-12, 4); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#e8eee1'; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(-3, -4); ctx.lineTo(-3, 4); ctx.moveTo(2, -4); ctx.lineTo(2, 4); ctx.stroke();
  ctx.fillStyle = '#263e3b'; ctx.fillRect(5, -2, 1.5, 1.5);
}

// Silhueta legível também no fallback isométrico sem WebGL.
function desenharCavaloMarinho(ctx, t, ferido) {
  ctx.save(); ctx.rotate(Math.sin(t * 1.5) * .08);
  ctx.strokeStyle = ferido ? '#88735a' : '#cb9d56'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(2, -10); ctx.quadraticCurveTo(-5, -4, 0, 3);
  ctx.quadraticCurveTo(7, 12, 0, 12); ctx.quadraticCurveTo(-4, 12, -3, 8); ctx.stroke();
  ctx.fillStyle = ferido ? '#a8956e' : '#e2b56d';
  ctx.beginPath(); ctx.ellipse(3, -9, 4, 3.5, -.3, 0, Math.PI * 2); ctx.fill();
  ctx.fillRect(5, -9, 5, 2); ctx.fillStyle = '#253d3c'; ctx.fillRect(4, -10, 1.5, 1.5);
  ctx.restore();
}

// --- TARTARUGA: casco rachado, nadadeiras que remam devagar -------------
function desenharTartaruga(ctx, t, ferido) {
  const remo = Math.sin(t * (ferido ? .9 : 1.6)) * .35;
  ctx.fillStyle = COR_SOFRIMENTO;
  // Nadadeiras dianteiras
  for (const lado of [-1, 1]) {
    ctx.save();
    ctx.rotate(lado * (.35 + remo));
    ctx.beginPath();
    ctx.ellipse(lado * 11, 1, 6.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Nadadeiras traseiras
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(lado * 6, 5, 3.4, 1.8, lado * .5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Casco
  ctx.fillStyle = ferido ? '#6f7f74' : '#7f9a80';
  ctx.beginPath();
  ctx.ellipse(0, 0, 11, 7.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4d5f52';
  ctx.lineWidth = 1;
  for (const a of [-.5, 0, .5]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 5.2, 0, Math.PI * (.5 + a), Math.PI * (1.5 + a));
    ctx.stroke();
  }
  // A RACHADURA: o que define o bicho, sempre visível.
  if (ferido) {
    ctx.strokeStyle = COR_TENSAO;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, -6.4); ctx.lineTo(-1, -2.6); ctx.lineTo(-4.2, -.4); ctx.lineTo(-1.4, 3.6);
    ctx.stroke();
  }
  // Cabeça
  ctx.fillStyle = ferido ? '#8d9aa0' : '#96b193';
  ctx.beginPath();
  ctx.ellipse(12.4, -1.2, 3.1, 2.3, .3, 0, Math.PI * 2);
  ctx.fill();
}

// --- GOLFINHO: encalhado de lado, cauda batendo fraco ------------------
function desenharGolfinho(ctx, t, ferido) {
  const cauda = Math.sin(t * (ferido ? 1.2 : 2.2)) * (ferido ? .22 : .42);
  const cinza = ferido ? '#8d9aa0' : '#9fb8c4';
  ctx.fillStyle = cinza;
  ctx.beginPath();
  ctx.moveTo(-13, 0);
  ctx.quadraticCurveTo(-4, -5.6, 6, -2.4);
  ctx.quadraticCurveTo(13, -.6, 15, .4);
  ctx.quadraticCurveTo(6, 3.4, -4, 3.2);
  ctx.quadraticCurveTo(-11, 2.6, -13, 0);
  ctx.fill();
  // Cauda
  ctx.save();
  ctx.translate(-13, 0); ctx.rotate(cauda);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(-6.5, -3.6); ctx.lineTo(-5.2, 0); ctx.lineTo(-6.5, 3.6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  // Peitoral e dorsal
  ctx.beginPath();
  ctx.moveTo(2, 2.4); ctx.lineTo(-1, 6.6); ctx.lineTo(6, 3); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(1, -3); ctx.lineTo(-2.4, -7); ctx.lineTo(-6, -2.2); ctx.closePath(); ctx.fill();
  // Focinho
  ctx.fillStyle = ferido ? '#a3adaf' : '#b6c9d0';
  ctx.beginPath();
  ctx.ellipse(14.4, .9, 2.2, 1.3, .12, 0, Math.PI * 2);
  ctx.fill();
  // A marca do encalhe: a pele seca na lateral de cima.
  if (ferido) {
    ctx.strokeStyle = COR_TENSAO;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-6, -3.4); ctx.lineTo(1, -4.2);
    ctx.stroke();
  }
}

// --- CARANGUEJO: alça de plástico enroscada -----------------------------
function desenharCaranguejo(ctx, t, ferido) {
  const marcha = Math.sin(t * (ferido ? 2.4 : 4)) * 1.1;
  ctx.strokeStyle = ferido ? '#8d9aa0' : '#c0705a';
  ctx.lineWidth = 1.3;
  for (const lado of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = -.7 + i * .6;
      ctx.beginPath();
      ctx.moveTo(lado * 4, 1);
      ctx.lineTo(lado * (8 + i), 3.4 + a + (i % 2 ? marcha * .4 : -marcha * .4));
      ctx.stroke();
    }
  }
  ctx.fillStyle = ferido ? '#9a8a86' : '#c0705a';
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.6, 4.4, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pinças
  for (const lado of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(lado * 7.6, -2.4, 2.1, 1.5, lado * .6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Olhos
  ctx.fillStyle = '#2b3336';
  for (const lado of [-1, 1]) {
    ctx.beginPath(); ctx.arc(lado * 2, -3.6, .9, 0, Math.PI * 2); ctx.fill();
  }
  // A ALÇA: anel de plástico torto, o problema do bicho.
  if (ferido) {
    ctx.strokeStyle = 'rgba(190,220,230,.78)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(.6, -1.2, 5.2, 3.4, .5, 0, Math.PI * 1.75);
    ctx.stroke();
  }
}

// --- PÁSSARO: asa caída, peito subindo --------------------------------
function desenharPassaro(ctx, t, ferido) {
  const asa = Math.sin(t * (ferido ? 1.4 : 2.8)) * (ferido ? .12 : .55);
  ctx.fillStyle = ferido ? '#8d9aa0' : '#b8a48a';
  // Corpo
  ctx.beginPath();
  ctx.ellipse(0, 0, 6, 4.2, -.1, 0, Math.PI * 2);
  ctx.fill();
  // Cabeça
  ctx.beginPath();
  ctx.arc(5.4, -3.2, 2.9, 0, Math.PI * 2);
  ctx.fill();
  // Bico
  ctx.fillStyle = ferido ? '#a89a86' : '#e0b76a';
  ctx.beginPath();
  ctx.moveTo(8, -3.4); ctx.lineTo(11, -2.5); ctx.lineTo(8, -2);
  ctx.closePath(); ctx.fill();
  // Cauda
  ctx.fillStyle = ferido ? '#8d9aa0' : '#b8a48a';
  ctx.beginPath();
  ctx.moveTo(-5.6, 0); ctx.lineTo(-11, 2.6); ctx.lineTo(-10, -.4);
  ctx.closePath(); ctx.fill();
  // Asa: quebrada fica colada no corpo; curada/ aliviada abre.
  ctx.save();
  ctx.translate(-1, -1);
  ctx.rotate(ferido ? .16 : -.2 + asa);
  ctx.fillStyle = ferido ? '#7d8a90' : '#cdbb9e';
  ctx.beginPath();
  ctx.ellipse(-1.6, .8, 5.4, 2.4, -.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Perna
  ctx.strokeStyle = ferido ? '#8d9aa0' : '#e0b76a';
  ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(-1, 3.8); ctx.lineTo(-1.6, 6.4); ctx.stroke();
}

// --- ESTRELA-DO-MAR: braços que abrem com a água ----------------------
function desenharEstrela(ctx, t, ferido) {
  const abre = ferido ? .55 : .85 + Math.sin(t * 1.1) * .1;
  ctx.save();
  ctx.rotate(Math.sin(t * .4) * .12);
  ctx.fillStyle = ferido ? '#a08f86' : '#d98a7a';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
    const a2 = a + Math.PI / 5;
    ctx.lineTo(Math.cos(a) * 8 * abre, Math.sin(a) * 8 * abre);
    ctx.lineTo(Math.cos(a2) * 3.2, Math.sin(a2) * 3.2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = ferido ? '#7d6a60' : '#b5654f';
  ctx.lineWidth = .8;
  ctx.stroke();
  // Textura: pontos no centro
  ctx.fillStyle = 'rgba(60,40,34,.32)';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    ctx.beginPath(); ctx.arc(Math.cos(a) * 2, Math.sin(a) * 2, .55, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// --- ARRAIA: fio na cauda ---------------------------------------------
function desenharArraia(ctx, t, ferido) {
  const flap = Math.sin(t * (ferido ? 1.3 : 2.4)) * (ferido ? .1 : .22);
  ctx.fillStyle = ferido ? '#8a949b' : '#8fa7b4';
  ctx.save();
  ctx.scale(1, 1 + flap);
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(12, -2, 9, 3);
  ctx.quadraticCurveTo(0, 7, -9, 3);
  ctx.quadraticCurveTo(-12, -2, 0, -9);
  ctx.fill();
  ctx.restore();
  // Cauda longa e fina
  ctx.strokeStyle = ferido ? '#8a949b' : '#8fa7b4';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, 5);
  ctx.quadraticCurveTo(-1 + Math.sin(t * 2) * 2, 11, -3 + Math.sin(t * 2 + 1) * 3, 17);
  ctx.stroke();
  // Olhos
  ctx.fillStyle = '#2b3336';
  for (const lado of [-1, 1]) {
    ctx.beginPath(); ctx.arc(lado * 2.4, -5.6, .9, 0, Math.PI * 2); ctx.fill();
  }
  // O FIO: linha branca cortando a base da cauda.
  if (ferido) {
    ctx.strokeStyle = 'rgba(235,240,245,.85)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 4.6); ctx.lineTo(-2.2, 6.6); ctx.lineTo(-4.4, 8.2);
    ctx.stroke();
  }
}

// ---------------------------------------------------------------------
// RASTRO DE SOCORRO — o gesto deixa marca
// ---------------------------------------------------------------------
/**
 * Partículas que sobem na cor do módulo que socorreu. `vida` 0..1.
 */
export function desenharRastroSocorro(ctx, sx, sy, vida, cor) {
  if (vida <= 0 || vida > 1) return;
  const n = 7;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const sobe = (1 - vida) * (18 + f * 14);
    const drift = Math.sin(vida * 8 + i * 1.7) * 4;
    ctx.globalAlpha = vida * (.75 - f * .45);
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.arc(drift, -6 - sobe - f * 5, 1.7 - f * .8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
