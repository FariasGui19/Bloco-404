// =====================================================================
// ASSINATURAS VISUAIS DAS ULTIMATES
//
// Cada Ultimate tem um desenho próprio, não só uma cor: a lâmina serrilhada
// do Bio-Forja, o martelo que racha o chão, os cabos do gancho, a coroa de
// espinhos do Domínio, a cúpula de água da Maré, os ecos sobrepostos do
// Núcleo. Tudo é procedural no canvas — nenhuma pose estática fingindo
// animação.
//
// Contrato: `drawUltimateSignature(ctx, dados)` onde `dados` traz
//   signature · kind · color · x/y (tela) · t (0→1) · dir {x,y} · radius · range
// `t` é o progresso normalizado do efeito: 0 no impacto, 1 no fim.
// A função devolve `true` quando desenhou algo; `false` deixa o renderer
// cair no desenho genérico por tipo.
// =====================================================================

const clamp01 = value => Math.max(0, Math.min(1, value));

// Pontinha de chama/faísca reaproveitada por várias assinaturas.
function faisca(ctx, x, y, tamanho) {
  ctx.fillRect(x - tamanho / 2, y - tamanho / 2, tamanho, tamanho);
}

function anel(ctx, x, y, rx, ry, alpha, largura = 2) {
  if (alpha <= 0) return;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = largura;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(.5, rx), Math.max(.5, ry), 0, 0, Math.PI * 2);
  ctx.stroke();
}

// ---------------------------------------------------------------------
// MOTOR BIO-FORJA — metal, engrenagem, peso
// ---------------------------------------------------------------------
function serra(ctx, d) {
  // Lâmina circular serrilhada girando e avançando no cone.
  const t = d.t;
  const raio = 24 + t * 26;
  const cx = d.x + d.dir.x * (26 + t * 74);
  const cy = d.y - 22 + d.dir.y * (26 + t * 30);
  const giro = -t * Math.PI * 5;
  ctx.globalAlpha = Math.max(0, 1 - t) * .95;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 26; i++) {
    const ang = giro + (i / 26) * Math.PI * 2;
    const r = i % 2 === 0 ? raio : raio * .78;
    const px = cx + Math.cos(ang) * r;
    const py = cy + Math.sin(ang) * r * .6;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  // Linha de corte contínua saindo da lâmina.
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + d.dir.x * 220, cy + d.dir.y * 110);
  ctx.stroke();
  ctx.globalAlpha = Math.max(0, 1 - t) * .8;
  for (let i = 0; i < 8; i++) {
    const k = i / 8;
    faisca(ctx, cx + d.dir.x * k * 150 + (i % 3 - 1) * 9, cy + d.dir.y * k * 75 - k * 22, 3);
  }
  return true;
}

function martelo(ctx, d) {
  // Cabeça de martelo caindo e rachaduras no chão.
  const t = d.t;
  const altura = (1 - clamp01(t * 2)) * 120;
  const cx = d.x + d.dir.x * 40;
  const cy = d.y - 10 + d.dir.y * 20 - altura;
  ctx.globalAlpha = Math.max(0, 1 - t) * .9;
  ctx.fillRect(cx - 26, cy - 16, 52, 22);
  ctx.fillRect(cx - 6, cy + 4, 12, 34);
  // Rachaduras em leque.
  ctx.globalAlpha = clamp01((t - .3) / .3) * (1 - t) * .85;
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + .3;
    const comprimento = 34 + (i % 3) * 16 + t * 26;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y + 2);
    ctx.lineTo(d.x + Math.cos(ang) * comprimento, d.y + 2 + Math.sin(ang) * comprimento * .5);
    ctx.stroke();
  }
  // Poeira subindo.
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    faisca(ctx, d.x + Math.cos(ang) * (28 + t * 40), d.y - t * 16 + Math.sin(ang) * 12, 4);
  }
  return true;
}

