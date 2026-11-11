// =====================================================================
// VIDA SUBAQUÁTICA — o mar deixa de ser chapado
//
// O criador pediu "mar com profundidade, recifes, rochas submersas,
// reflexos, vida". A textura assada (`beach-water.js`) já resolve o
// estático: degradê, bancos, cáusticas e espuma. O que falta é o que se
// MOVE embaixo d'água quando o jogador mergulha.
//
// REGRA DE CUSTO (a mesma da fase 1): nada aqui escala com o zoom.
//   - cardumes: número FIXO por mapa, só os visíveis são desenhados;
//   - bolhas: partículas com teto duro;
//   - raios de sol: quantidade fixa, animação por seno;
//   - recifes: lista estática assada uma vez por mapa.
//
// Tudo é determinístico (hash com semente) para o teste poder comparar e
// para a cena não "pular" ao trocar de mapa e voltar.
// =====================================================================
import { createCoastField } from '../engine/coast-field.js';

const AGUA = 'YyDdX';
const isAguaChar = c => c != null && AGUA.includes(c);

export const VIDA = {
  cardumesPorMapa: 7,
  peixesPorCardume: 6,
  bolhasMax: 26,
  raios: 9,
  // Recifes são MANCHAS, não pontos soltos: um recife de verdade é um
  // agrupamento de coral, rocha e alga. Pontinhos espalhados pelo mar
  // inteiro liam como ruído/defeito no print, não como vida.
  recifesMax: 5,      // quantos agrupamentos
  porRecife: 7,       // elementos por agrupamento
};

