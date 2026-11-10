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
  recifesMax: 34,
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
  const recifes = [];
  const minDist = 2.6;

  for (let y = 1; y < rows.length - 1 && recifes.length < VIDA.recifesMax; y++) {
    for (let x = 1; x < (rows[y]?.length ?? 0) - 1 && recifes.length < VIDA.recifesMax; x++) {
      if (!isAguaChar(rows[y][x])) continue;
      // Água funda: pelo menos 2 tiles da costa.
      const px = Math.min(field.width - 1, Math.floor((x + .5) * field.scale));
      const py = Math.min(field.height - 1, Math.floor((y + .5) * field.scale));
      const dist = field.distLand[py * field.width + px];
      if (dist < 2.1) continue;

      const r = hash(x, y, 41);
      if (r > .16) continue;

      const wx = x + .5 + (hash(x, y, 7) - .5) * .7;
      const wy = y + .5 + (hash(x, y, 11) - .5) * .7;
      if (recifes.some(o => Math.hypot(o.x - wx, o.y - wy) < minDist)) continue;

      recifes.push({
        x: wx, y: wy,
        // 0 = coral, 1 = rocha submersa, 2 = alga alta
        tipo: Math.floor(hash(x, y, 23) * 3),
        tamanho: .55 + hash(x, y, 31) * .7,
        fase: hash(x, y, 53) * Math.PI * 2,
      });
    }
  }
  return recifes;
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
    if (dist < 2.4) c.medo = Math.min(1, c.medo + dt * 2.4);

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