function cabos(ctx, d) {
  // Seis cabos saindo do gancho e puxando para o corpo.
  const t = d.t;
  const comprimento = 40 + t * 150;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t * .8;
    const ex = d.x + Math.cos(ang) * comprimento;
    const ey = d.y - 8 + Math.sin(ang) * comprimento * .5;
    ctx.globalAlpha = Math.max(0, 1 - t) * (.35 + (i % 2) * .3);
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 10);
    ctx.quadraticCurveTo(d.x + Math.cos(ang) * comprimento * .5, d.y - 30 + Math.sin(ang) * comprimento * .2, ex, ey);
    ctx.stroke();
    // Gancho na ponta.
    ctx.globalAlpha = Math.max(0, 1 - t) * .9;
    ctx.fillRect(ex - 3, ey - 3, 6, 6);
  }
  anel(ctx, d.x, d.y - 6, 26 + t * 70, 12 + t * 32, Math.max(0, 1 - t) * .5);
  return true;
}

function propulsores(ctx, d) {
  // Dois jatos atrás do corpo, cone de chama e linhas de impulso à frente.
  const t = d.t;
  for (let jato = 0; jato < 2; jato++) {
    const desvio = jato === 0 ? -11 : 11;
    const baseX = d.x - d.dir.x * 12 + desvio;
    const baseY = d.y - 14 - d.dir.y * 6;
    const comprimento = 26 + t * 120;
    // Cone de chama.
    ctx.globalAlpha = Math.max(0, 1 - t) * .55;
    ctx.beginPath();
    ctx.moveTo(baseX - 5, baseY);
    ctx.lineTo(baseX + 5, baseY);
    ctx.lineTo(baseX - d.dir.x * comprimento, baseY - d.dir.y * comprimento * .5 + 3);
    ctx.closePath();
    ctx.fill();
    // Núcleo branco do jato.
    ctx.globalAlpha = Math.max(0, 1 - t) * .85;
    ctx.fillRect(baseX - 2, baseY, 4, 10 + t * 26);
  }
  // Anel de ar sendo empurrado para trás.
  anel(ctx, d.x - d.dir.x * (20 + t * 40), d.y - 6 - d.dir.y * (10 + t * 20),
       22 + t * 40, 11 + t * 18, Math.max(0, 1 - t) * .45);
  // Linhas de velocidade no sentido do avanço.
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  for (let i = 0; i < 9; i++) {
    const k = (i / 9) * (70 + t * 170);
    const lateral = (i % 3 - 1) * 13;
    ctx.fillRect(d.x + d.dir.x * k + lateral, d.y - 20 + d.dir.y * k * .5, 14 + (i % 2) * 10, 2);
  }
  return true;
}

function forjaDome(ctx, d) {
  // Cúpula de raízes e engrenagens que se abre (Ultimate base do Bio).
  const t = d.t;
  const raio = 30 + t * 170;
  ctx.lineWidth = 2.5;
  anel(ctx, d.x, d.y - 6, raio, raio * .52, Math.max(0, 1 - t) * .8, 3);
  anel(ctx, d.x, d.y - 6, raio * .72, raio * .36, Math.max(0, 1 - t) * .55);
  // Dentes de engrenagem na borda.
  ctx.globalAlpha = Math.max(0, 1 - t) * .7;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + t * 1.6;
    faisca(ctx, d.x + Math.cos(ang) * raio, d.y - 6 + Math.sin(ang) * raio * .52, 5);
  }
  // Raízes descendo.
  ctx.globalAlpha = Math.max(0, 1 - t) * .4;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(d.x + Math.cos(ang) * 14, d.y - 10 + Math.sin(ang) * 8);
    ctx.lineTo(d.x + Math.cos(ang) * (raio * .6), d.y + 14 + Math.sin(ang) * raio * .3);
    ctx.stroke();
  }
  return true;
}

