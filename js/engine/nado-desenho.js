// =====================================================================
// NADO — desenho do nadador, do cordão de boias e do marcador de treino
//
// Antes disto o operador "nadava" em pé: o mesmo sprite de caminhada
// deslizando em cima do mar. Aqui o corpo deita.
//
// A arte (`assets/sprites/player/nado-<traje>.png`, feita por
// `tools/preparar-nado.py`) é UM corpo horizontal de perfil, virado para
// a direita, em dois quadros (braço à frente / braço atrás). O jogo:
//   - GIRA o corpo para a direção do nado na tela (isométrica);
//   - ONDULA o corpo em fatias verticais (a cauda bate mais que a cabeça);
//   - alterna os dois quadros na cadência da braçada;
//   - desenha a parte de baixo do corpo translúcida (linha d'água) e, no
//     mergulho, o corpo inteiro esmaecido e menor (está lá embaixo);
//   - deixa ESTEIRA de espuma na superfície e riscos de luz na arrancada.
//
// Custo por quadro: 16 `drawImage` pequenos + até ~14 elipses de esteira.
// Nada disto cresce com o mapa.
// =====================================================================
import { getSprite } from './sprites.js';

const LARGURA = 340, ALTURA = 120;
// Centro do corpo e eixo (medidos pela ferramenta de arte: pés em x=14,
// eixo em y=68).
// A ÂNCORA (o ponto que fica em cima da posição do operador) é o peito,
// não o meio do corpo: assim a cabeça avança pouco sobre a areia ao chegar
// na praia e o corpo gira pelo peito, como quem nada de verdade.
const CENTRO_X = 198, EIXO_Y = 68;
// Meio do corpo, para a sombra e o brilho ficarem embaixo dele todo.
const MEIO_X = 168;
// Da cabeça aos pés o corpo mede ~238 px na folha; em pé o operador tem
// ~120 px de altura na tela. Deitado de lado (sem achatar) ele precisa
// de quase isso: com .28 o nadador parecia uma criança.
const ESCALA = .42;
// 10 fatias de 34 px exatos: recorte em pixel inteiro, sem fresta.
const FATIAS = 10;
// Cabeça (na folha), para as bolhas saírem do lugar certo.
const CABECA_X = 236;
// Abaixo desta linha (no sprite) o corpo está dentro d'água.
const LINHA_DAGUA = EIXO_Y + 4;

const COR_TRAJE = Object.freeze({
  nado_mare: '#62f2ff',
  nado_bio: '#ffc35a',
  nado_dominio: '#ffd264',
  nado_nucleo: '#8dffb4',
  nado_civil: '#e8fffa',
});

/** Qual folha de nado veste o operador agora. */
export function spriteDeNado(player, arquetipo) {
  const traje = player?.equippedSuit;
  if (traje === 'mare') return 'nado_mare';
  if (traje === 'bio_forja') return 'nado_bio';
  if (traje === 'dominio') return 'nado_dominio';
  // Núcleo: qualquer forma ativa usa o traje do núcleo (as formas não têm
  // folha de nado própria; nadar transformado é o mesmo corpo).
  if (arquetipo === 'nucleo_dez_forma' && player?.nucleoForm) return 'nado_nucleo';
  return 'nado_civil';
}

function aproximarAngulo(atual, alvo, k) {
  let d = alvo - atual;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return atual + d * k;
}

/** Guarda a esteira no próprio jogador (some com ele, sem cache global). */
function atualizarEsteira(player, nado, agora, naSuperficie) {
  const rastro = player._esteira ?? (player._esteira = []);
  while (rastro.length && agora - rastro[0].t > 1.25) rastro.shift();
  const vel = Math.hypot(nado.vx ?? 0, nado.vy ?? 0);
  const ultimo = rastro[rastro.length - 1];
  const longe = !ultimo || Math.hypot(ultimo.x - player.x, ultimo.y - player.y) > .28;
  if (naSuperficie && vel > .5 && longe && rastro.length < 16) {
    rastro.push({ x: player.x, y: player.y, t: agora, forca: Math.min(1, vel / 3.2) + (nado.arrancada > 0 ? .6 : 0) });
  }
  return rastro;
}

