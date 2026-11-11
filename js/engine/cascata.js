// =====================================================================
// CASCATA E ESPUMA — a água que se mexe em cima da arte parada
//
// As falésias com queda-d'água são PNGs estáticos. O que dá vida é uma
// camada por cima, recortada pela MÁSCARA DA ÁGUA que a ferramenta de arte
// exporta junto (`*-agua.png`, ver tools/preparar-relevo-praia.py):
//
//   1. fios claros e escuros descendo dentro da máscara (a queda);
//   2. respingo e névoa onde a água bate;
//   3. anel de espuma animado no pé das pedras que ficam no mar.
//
// REGRA DE CUSTO (a mesma do resto da praia): nada aqui escala com o mapa.
// Cada cascata tem um canvas próprio do tamanho da peça (~200x430 px),
// redesenhado só quando a peça está na tela; os fios são uma lista FIXA
// criada uma vez, animada por fase — sem alocar nada por quadro.
// =====================================================================
import { getSprite } from './sprites.js';

const FIOS = 54;

// Sorteio fixo: a mesma cascata tem sempre os mesmos fios.
function hash(n, seed = 0) {
  let h = Math.imul(n + 1 + seed * 977, 374761393);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function criarFios(w, h, seed) {
  return Array.from({ length: FIOS }, (_, i) => {
    const claro = hash(i, seed + 3) < .68;
    return {
      x: hash(i, seed) * w,
      largura: 1.5 + hash(i, seed + 1) * (claro ? 3.2 : 4.5),
      comprimento: h * (.05 + hash(i, seed + 2) * .13),
      // Uma queda inteira leva de 0,7 a 1,3 s: água pesada, não chuvisco.
      velocidade: .75 + hash(i, seed + 4) * .7,
      fase: hash(i, seed + 5),
      cor: claro
        ? `rgba(255,255,255,${(.28 + hash(i, seed + 6) * .42).toFixed(2)})`
        : `rgba(16,128,150,${(.16 + hash(i, seed + 7) * .2).toFixed(2)})`,
    };
  });
}

const cache = new Map();

/**
 * Desenha os fios da queda por cima da peça já desenhada.
 * `x,y,w,h` é o MESMO retângulo de destino usado para a peça (no sistema
 * de coordenadas atual do contexto — espelhamento incluso).
 */
export function desenharCascata(ctx, { mascaraId, crop, x, y, w, h, t }) {
  const mascara = getSprite(mascaraId);
  if (!mascara || !crop?.w || !crop?.h) return;

  let e = cache.get(mascaraId);
  if (!e) {
    const canvas = document.createElement('canvas');
    canvas.width = crop.w;
    canvas.height = crop.h;
    e = { canvas, g: canvas.getContext('2d'), fios: criarFios(crop.w, crop.h, mascaraId.length) };
    cache.set(mascaraId, e);
  }

  const g = e.g, cw = crop.w, ch = crop.h;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, cw, ch);
  for (const f of e.fios) {
    const k = (t * f.velocidade + f.fase) % 1;
    const fy = k * (ch + f.comprimento) - f.comprimento;
    g.fillStyle = f.cor;
    g.fillRect(f.x, fy, f.largura, f.comprimento);
  }
  // Recorte: os fios só existem onde a arte tem água.
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(mascara, crop.x, crop.y, cw, ch, 0, 0, cw, ch);

  ctx.drawImage(e.canvas, x, y, w, h);
}

/**
 * Respingo no pé da queda: gotas que saltam, névoa que sobe e a espuma
 * que se abre na água. `largura` é a largura da queda em pixels de tela.
 */
export function desenharRespingo(ctx, x, y, largura, t, seed = 0) {
  ctx.save();
  // Névoa: três sopros largos, lentos.
  for (let i = 0; i < 3; i++) {
    const k = (t * .32 + i / 3 + hash(i, seed) * .2) % 1;
    const raio = largura * (.34 + k * .5);
    ctx.globalAlpha = (1 - k) * .2;
    ctx.fillStyle = '#eafffb';
    ctx.beginPath();
    ctx.ellipse(x + (hash(i, seed + 9) - .5) * largura * .5, y - 4 - k * 22, raio, raio * .5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Espuma que se abre em anéis na superfície.
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#f4fffb';
  for (let i = 0; i < 3; i++) {
    const k = (t * .55 + i / 3) % 1;
    ctx.globalAlpha = (1 - k) * .75;
    ctx.beginPath();
    ctx.ellipse(x, y + 2, largura * (.3 + k * .75), largura * (.13 + k * .34), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Gotas que saltam em arco.
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 10; i++) {
    const k = (t * (1.1 + hash(i, seed + 2) * .9) + hash(i, seed + 3)) % 1;
    const ang = (hash(i, seed + 4) - .5) * 2.4;
    const alcance = largura * (.25 + hash(i, seed + 5) * .55);
    const gx = x + Math.sin(ang) * alcance * k;
    const gy = y - Math.sin(k * Math.PI) * (10 + hash(i, seed + 6) * 16);
    ctx.globalAlpha = (1 - k) * .9;
    ctx.fillRect(gx - 1, gy - 1, 2, 2);
  }
  ctx.restore();
}

/**
 * Anel de espuma no pé de uma pedra que fica no mar: dois contornos que
 * respiram em fases opostas. `raio` em pixels de tela (meia largura).
 */
export function desenharAnelEspuma(ctx, x, y, raio, t, seed = 0) {
  ctx.save();
  ctx.strokeStyle = '#f2fffb';
  ctx.lineCap = 'round';
  for (let anel = 0; anel < 2; anel++) {
    const k = (t * .28 + anel * .5 + hash(seed, 11) * .7) % 1;
    const r = raio * (1 + k * .32);
    ctx.globalAlpha = (1 - k) * .62;
    ctx.lineWidth = 1.8 - k;
    ctx.beginPath();
    // Contorno serrilhado: espuma não é um círculo perfeito.
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const ruido = 1 + Math.sin(a * 5 + seed + t * .9) * .06 + Math.sin(a * 3 - t * .6) * .05;
      const px = x + Math.cos(a) * r * ruido;
      const py = y + Math.sin(a) * r * .5 * ruido;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