function hash(x, y, seed = 0) {
  let h = Math.imul(Math.round(x * 97) + seed * 7919, 374761393)
    + Math.imul(Math.round(y * 89), 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------
// RECIFES — pontos de coral/rocha no fundo, escolhidos a partir do mapa
// ---------------------------------------------------------------------
/**
 * Distribui recifes em água funda, longe da costa e longe uns dos outros.
 * Devolve coordenadas em TILES (com fração), estáveis por mapa.
 */
export function criarRecifes(map, field) {
  const rows = map.aguaPraia;
  if (!rows) return [];
  const dist = (x, y) => {
    const px = Math.min(field.width - 1, Math.max(0, Math.floor(x * field.scale)));
    const py = Math.min(field.height - 1, Math.max(0, Math.floor(y * field.scale)));
    return field.distLand[py * field.width + px];
  };

  const grupos = [];
  // Candidatos: água funda, longe da costa e longe de outro recife.
  const celulas = [];
  for (let y = 1; y < rows.length - 1; y++) {
    for (let x = 1; x < (rows[y]?.length ?? 0) - 1; x++) {
      if (!isAguaChar(rows[y][x])) continue;
      if (dist(x + .5, y + .5) < 2.4) continue;
      celulas.push([x, y]);
    }
  }
  // Prioriza água ENCADEADA (cercada de terra), onde o mergulho acontece,
  // em vez do mar aberto na borda do mapa. `abrigo` mede quantas das 8
  // células em volta são terra em até 2 tiles.
  const abrigo = (x, y) => {
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (!dx && !dy) continue;
      const c = rows[y + dy]?.[x + dx];
      if (c != null && !isAguaChar(c)) n += 1 / Math.hypot(dx, dy);
    }
    return n;
  };
  // Abrigo primeiro, e dentro do mesmo nível a ordem determinística.
  celulas.sort((a, b) => (abrigo(b[0], b[1]) - abrigo(a[0], a[1]))
    || (hash(a[0], a[1], 41) - hash(b[0], b[1], 41)));

  for (const [x, y] of celulas) {
    if (grupos.length >= VIDA.recifesMax) break;
    const cx = x + .5, cy = y + .5;
    if (grupos.some(g => Math.hypot(g.x - cx, g.y - cy) < 5.5)) continue;

    // Um agrupamento: elementos em volta do centro, com raio variado.
    const elementos = [];
    for (let k = 0; k < VIDA.porRecife; k++) {
      const ang = hash(x, y, k * 13 + 3) * Math.PI * 2;
      const raio = (0.25 + hash(x, y, k * 19 + 5) * 0.95);
      const ex = cx + Math.cos(ang) * raio;
      const ey = cy + Math.sin(ang) * raio * .75;
      if (!isAguaChar(rows[Math.floor(ey)]?.[Math.floor(ex)])) continue;
      if (dist(ex, ey) < 1.9) continue;
      elementos.push({
        x: ex, y: ey,
        tipo: Math.floor(hash(x + k, y, 23) * 3),
        tamanho: .6 + hash(x + k, y, 31) * .8,
        fase: hash(x + k, y, 53) * Math.PI * 2,
      });
    }
    if (elementos.length >= 3) grupos.push({ x: cx, y: cy, elementos });
  }
  return grupos;
}

/** Lista achatada de elementos (para desenhar e para os testes). */
export function elementosDeRecife(recifes) {
  return recifes.flatMap(g => g.elementos);
}

// ---------------------------------------------------------------------
// CARDUMES — grupos que nadam em círculo e fogem do jogador
// ---------------------------------------------------------------------
export function criarCardumes(map, field) {
  const rows = map.aguaPraia;
  if (!rows) return [];
  const cardumes = [];
  const tentativas = 300;
  for (let i = 0; i < tentativas && cardumes.length < VIDA.cardumesPorMapa; i++) {
    const x = 1 + hash(i, 3, 67) * (rows[0].length - 2);
    const y = 1 + hash(i, 5, 71) * (rows.length - 2);
    const tx = Math.floor(x), ty = Math.floor(y);
    if (!isAguaChar(rows[ty]?.[tx])) continue;
    const px = Math.min(field.width - 1, Math.floor(x * field.scale));
    const py = Math.min(field.height - 1, Math.floor(y * field.scale));
    if (field.distLand[py * field.width + px] < 1.6) continue;
    if (cardumes.some(c => Math.hypot(c.homeX - x, c.homeY - y) < 4)) continue;

    cardumes.push({
      homeX: x, homeY: y,
      x, y,
      raio: .5 + hash(i, 7, 79) * .9,
      vel: .18 + hash(i, 11, 83) * .22,
      fase: hash(i, 13, 87) * Math.PI * 2,
      // Cor do cardume: prata, coral ou turquesa (mesma paleta da praia).
      cor: Math.floor(hash(i, 17, 89) * 3),
      peixes: Array.from({ length: VIDA.peixesPorCardume }, (_, k) => ({
        ox: (hash(k, i, 97) - .5) * .72,
        oy: (hash(k, i, 101) - .5) * .42,
        fase: hash(k, i, 103) * Math.PI * 2,
        flip: hash(k, i, 107) < .5,
      })),
      medo: 0,
      flip: false,
    });
  }
  return cardumes;
}

const CORES_CARDUME = [
  [214, 236, 240], // prata
  [240, 160, 120], // coral
  [120, 226, 210], // turquesa
];

/**
 * Atualiza cardumes. `submerso` controla se eles aparecem/mexem mais rápido
 * quando o jogador está embaixo (o mar responde ao mergulho).
 */
export function atualizarCardumes(cardumes, player, dt, submerso) {
  dt = Math.max(0, Math.min(dt, .1));
  for (const c of cardumes) {
    c.fase += c.vel * dt * (submerso ? 1.9 : 1);
    // Trajetória em laço largo, com deriva vertical: nada de círculo perfeito.
    const tx = c.homeX + Math.cos(c.fase) * c.raio;
    const ty = c.homeY + Math.sin(c.fase * 1.3) * c.raio * .55;
    const dist = Math.hypot(player.x - c.x, player.y - c.y);
    // Medo decai devagar: o cardume não teleporta ao se assustar.
    c.medo = Math.max(0, c.medo - dt * .8);
    // Um Maré experiente e calmo inspira confiança; uma arrancada ainda assusta.
    const nado = player.nado;
    const afinidade = submerso && nado?.mareAstral && !nado.arrancada
      ? Math.max(0, Math.min(1, nado.respeito?.valor ?? 0)) : 0;
    if (dist < 2.4) c.medo = Math.min(1, c.medo + dt * 2.4 * (1 - afinidade * .9));

    const alvoX = c.medo > .05 && dist > .001
      ? tx + (c.x - player.x) / dist * c.medo * 1.4
      : tx;
    const alvoY = c.medo > .05 && dist > .001
      ? ty + (c.y - player.y) / dist * c.medo * 1.4
      : ty;

    const vx = alvoX - c.x, vy = alvoY - c.y;
    const len = Math.hypot(vx, vy);
    if (len > .001) {
      const passo = Math.min(len, (.5 + c.medo * 1.6) * dt);
      c.x += vx / len * passo;
      c.y += vy / len * passo;
      c.flip = vx < 0;
    }
  }
}

// ---------------------------------------------------------------------
// BOLHAS — partículas com teto duro
// ---------------------------------------------------------------------
export function atualizarBolhas(bolhas, player, nado, dt, map) {
  dt = Math.max(0, Math.min(dt, .1));
  const submerso = nado?.ativo && nado.profundidade > 1.25;

  // Só nascem bolhas quando o jogador está embaixo d'água.
  if (submerso && bolhas.length < VIDA.bolhasMax) {
    const n = Math.min(VIDA.bolhasMax - bolhas.length, Math.ceil(dt * 26));
    for (let i = 0; i < n; i++) {
      bolhas.push({
        x: player.x + (Math.random() - .5) * .45,
        y: player.y + (Math.random() - .5) * .3,
        vy: -.25 - Math.random() * .45,
        fase: Math.random() * Math.PI * 2,
        vida: 1,
        raio: .035 + Math.random() * .05,
      });
    }
  }

  for (let i = bolhas.length - 1; i >= 0; i--) {
    const b = bolhas[i];
    b.fase += dt * 3.2;
    b.y += b.vy * dt;
    b.x += Math.sin(b.fase) * dt * .09;
    b.vida -= dt * .55;
    if (b.vida <= 0 || !isAguaChar(map?.aguaPraia?.[Math.floor(b.y)]?.[Math.floor(b.x)])) {
      bolhas.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------------
// RAIOS DE SOL — fixos, animados por seno (sem custo de caminho)
// ---------------------------------------------------------------------
export function criarRaios(map) {
  const rows = map.aguaPraia;
  if (!rows) return [];
  return Array.from({ length: VIDA.raios }, (_, i) => ({
    x: hash(i, 1, 131) * rows[0].length,
    y: hash(i, 3, 137) * rows.length,
    largura: .8 + hash(i, 5, 139) * 1.5,
    fase: hash(i, 7, 149) * Math.PI * 2,
    vel: .25 + hash(i, 9, 151) * .3,
  }));
}

// ---------------------------------------------------------------------
// PACOTE POR MAPA (tudo criado uma vez)
// ---------------------------------------------------------------------
const cache = new WeakMap();

export function getVidaAquatica(map) {
  if (!map?.aguaPraia) return null;
  let vida = cache.get(map);
  if (!vida) {
    const field = createCoastField(map.aguaPraia, 8);
    vida = {
      recifes: criarRecifes(map, field),
      cardumes: criarCardumes(map, field),
      raios: criarRaios(map),
      bolhas: [],
    };
    cache.set(map, vida);
  }
  return vida;
}

export function clearVidaAquatica(map) {
  if (map) cache.delete(map);
}

export { CORES_CARDUME };