/**
 * Desenha o operador nadando. Devolve false se a folha ainda não carregou
 * (quem chamou desenha o sprite de sempre).
 * `opt`: { arquetipo, HW, HH, t }
 */
export function desenharNadador(ctx, player, ix, iy, opt) {
  const nado = player.nado;
  const id = spriteDeNado(player, opt.arquetipo);
  const imagem = getSprite(id);
  if (!imagem || !nado) return false;
  const { HW, HH, t } = opt;

  const submerso = nado.submerso || nado.profundidade > 1.25;
  // 0 na superfície, 1 no fundo: quanto o corpo "desceu".
  const fundura = Math.max(0, Math.min(1, (nado.profundidade - .9) / 1.0)) * (nado.submerso ? 1 : .35);
  const vel = Math.hypot(nado.vx ?? 0, nado.vy ?? 0);
  const movendo = vel > .35;
  const arrancando = nado.arrancada > 0;
  const mare = id === 'nado_mare';
  const cor = COR_TRAJE[id] ?? '#e8fffa';

  // ---- direção na tela (isométrica) ----
  const dx = nado.dirX ?? 0, dy = nado.dirY ?? 1;
  const alvo = Math.atan2((dx + dy) * HH, (dx - dy) * HW);
  player._nadoAng = player._nadoAng == null ? alvo : aproximarAngulo(player._nadoAng, alvo, .22);
  const ang = player._nadoAng;
  const viradoParaEsquerda = Math.cos(ang) < 0;
  // Câmera isométrica: quem nada "para cima/baixo" na tela está em
  // escorço, então o corpo encurta um pouco nesse eixo.
  const escorco = 1 - .2 * Math.sin(ang) ** 2;
  // Do peito (âncora) até o meio do corpo, ao longo do eixo do nado.
  const recuo = (MEIO_X - CENTRO_X) * ESCALA * escorco;

  // ---- esteira (embaixo do corpo) ----
  const rastro = atualizarEsteira(player, nado, t, !submerso);
  if (rastro.length) {
    ctx.save();
    ctx.lineWidth = 1.4;
    for (const p of rastro) {
      const idade = (t - p.t) / 1.25;
      if (idade >= 1) continue;
      const px = (p.x - p.y) * HW, py = (p.x + p.y) * HH;
      const r = 5 + idade * 15 * (.7 + p.forca * .5);
      ctx.globalAlpha = (1 - idade) * (1 - idade) * .5 * Math.min(1, .45 + p.forca);
      ctx.strokeStyle = '#f2fffb';
      ctx.beginPath();
      ctx.ellipse(px, py, r, r * .5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- sombra no fundo: é ela que diz "estou em cima de água funda" ----
  if (!submerso) {
    const fundo = Math.min(2, nado.fundo ?? nado.profundidade);
    ctx.save();
    ctx.globalAlpha = .1 + fundo * .05;
    ctx.fillStyle = '#012b3c';
    ctx.translate(ix + fundo * 2, iy + 5 + fundo * 5);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.ellipse(recuo, 0, (50 - fundo * 4) * escorco, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- anel de quem boia parado ----
  if (!movendo && !submerso) {
    ctx.save();
    ctx.strokeStyle = '#f2fffb';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      const k = ((t * .55 + i * .5) % 1);
      ctx.globalAlpha = (1 - k) * .38;
      ctx.beginPath();
      ctx.ellipse(ix, iy + 2, 28 + k * 26, (28 + k * 26) * .46, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- brilho do traje / da arrancada (embaixo do corpo) ----
  if (arrancando || (mare && (movendo || submerso))) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = arrancando ? .5 : .16 + fundura * .12;
    ctx.translate(ix, iy - 4 + fundura * 6);
    ctx.rotate(ang);
    const g = ctx.createRadialGradient(recuo / 1.25, 0, 2, recuo / 1.25, 0, 62);
    g.addColorStop(0, cor);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.scale(1.25, .42);
    ctx.beginPath();
    ctx.arc(recuo / 1.25, 0, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- corpo ----
  // Cadência da braçada: acompanha a velocidade; parado, o braço fica à
  // frente (boiando). Na arrancada o corpo vira flecha (quadro 0).
  const cadencia = 1.5 + Math.min(3.2, vel) * .75;
  player._nadoFase = (player._nadoFase ?? 0) + cadencia / 60;
  const quadro = arrancando || !movendo ? 0 : Math.floor(player._nadoFase) % 2;
  const escala = ESCALA * (1 - fundura * .1);
  const estica = (arrancando ? 1.1 : 1) * escorco;
  // A cauda bate mais que a cabeça; mergulhado, o corpo todo ondula mais.
  const amplitude = (movendo ? 1.5 + Math.min(2.2, vel) * .75 : .8) * (submerso ? 1.5 : 1) * (arrancando ? .5 : 1);
  const onda = t * (movendo ? 9 + vel * 1.4 : 2.4);
  const boia = submerso ? 0 : Math.sin(t * 2.3) * 1.1;
  const alfaCorpo = submerso ? .62 - fundura * .12 : 1;

  ctx.save();
  ctx.translate(ix, iy - 7 + boia + fundura * 9);
  ctx.rotate(ang);
  if (viradoParaEsquerda) ctx.scale(1, -1);
  const alisavaAntes = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  const fatia = LARGURA / FATIAS;
  const topo = LINHA_DAGUA, baixo = ALTURA - LINHA_DAGUA;
  for (let i = 0; i < FATIAS; i++) {
    const u = (i + .5) / FATIAS;                    // 0 = pés, 1 = mãos
    const oy = Math.sin(onda - u * 3.4) * amplitude * (1 - u * .82);
    const sx = quadro * LARGURA + i * fatia;
    const dxp = (i * fatia - CENTRO_X) * escala * estica;
    const dw = fatia * escala * estica + .7;         // .7: sem fresta entre fatias
    // Acima da linha d'água: corpo inteiro. Abaixo: dentro d'água.
    ctx.globalAlpha = alfaCorpo;
    ctx.drawImage(imagem, sx, 0, fatia, topo, dxp, -EIXO_Y * escala + oy, dw, topo * escala);
    ctx.globalAlpha = alfaCorpo * (submerso ? 1 : .56);
    ctx.drawImage(imagem, sx, topo, fatia, baixo, dxp, (topo - EIXO_Y) * escala + oy, dw, baixo * escala);
  }
  ctx.imageSmoothingEnabled = alisavaAntes;

  // ---- espuma da braçada: respingo na mão quando o braço troca ----
  if (movendo && !submerso) {
    const k = player._nadoFase % 1;
    if (k < .35) {
      ctx.globalAlpha = (1 - k / .35) * .85;
      ctx.fillStyle = '#ffffff';
      const mx = (LARGURA - CENTRO_X - 26) * escala;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.7 + Math.floor(player._nadoFase) * 2.1;
        ctx.beginPath();
        ctx.arc(mx + Math.cos(a) * (3 + k * 9), 3 + Math.sin(a) * (2 + k * 5), 1.5 - k * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Espuma no pé: a batida de perna.
    ctx.globalAlpha = .5 + .3 * Math.sin(onda * 1.3);
    ctx.fillStyle = '#f2fffb';
    const pxp = (14 - CENTRO_X) * escala - 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(pxp - i * 3.5, 2 + Math.sin(onda + i) * 2.5, 2 - i * .45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---- riscos de arrancada ----
  if (arrancando) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = cor;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = (i - 2) * 4.2;
      const x0 = -CENTRO_X * escala - 6 - ((t * 190 + i * 37) % 26);
      ctx.globalAlpha = .7 - Math.abs(i - 2) * .16;
      ctx.lineWidth = i === 2 ? 2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.lineTo(x0 - 16 - (i % 2) * 9, y);
      ctx.stroke();
    }
  }
  ctx.restore();

  // ---- bolhas de quem prende o ar ----
  if (nado.submerso) {
    ctx.save();
    ctx.strokeStyle = 'rgba(232,255,250,.85)';
    ctx.lineWidth = 1;
    const alcanceCabeca = (CABECA_X - CENTRO_X) * escala * estica;
    const cabecaX = ix + Math.cos(ang) * alcanceCabeca, cabecaY = iy - 8 + Math.sin(ang) * alcanceCabeca + fundura * 9;
    for (let i = 0; i < 4; i++) {
      const k = ((t * .9 + i * .27) % 1);
      ctx.globalAlpha = (1 - k) * .8;
      ctx.beginPath();
      ctx.arc(cabecaX + Math.sin(t * 3 + i * 2.2) * 3.5, cabecaY - k * 24 - i, 1.2 + (i % 2) * .9, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  player._topo = 46;
  return true;
}

// ---------------------------------------------------------------------
// CORDÃO DE BOIAS — o limite do degrau, visível
// ---------------------------------------------------------------------
/**
 * `boias`: pontos de `boiasDoLimite(map, nivel)`. Só as próximas do
 * operador aparecem (o limite importa onde ele está) e somem com a
 * distância: de perto é um cordão, de longe não polui o mar.
 */
export function desenharBoias(ctx, boias, player, range, t, HW, HH) {
  if (!boias?.length || !player) return;
  const PERTO = 5.5, LONGE = 10.5;
  ctx.save();
  for (const b of boias) {
    if (b.x < range.x0 - 1 || b.x > range.x1 + 1 || b.y < range.y0 - 1 || b.y > range.y1 + 1) continue;
    const d = Math.hypot(b.x - player.x, b.y - player.y);
    if (d > LONGE) continue;
    const alfa = d < PERTO ? 1 : 1 - (d - PERTO) / (LONGE - PERTO);
    const x = (b.x - b.y) * HW, y = (b.x + b.y) * HH + Math.sin(t * 1.9 + b.fase) * 1.3;
    // reflexo
    ctx.globalAlpha = alfa * .28;
    ctx.fillStyle = '#01303f';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 6, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // boia: laranja com faixa branca (alterna para parecer cordão)
    ctx.globalAlpha = alfa * .95;
    const laranja = (Math.round(b.x * 2 + b.y * 2) & 1) === 0;
    ctx.fillStyle = laranja ? '#ff8a3c' : '#fff6e6';
    ctx.beginPath();
    ctx.ellipse(x, y, 4.8, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = laranja ? '#fff6e6' : '#ff8a3c';
    ctx.fillRect(x - 4.2, y - .9, 8.4, 1.9);
    ctx.globalAlpha = alfa * .6;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 1.5, y - 1.7, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------------
// MARCADOR DA POÇA DE TREINO
// ---------------------------------------------------------------------
/**
 * Anel pulsando na poça e uma placa flutuante. `forca` (0..1) deixa o
 * marcador discreto quando o operador já está dentro da poça.
 */
export function desenharMarcadorDeTreino(ctx, poca, t, HW, HH, texto, forca = 1) {
  if (!poca || forca <= 0) return;
  const x = (poca.x - poca.y) * HW, y = (poca.x + poca.y) * HH;
  const rx = (poca.rx + poca.ry) * HW * .78, ry = (poca.rx + poca.ry) * HH * .78;
  ctx.save();
  // Anéis que respiram para fora.
  ctx.strokeStyle = '#9fffe3';
  for (let i = 0; i < 2; i++) {
    const k = (t * .45 + i * .5) % 1;
    ctx.globalAlpha = (1 - k) * .55 * forca;
    ctx.lineWidth = 2 - k;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * (.82 + k * .35), ry * (.82 + k * .35), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Seta e placa.
  const sobe = Math.sin(t * 2.6) * 3;
  const topo = y - 62 + sobe;
  ctx.globalAlpha = forca;
  ctx.fillStyle = '#9fffe3';
  ctx.beginPath();
  ctx.moveTo(x, topo + 30); ctx.lineTo(x - 7, topo + 19); ctx.lineTo(x + 7, topo + 19);
  ctx.closePath();
  ctx.fill();
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const meia = Math.ceil(ctx.measureText(texto).width / 2) + 9;
  ctx.fillStyle = 'rgba(8,40,44,.92)';
  ctx.fillRect(x - meia, topo, meia * 2, 18);
  ctx.strokeStyle = '#9fffe3';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - meia, topo, meia * 2, 18);
  ctx.fillStyle = '#e1fff1';
  ctx.fillText(texto, x, topo + 9.5);
  ctx.restore();
}