// ---------------------------------------------------------------------
// LÂMINA DE DOMÍNIO — runas, geometria, peso vertical
// ---------------------------------------------------------------------
function laminaVertical(ctx, d) {
  // Espada gigante descendo do alto e fincando no chão.
  const t = d.t;
  const queda = (1 - clamp01(t * 2.2)) * 180;
  const cx = d.x + d.dir.x * 30;
  const topo = d.y - 150 + queda;
  ctx.globalAlpha = Math.max(0, 1 - t) * .9;
  ctx.fillRect(cx - 4, topo, 8, 120);          // lâmina
  ctx.fillRect(cx - 20, topo - 10, 40, 6);     // guarda
  ctx.fillRect(cx - 3, topo - 26, 6, 18);      // cabo
  // Onda de choque vertical.
  ctx.globalAlpha = clamp01((t - .35) / .3) * (1 - t) * .8;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 60 - i * 14, d.y - 40);
    ctx.lineTo(cx - 20 - i * 8, d.y + 6);
    ctx.moveTo(cx + 60 + i * 14, d.y - 40);
    ctx.lineTo(cx + 20 + i * 8, d.y + 6);
    ctx.stroke();
  }
  // Runas douradas subindo.
  ctx.globalAlpha = Math.max(0, 1 - t) * .6;
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(cx - 34 + i * 12, d.y - 30 - t * 50 - (i % 3) * 10, 3, 10);
  }
  return true;
}

function muralhaHex(ctx, d) {
  // Segmentos hexagonais que se fecham e depois estouram para fora.
  const t = d.t;
  const raio = t < .45 ? 58 - t * 20 : 40 + (t - .45) * 140;
  ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const cx = d.x + Math.cos(ang) * raio;
    const cy = d.y - 12 + Math.sin(ang) * raio * .6;
    ctx.globalAlpha = Math.max(0, 1 - t) * (t < .45 ? .85 : .5);
    ctx.beginPath();
    for (let p = 0; p < 6; p++) {
      const a = (p / 6) * Math.PI * 2;
      const px = cx + Math.cos(a) * 14;
      const py = cy + Math.sin(a) * 10;
      if (p === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  }
  // Parede frontal enquanto fecha.
  ctx.globalAlpha = Math.max(0, .45 - t) * 2 * .7;
  ctx.fillRect(d.x - 46, d.y - 46, 92, 8);
  return true;
}

function tita(ctx, d) {
  // Silhueta de titã subindo atrás do corpo: cabeça, ombros, tronco e punhos.
  const t = d.t;
  const altura = 74 + t * 86;
  const largura = 66 + t * 34;
  const topo = d.y - altura;
  ctx.globalAlpha = Math.max(0, 1 - t) * .22;
  // Tronco em trapézio.
  ctx.beginPath();
  ctx.moveTo(d.x - largura * .34, topo + altura * .18);
  ctx.lineTo(d.x + largura * .34, topo + altura * .18);
  ctx.lineTo(d.x + largura * .46, d.y + 2);
  ctx.lineTo(d.x - largura * .46, d.y + 2);
  ctx.closePath();
  ctx.fill();
  // Ombros e punhos.
  ctx.beginPath();
  ctx.ellipse(d.x - largura * .46, topo + altura * .22, largura * .2, altura * .12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(d.x + largura * .46, topo + altura * .22, largura * .2, altura * .12, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cabeça.
  ctx.beginPath();
  ctx.arc(d.x, topo + altura * .06, largura * .11, 0, Math.PI * 2);
  ctx.fill();

  // Contorno que "acende" conforme o titã termina de subir.
  ctx.globalAlpha = Math.max(0, 1 - t) * .8;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(d.x - largura * .34, topo + altura * .18);
  ctx.lineTo(d.x - largura * .46, d.y + 2);
  ctx.lineTo(d.x + largura * .46, d.y + 2);
  ctx.lineTo(d.x + largura * .34, topo + altura * .18);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(d.x, topo + altura * .06, largura * .11, 0, Math.PI * 2);
  ctx.stroke();

  // Pedras e poeira girando na base.
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + t * 1.8;
    const raio = 46 + t * 54;
    faisca(ctx, d.x + Math.cos(ang) * raio, d.y - 4 + Math.sin(ang) * raio * .34, 4 + (i % 2) * 2);
  }
  return true;
}

function trono(ctx, d) {
  // O trono antigo sobe atrás do operador; a onda quadrada corre no chão.
  const t = d.t;
  const altura = 46 + t * 40;
  const largura = 42 + t * 16;
  const base = d.y - 2;
  const topo = base - altura;
  ctx.globalAlpha = Math.max(0, 1 - t) * .3;
  ctx.fillRect(d.x - largura / 2, topo, largura, altura);
  ctx.globalAlpha = Math.max(0, 1 - t) * .85;
  ctx.lineWidth = 2;
  // Encosto com pontas.
  ctx.beginPath();
  ctx.moveTo(d.x - largura / 2, base);
  ctx.lineTo(d.x - largura / 2, topo + 8);
  ctx.lineTo(d.x - largura * .26, topo);
  ctx.lineTo(d.x, topo + 10);
  ctx.lineTo(d.x + largura * .26, topo);
  ctx.lineTo(d.x + largura / 2, topo + 8);
  ctx.lineTo(d.x + largura / 2, base);
  ctx.stroke();
  // Braços do trono.
  ctx.beginPath();
  ctx.moveTo(d.x - largura / 2, base - altura * .42);
  ctx.lineTo(d.x - largura * .76, base - altura * .42);
  ctx.lineTo(d.x - largura * .76, base - altura * .28);
  ctx.moveTo(d.x + largura / 2, base - altura * .42);
  ctx.lineTo(d.x + largura * .76, base - altura * .42);
  ctx.lineTo(d.x + largura * .76, base - altura * .28);
  ctx.stroke();
  // Onda quadrada correndo no chão, no sentido da investida.
  ctx.globalAlpha = Math.max(0, 1 - t) * .6;
  const avanco = 30 + t * 130;
  ctx.beginPath();
  ctx.moveTo(d.x - 40, d.y + 6);
  ctx.lineTo(d.x - 40, d.y - 8);
  ctx.lineTo(d.x + d.dir.x * avanco, d.y - 8 + d.dir.y * avanco * .5);
  ctx.lineTo(d.x + d.dir.x * avanco, d.y + 8 + d.dir.y * avanco * .5);
  ctx.stroke();
  // Destroços dourados.
  ctx.globalAlpha = Math.max(0, 1 - t) * .7;
  for (let i = 0; i < 7; i++) {
    faisca(ctx, d.x + d.dir.x * (t * 130) + (i % 3 - 1) * 20, d.y - 6 + d.dir.y * (t * 60) - (i % 4) * 8, 5);
  }
  return true;
}

function coroa(ctx, d) {
  // Coroa de espinhos que sobe e racha o chão (Ultimate base do Domínio).
  const t = d.t;
  const raio = 26 + t * 150;
  anel(ctx, d.x, d.y - 4, raio, raio * .5, Math.max(0, 1 - t) * .85, 3);
  ctx.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * Math.PI * 2 + t * .5;
    const x = d.x + Math.cos(ang) * raio * .82;
    const y = d.y - 4 + Math.sin(ang) * raio * .41;
    ctx.globalAlpha = Math.max(0, 1 - t) * .8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * 10, y - 18 - t * 12);
    ctx.stroke();
  }
  return true;
}

// ---------------------------------------------------------------------
// MARÉ ASTRAL — água, corrente, pressão
// ---------------------------------------------------------------------
function cupulaAgua(ctx, d) {
  // Cúpula de água fechando e gotas orbitando.
  const t = d.t;
  const raio = 54 + t * 16;
  ctx.lineWidth = 3;
  for (let casca = 0; casca < 3; casca++) {
    ctx.globalAlpha = Math.max(0, 1 - t) * (.75 - casca * .2);
    ctx.beginPath();
    ctx.ellipse(d.x, d.y - 10, raio - casca * 8, (raio - casca * 8) * .92, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y - 8, raio, raio * .3, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Gotas orbitando a cúpula.
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + t * 2.6;
    ctx.beginPath();
    ctx.arc(d.x + Math.cos(ang) * raio, d.y - 10 + Math.sin(ang) * raio * .92, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return true;
}

function vortice(ctx, d) {
  // Espiral de corrente com crista de onda.
  const t = d.t;
  ctx.lineWidth = 2.5;
  for (let braço = 0; braço < 3; braço++) {
    ctx.globalAlpha = Math.max(0, 1 - t) * (.75 - braço * .18);
    ctx.beginPath();
    for (let i = 0; i <= 30; i++) {
      const k = i / 30;
      const ang = braço * (Math.PI * 2 / 3) + k * 6 + t * 5;
      const raio = 12 + k * (60 + t * 90);
      const px = d.x + Math.cos(ang) * raio;
      const py = d.y - 8 + Math.sin(ang) * raio * .5;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Crista avançando na direção.
  ctx.globalAlpha = Math.max(0, 1 - t) * .6;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const px = d.x + d.dir.x * (30 + t * 170) + (k - .5) * 90;
    const py = d.y - 16 + d.dir.y * (30 + t * 170) * .5 - Math.sin(k * Math.PI) * 16;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  return true;
}

function chicote(ctx, d) {
  // Três açoites de água abrindo em leque, com gotas na ponta.
  const t = d.t;
  for (let chicotada = 0; chicotada < 3; chicotada++) {
    const lado = chicotada - 1;
    const comprimento = 66 + t * 150 + Math.abs(lado) * 14;
    const pontaX = d.x + d.dir.x * comprimento + lado * 34;
    const pontaY = d.y - 16 + d.dir.y * comprimento * .5 + lado * 8;
    ctx.globalAlpha = Math.max(0, 1 - t) * (.85 - Math.abs(lado) * .18);
    ctx.lineWidth = 3 - Math.abs(lado) * .6;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 14);
    ctx.bezierCurveTo(
      d.x + d.dir.x * comprimento * .18 + lado * 36, d.y - 58,
      d.x + d.dir.x * comprimento * .62 + lado * 20, d.y - 44,
      pontaX, pontaY
    );
    ctx.stroke();
    // Gota na ponta.
    ctx.beginPath();
    ctx.arc(pontaX, pontaY, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Respingo na base.
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  for (let i = 0; i < 9; i++) {
    const k = i / 9;
    ctx.beginPath();
    ctx.arc(d.x + (k - .5) * (60 + t * 60), d.y + 2 - Math.sin(k * Math.PI) * (6 + t * 14), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  return true;
}

function sonar(ctx, d) {
  // Anéis de sonar + cardume abstrato se afastando.
  const t = d.t;
  for (let anelIndice = 0; anelIndice < 3; anelIndice++) {
    const k = clamp01(t + anelIndice * .16);
    anel(ctx, d.x, d.y - 4, 20 + k * 190, 10 + k * 95, Math.max(0, 1 - k) * .8, 2.5);
  }
  // Cardume abstrato: corpo oval + cauda, nadando para fora.
  ctx.globalAlpha = Math.max(0, 1 - t) * .6;
  for (let i = 0; i < 7; i++) {
    const ang = (i / 7) * Math.PI * 2 + t;
    const raio = 40 + t * 120 + (i % 4) * 12;
    const px = d.x + Math.cos(ang) * raio;
    const py = d.y - 6 + Math.sin(ang) * raio * .5;
    ctx.beginPath();
    ctx.ellipse(px, py, 6, 3, ang, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px - Math.cos(ang) * 8, py - Math.sin(ang) * 4);
    ctx.lineTo(px - Math.cos(ang) * 14 - Math.sin(ang) * 4, py - Math.sin(ang) * 7 + Math.cos(ang) * 2);
    ctx.lineTo(px - Math.cos(ang) * 14 + Math.sin(ang) * 4, py - Math.sin(ang) * 7 - Math.cos(ang) * 2);
    ctx.closePath();
    ctx.fill();
  }
  return true;
}

function estuario(ctx, d) {
  // Leque de maré: faixas largas varrendo a área como uma onda que abre.
  const t = d.t;
  ctx.lineWidth = 2;
  for (let faixa = 0; faixa < 5; faixa++) {
    const abertura = -1.1 + faixa * .55;
    ctx.globalAlpha = Math.max(0, 1 - t) * (.55 - faixa * .06);
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const k = i / 20;
      const raio = 24 + k * (90 + t * 130);
      const ang = abertura * (0.4 + k * .9);
      const px = d.x + Math.cos(ang) * raio * .9 + d.dir.x * 18;
      const py = d.y - 8 + Math.sin(ang) * raio * .42;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // Espuma na borda do leque.
  ctx.globalAlpha = Math.max(0, 1 - t) * .5;
  for (let i = 0; i < 12; i++) {
    const ang = -1.1 + (i / 11) * 2.2;
    const raio = 80 + t * 130;
    faisca(ctx, d.x + Math.cos(ang) * raio * .9, d.y - 8 + Math.sin(ang) * raio * .42, 3);
  }
  return true;
}

// ---------------------------------------------------------------------
// NÚCLEO 10X — eco, sobreposição, tempo
// ---------------------------------------------------------------------
function tempo(ctx, d) {
  // Ponteiros de relógio + riscos de velocidade + ecos defasados.
  const t = d.t;
  ctx.lineWidth = 2;
  anel(ctx, d.x, d.y - 12, 40 + t * 90, 20 + t * 45, Math.max(0, 1 - t) * .7, 2);
  ctx.globalAlpha = Math.max(0, 1 - t) * .85;
  for (let ponteiro = 0; ponteiro < 3; ponteiro++) {
    const ang = -Math.PI / 2 + ponteiro * (Math.PI * 2 / 3) + t * 9;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - 12);
    ctx.lineTo(d.x + Math.cos(ang) * 54, d.y - 12 + Math.sin(ang) * 27);
    ctx.stroke();
  }
  // Ecos do corpo com atraso.
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = Math.max(0, 1 - t) * (.22 / i);
    ctx.beginPath();
    ctx.ellipse(d.x - i * 13 - t * 10, d.y - 14, 11, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Riscos horizontais de tempo.
  ctx.globalAlpha = Math.max(0, 1 - t) * .45;
  for (let i = 0; i < 6; i++) {
    const y = d.y - 34 + i * 9;
    ctx.fillRect(d.x - 90 - t * 40, y, 60 + (i % 3) * 24, 1);
  }
  return true;
}

function punhoEco(ctx, d) {
  // Punho de eco gigante descendo, com contornos repetidos.
  const t = d.t;
  const queda = (1 - clamp01(t * 2)) * 110;
  const cx = d.x + d.dir.x * 26;
  const cy = d.y - 60 + queda;
  for (let eco = 3; eco >= 0; eco--) {
    ctx.globalAlpha = Math.max(0, 1 - t) * (.55 - eco * .1);
    const escala = 1 + eco * .18;
    ctx.fillRect(cx - 22 * escala, cy - 18 * escala, 44 * escala, 30 * escala);
    ctx.fillRect(cx - 14 * escala, cy + 12 * escala, 28 * escala, 16 * escala);
  }
  // Onda de eco no chão.
  anel(ctx, d.x, d.y + 2, 30 + t * 140, 15 + t * 70, Math.max(0, 1 - t) * .5, 2);
  return true;
}

function fenda(ctx, d) {
  // O corpo se divide: dois ecos se afastam e um rasgo de luz fica no meio.
  const t = d.t;
  const separacao = 8 + t * 54;
  // Ecos se afastando lado a lado.
  for (let lado = -1; lado <= 1; lado += 2) {
    ctx.globalAlpha = Math.max(0, 1 - t) * .45;
    ctx.beginPath();
    ctx.ellipse(d.x + lado * separacao, d.y - 16, 10, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(d.x + lado * separacao, d.y - 36, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  // Rasgo vertical, com dentes nas bordas.
  const altura = 50 + t * 60;
  ctx.globalAlpha = Math.max(0, 1 - t) * .95;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i <= 12; i++) {
    const k = i / 12;
    const x = d.x + (i % 2 ? 5 : -5);
    const y = d.y - 10 - altura * k;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Clarão vazando do rasgo.
  ctx.globalAlpha = Math.max(0, 1 - t) * .35;
  ctx.beginPath();
  ctx.moveTo(d.x - 8, d.y - 8);
  ctx.lineTo(d.x + d.dir.x * 90, d.y - 40 + d.dir.y * 30);
  ctx.lineTo(d.x + d.dir.x * 90, d.y - 22 + d.dir.y * 30);
  ctx.lineTo(d.x + 8, d.y - 2);
  ctx.closePath();
  ctx.fill();
  return true;
}

function sobreposicao(ctx, d) {
  // Dez silhuetas convergindo para um pulso único.
  const t = d.t;
  const raio = Math.max(0, 1 - t) * 150 + 20;
  for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2;
    ctx.globalAlpha = Math.max(0, 1 - t) * (.5 - i * .03);
    ctx.beginPath();
    ctx.ellipse(
      d.x + Math.cos(ang) * raio, d.y - 12 + Math.sin(ang) * raio * .5,
      9, 18, 0, 0, Math.PI * 2
    );
    ctx.fill();
  }
  anel(ctx, d.x, d.y - 6, 28 + t * 150, 14 + t * 75, Math.max(0, 1 - t) * .9, 3);
  return true;
}

function horizonte(ctx, d) {
  // Anéis orbitais e silhuetas abstratas (base do Núcleo).
  const t = d.t;
  for (let anelIndice = 0; anelIndice < 3; anelIndice++) {
    const inclinacao = anelIndice * .5 + t * 1.2;
    ctx.globalAlpha = Math.max(0, 1 - t) * (.7 - anelIndice * .16);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y - 12, 40 + t * 120, 18 + t * 46, inclinacao, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = Math.max(0, 1 - t) * .4;
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + t * 1.5;
    ctx.beginPath();
    ctx.ellipse(d.x + Math.cos(ang) * (50 + t * 80), d.y - 12 + Math.sin(ang) * (24 + t * 34), 6, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return true;
}

const SIGNATURES = {
  serra, martelo, cabos, propulsores, forja_dome: forjaDome,
  lamina_vertical: laminaVertical, muralha_hex: muralhaHex, tita, trono, coroa,
  cupula_agua: cupulaAgua, vortice, chicote, sonar, estuario,
  tempo, punho_eco: punhoEco, fenda, sobreposicao, horizonte,
};

export const ULTIMATE_SIGNATURES = Object.freeze(Object.keys(SIGNATURES));

export function drawUltimateSignature(context, dados) {
  const desenho = SIGNATURES[dados?.signature];
  if (!desenho) return false;
  context.save();
  context.shadowColor = dados.color;
  context.shadowBlur = 18;
  context.strokeStyle = dados.color;
  context.fillStyle = dados.color;
  context.lineCap = 'round';
  const desenhou = desenho(context, {
    ...dados,
    t: clamp01(dados.t ?? 0),
    dir: dados.dir ?? { x: 0, y: 1 },
  });
  context.restore();
  return desenhou;
}
