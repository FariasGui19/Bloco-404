// js/engine/renderer.js
// =====================================================================
//  RENDERER
//  Chão (passada única) → brilhos → paredes/objetos/personagens por
//  profundidade → poeira → debug → nomes e balões
// =====================================================================
import { CONFIG, TILE } from '../config.js';
import { camera, view, worldToScreen, isoToWorld } from './camera.js';
import { drawUltimateSignature } from './ultimate-visuals.js';
import { getSprite } from './sprites.js';
import { createBeachSurface } from './beach-surface.js';
import { getSeaCanvas, foamArcs } from './beach-water.js';
import { identidadeDoGate, desenharSeloDeModulo } from './selos-modulo.js';
import { getVidaAquatica, atualizarCardumes, atualizarBolhas, CORES_CARDUME, elementosDeRecife } from '../game/vida-aquatica.js';
import { detalhesFauna } from '../game/fauna-ferida.js';
import { desenharBichoFerido, desenharRastroSocorro } from '../ui/fauna-desenho.js';
import { criarFragmentosDeMare, fragmentosColetados } from '../game/mare-missao.js';
import { createCoastField } from './coast-field.js';
import { bridgeGateGeometry } from './bridge-geometry.js';
import { getBioWalkFrame, bioWalkSheet } from '../data/bio-walk.js';
import { faunaFootAnchor } from '../game/fauna-costeira.js';
import { getFrame } from './sprite-clean.js';
import { drawAmbientBack, drawAmbientFront } from './ambient.js';
import { tintaDoClima, atualizarParticulas } from '../game/clima.js';
import { animarFauna } from '../game/fauna-animacao.js';
import { isDebugEnabled, drawDebugWorld } from '../game/debug.js';
import { ACTION_SPRITES } from '../data/action-sprites.js';
import { drawHubScreenFx, hasHubScreenFx } from './hub-screen-fx.js';
import { getVelozAnimation, getVelozPulse } from '../data/veloz-animation.js';
import { getBrutaAnimation, BRUTA_SCALE, BRUTA_FOOT_Y } from '../data/bruta-animation.js';
import { getUltimateFrame } from '../data/nucleo-ultimate-animation.js';
import { getBioUltimateFrame } from '../data/bio-ultimate-animation.js';
import { getBioAttackFrame, getBioPropulsorFrame } from '../data/bio-action-animation.js';
import { getMareUltimateFrame } from '../data/mare-ultimate-animation.js';
import { getDominioUltimateFrame } from '../data/dominio-ultimate-animation.js';
import { getMarePropulsorFrame } from '../data/mare-action-animation.js';
import { getTransformFrame, getNucleoBraceletFrame } from '../data/transform-animation.js';
import { getSelectedToolId } from '../game/tools.js';
import { NUCLEO_BRUTA } from '../data/nucleo-forms.js';
import { getFissures } from '../game/scars.js';
import { getMareWalk, getMareAttack, mareSheet } from '../data/mare-animation.js';
import { getDominioWalk, getDominioAttack } from '../data/dominio-animation.js';
import { getBasicAttackPose } from '../data/basic-attack-poses.js';
import { listCombatFeedback } from '../game/combat-feedback.js';
import { state } from '../game/state.js';

const HW = CONFIG.TILE_W / 2;
const HH = CONFIG.TILE_H / 2;
const TH = CONFIG.TILE_H;
const C = CONFIG.COLORS;

let canvas, ctx;
const drawList = [];
const range = { x0: 0, y0: 0, x1: 0, y1: 0 };

// =====================================================================
//  INICIALIZAÇÃO
// =====================================================================
export function initRenderer(canvasEl) {
  canvas = canvasEl;
  ctx = canvas.getContext('2d');
  window.addEventListener('resize', resize);
  resize();
}

function resize() {
  view.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  view.w = window.innerWidth;
  view.h = window.innerHeight;
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  ctx.imageSmoothingEnabled = false;   // redimensionar o canvas reseta isso
}

// =====================================================================
//  FRAME
// =====================================================================
export function render(map, state) {
  if (!map) return;
  const { dpr } = view;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = map.meta?.corFundo ?? C.BG;
  ctx.fillRect(0, 0, view.w, view.h);

  const z = camera.zoom * dpr;
  // Tremor da Ultimate: desloca a câmera e volta sozinho.
  const shake = state.player?.ultimate?.shake;
  let shakeX = 0, shakeY = 0;
  if (shake && shake.timeLeft > 0) {
    const k = shake.timeLeft / (shake.duration || .34);
    const power = (shake.power ?? 8) * k;
    shakeX = Math.sin(shake.timeLeft * 143) * power;
    shakeY = Math.cos(shake.timeLeft * 117) * power * .6;
  }
  ctx.setTransform(
    z, 0, 0, z,
    (view.w / 2 - camera.x * camera.zoom + shakeX) * dpr,
    (view.h / 2 - camera.y * camera.zoom + shakeY) * dpr
  );

  updateVisibleRange(map);

  // O metrô modular volta a usar chão e tiles.
  if (!map.meta?.backgroundCoversFloor) {
    if (map.aguaPraia) {
      // AREIA primeiro, MAR por cima: o mar recorta a própria borda pelo campo
      // de costa (`beach-water.js`), então a linha d'água é curva em vez de
      // seguir a borda quadrada das células de areia.
      if (map.id !== 'ilha_estacao_bio') drawBeachSurface(map);
      drawBeachSea(map);
      drawVidaAquatica(map, state);
      drawBeachRipples(map);
    }
    drawFloors(map);
    drawHazards(state.hazards);
    if (map.id === 'hub_saguao') drawHubFloorMarkings();
    if (map.id === 'ilha_praia_inicial') drawBeachStation(map);
    if (map.id === 'bio_sala_controle') drawBioControlFloor();
    if (map.id === 'ilha_estacao_bio') {
      drawStationPaving(map);
      drawStationCanalRims(map);
      drawStationBridges(map);
      drawBioNetwork(map);
      drawStationRoute(map);
      drawBioShadows(map);
    }

    if (map.metroTiles) {
      drawMetroPlatformTiles(map);
    }

    if (map.metroRailTiles) {
      drawMetroRailTiles(map);
    }
  }
  // Background hero não será desenhado neste mapa jogável.
  if (!map.meta?.disableBackground) {
    drawMapBackground(map);
  }

  drawAmbientBack(ctx, state, HW, HH);
  // Chão antes de tudo: as fendas ficam embaixo de objetos e personagens.
  drawWorldScars(state);
  drawWorld(map, state);
  drawBasicAttack(state.player);
  drawAbilityEffects(state);
  drawUltimateCharge(state);
  drawUltimateEffect(state);
  drawAmbientFront(ctx, map, HW, HH);
  // CLIMA por último entre as camadas de mundo: chuva e tinta cobrem
  // tudo (inclusive o jogador), mas nunca a HUD, que é DOM.
  drawClima(ctx, state, view);
  drawTarget(state.player);

  if (isDebugEnabled()) drawDebugWorld(ctx, map, state, CONFIG.TILE_W, CONFIG.TILE_H);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Clarão curto no instante da soltura (não cobre a HUD, que é DOM).
  const flash = state.player?.ultimate?.flash;
  if (flash && flash.timeLeft > 0) {
    ctx.save();
    ctx.globalAlpha = (flash.timeLeft / (flash.duration || .26)) * .34;
    ctx.fillStyle = flash.color ?? '#ffffff';
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }
  drawLabels(state);
  drawBubbles(state);
}

// =====================================================================
//  HELPERS
// =====================================================================
function updateVisibleRange(map) {
  const hw = view.w / 2 / camera.zoom;
  const hh = view.h / 2 / camera.zoom;

  const a = isoToWorld(camera.x - hw, camera.y - hh);
  const b = isoToWorld(camera.x + hw, camera.y - hh);
  const c = isoToWorld(camera.x + hw, camera.y + hh);
  const d = isoToWorld(camera.x - hw, camera.y + hh);
  const m = Math.ceil(CONFIG.WALL_H / CONFIG.TILE_H) + 2;

  range.x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x, d.x)) - m);
  range.y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y, d.y)) - m);
  range.x1 = Math.min(map.layout[0].length - 1, Math.ceil(Math.max(a.x, b.x, c.x, d.x)) + m);
  range.y1 = Math.min(map.layout.length - 1, Math.ceil(Math.max(a.y, b.y, c.y, d.y)) + m);
}

// "Sorteio fixo": cada tile recebe sempre o mesmo número entre 0 e 1
function hash(x, y) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pickVariant(cfg, x, y) {
  if (cfg.RAROS?.length && hash(x, y) < (cfg.CHANCE_RARO ?? 0.08)) {
    return cfg.RAROS[Math.floor(hash(y + 7, x + 3) * cfg.RAROS.length)];
  }
  return cfg.VARIANTES[Math.floor(hash(x + 11, y + 5) * cfg.VARIANTES.length)];
}

const tintCache = new Map();
function tint(hex, amount) {
  const key = hex + amount;
  let color = tintCache.get(key);
  if (color) return color;
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, v + amount));
  color = `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  tintCache.set(key, color);
  return color;
}

function quad(ax, ay, bx, by, cx, cy, dx, dy, fill, stroke, lineWidth = 1) {
  ctx.beginPath();
  ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

function drawSmooth(src, sx, sy, sw, sh, dx, dy, dw, dh) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
  ctx.restore();
}
// =====================================================================
// BACKGROUND ARQUITETÔNICO
//
// Mapas grandes/important es podem usar uma arte completa de cenário.
// A colisão continua sendo definida pelo layout JS.
//
// Exemplo no mapa:
// meta: {
//   background: {
//     sprite: 'metro_background',
//     anchor: { x: 14, y: 18 },
//     scale: 0.88,
//   }
// }
// =====================================================================

function drawMapBackground(map) {
  const background = map.meta?.background;

  if (!background) return;

  const image = getSprite(background.sprite);

  if (!image) return;

  const anchor = background.anchor ?? { x: 0, y: 0 };

  const baseScale =
    background.scale ??
    CONFIG.METRO_BACKGROUND?.DEFAULT_SCALE ??
    1;

  const scaleX = background.scaleX ?? baseScale;
  const scaleY = background.scaleY ?? baseScale;

  const pivot = background.pivot ?? {
    x: image.width / 2,
    y: image.height,
  };

  const ix = (anchor.x - anchor.y) * HW;
  const iy = (anchor.x + anchor.y) * HH;

  const offsetX = background.offsetX ?? 0;
  const offsetY = background.offsetY ?? 0;

  const rotation =
    ((background.rotation ?? 0) * Math.PI) / 180;

  ctx.save();

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';

  // Centro lógico da âncora.
  ctx.translate(
    ix + offsetX,
    iy + offsetY
  );

  // Rotação opcional: use somente 0 ou 180 para isometria.
  if (rotation !== 0) {
    ctx.rotate(rotation);
  }

  // Espelhamento.
  ctx.scale(
    background.flipX ? -1 : 1,
    background.flipY ? -1 : 1
  );

  // O pivot do PNG fica exatamente no anchor do mundo.
  ctx.drawImage(
    image,

    -pivot.x * scaleX,
    -pivot.y * scaleY,

    image.width * scaleX,
    image.height * scaleY
  );

  ctx.restore();
}
// =====================================================================
//  CHÃO (desenhado inteiro antes de qualquer coisa)
// =====================================================================
// =====================================================================
// DEBUG — WALK MASK
//
// Mostra a área lógica caminhável por cima do background.
//
// Ciano = caminhável
// Vermelho = bloqueado
//
// Ative com H.
// =====================================================================

function drawWalkMaskDebug(map) {
  if (!map.walkMask) return;

  ctx.save();

  ctx.font = '8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = 0; y < map.walkMask.length; y++) {
    const row = map.walkMask[y];

    for (let x = 0; x < row.length; x++) {
      const walkable = row[x] === '.';

      const tx = (x - y) * HW;
      const ty = (x + y) * HH;

      // Losango isométrico do tile.
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + HW, ty + HH);
      ctx.lineTo(tx, ty + TH);
      ctx.lineTo(tx - HW, ty + HH);
      ctx.closePath();

      ctx.fillStyle = walkable
        ? 'rgba(53, 230, 211, 0.20)'
        : 'rgba(255, 70, 70, 0.06)';

      ctx.fill();

      ctx.lineWidth = walkable ? 1.4 : 0.7;

      ctx.strokeStyle = walkable
        ? 'rgba(53, 230, 211, 0.95)'
        : 'rgba(255, 70, 70, 0.26)';

      ctx.stroke();

      // Coordenadas só aparecem em intervalos para não poluir demais.
      if (x % 3 === 0 && y % 3 === 0) {
        ctx.fillStyle = walkable
          ? '#d5ffff'
          : 'rgba(255, 170, 170, 0.65)';

        ctx.fillText(
          `${x},${y}`,
          tx,
          ty + HH + 3
        );
      }
    }
  }

  ctx.restore();
}
function drawFloors(map) {
  for (let d = range.x0 + range.y0; d <= range.x1 + range.y1; d++) {
    const xs = Math.max(range.x0, d - range.y1);
    const xe = Math.min(range.x1, d - range.y0);

    for (let x = xs; x <= xe; x++) {
      const y = d - x;
      const type = map.layout[y][x];
      if (type !== TILE.WALL) drawFloorTile(type, x, y, map);
    }
  }
}

// O mar é uma textura única ASSADA por mapa (js/engine/beach-water.js):
// degradê, bancos submersos, cáusticas, espuma da margem e linha de espuma
// recuada vêm todos dela. Antes isso era recalculado pixel a pixel no
// primeiro frame e as ondas/espuma eram redesenhadas a cada quadro.
function drawBeachSea(map) {
  const sea = getSeaCanvas(map);
  if (!sea) return;
  ctx.save();
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sea.canvas, 0, 0, map.aguaPraia[0].length, map.aguaPraia.length);
  ctx.restore();
}

// Uma única textura de areia em coordenadas de mundo elimina as emendas de
// cada losango. A máscara vem da própria grade, não altera chão ou colisão.
const beachSurfaceCache = new WeakMap();
function drawBeachSurface(map) {
  let texture = beachSurfaceCache.get(map);
  if (!texture) {
    const data = createBeachSurface(map.aguaPraia);
    texture = document.createElement('canvas');
    texture.width = data.width; texture.height = data.height;
    const paint = texture.getContext('2d');
    const image = paint.createImageData(data.width, data.height);
    image.data.set(data.pixels);
    paint.putImageData(image, 0, 0);
    // Grãos e sulcos sutis são assados no cache, não redesenhados por frame.
    const rows = map.aguaPraia, scale = data.scale;
    paint.strokeStyle = 'rgba(145,101,58,.20)'; paint.lineWidth = .8;
    paint.lineCap = 'round'; paint.beginPath();
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++) {
      if (!'SMT'.includes(rows[y][x])) continue;
      for (let n = 0; n < 3; n++) {
        const wx = x + .14 + hash(x * 7 + n * 31, y + 17) * .72;
        const wy = y + .14 + hash(x + 11, y * 7 + n * 23) * .72;
        const size = .035 + hash(x+n*29, y+37) * .05;
        paint.moveTo((wx-size)*scale, wy*scale);
        paint.quadraticCurveTo(wx*scale, (wy-.04)*scale, (wx+size)*scale, wy*scale);
      }
    }
    paint.stroke();
    beachSurfaceCache.set(map, texture);
  }
  ctx.save();
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(texture, 0, 0, map.aguaPraia[0].length, map.aguaPraia.length);
  ctx.restore();
}
// MOVIMENTO DA ÁGUA — só a animação aditiva, em orçamento fixo.
// A espuma e as ondulações estáticas já estão na textura assada; aqui sobram
// alguns arcos que sobem e descem na beira. `foamArcs` devolve no máximo
// `limit` itens por quadro, então afastar a câmera não aumenta o custo.
const SHORE_ARC_BUDGET = 72;
function drawBeachRipples(map) {
  const rows = map.aguaPraia;
  const time = performance.now() / 1000;
  const arcs = foamArcs(rows, range, time, SHORE_ARC_BUDGET);
  if (!arcs.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const { x, y, phase, seed } of arcs) {
    const ix = (x - y) * HW, iy = (x + y) * HH;
    const rise = Math.sin(phase * Math.PI);
    const alpha = .5 * (1 - rise) * (.55 + seed * .45);
    if (alpha <= .02) continue;
    const len = 7 + seed * 7;
    const off = (1 - rise) * 3.2;
    ctx.strokeStyle = `rgba(232,255,247,${alpha.toFixed(3)})`;
    ctx.lineWidth = 1 + seed * .8;
    ctx.beginPath();
    ctx.moveTo(ix - len / 2, iy + off);
    ctx.quadraticCurveTo(ix, iy + off - 2.4, ix + len / 2, iy + off);
    ctx.stroke();
  }
  ctx.restore();
}


// =====================================================================
// VIDA SUBAQUÁTICA
//
// Tudo é opaco sob a água? Não: o mar assado é desenhado ANTES, então o
// que aparece aqui é o que está "embaixo" da lâmina. A leitura funciona
// porque cada elemento é desenhado com alpha baixo, como se a água o
// tingisse — recifes mais apagados, cardumes um pouco mais vivos (estão
// mais perto da superfície).
//
// Custo: cardumes são um número FIXO por mapa (7); recifes e raios são
// listas estáticas. Só os visíveis são desenhados.
// =====================================================================
const vidaCache = new WeakMap();
const fragmentosCache = new WeakMap();

// Cor por módulo, espelhada de `selos-modulo.js` para o rastro de socorro.
const MOD_COR = {
  mare_astral: '#35E6D3',
  nucleo_dez_forma: '#9CEFA2',
  lamina_dominio_anciao: '#EDB85A',
  motor_bio_forja: '#CE9C5F',
};

// ---------------------------------------------------------------------
// CLIMA: tinta, chuva e clarão
//
// Peso por frame é constante: 120 partículas no máximo, um retângulo de
// tinta e uma vinheta. Nada aqui cresce com o tamanho do mapa.
// ---------------------------------------------------------------------
function drawClima(ctx, state, view) {
  const clima = state.clima;
  if (!clima) return;

  // 1. TINTA: esfria e escurece a cena inteira. É o efeito mais barato
  //    e o que mais se lê de longe — em ressaca a praia "fecha".
  const tinta = tintaDoClima(clima);
  if (tinta.a > 0.004) {
    ctx.save();
    ctx.fillStyle = `rgba(${tinta.r},${tinta.g},${tinta.b},${tinta.a.toFixed(3)})`;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  // 2. CHUVA: só desenha se o buffer existir (evita alocar em mapa seco).
  if (clima.chuva > 0.02 && state.particulasClima) {
    const ativas = Math.round(state.particulasClima.length * Math.min(1, clima.chuva));
    atualizarParticulas(state.particulasClima, clima, 1 / 60, ativas);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(190,220,235,${(0.16 + clima.chuva * 0.26).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const W = view.w, H = view.h;
    const dx = Math.cos(clima.direcao) * clima.vento * 26;
    const dy = Math.sin(clima.direcao) * clima.vento * 10;
    for (let i = 0; i < ativas; i++) {
      const p = state.particulasClima[i];
      const x = p.x * W, y = p.y * H;
      const c = p.comprimento * H;
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx * 0.25, y + c + dy * 0.25);
    }
    ctx.stroke();
    ctx.restore();
  }

  // 3. VINHETA: fecha o quadro nas bordas. Em tempo fechado ela aperta.
  if (clima.forca > 0.15) {
    const forca = Math.min(0.5, clima.forca * 0.42);
    const g = ctx.createRadialGradient(
      view.w * .5, view.h * .5, Math.min(view.w, view.h) * .32,
      view.w * .5, view.h * .5, Math.max(view.w, view.h) * .72);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, `rgba(8,18,24,${forca.toFixed(3)})`);
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }
}

function drawVidaAquatica(map, state) {
  if (!map.aguaPraia) return;
  let vida = vidaCache.get(map);
  if (!vida) { vida = getVidaAquatica(map); vidaCache.set(map, vida); }
  if (!vida) return;

  const t = performance.now() / 1000;
  const player = state.player;
  const nado = player?.nado;
  const submerso = !!nado?.ativo && nado.profundidade > 1.25;

  // Atualiza simulação uma vez por frame (não por item visível).
  atualizarCardumes(vida.cardumes, player ?? { x: 0, y: 0 }, 1 / 60, submerso);
  atualizarBolhas(vida.bolhas, player ?? { x: 0, y: 0 }, nado, 1 / 60, map);

  const dentro = (x, y, margem = 4) =>
    x >= range.x0 - margem && x <= range.x1 + margem &&
    y >= range.y0 - margem && y <= range.y1 + margem;

  ctx.save();

  // ---- Fauna ferida: os animais em apuros do mapa atual ----
  // Desenhada junto com a vida aquática porque é a MESMA camada: bicho
  // ferido é vida no mar, não um item de inventário.
  const bichos = detalhesFauna(map, state.progress, vida.recifes);
  for (const b of bichos) {
    if (!dentro(b.x, b.y, 2)) continue;
    const bx = (b.x - b.y) * HW, by = (b.x + b.y) * HH;
    const perto = player && Math.hypot(player.x - b.x, player.y - b.y) < 3.4;
    desenharBichoFerido(ctx, b, bx, by, 16, t, {
      destacado: perto && b.estado !== 'curado',
      corModulo: b.def?.cura && MOD_COR[b.def.cura],
    });
    if (b.rastro > 0) {
      desenharRastroSocorro(ctx, bx, by, b.rastro, MOD_COR[b.def?.cura] ?? '#9fffe3');
      b.rastro = Math.max(0, b.rastro - 1 / 90);
    }
  }

  // ---- Raios de sol: só quando o jogador mergulha (é o "wow" do mergulho)
  if (submerso) {
    ctx.globalCompositeOperation = 'lighter';
    for (const raio of vida.raios) {
      if (!dentro(raio.x, raio.y, 8)) continue;
      const pulsar = .06 + .05 * Math.sin(t * raio.vel + raio.fase);
      const ix = (raio.x - raio.y) * HW, iy = (raio.x + raio.y) * HH;
      const g = ctx.createLinearGradient(ix, iy - 120, ix, iy + 40);
      g.addColorStop(0, `rgba(190,240,255,${pulsar.toFixed(3)})`);
      g.addColorStop(1, 'rgba(190,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ix - raio.largura * 9, iy - 120);
      ctx.lineTo(ix + raio.largura * 9, iy - 120);
      ctx.lineTo(ix + raio.largura * 22, iy + 40);
      ctx.lineTo(ix - raio.largura * 22, iy + 40);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- Recifes: coral, rocha submersa e alga alta (agrupados em manchas)
  for (const r of elementosDeRecife(vida.recifes)) {
    if (!dentro(r.x, r.y)) continue;
    const ix = (r.x - r.y) * HW, iy = (r.x + r.y) * HH;
    const balanco = Math.sin(t * 1.1 + r.fase) * 1.6;
    const s = r.tamanho;
    if (r.tipo === 0) {
      // Coral: três hastes curvas, rosa/coral, balançando.
      ctx.strokeStyle = 'rgba(232,132,120,.62)';
      ctx.lineWidth = 2.4 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(ix + k * 5 * s, iy);
        ctx.quadraticCurveTo(ix + k * 7 * s + balanco, iy - 9 * s, ix + k * 9 * s + balanco * 1.4, iy - 16 * s);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,190,150,.30)';
      ctx.lineWidth = 1.1 * s;
      ctx.beginPath();
      ctx.moveTo(ix + balanco * .5, iy);
      ctx.lineTo(ix + balanco * .9, iy - 20 * s);
      ctx.stroke();
    } else if (r.tipo === 1) {
      // Rocha submersa: mancha escura e arredondada, com brilho de topo.
      ctx.fillStyle = 'rgba(24,58,76,.42)';
      ctx.beginPath();
      ctx.ellipse(ix, iy + 2, 11 * s, 6.5 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(120,160,170,.20)';
      ctx.beginPath();
      ctx.ellipse(ix - 2 * s, iy, 6 * s, 3 * s, -.3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Alga alta: lâminas finas subindo e voltando com a corrente.
      ctx.strokeStyle = 'rgba(96,178,132,.50)';
      ctx.lineWidth = 1.7 * s;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = -1; k <= 1; k++) {
        ctx.moveTo(ix + k * 4, iy);
        ctx.quadraticCurveTo(ix + k * 5 + balanco * 1.5, iy - 12 * s, ix + k * 4 + balanco * 2.6, iy - 24 * s);
      }
      ctx.stroke();
    }
  }

  // ---- Cardumes: peixinhos em vaivém, apagados pela água
  for (const c of vida.cardumes) {
    if (!dentro(c.x, c.y, 2)) continue;
    const cor = CORES_CARDUME[c.cor];
    const base = submerso ? .78 : .5;
    ctx.fillStyle = `rgba(${cor[0]},${cor[1]},${cor[2]},${base})`;
    for (const p of c.peixes) {
      const bal = Math.sin(t * 3.4 + p.fase) * .06;
      const px = c.x + p.ox + bal;
      const py = c.y + p.oy + Math.sin(t * 2.1 + p.fase) * .03;
      const ix = (px - py) * HW, iy = (px + py) * HH;
      const flip = c.flip ? -1 : 1;
      // Corpo do peixe: losango curto e cauda.
      ctx.beginPath();
      ctx.moveTo(ix - 4 * flip, iy);
      ctx.lineTo(ix, iy - 1.8);
      ctx.lineTo(ix + 3 * flip, iy);
      ctx.lineTo(ix, iy + 1.8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ix - 4 * flip, iy);
      ctx.lineTo(ix - 6.5 * flip, iy - 2.2);
      ctx.lineTo(ix - 6.5 * flip, iy + 2.2);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- Fragmentos de maré: o prêmio do mergulho, girando devagar
  let frags = fragmentosCache.get(map);
  if (!frags) {
    frags = criarFragmentosDeMare(map, createCoastField(map.aguaPraia, 8));
    fragmentosCache.set(map, frags);
  }
  if (frags.length) {
    const pegos = fragmentosColetados(state.progress);
    for (const frag of frags) {
      if (pegos.has(frag.id) || !dentro(frag.x, frag.y, 2)) continue;
      const ix = (frag.x - frag.y) * HW;
      const iy = (frag.x + frag.y) * HH + Math.sin(t * 1.6 + frag.fase) * 3;
      const brilho = .62 + .28 * Math.sin(t * 2.4 + frag.fase);
      // Halo.
      const halo = ctx.createRadialGradient(ix, iy, 0, ix, iy, 16);
      halo.addColorStop(0, `rgba(120,236,255,${(brilho * .5).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(120,236,255,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(ix, iy, 16, 0, Math.PI * 2);
      ctx.fill();
      // Cristal.
      ctx.fillStyle = `rgba(196,248,255,${brilho.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(ix, iy - 7); ctx.lineTo(ix + 4.5, iy);
      ctx.lineTo(ix, iy + 7); ctx.lineTo(ix - 4.5, iy);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(72,190,220,.75)';
      ctx.lineWidth = .8;
      ctx.stroke();
    }
  }

  // ---- Bolhas: só do jogador, sobem e estouram
  if (vida.bolhas.length) {
    ctx.strokeStyle = 'rgba(226,252,255,.62)';
    ctx.lineWidth = .9;
    for (const b of vida.bolhas) {
      const ix = (b.x - b.y) * HW, iy = (b.x + b.y) * HH;
      ctx.globalAlpha = Math.max(0, b.vida) * .8;
      ctx.beginPath();
      ctx.arc(ix, iy, b.raio * 64, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawFloorTile(type, x, y, map) {
  const tx = (x - y) * HW;
  const ty = (x + y) * HH;

  const water = map.aguaPraia?.[y]?.[x];
  if (water && 'SMT'.includes(water)) return; // já pintado na superfície contínua
  if (water && 'YyDd'.includes(water)) {
    // O mar contínuo já foi desenhado sob as ilhas e pontes.
    return;
  }

  // Placa específica (map.pisos) ou mapa inteiro em placas
  const placas = map.meta?.estiloPiso === 'placas';
  const rc = map.pisos?.[`${x},${y}`] ?? (placas ? pickVariant(CONFIG.FLOOR_SPRITE, x, y) : null);
  if (rc && drawFloorSprite(rc, tx, ty)) return;

  if (type === TILE.ELEVATOR) {
    quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, C.ELEVATOR_FILL, C.ELEVATOR_LINE, 2);
    ctx.fillStyle = C.ELEVATOR_LINE;
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⇅', tx, ty + HH + 5);
    return;
  }

  // Ladrilho procedural (saguão)
  const isHub = map.id === 'hub_saguao';
  const hubRoute = isHub && (x === 9 || y === 6);
  const base = hubRoute ? '#20323a' : isHub && (x === 1 || x === 16 || y === 1 || y === 13) ? '#222c31' : map.corChao ?? '#1b1f27';
  const r = hash(x, y);
  const v = r < 0.33 ? -3 : r < 0.66 ? 0 : 3;
  quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, tint(base, v), C.GRID);

  const k = 0.8;
  quad(
    tx, ty + HH - HH * k,
    tx + HW * k, ty + HH,
    tx, ty + HH + HH * k,
    tx - HW * k, ty + HH,
    tint(base, v + 5), null
  );
  if (hubRoute) {
    // Filetes encaixados no losango: decoração de chão, sem hitboxes.
    ctx.save(); ctx.strokeStyle = 'rgba(77,224,197,.25)'; ctx.lineWidth = .8;
    ctx.beginPath();
    if (x === 9) { ctx.moveTo(tx-HW*.76,ty+HH*.76); ctx.lineTo(tx+HW*.24,ty+HH*1.76); }
    if (y === 6) { ctx.moveTo(tx+HW*.76,ty+HH*.76); ctx.lineTo(tx-HW*.24,ty+HH*1.76); }
    ctx.stroke(); ctx.restore();
  }
}

// Recorte em losangos: limita qualquer textura de chão à geometria caminhável
// visível. Usado pelo piso industrial, conduítes e sombras de apoio.
function stationClip(map, predicate) {
  ctx.beginPath();
  for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) {
    if (!predicate(x, y)) continue;
    const ix = (x - y) * HW, iy = (x + y) * HH;
    ctx.moveTo(ix, iy); ctx.lineTo(ix + HW, iy + HH); ctx.lineTo(ix, iy + TH); ctx.lineTo(ix - HW, iy + HH); ctx.closePath();
  }
  ctx.clip();
}

const ehDeck = (map, x, y) => 'Bb'.includes(map.aguaPraia?.[y]?.[x] ?? ' ');

// Pátios e caminhos de manutenção são tratamento visual; a máscara de colisão
// continua sendo a única fonte de caminhabilidade.
function caminhoEstacao(map, x, y) {
  if (map.walkMask[y]?.[x] !== '.' || ehDeck(map, x, y)) return false;
  return (
    (x >= 3 && x <= 17 && y >= 3 && y <= 15) ||   // avental do terminal
    (x >= 8 && x <= 18 && y >= 10 && y <= 18) ||
    (x >= 14 && x <= 39 && y >= 17 && y <= 22) ||
    (x >= 32 && x <= 48 && y >= 14 && y <= 25) ||
    (x >= 30 && x <= 34 && y >= 22 && y <= 27) ||
    (x >= 44 && x <= 48 && y >= 18 && y <= 51) ||
    (x >= 47 && x <= 64 && y >= 40 && y <= 56) ||  // avental da estufa
    (x >= 45 && x <= 59 && y >= 46 && y <= 53) ||
    (x >= 53 && x <= 59 && y >= 42 && y <= 47));
}

// Plataforma do trem é piso, não um sprite decorativo flutuando sobre a areia.
// Não altera a máscara: a faixa de trilhos R continua bloqueada.
const beachStationCache = new WeakMap();
function drawBeachStation(map) {
  let entry = beachStationCache.get(map);
  if (!entry) {
    // A plataforma é estática: compor uma vez, em coordenadas isométricas.
    const left = -4 * HW, top = 3 * HH;
    const surface = document.createElement('canvas');
    surface.width = 17 * HW; surface.height = 17 * HH + 18;
    const previous = ctx;
    ctx = surface.getContext('2d');
    try {
      ctx.translate(-left, -top);
      ctx.imageSmoothingEnabled = false;
      // Faces estruturais sob o tabuleiro, com suportes e iluminação embutida.
      const p = (x, y) => [(x-y)*HW, (x+y)*HH];
      const face = (a, b, color) => {
        const [ax, ay] = p(...a), [bx, by] = p(...b);
        quad(ax, ay, bx, by, bx, by+14, ax, ay+14, color, '#26333a', 1);
        ctx.strokeStyle = '#202c34'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ax, ay+10); ctx.lineTo(bx, by+10); ctx.stroke();
      };
      for (let x = 2; x <= 13; x++) face([x, 6], [x+1, 6], '#3b4c4d');
      for (let y = 1; y <= 5; y++) face([14, y], [14, y+1], '#30404b');
      ctx.strokeStyle = '#5fd5cd'; ctx.lineWidth = 2;
      for (let x = 3; x <= 13; x += 3) {
        const [a,b] = p(x,6); ctx.beginPath(); ctx.moveTo(a-5,b+6); ctx.lineTo(a+5,b+11); ctx.stroke();
      }
      for (let y = 1; y <= 5; y++) for (let x = 2; x <= 13; x++) {
        if (!'RPSM'.includes(map.aguaPraia[y]?.[x] ?? ' ')) continue;
        const ix = (x-y)*HW, iy = (x+y)*HH;
        // Placas alinhadas à grade, sem repetir recortes inteiros de máquinas.
        quad(ix, iy, ix+HW, iy+HH, ix, iy+TH, ix-HW, iy+HH,
          (x+y)%3 ? '#44535a' : '#4c5c61', '#263840', 1);
        if ((x+y)%3 === 0) {
          ctx.strokeStyle = 'rgba(157,185,179,.3)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(ix-HW*.55,iy+HH); ctx.lineTo(ix,iy+HH*1.55);
          ctx.lineTo(ix+HW*.55,iy+HH); ctx.stroke();
        }
        if (y === 4) {
          ctx.strokeStyle = '#e1bd73'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(ix, iy+3); ctx.lineTo(ix+HW-3, iy+HH); ctx.stroke();
        }
      }
    } finally { ctx = previous; }
    entry = { surface, left, top };
    beachStationCache.set(map, entry);
  }
  ctx.drawImage(entry.surface, entry.left, entry.top);
}

// Circuito da sala conecta o registro, a placa e o painel de controle.
function drawBioControlFloor() {
  const live = !!state.progress?.flags?.gate_bio_pulso_interior;
  const p = (x, y) => [(x-y)*HW, (x+y)*HH];
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const route = [[3.5,5.5],[7.5,5.5],[10.5,5.5],[10.5,3.5]];
  for (const [width, color] of [[7, '#192a29'], [3, live ? '#86dbb7' : '#a38858']]) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath();
    route.forEach(([x,y], i) => { const [a,b] = p(x,y); if (!i) ctx.moveTo(a,b); else ctx.lineTo(a,b); });
    ctx.stroke();
  }
  ctx.restore();
}

// Borda de pedra rente à água: o canal deixa de ser uma faixa ciana sem
// limite e passa a ter margem dos dois lados. Só desenha arestas com terra
// ou deck do outro lado; não altera máscara nem colisão.
function drawStationCanalRims(map) {
  const linhas = map.aguaPraia;
  ctx.save();
  for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) {
    if (linhas[y]?.[x] !== 'Y') continue;
    const ix = (x - y) * HW, iy = (x + y) * HH;
    const T = [ix, iy], R = [ix + HW, iy + HH], B = [ix, iy + TH], L = [ix - HW, iy + HH];
    const C = [ix, iy + HH];
    const vizinhos = [
      [x - 1, y, L, T], [x, y - 1, T, R],
      [x + 1, y, R, B], [x, y + 1, B, L],
    ];
    for (const [nx, ny, p, q] of vizinhos) {
      const outro = linhas[ny]?.[nx];
      if (!outro || 'YyDd'.includes(outro)) continue;
      const interior = (v) => [v[0] + (C[0] - v[0]) * .17, v[1] + (C[1] - v[1]) * .17];
      const pi = interior(p), qi = interior(q);
      ctx.fillStyle = '#3a4740';
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]);
      ctx.lineTo(qi[0], qi[1]); ctx.lineTo(pi[0], pi[1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(178,190,160,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(pi[0], pi[1] - 1); ctx.lineTo(qi[0], qi[1] - 1); ctx.stroke();
      ctx.strokeStyle = 'rgba(12,32,34,.55)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
  }
  ctx.restore();
}

// Rota da primeira missão desenhada no piso: pequenos losangos e setas,
// com os trechos já concluídos mais claros. É só orientação visual.
function drawStationRoute(map) {
  const rota = map.bioRoute;
  if (!rota?.path?.length) return;
  const flags = state.progress?.flags ?? {};
  const ponto = ([x, y]) => [((x + .5) - (y + .5)) * HW, ((x + .5) + (y + .5)) * HH];
  ctx.save();
  stationClip(map, (x, y) => map.walkMask[y]?.[x] === '.' && !'YyDd'.includes(map.aguaPraia?.[y]?.[x] ?? ' '));
  for (let i = 0; i < rota.path.length - 1; i++) {
    const a = ponto(rota.path[i]), b = ponto(rota.path[i + 1]);
    const etapa = (rota.stages ?? []).find(s => i < s.ate);
    const feito = etapa ? !!flags[etapa.flag] : false;
    const passos = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 46));
    for (let p = 0; p <= passos; p++) {
      const t = p / passos, px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t;
      ctx.fillStyle = feito ? 'rgba(143,230,200,.75)' : 'rgba(116,155,146,.28)';
      ctx.beginPath(); ctx.moveTo(px, py - 3); ctx.lineTo(px + 5, py);
      ctx.lineTo(px, py + 3); ctx.lineTo(px - 5, py); ctx.closePath(); ctx.fill();
    }
  }
  ctx.restore();
}

// Texturas em coordenadas de mundo: ambas seguem a mesma projeção dos tiles.
// Água e decks não recebem chão; caminhos permanecem legíveis sobre o jardim.
function paintStationPaving(map) {
  const paintTexture = (image, predicate, fallback) => {
    ctx.save();
    stationClip(map, predicate);
    ctx.transform(HW, HH, -HW, HH, 0, 0);
    ctx.fillStyle = fallback;
    ctx.fillRect(range.x0, range.y0, range.x1 - range.x0 + 1, range.y1 - range.y0 + 1);
    if (image) {
      const span = 6;
      ctx.imageSmoothingEnabled = false;
      for (let y = Math.floor(range.y0 / span) * span; y <= range.y1; y += span)
        for (let x = Math.floor(range.x0 / span) * span; x <= range.x1; x += span)
          ctx.drawImage(image, x, y, span, span);
    }
    ctx.restore();
  };
  paintTexture(getSprite('bio_jardim_novo'), (x, y) => map.walkMask[y]?.[x] === '.' && !ehDeck(map, x, y), '#405247');
  paintTexture(getSprite('bio_piso_novo'), (x, y) => caminhoEstacao(map, x, y), '#4c5648');
}

// Piso estático em blocos: o recorte e as centenas de losangos são pintados
// uma vez por bloco, não novamente a cada frame. A rede continua independente.
const stationPavingCache = new WeakMap();
function drawStationPaving(map) {
  const sheet = getSprite('bio_piso_novo'), garden = getSprite('bio_jardim_novo');
  let cache = stationPavingCache.get(map);
  if (!cache || cache.sheet !== sheet || cache.garden !== garden) {
    cache = { sheet, garden, chunks: new Map() };
    stationPavingCache.set(map, cache);
  }
  const span = 12;
  for (let cy = Math.floor(range.y0 / span); cy <= Math.floor(range.y1 / span); cy++) {
    for (let cx = Math.floor(range.x0 / span); cx <= Math.floor(range.x1 / span); cx++) {
      const key = `${cx},${cy}`;
      if (!cache.chunks.has(key)) {
        const x0 = cx * span, y0 = cy * span;
        const x1 = Math.min(x0 + span - 1, map.layout[0].length - 1);
        const y1 = Math.min(y0 + span - 1, map.layout.length - 1);
        let hasPaving = false;
        for (let y = y0; y <= y1 && !hasPaving; y++)
          for (let x = x0; x <= x1; x++) if (map.walkMask[y]?.[x] === '.' && !ehDeck(map, x, y)) { hasPaving = true; break; }
        if (!hasPaving) { cache.chunks.set(key, null); continue; }
        const left = (x0 - (y1 + 1)) * HW;
        const top = (x0 + y0) * HH;
        const tile = document.createElement('canvas');
        tile.width = (x1 - x0 + y1 - y0 + 2) * HW;
        tile.height = (x1 - x0 + y1 - y0 + 2) * HH;
        const previousCtx = ctx, previousRange = { ...range };
        try {
          ctx = tile.getContext('2d');
          ctx.translate(-left, -top);
          Object.assign(range, { x0, y0, x1, y1 });
          paintStationPaving(map);
        } finally {
          ctx = previousCtx;
          Object.assign(range, previousRange);
        }
        cache.chunks.set(key, { tile, left, top });
      }
      const chunk = cache.chunks.get(key);
      if (chunk) ctx.drawImage(chunk.tile, chunk.left, chunk.top);
    }
  }
}

// Tabuleiros das duas travessias: geometria real sobre a água, com espessura
// nas bordas. Guarda-corpos são desenhados depois, como objetos por trecho.
function drawStationBridges(map) {
  const iso = (x, y) => [(x - y) * HW, (x + y) * HH];
  ctx.save();
  for (const ponte of map.bioBridges ?? []) {
    const x0 = ponte.x0, x1 = ponte.x1 + 1, y0 = ponte.y0, y1 = ponte.y1 + 1;
    const a = iso(x0, y0), b = iso(x1, y0), c = iso(x1, y1), d = iso(x0, y1);
    // Sombra na água, deslocada para baixo, sem criar colisão.
    ctx.fillStyle = 'rgba(5,32,38,.42)';
    ctx.beginPath(); ctx.moveTo(a[0], a[1] + 9); ctx.lineTo(b[0], b[1] + 9);
    ctx.lineTo(c[0], c[1] + 9); ctx.lineTo(d[0], d[1] + 9); ctx.closePath(); ctx.fill();
    // Faces laterais dão espessura ao tabuleiro.
    ctx.fillStyle = '#252e2b';
    ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + 9); ctx.lineTo(b[0], b[1] + 9); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#3a443c';
    ctx.beginPath(); ctx.moveTo(d[0], d[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + 9); ctx.lineTo(d[0], d[1] + 9); ctx.closePath(); ctx.fill();
    // Tampa do deck: tom quente separa a travessia do piso industrial escuro.
    ctx.fillStyle = '#6b6550';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill();
    // Tábuas/réguas acompanhando o eixo longo da travessia, com rebites.
    const alongX = ponte.axis === 'x';
    const passosLongos = (alongX ? x1 - x0 : y1 - y0);
    const passosCurtos = (alongX ? y1 - y0 : x1 - x0);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(38,46,40,.6)';
    for (let t = 0; t <= passosCurtos; t++) {
      const p = alongX ? iso(x0, y0 + t) : iso(x0 + t, y0);
      const q = alongX ? iso(x1, y0 + t) : iso(x0 + t, y1);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    for (let t = 0; t <= passosLongos; t++) {
      const p = alongX ? iso(x0 + t, y0) : iso(x0, y0 + t);
      const q = alongX ? iso(x0 + t, y1) : iso(x1, y0 + t);
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(196,190,150,.5)';
    for (let u = 0; u <= passosLongos; u++) for (let v = 0; v <= passosCurtos; v++) {
      const p = alongX ? iso(x0 + u, y0 + v) : iso(x0 + v, y0 + u);
      ctx.beginPath(); ctx.arc(p[0], p[1], 1.5, 0, Math.PI * 2); ctx.fill();
    }
    // Treliça sob as duas bordas longas: dá massa à ponte sem criar colisão.
    const lados = alongX ? [[a, b], [d, c]] : [[a, d], [b, c]];
    for (const [p, q] of lados) {
      const trechos = Math.max(2, passosLongos);
      ctx.strokeStyle = '#1d2a28'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p[0], p[1] + 13); ctx.lineTo(q[0], q[1] + 13); ctx.stroke();
      ctx.lineWidth = 1.8; ctx.strokeStyle = 'rgba(58,80,70,.9)';
      for (let s = 0; s < trechos; s++) {
        const t0 = s / trechos, t1 = (s + 1) / trechos;
        const u0 = [p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0];
        const u1 = [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1];
        ctx.beginPath(); ctx.moveTo(u0[0], u0[1]); ctx.lineTo(u1[0], u1[1] + 13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u0[0], u0[1] + 13); ctx.lineTo(u1[0], u1[1]); ctx.stroke();
      }
    }
    // Longarinas metálicas nas duas bordas longas.
    ctx.strokeStyle = '#22322e'; ctx.lineWidth = 4;
    for (const [p, q] of lados) {
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(178,193,155,.6)'; ctx.lineWidth = 1.4;
    for (const [p, q] of lados) {
      ctx.beginPath(); ctx.moveTo(p[0], p[1] - 2); ctx.lineTo(q[0], q[1] - 2); ctx.stroke();
    }
    // Encontros baixos nas duas pontas: pedra rasa, não bloco alto.
    const meioCurto = (y0 + y1) / 2, meioLongo = (x0 + x1) / 2;
    const pontas = alongX ? [iso(x0, meioCurto), iso(x1, meioCurto)] : [iso(meioLongo, y0), iso(meioLongo, y1)];
    for (const [px, py] of pontas) {
      ctx.fillStyle = '#2a3632';
      ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px + 20, py - 2);
      ctx.lineTo(px, py + 8); ctx.lineTo(px - 20, py - 2); ctx.closePath();
      ctx.moveTo(px - 20, py - 2); ctx.lineTo(px - 20, py + 3);
      ctx.lineTo(px, py + 13); ctx.lineTo(px + 20, py + 3);
      ctx.lineTo(px + 20, py - 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#8d9080';
      ctx.beginPath(); ctx.moveTo(px, py - 12); ctx.lineTo(px + 20, py - 2);
      ctx.lineTo(px, py + 8); ctx.lineTo(px - 20, py - 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(45,58,51,.8)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(px - 20, py - 2); ctx.lineTo(px, py + 8);
      ctx.lineTo(px + 20, py - 2); ctx.stroke();
    }
  }
  ctx.restore();
}

// Rede de pressão: conduítes no chão, com estado vindo apenas dos reparos.
// Não concede item, habilidade ou conclusão de missão.
function drawBioNetwork(map) {
  const net = map.bioNetwork;
  if (!net) return;
  const flags = state.progress?.flags ?? {};
  const energizada = !!flags.gate_bio_reparo_condutor && !!flags.gate_bio_reparo_regulador;
  const fluxo = !!flags.gate_bio_valvula_estufa;
  ctx.save();
  // Os percursos são validados sobre terra/deck; não recortar milhares de tiles por frame.
  const ponto = ([x, y]) => [((x + .5) - (y + .5)) * HW, ((x + .5) + (y + .5)) * HH];
  for (const path of net.paths) {
    const desenha = (largura, cor) => {
      ctx.beginPath();
      for (let i = 0; i < path.length; i++) {
        const [px, py] = ponto(path[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineWidth = largura; ctx.strokeStyle = cor; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
    };
    desenha(6, 'rgba(22,34,34,.8)');
    desenha(3.5, energizada ? '#41705f' : '#46534e');
    desenha(1.2, energizada ? (fluxo ? '#a9f3d2' : '#77c9ad') : '#637069');
    // Juntas e cotovelos: a linha lê como tubulação, não como risco no chão.
    for (const [x, y] of path) {
      const [px, py] = ponto([x, y]);
      ctx.fillStyle = '#1b2b2b';
      ctx.beginPath(); ctx.moveTo(px, py - 4); ctx.lineTo(px + 6, py);
      ctx.lineTo(px, py + 4); ctx.lineTo(px - 6, py); ctx.closePath(); ctx.fill();
      ctx.fillStyle = energizada ? '#7fc9ae' : '#586660';
      ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const node of net.nodes) {
    const [px, py] = ponto([node.x, node.y]);
    ctx.fillStyle = '#182827';
    ctx.beginPath(); ctx.ellipse(px, py, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
    if (energizada) {
      const pulso = .55 + .35 * Math.sin(performance.now() / 420 + node.x);
      ctx.fillStyle = fluxo ? `rgba(150,255,214,${pulso})` : `rgba(96,214,185,${pulso * .6})`;
      ctx.beginPath(); ctx.ellipse(px, py, 8, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Apoio no solo para as estruturas grandes: elipse escura antes dos objetos.
function drawBioShadows() {
  ctx.save();
  // Fundação projetada a partir da mesma hitbox sólida do terminal.
  const terminal = (state.objects ?? []).find(o => o.id === 'bio_terminal_principal');
  if (terminal?.hitbox) {
    const h = terminal.hitbox, x0 = terminal.x + h.offsetX, y0 = terminal.y + h.offsetY;
    const x1 = x0 + h.width, y1 = y0 + h.height;
    const p = (x,y) => [(x-y)*HW,(x+y)*HH];
    const [a,b,c,d] = [p(x0,y0),p(x1,y0),p(x1,y1),p(x0,y1)];
    ctx.fillStyle = '#263d35'; ctx.strokeStyle = '#172b28'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(c[0],c[1]+7); ctx.lineTo(d[0],d[1]+7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#58665a';
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.lineTo(...c); ctx.lineTo(...d); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#8a9c83'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(...d); ctx.lineTo(...c); ctx.lineTo(...b); ctx.stroke();
  }
  for (const o of state.objects ?? []) {
    if (!o.sombra || o.oculto) continue;
    const ix = (o.x - o.y) * HW, iy = (o.x + o.y) * HH;
    // Sombra larga difusa + contato duro junto à base: a peça "assenta".
    ctx.fillStyle = 'rgba(10,26,27,.22)';
    ctx.beginPath(); ctx.ellipse(ix, iy + 2, o.sombra[0], o.sombra[1], 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(6,20,21,.38)';
    ctx.beginPath(); ctx.ellipse(ix, iy + 2, o.sombra[0] * .55, o.sombra[1] * .55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHubFloorMarkings() {
  const x = (9 - 9.5) * HW, y = (9 + 9.5) * HH;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(13,43,43,.48)'; ctx.beginPath(); ctx.ellipse(0, 0, 80, 39, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(83,229,196,.56)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 78, 37, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(235,191,96,.45)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, 69, 32, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(173,255,229,.7)'; ctx.textAlign = 'center'; ctx.font = 'bold 12px monospace';
  ctx.fillText('BLOCO 404', 0, 0);
  ctx.fillStyle = 'rgba(119,213,193,.58)'; ctx.font = '8px monospace'; ctx.fillText('CONEXÕES • ECOS', 0, 12);
  const angle = performance.now() * .00045;
  ctx.strokeStyle = 'rgba(112,255,218,.62)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = angle + i * Math.PI * 2 / 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 78, 37, 0, a, a + .22); ctx.stroke();
  }
  ctx.restore();
}

// =====================================================================
// TILES ESPECIAIS DO METRÔ
//
// map.metroTiles usa:
// 'x,y': [linha, coluna]
//
// Exemplo:
// '14,5': [0, 1] → borda amarela de plataforma.
// =====================================================================

// =====================================================================
// TILES ESPECIAIS DO METRÔ
//
// A sheet gerada por IA possui células quadradas com bastante padding.
// Portanto, usamos getFrame() e crop para desenhar somente o conteúdo
// real do tile, encaixado exatamente no losango 64x32 do motor.
// =====================================================================

function drawMetroPlatformTiles(map) {
  if (!map.metroTiles) return;

  const cfg = CONFIG.METRO_PLATFORM_TILES;
  const image = getSprite(cfg?.ID);

  if (!cfg || !image) return;

  for (const [key, rc] of Object.entries(map.metroTiles)) {
    const [xText, yText] = key.split(',');

    const x = Number(xText);
    const y = Number(yText);

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    if (
      x < range.x0 - 1 ||
      x > range.x1 + 1 ||
      y < range.y0 - 1 ||
      y > range.y1 + 1
    ) {
      continue;
    }

    const row = rc?.[0] ?? 0;
    const col = rc?.[1] ?? 0;

    // Recorta somente o conteúdo visível da célula.
    const frame = getFrame(
      image,
      col,
      row,
      cfg.SHEET_COLS,
      cfg.SHEET_ROWS
    );

    const crop = frame?.crop;

    if (!crop) continue;

    const tx = (x - y) * HW;
    const ty = (x + y) * HH;

    ctx.save();

    // Mantém pixels nítidos.
    ctx.imageSmoothingEnabled = false;

    // IMPORTANTE:
    // A arte recortada é encaixada no tile matemático do jogo:
    // largura 64 / altura 32.
    // Isso impede que ela fique inclinada ou deslocada.
    ctx.drawImage(
      crop.canvas,
      0,
      0,
      crop.w,
      crop.h,

      tx - HW,
      ty,

      CONFIG.TILE_W,
      CONFIG.TILE_H
    );

    ctx.restore();
  }
}
// =====================================================================
// KIT DE TRILHOS DO METRÔ
//
// Sheet metro-rail-kit.png.
//
// map.metroRailTiles usa:
// 'x,y': [linha, coluna]
//
// A sheet é tratada como decal técnico e encaixada no tile 64x32.
// =====================================================================

// =====================================================================
// KIT DE TRILHOS DO METRÔ
//
// Algumas sheets geradas por IA vêm com trilhos no eixo oposto ao trem.
// O mapa pode usar:
//
// meta: {
//   metroRailRotation: 90
// }
//
// para girar o conteúdo visual da sheet sem alterar a geometria
// isométrica do tile 64x32.
// =====================================================================

const metroRailRotationCache = new Map();

function getRotatedRailCell(frame, rotation, row, col) {
  if (!rotation || rotation % 360 === 0) {
    return frame.cell;
  }

  const normalizedRotation = ((rotation % 360) + 360) % 360;
  const key = `${row},${col},${normalizedRotation}`;

  if (metroRailRotationCache.has(key)) {
    return metroRailRotationCache.get(key);
  }

  const size = Math.max(frame.cell.width, frame.cell.height);

  const rotated = document.createElement('canvas');
  rotated.width = size;
  rotated.height = size;

  const rotatedCtx = rotated.getContext('2d');
  rotatedCtx.imageSmoothingEnabled = false;
  rotatedCtx.translate(size / 2, size / 2);
  rotatedCtx.rotate((normalizedRotation * Math.PI) / 180);
  rotatedCtx.drawImage(
    frame.cell,
    -frame.cell.width / 2,
    -frame.cell.height / 2
  );

  metroRailRotationCache.set(key, rotated);
  return rotated;
}

function drawMetroRailTiles(map) {
  if (!map.metroRailTiles) return;

  const cfg = CONFIG.METRO_RAIL_KIT;
  const image = getSprite(cfg?.ID);

  if (!cfg || !image) return;

  const rotation = map.meta?.metroRailRotation ?? 0;

  for (const [key, rc] of Object.entries(map.metroRailTiles)) {
    const [xText, yText] = key.split(',');

    const x = Number(xText);
    const y = Number(yText);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }

    if (
      x < range.x0 - 1 ||
      x > range.x1 + 1 ||
      y < range.y0 - 1 ||
      y > range.y1 + 1
    ) {
      continue;
    }

    const row = rc?.[0] ?? 0;
    const col = rc?.[1] ?? 0;

    const frame = getFrame(
      image,
      col,
      row,
      cfg.SHEET_COLS,
      cfg.SHEET_ROWS
    );

    if (!frame?.cell) continue;

    const source = getRotatedRailCell(
      frame,
      rotation
    );

    const tx = (x - y) * HW;
    const ty = (x + y) * HH;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      source,
      0,
      0,
      source.width,
      source.height,

      tx - HW,
      ty,

      CONFIG.TILE_W,
      CONFIG.TILE_H
    );

    ctx.restore();
  }
}
function drawFloorSprite(rc, tx, ty) {
  const cfg = (rc[2] && CONFIG[rc[2]]) || CONFIG.FLOOR_SPRITE;
  if (!cfg) return false;

  const image = getSprite(cfg.ID);
  const f = getFrame(image, rc[1], rc[0], cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop;
  if (!f) return false;

  const k = (CONFIG.TILE_W * (cfg.AJUSTE_LARGURA ?? 1)) / f.w;
  const w = f.w * k;
  const h = f.h * k;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(tx, ty + (cfg.AJUSTE_Y ?? 0));
  if (rc[3]) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();

  return true;
}

// =====================================================================
//  PAREDES + OBJETOS + PERSONAGENS (por profundidade)
// =====================================================================
const depthOf = (item) => item.x + item.y + (item.depthOffset ?? 0);

const backList = [];

// =====================================================================
// CICATRIZES DO CHÃO — a fenda que a Quebra Sistemas deixa
// =====================================================================
// Decalque isométrico, não objeto de colisão: o jogador atravessa, mas o mapa
// lembra do golpe. A semente estável de cada fenda evita o desenho "ferver".
function drawWorldScars(state) {
  const mapa = state.world?.currentMapId;
  const fissuras = getFissures(state.progress, mapa);
  if (!fissuras.length) return;
  ctx.save();
  // O laço principal já aplicou zoom, câmera e tremor no contexto: aqui só
  // projetamos as coordenadas do mundo, igual ao resto do chão. (Uma
  // transformação extra aqui faria a fenda flutuar fora do mapa.)
  for (const f of fissuras) {
    const sx = (f.x - f.y) * HW;
    const sy = (f.x + f.y) * HH;
    // Comprimento do traço em pixels de mundo; a direção vem do dado do golpe
    // (facing é uma direção ISO: [1,1] desce, [-1,-1] sobe...). A escala é
    // calibrada pelo tile (64 px): a fenda cobre de 2 a 4 tiles, é o que dá
    // para ler como chão rachado sem virar um buraco do tamanho do mapa.
    const escala = 62;
    const dx = (f.dx ?? 1) * escala, dy = (f.dy ?? 1) * escala * .5;
    const comprimento = (f.len ?? 3) * .5;
    const semente = f.seed ?? 1;
    const tremor = (i) => {
      // Ruído determinístico, sem aleatório por quadro.
      const n = Math.sin(semente * .017 + i * 2.7) * 43758.5453;
      return (n - Math.floor(n) - .5) * 2;
    };
    // 1) Sombra funda sob a fenda: dá a sensação de abismo.
    ctx.globalAlpha = .55;
    ctx.strokeStyle = '#05090c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const px = sx + dx * k * comprimento + tremor(i) * 2;
      const py = sy + dy * k * comprimento + tremor(i + 5) * 1.2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // 2) Magma esfriando: halo laranja largo + miolo quente quase branco.
    ctx.globalAlpha = .35;
    ctx.strokeStyle = '#ff7a3c';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const px = sx + dx * k * comprimento + tremor(i) * 1.6;
      const py = sy + dy * k * comprimento + tremor(i + 5) * 1;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = .95;
    ctx.strokeStyle = '#ffd08a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (let i = 0; i <= 10; i++) {
      const k = i / 10;
      const px = sx + dx * k * comprimento + tremor(i) * 1.4;
      const py = sy + dy * k * comprimento + tremor(i + 5) * .8;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // 3) Placas levantadas nas margens (retângulos duros, como na Ultimate).
    ctx.globalAlpha = .8;
    ctx.fillStyle = '#2a3138';
    // Perpendicular normalizada no espaço da tela: as placas ficam ENCOSTADAS
    // na fenda (antes flutuavam longe dela, parecendo lixo no chão).
    const perpLen = Math.hypot(dy, dx) || 1;
    const perpX = -dy / perpLen, perpY = dx / perpLen;
    for (let placa = 0; placa < 4; placa++) {
      const k = .18 + placa * .2;
      const lado = placa % 2 === 0 ? -1 : 1;
      const px = sx + dx * k * comprimento + perpX * lado * 9 + tremor(placa) * 1.5;
      const py = sy + dy * k * comprimento + perpY * lado * 9 + tremor(placa + 3) * 1.5;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((tremor(placa) * .5));
      ctx.fillRect(-7, -3, 14, 6);
      // Brilho na quina da placa: lembra que o chão acabou de ser partido.
      ctx.fillStyle = '#ff7a3c';
      ctx.globalAlpha = .5;
      ctx.fillRect(-7, -3, 14, 1.5);
      ctx.fillStyle = '#2a3138';
      ctx.globalAlpha = .8;
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawWorld(map, state) {
  drawList.length = 0;
  backList.length = 0;

  if (isDebugEnabled()) window.__objs = state.objects;

  const margem = 10;
  const visivel = (o) =>
    o.x >= range.x0 - margem && o.x <= range.x1 + margem &&
    o.y >= range.y0 - margem && o.y <= range.y1 + margem;

  for (const a of state.actors ?? []) drawList.push(a);
  if (state.companion) drawList.push(state.companion);
  for (const a of state.fauna ?? []) if (visivel(a)) drawList.push(a);
  for (const target of state.trainingTargets ?? []) if (visivel(target)) drawList.push(target);

  for (const o of state.objects ?? []) {
    if (o.camada === 'fundo') { backList.push(o); continue; }  // trem/trilho sempre
    if (!visivel(o)) continue;
    // Estruturas grandes deixam de ter uma única profundidade: o PNG é
    // desenhado em faixas horizontais com valores de profundidade próprios,
    // para que o jogador passe entre a parte de trás e a da frente.
    const camadas = o.depthLayers;
    if (camadas?.count > 1) {
      depthLayerOffsets(camadas).forEach((offset, i) => drawList.push({
        ...o,
        __slice: { index: i, count: camadas.count },
        depthOffset: offset,
      }));
    } else drawList.push(o);
  }

  // Guarda-corpos das pontes Bio: cada trecho é um item com x+y real.
  for (const rail of map.bioBridgeRails ?? []) {
    if (visivel(rail)) drawList.push(rail);
  }

  for (const item of state.collectibles ?? []) {
    if (visivel(item)) drawList.push(item);
  }

  drawList.push(state.player);
  // ...o resto da função continua igual (sort, drawItem, loops)
  drawList.sort((a, b) => depthOf(a) - depthOf(b));
  backList.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const drawItem = (item) => {
    if (item.renderType === 'object') {
      drawMapObject(item, state);
    } else if (item.renderType === 'trainingTarget') {
      drawTrainingTarget(item);
    } else if (item.renderType === 'companion') {
      if (item.speciesId === 'bolt') drawBolt(item); else drawLumeo(item);
    } else if (item.renderType === 'fauna') {
      drawCoastalFauna(item);
    } else if (item.renderType === 'collectible') {
      drawCollectible(item, state);
    } else if (item.renderType === 'bioRail') {
      drawBioRail(item);
    } else {
      drawEntity(item, state);
    }
  };

  // Fachada no extremo do trilho, atrás do trem; é cenográfica, não portal.
  if (map.id === 'ilha_praia_inicial') {
    const rail = backList.find(o => o.id === 'trilho_dimensional_principal');
    if (rail) drawBeachRailTunnel(rail);
  }
  // Camada de fundo (trilho, trem): atrás de tudo, só acima do chão.
  for (const o of backList) drawMapObject(o, state);

  let ei = 0;
  for (let d = range.x0 + range.y0; d <= range.x1 + range.y1; d++) {
    const xs = Math.max(range.x0, d - range.y1);
    const xe = Math.min(range.x1, d - range.y0);

    for (let x = xs; x <= xe; x++) {
      const y = d - x;
      if (
        map.layout[y][x] === TILE.WALL &&
        !map.meta?.useBackgroundWalls
      ) {
        drawWallTile(x, y, map);
      }
    }

    while (ei < drawList.length && Math.floor(drawList[ei].x) + Math.floor(drawList[ei].y) <= d) {
      drawItem(drawList[ei++]);
    }
  }

  while (ei < drawList.length) drawItem(drawList[ei++]);

  drawCombatFeedback();
  drawPlayerHurt();
}

// Zonas de eco instável: anel pulsante no chão, sem esconder o personagem.
function drawHazards(hazards) {
  if (!hazards?.length) return;
  ctx.save();
  for (const hazard of hazards) {
    const x = (hazard.x - hazard.y) * HW, y = (hazard.x + hazard.y) * HH;
    const pulse = .55 + .45 * Math.sin(hazard.clock * 2.2);
    const radius = hazard.radius * HW;
    ctx.globalAlpha = .16 + pulse * .10;
    ctx.fillStyle = '#6bff92';
    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * HH / HW, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = .5 + pulse * .3;
    ctx.strokeStyle = '#a9ffbe'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(x, y, radius, radius * HH / HW, 0, 0, Math.PI * 2); ctx.stroke();
    // Pequenos fragmentos de eco girando devagar.
    ctx.fillStyle = '#d9ffe3';
    for (let i = 0; i < 4; i++) {
      const angle = hazard.clock * .8 + i * Math.PI / 2;
      const px = x + Math.cos(angle) * radius * .72;
      const py = y + Math.sin(angle) * radius * .72 * HH / HW - 2;
      ctx.fillRect(px - 1, py - 1, 2, 2);
    }
  }
  ctx.restore();
}

// Dano recente escurece as bordas; vida zerada fecha o quadro em preto.
function drawPlayerHurt() {
  const player = state.player;
  const hurt = player?.hurtTimer ?? 0;
  const dead = (player?.health ?? 1) <= 0;
  if (hurt <= 0 && !dead) return;
  const { w, h, dpr } = view;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (hurt > 0) {
    const strength = Math.min(1, hurt / .5) * .75;
    const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .25, w / 2, h / 2, Math.max(w, h) * .62);
    gradient.addColorStop(0, 'rgba(120,10,10,0)');
    gradient.addColorStop(1, `rgba(150,18,12,${strength})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  if (dead) {
    ctx.fillStyle = 'rgba(4,10,8,.72)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#c9ffe0';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ECO DISPERSO • RETORNANDO', w / 2, h / 2);
  }
  ctx.restore();
}

// Números de dano/crítico/XP sobem e desaparecem acima do alvo.
function drawCombatFeedback() {
  const items = listCombatFeedback();
  if (!items.length) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const item of items) {
    const t = 1 - Math.max(0, item.life) / item.duration;
    const x = (item.x - item.y) * HW;
    const y = (item.x + item.y) * HH - 42 - t * 24;
    ctx.globalAlpha = Math.min(1, item.life / (item.duration * .45));
    ctx.font = `bold ${item.crit ? 13 : 10}px monospace`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(4,16,12,.85)';
    ctx.strokeText(item.text, x, y);
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, x, y);
  }
  ctx.restore();
}

// Entrada dimensional na ponta oeste do trem; desenhada atrás do material
// rodante e sem acrescentar colisão, portal ou promessa de túnel explorável.
// O eixo e a ponta usam os mesmos campos do trilho já convertido para runtime.
// A abertura fica atrás do trilho/trem e não é uma passagem jogável.
export function beachRailEnd(rail, frame) {
  const half = (rail.larguraPx ?? 0) / 2;
  const height = frame?.w ? (rail.larguraPx ?? 0) * frame.h / frame.w : 0;
  return { x: (rail.x - rail.y) * HW + (rail.ajusteX ?? 0) - half,
    y: (rail.x + rail.y) * HH + (rail.ajusteY ?? 0) - half * (rail.skewY ?? 0)
      - height * (rail.pivotY ?? .5) * (rail.escalaY ?? 1) };
}
export function beachTunnelAnchor(rail, frame) {
  const end = beachRailEnd(rail, frame);
  return { x: end.x + HW + 16, y: end.y + 24 };
}
function drawBeachRailTunnel(rail) {
  const image = getSprite(rail.sprite);
  const cfg = getObjectSpriteConfig(rail.sprite);
  const frame = getFrame(image, rail.frame?.col ?? 0, rail.frame?.row ?? 0, cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop;
  if (!frame) return;
  const end = beachTunnelAnchor(rail, frame);
  ctx.save(); ctx.translate(end.x, end.y); ctx.lineJoin = 'round';
  // Sapata assentada sob a estrutura e estendida na direção do trilho.
  ctx.fillStyle = '#344a50'; ctx.strokeStyle = '#1c2d34'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-94, 20); ctx.lineTo(-62, 29);
  ctx.lineTo(34, 4); ctx.lineTo(54, 0); ctx.lineTo(22, -16);
  ctx.lineTo(-74, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  // Alongar o pórtico para cima sem levantar sua base da plataforma.
  ctx.save(); ctx.translate(0, 15);
  // A face transversal do portal acompanha o outro eixo isométrico do piso.
  // A inclinação mantém as colunas verticais, sem rotacionar a estrutura.
  ctx.transform(1, -0.32, 0, 1.18, 0, 0); ctx.translate(0, -15);
  // Volume se prolonga para trás, paralelo ao trilho, em vez de ser
  // uma placa fina na diagonal. A abertura frontal continua atrás do trem.
  // O desenho do trilho já é diagonal dentro do próprio PNG; skewY
  // sozinho não mede sua inclinação visual. O eixo do deck é 2:1.
  const depthX = -32, depthY = (depthX * HH / HW + 0.32 * depthX) / 1.18;
  const panel = (points, fill) => {
    ctx.beginPath(); points.forEach(([x,y],i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#253a42'; ctx.lineWidth = 2; ctx.stroke();
  };
  panel([[-62,10],[-62,-82],[-62+depthX,-82+depthY],[-62+depthX,10+depthY]], '#1c2f38');
  panel([[-62,-82],[-42,-112],[-42+depthX,-112+depthY],[-62+depthX,-82+depthY]], '#40565b');
  panel([[-42,-112],[23,-112],[23+depthX,-112+depthY],[-42+depthX,-112+depthY]], '#51636a');
  panel([[23,-112],[54,-82],[54+depthX,-82+depthY],[23+depthX,-112+depthY]], '#344a51');
  // Ranhuras da carcaça reforçam a profundidade sem cobrir o trilho.
  ctx.strokeStyle = '#73918d'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-62 + depthX * .3, -82 + depthY * .3);
  ctx.lineTo(-42 + depthX * .3, -112 + depthY * .3);
  ctx.lineTo(23 + depthX * .3, -112 + depthY * .3); ctx.stroke();
  // Moldura recuada enquadra a traseira do trem e a ponta real do trilho.
  ctx.fillStyle = '#243841'; ctx.strokeStyle = '#61777b'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-62, 10); ctx.lineTo(-62, -82);
  ctx.lineTo(-42, -112); ctx.lineTo(23, -112); ctx.lineTo(54, -82);
  ctx.lineTo(54, 17); ctx.lineTo(34, 16); ctx.lineTo(34, -77);
  ctx.lineTo(15, -92); ctx.lineTo(-34, -92); ctx.lineTo(-42, -77);
  ctx.lineTo(-42, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#0b1b24'; ctx.beginPath(); ctx.moveTo(-42,9);
  ctx.lineTo(-42,-77); ctx.lineTo(-34,-92); ctx.lineTo(15,-92);
  ctx.lineTo(34,-77); ctx.lineTo(34,16); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4ad4d2'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-52,0); ctx.lineTo(-52,-79); ctx.lineTo(-38,-101);
  ctx.lineTo(19,-101); ctx.lineTo(44,-79); ctx.lineTo(44,3); ctx.stroke();
  ctx.restore(); // escala do pórtico
  ctx.restore();
}

// Um trecho de guarda-corpo: poste + duas travessas até o poste seguinte.
// A posição é a coordenada de mundo real do trecho, então a ordenação por
// profundidade separa de verdade o lado distante do lado próximo da ponte.
function drawBioRail(rail) {
  const ix = (rail.x - rail.y) * HW, iy = (rail.x + rail.y) * HH;
  const passoX = rail.axis === 'x' ? HW : -HW;
  const passoY = HH;
  const altura = 20;
  ctx.save();
  ctx.fillStyle = 'rgba(8,25,26,.3)';
  ctx.beginPath(); ctx.ellipse(ix, iy + 2, 5, 2.4, 0, 0, Math.PI * 2); ctx.fill();
  if (!rail.ultimo) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#20322f'; ctx.lineWidth = 5;
    for (const dy of [-altura + 3, -altura + 10]) {
      ctx.beginPath(); ctx.moveTo(ix, iy + dy); ctx.lineTo(ix + passoX, iy + passoY + dy); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(148,182,158,.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ix, iy - altura + 2); ctx.lineTo(ix + passoX, iy + passoY - altura + 2); ctx.stroke();
  }
  // Poste e lanterna de baixa intensidade.
  ctx.strokeStyle = '#1c2c2b'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(ix, iy + 2); ctx.lineTo(ix, iy - altura - 2); ctx.stroke();
  ctx.strokeStyle = '#6f8c78'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix, iy - altura); ctx.stroke();
  ctx.fillStyle = rail.side === 'perto' ? '#f0c57b' : '#96d3bc';
  ctx.beginPath(); ctx.arc(ix, iy - altura - 3, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// Manifestação de treino é um alvo explícito e inofensivo; não é fauna.
function drawTrainingTarget(target) {
  const x = (target.x-target.y)*HW, y = (target.x+target.y)*HH;
  const down = target.health <= 0;
  ctx.save();
  ctx.fillStyle = 'rgba(12,34,35,.30)'; ctx.beginPath(); ctx.ellipse(x,y+2,22,8,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#334c50'; ctx.beginPath(); ctx.moveTo(x-22,y); ctx.lineTo(x,y+8); ctx.lineTo(x+22,y); ctx.lineTo(x,y-8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = down ? '#566362' : target.hitTimer > 0 ? '#fff7bd' : '#58dcca';
  ctx.strokeStyle = '#cdfef3'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x,y-(down?19:48)); ctx.lineTo(x+13,y-29); ctx.lineTo(x,y-12); ctx.lineTo(x-13,y-29); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#d9fff5'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  const caption = down ? 'RECARREGANDO' : 'ECO DE TREINO · CLIQUE';
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(5,30,32,.9)'; ctx.strokeText(caption, x, y-58); ctx.fillText(caption, x, y-58);
  if (!down) { ctx.fillStyle = '#1d3735'; ctx.fillRect(x-18,y-54,36,3); ctx.fillStyle = '#9af9c8'; ctx.fillRect(x-18,y-54,36*target.health/target.maxHealth,3); }
  ctx.restore();
}

function drawBasicAttack(player) {
  const a = player.combat;
  if (!a?.timeLeft) return;
  const t = 1 - a.timeLeft/a.duration;
  const ix = (player.x-player.y)*HW, iy = (player.x+player.y)*HH - 17;
  const sx = (a.dx-a.dy)*HW, sy = (a.dx+a.dy)*HH;
  const angle = Math.atan2(sy,sx), radius = 30 + 12*t;
  ctx.save(); ctx.translate(ix,iy); ctx.rotate(angle);
  ctx.strokeStyle = a.color; ctx.globalAlpha = Math.sin(Math.PI*t)*.9;
  ctx.lineWidth = a.style === 'lamina_dominio_anciao' ? 5 : 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(3,0,radius,-.75,.75); ctx.stroke();
  ctx.strokeStyle = '#f4fff5'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(3,0,radius-4,-.48,.48); ctx.stroke();
  if (a.style === 'mare_astral') {
    ctx.strokeStyle = '#86f5ff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(3, 0, radius - 8, -.9, .65); ctx.stroke();
    ctx.fillStyle = '#d3ffff';
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(24 + i * 6, -16 + i * 15, 2 - i * .35, 0, Math.PI * 2); ctx.fill(); }
  } else if (a.style === 'motor_bio_forja') {
    ctx.strokeStyle = '#ffe6b0'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { const ang = -.6 + i * .4; ctx.beginPath(); ctx.moveTo(Math.cos(ang)*radius, Math.sin(ang)*radius); ctx.lineTo(Math.cos(ang)*(radius+7), Math.sin(ang)*(radius+7)); ctx.stroke(); }
  } else if (a.style === 'lamina_dominio_anciao') {
    ctx.strokeStyle = '#fff1af'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(20,-12); ctx.lineTo(39,0); ctx.lineTo(20,12); ctx.stroke();
  }
  if (a.transformed) {
    ctx.strokeStyle = '#c9ffd5'; ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(13, i*8 - 4); ctx.lineTo(36, i*8 + 2); ctx.stroke(); }
  }
  ctx.restore();
}

// As células são desenhadas integralmente: os peixes são um cardume, não
// componentes desconectados a eliminar, e as âncoras não pulam entre quadros.
// Espécies da folha NOVA (Praia 10.0), por linha e largura em px.
// `ar` = passa tempo acima da linha d'água (o golfinho salta).
const FAUNA_NOVA = {
  trinta_reis: { linha: 0, largura: 46, ar: 'voo' },
  graxaim:     { linha: 1, largura: 54 },
  golfinho:    { linha: 2, largura: 62, ar: 'salto' },
  tartaruga:   { linha: 3, largura: 52, ar: 'nado' },
};

function drawCoastalFauna(a) {
  const crab = a.species === 'caranguejo';
  const nova = FAUNA_NOVA[a.species];
  const image = getSprite(crab ? 'fauna_caranguejo' : nova ? 'fauna_nova_1010' : 'fauna_costeira');
  if (!image) return;
  const cols = crab ? 4 : 8, rows = crab ? 4 : nova ? 4 : 4;
  const flight = (a.species === 'gaivota' || a.species === 'trinta_reis') && a.fleeing;
  const row = crab ? (a.fleeing ? 2 : 0)
    : nova ? nova.linha
    : ({ gaivota: 1, peixes: 2, capivara: 3 }[a.species] ?? 0);
  const tick = Math.floor(a.clock * (a.fleeing ? 8 : 4));
  const col = crab ? tick % 4
    : nova ? tick % 8
    : flight ? 4 + tick % 4
    : a.species === 'gaivota' ? tick % 4
    : a.species === 'capivara' ? tick % 7 : tick % 8;
  const width = crab ? 54
    : nova ? nova.largura
    : a.species === 'peixes' ? 65 : a.species === 'capivara' ? 62 : 48;
  const cw = image.width / cols, ch = image.height / rows;
  const height = width * ch / cw;
  const x = (a.x - a.y) * HW, y = (a.x + a.y) * HH;
  // Golfinho e tartaruga vivem na água: a sombra deles é na própria
  // lâmina d'água, e o golfinho ganha arco de salto.
  const naAgua = a.species === 'golfinho' || a.species === 'tartaruga' || a.species === 'peixes';
  // Animação vem do módulo de fauna: parábola de verdade para o golfinho,
  // batida em rajada para o trinta-réis, passo para o graxaim. O renderer
  // só obedece — nada de seno solto aqui dentro.
  const anim = animarFauna(a);
  ctx.save();
  if (!naAgua) {
    ctx.fillStyle = 'rgba(12,25,24,.22)'; ctx.beginPath(); ctx.ellipse(x, y + 3, width * .22, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(x, y + anim.y - (flight ? 18 + Math.sin(a.clock * 8) * 2 : 0));
  if (a.flip) ctx.scale(-1, 1);
  // Inclinação do corpo: o golfinho mergulha e emerge com o corpo
  // inclinado; quem está em terra firme mal inclina.
  if (anim.rot) ctx.rotate(anim.rot * (a.flip ? -1 : 1));
  if (anim.escalaY !== 1) ctx.scale(1, anim.escalaY);
  ctx.imageSmoothingEnabled = false;
  const box = (a.species === 'capivara' || nova) ? getVisibleBox(image, col * cw, row * ch, cw, ch) : null;
  // Usa a base opaca de cada quadro, sem redimensioná-lo ou deslocar a sombra.
  const anchor = faunaFootAnchor(box, ch);
  ctx.drawImage(image, col * cw, row * ch, cw, ch, -width / 2, -height * anchor, width, height);
  ctx.restore();
}

// ---------------------------------------------------------------------
//  PAREDES
// ---------------------------------------------------------------------
function drawWallTile(x, y, map) {
  const lastX = map.layout[0].length - 1;
  const lastY = map.layout.length - 1;
  const front = y === lastY || x === lastX;

  if (!front && (x === 0 || y === 0) && map.meta?.estiloParede !== 'simples') {
    if (drawWallSprite(x, y, map)) return;
  }

  drawWallProcedural(x, y, front);
}

function drawWallSprite(x, y, map) {
  const cfg = CONFIG.WALL_SPRITE;
  if (!cfg) return false;

  const image = getSprite(cfg.ID);
  const ref = getFrame(image, 0, 0, cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop;
  if (!ref) return false;

  const k = (HW * (cfg.LARGURA ?? 1.25)) / ref.w;
  const ky = k * (map.meta?.alturaParede ?? 1);   // altura por mapa

  const ex = (x + 1 - (y + 1)) * HW;
  const ey = (x + 1 + (y + 1)) * HH;

  let rc;
  let flip = false;
  let centro = false;

  if (x === 0 && y === 0) {
    rc = cfg.CANTO;
    centro = true;
  } else {
    rc = map.paredes?.[`${x},${y}`] ?? pickVariant(cfg, x, y);
    flip = x === 0;
  }

  const f = getFrame(image, rc[1], rc[0], cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop ?? ref;
  const w = f.w * k;
  const h = f.h * ky;
  const ax = cfg.AJUSTE_X ?? 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.translate(ex + (flip ? -ax : ax), ey + (cfg.AJUSTE_Y ?? 0));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, centro ? -w / 2 : -w, -h, w, h);
  ctx.restore();
  return true;
}

function drawWallProcedural(x, y, front) {
  const tx = (x - y) * HW;
  const ty = (x + y) * HH;
  const h = front ? (CONFIG.FRONT_WALL_H ?? 12) : CONFIG.WALL_H;

  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - h, tx - HW, ty + HH - h, C.WALL_LEFT, C.WALL_LEFT);
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - h, tx, ty + TH - h, C.WALL_RIGHT, C.WALL_RIGHT);
  quad(
    tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h,
    C.WALL_TOP, 'rgba(255,255,255,0.06)'
  );
}

// ---------------------------------------------------------------------
//  OBJETOS
// ---------------------------------------------------------------------
// ---------------------------------------------------------------------
//  OBJETOS (com espelhamento e porta animada)
// ---------------------------------------------------------------------
// =====================================================================
// OBJETOS
//
// Suporta sheets diferentes:
// - hub_props
// - metro_props
// - dimensional_train
// =====================================================================

function getObjectSpriteConfig(spriteId) {
  if (['bio_terminal', 'bio_reator', 'bio_ponte', 'bio_estufa', 'bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria', 'bio_plataforma', 'bio_margem_canto', 'bio_margem_cano', 'bio_margem_ruina', 'bio_margem_mureta', 'bio_condutor_quebrado', 'bio_condutor_ativo', 'bio_regulador_quebrado', 'bio_regulador_ativo', 'bio_mato_cano', 'bio_mato_ventilacao', 'bio_mato_barris', 'bio_mato_fissura', 'bio_cabeceira', 'bio_distribuidor', 'bio_margem_baixa', 'bio_fundacao'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (['hub_vaso_novo', 'hub_reciclagem', 'hub_carrinho', 'hub_bebedouro'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: .25, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'costa_rochosa') return { SHEET_COLS: 4, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'praia_plataforma_kit') return { SHEET_COLS: 4, SHEET_ROWS: 2, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'vegetacao_tropical') return { SHEET_COLS: 8, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'metro_props') {
    return CONFIG.METRO_PROPS_SPRITE;
  }

  if (spriteId === 'metro_structure') {
    return CONFIG.METRO_STRUCTURE_SPRITE;
  }

  if (spriteId === 'dimensional_train') {
    return CONFIG.DIMENSIONAL_TRAIN_SPRITE;
  }

  if (spriteId === 'dimensional_rail_strip') {
    return CONFIG.DIMENSIONAL_RAIL_STRIP_SPRITE;
  }

  if (spriteId === 'train_boarding_terminal') {
    return CONFIG.TRAIN_BOARDING_TERMINAL_SPRITE;
  }
  if (spriteId === 'player') {
    return CONFIG.PLAYER_SPRITE;
  }
  if (spriteId === 'beach_props') {
    return CONFIG.BEACH_PROPS_SPRITE;
  }
  return CONFIG.HUB_PROPS_SPRITE;
}
// =====================================================================
// CROP VISUAL: descobre a área realmente visível de um PNG (alpha > 40)
// e cacheia o resultado por imagem+célula.
// =====================================================================
const visibleBoxCache = new WeakMap();

function getVisibleBox(image, sx, sy, sw, sh, threshold = 40) {
  let porImagem = visibleBoxCache.get(image);
  if (!porImagem) {
    porImagem = new Map();
    visibleBoxCache.set(image, porImagem);
  }

  const key = `${sx},${sy},${sw},${sh}`;
  if (porImagem.has(key)) return porImagem.get(key);

  const c = document.createElement('canvas');
  c.width = sw;
  c.height = sh;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  const d = cx.getImageData(0, 0, sw, sh).data;
  let minX = sw, minY = sh, maxX = -1, maxY = -1;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      if (d[(y * sw + x) * 4 + 3] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const box = maxX < 0
    ? { x: 0, y: 0, w: sw, h: sh }
    : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };

  porImagem.set(key, box);
  return box;
}
// Limiares acompanhando a largura e o eixo do deck, em vez de uma caverna
// ou rocha aparentemente solta sobre a ponte. Só muda o desenho do gate.
function drawBridgeThreshold(object, map, state) {
  const g = bridgeGateGeometry(map?.aguaPraia, object);
  if (!g) return; // sem deck reconhecível, não inventar marca sobre água
  const x = (g.x - g.y) * HW, y = (g.x + g.y) * HH;

  // SELO DO MÓDULO: o portal de energia que dá identidade ao gate.
  // Desenhado ANTES do traço do deck, para o deck ficar por cima do
  // brilho (leitura correta de "portal atrás do piso").
  const vencido = Boolean(state?.progress?.flags?.[`gate_${object.id}`]);
  const identidade = identidadeDoGate(object);
  ctx.save();
  ctx.translate(x, y - 6);
  desenharSeloDeModulo(ctx, identidade, g, performance.now() / 1000, vencido);
  ctx.restore();
  // Pontas da faixa são recuadas das bordas físicas do deck.
  const dx = (g.axis === 'x' ? -1 : 1) * HW * g.halfWidth, dy = HH * g.halfWidth;
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const line = (color, width, ax, ay, bx, by) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); };
  if (g.kind === 'dominio') {
    // Fragmento geológico com fenda de frequência: não é um arco tecnológico.
    ctx.fillStyle = '#525053'; ctx.strokeStyle = '#292e30'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-dx*.72, -dy*.72); ctx.lineTo(-18, -30); ctx.lineTo(5, -43); ctx.lineTo(24, -26); ctx.lineTo(dx*.72,dy*.72); ctx.lineTo(0, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#edb85a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-3,-38); ctx.lineTo(1,-28); ctx.lineTo(-6,-19); ctx.lineTo(3,-10); ctx.lineTo(-1,1); ctx.stroke();
  } else if (g.kind === 'bio') {
    // Um condutor rompido com extremidades mecânicas sobre a travessia.
    line('#283e3b', 9, -dx, -dy, dx, dy);
    line('#ce9c5f', 3, -dx, -dy, -dx*.24, -dy*.24);
    line('#ce9c5f', 3, dx*.24, dy*.24, dx, dy);
    for (const side of [-1, 1]) {
      const px = dx * side, py = dy * side;
      ctx.fillStyle = '#3f5750'; ctx.strokeStyle = '#aec9aa'; ctx.lineWidth = 1.5;
      ctx.fillRect(px-5, py-8, 10, 8); ctx.strokeRect(px-5, py-8, 10, 8);
    }
  } else {
    // Maré = faixas de fluxo curvas; Núcleo = marcas cinéticas angulares.
    line('#344c49', 8, -dx, -dy, dx, dy);
    if (g.kind === 'mare' || g.kind === 'mare_nucleo') {
      ctx.strokeStyle = '#74e6e4'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-dx*.85,-dy*.85); ctx.quadraticCurveTo(-6,-8,0,0); ctx.quadraticCurveTo(6,8,dx*.85,dy*.85); ctx.stroke();
    }
    if (g.kind === 'nucleo' || g.kind === 'mare_nucleo') {
      ctx.strokeStyle = '#9cefa2'; ctx.lineWidth = 2;
      for (const f of [-.48, .48]) {
        const px=dx*f, py=dy*f; ctx.beginPath(); ctx.moveTo(px-5,py-4); ctx.lineTo(px,py); ctx.lineTo(px+5,py-4); ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// Projetor decorativo de recepção, ordenado como objeto; não é portal nem interação.
function drawHubHologram(object) {
  const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
  const t = performance.now() / 1000;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#142c30'; ctx.strokeStyle = '#529a8c'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, 25, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(55,237,207,.08)';
  ctx.beginPath(); ctx.moveTo(-19, -2); ctx.lineTo(-37, -78); ctx.lineTo(37, -78); ctx.lineTo(19, -2); ctx.closePath(); ctx.fill();
  const bob = Math.sin(t * 1.7) * 3;
  ctx.translate(0, -51 + bob);
  ctx.shadowColor = '#49ffe2'; ctx.shadowBlur = 12;
  ctx.strokeStyle = 'rgba(108,255,226,.8)'; ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke();
  ctx.save(); ctx.rotate(t * .7); ctx.strokeStyle = 'rgba(111,249,222,.55)';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 10, -.4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#c0fff0'; ctx.beginPath(); ctx.arc(25, -4, 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.fillStyle = 'rgba(175,255,237,.85)'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.fillText('404', 0, 3);
  ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(95,242,217,.28)'; ctx.lineWidth = .7;
  for (let i = 0; i < 4; i++) { const yy = -13 + i * 8; ctx.beginPath(); ctx.moveTo(-31, yy); ctx.lineTo(31, yy); ctx.stroke(); }
  ctx.restore();
}

// Marcadores de acesso e de impulso têm posições reais e não bloqueiam o chão.
function drawBioMarker(object) {
  const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
  const active = object.dashSensor && !!state.progress?.flags?.gate_bio_pulso_interior;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(13,35,32,.8)'; ctx.strokeStyle = active ? '#a9f2bb' : '#e8ba70'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 0, 25, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = active ? '#a9f2bb' : '#ffcd80'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText(active ? 'PULSO OK' : object.bioMarker, 0, -16);
  ctx.restore();
}

// Duas plataformas da mesma linha, decorativas e sem colisão extra.
function drawCableStation(object) {
  const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
  const active = !!state.progress?.flags?.gate_teleferico_quebrado;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#34463e'; ctx.strokeStyle = '#b5c0a0'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -15); ctx.lineTo(50, 9); ctx.lineTo(0, 32); ctx.lineTo(-50, 9); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#273934'; ctx.lineWidth = 6;
  for (const px of [-36, 36]) { ctx.beginPath(); ctx.moveTo(px, 8); ctx.lineTo(px, -77); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.strokeStyle = '#718b77';
  ctx.beginPath(); ctx.moveTo(-48, -72); ctx.lineTo(48, -72); ctx.moveTo(0, -72); ctx.lineTo(0, -58); ctx.stroke();
  ctx.fillStyle = '#314c48'; ctx.strokeStyle = active ? '#8fe4bd' : '#c99b67';
  ctx.fillRect(-23, -58, 46, 38); ctx.strokeRect(-23, -58, 46, 38);
  ctx.fillStyle = active ? '#81c9b5' : '#715e4d'; ctx.fillRect(-17, -52, 34, 18);
  ctx.fillStyle = '#152d2c'; ctx.fillRect(-43, -99, 86, 19);
  ctx.strokeStyle = '#92b6a0'; ctx.strokeRect(-43, -99, 86, 19);
  ctx.fillStyle = '#e2f8d8'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText(object.cableStation, 0, -86);
  ctx.restore();
}

// Filtro de estado: uma flag persistida pode acender uma peça sem trocar de sprite.
export function filtroObjeto(object) {
  return object.filterOnFlag && state.progress?.flags?.[object.filterOnFlag]
    ? (object.filterOn ?? object.filter)
    : object.filter;
}

// Offsets de profundidade de uma estrutura em camadas. Exportado para os testes
// conferirem que o jogador fica entre duas faixas, e não atrás de um sprite inteiro.
export function depthLayerOffsets(camadas) {
  const n = camadas?.count ?? 0;
  if (n < 2) return [camadas?.back ?? 0];
  return Array.from({ length: n }, (_, i) =>
    camadas.back + (camadas.front - camadas.back) * ((i + .5) / n));
}

// Faixa horizontal da imagem desenhada por uma camada de profundidade.
export function fatiaObjeto(object, altura) {
  if (!object.__slice) return { sy: 0, sh: altura };
  const { index, count } = object.__slice;
  const sy = Math.floor(altura * index / count);
  const fim = Math.floor(altura * (index + 1) / count);
  return { sy, sh: Math.max(1, fim - sy) };
}

function drawMapObject(object, state) {
  if (object.hideWhenFlag && state.progress.flags?.[object.hideWhenFlag]) return;
  if (object.showWhenFlag && !state.progress.flags?.[object.showWhenFlag]) return; // NOVO

  if (['rocha_rachada', 'travessia_mare_eco', 'passagem_mare_eco', 'caverna_alagada', 'fenda_estreita', 'teleferico_quebrado'].includes(object.id)) { drawBridgeThreshold(object, state.world?.currentMap, state); return; }

  if (object.gate) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save(); ctx.fillStyle = 'rgba(11,24,28,.28)'; ctx.beginPath();
    ctx.ellipse(x, y + 3, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  if (object.bioMarker) { drawBioMarker(object); return; }
  if (object.cableStation) { drawCableStation(object); return; }
  if (object.tipo === 'holograma_decorativo') { drawHubHologram(object); return; }
  if (object.porta) { drawDoor(object); return; }
  if (object.routeMarker) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save();
    ctx.strokeStyle = '#9fffe3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 30); ctx.stroke();
    ctx.fillStyle = '#0c393c'; ctx.fillRect(x - 38, y - 48, 76, 18);
    ctx.strokeRect(x - 38, y - 48, 76, 18);
    ctx.fillStyle = '#e1fff1'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(object.routeMarker, x, y - 36);
    ctx.restore(); return;
  }
  // Painel de arquivo: arte de cenário em moldura, não geometria transitável.
  const scene = object.sceneSprite && getSprite(object.sceneSprite);
  if (scene) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save();
    ctx.fillStyle = '#0b1b25'; ctx.fillRect(x - 42, y - 92, 84, 47);
    ctx.drawImage(scene, x - 40, y - 90, 80, 43);
    ctx.strokeStyle = 'rgba(119, 231, 221, 0.8)'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 42, y - 92, 84, 47);
    ctx.restore();
  }
  // ...

  const sheet = getObjectSpriteConfig(object.sprite);
  const image = getSprite(object.sprite ?? sheet.ID);
  if (!image || !sheet) return;

  // Estado ligado a uma flag de progresso (ex.: válvula da estufa aberta).
  const filtro = filtroObjeto(object);

  if (object.useCrop && drawCroppedObject(object, image, sheet)) return;

  // fallback antigo (não usado pelo trem/trilho)
  const frameW = image.width / sheet.SHEET_COLS;
  const frameH = image.height / sheet.SHEET_ROWS;
  const col = object.frame?.col ?? 0;
  const row = object.frame?.row ?? 0;
  const scale = object.scale ?? sheet.DEFAULT_SCALE;
  const drawW = frameW * scale;
  const drawH = frameH * scale;
  const ix = (object.x - object.y) * HW;
  const iy = (object.x + object.y) * HH;

  if (state.world?.currentMapId === 'hub_saguao' && ['saguao_vaso_novo', 'saguao_bebedouro'].includes(object.id)) {
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.33)'; ctx.beginPath();
    ctx.ellipse(ix, iy + (object.ajusteY ?? 0) + 2, object.id === 'saguao_bebedouro' ? 18 : 20, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  const banda = fatiaObjeto(object, frameH);
  ctx.save();
  if (filtro) ctx.filter = filtro;
  ctx.translate(ix + (object.ajusteX ?? 0), iy + (object.ajusteY ?? 0));
  if (object.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    col * frameW, row * frameH + banda.sy, frameW, banda.sh,
    -drawW / 2, -drawH * (object.anchorY ?? sheet.FEET_ANCHOR_Y) + banda.sy * scale,
    drawW, banda.sh * scale
  );
  // Desenhar o movimento apenas dentro das superfícies do sprite fixo.
  if (hasHubScreenFx(state.world?.currentMapId, object.id)) {
    ctx.save(); ctx.translate(-drawW / 2, -drawH * (object.anchorY ?? sheet.FEET_ANCHOR_Y));
    ctx.scale(drawW / frameW, drawH / frameH);
    drawHubScreenFx(ctx, object.id, performance.now() / 1000);
    ctx.restore();
  }
  ctx.filter = 'none';
  ctx.restore();
  if (object.id === 'hub_painel_decor') {
    // Dados e varredura sobre o mostrador já existente, apenas decoração.
    ctx.save(); ctx.translate(ix, iy); ctx.transform(1, -.22, 0, 1, 0, 0);
    ctx.fillStyle = 'rgba(4,62,69,.9)'; ctx.textAlign = 'center'; ctx.font = 'bold 6px monospace';
    ctx.fillText('ROTAS', 0, -64); ctx.fillRect(-9, -58, 18, 1);
    ctx.fillRect(-9, -53, 13, 1); ctx.fillRect(-9, -49, 16, 1);
    ctx.fillStyle = 'rgba(220,255,249,.55)';
    ctx.fillRect(-9, -58 + (performance.now() * .012) % 18, 18, 1);
    ctx.restore();
  }
}

function drawCroppedObject(object, image, sheet) {
  const col = object.frame?.col ?? 0;
  const row = object.frame?.row ?? 0;
  const fr = getFrame(image, col, row, sheet.SHEET_COLS, sheet.SHEET_ROWS);
  const c = fr?.crop;
  if (!c || !c.w || !c.h) return false;

  // Prioridade: larguraPx > scale
  const scale = object.larguraPx
    ? object.larguraPx / c.w
    : (object.scale ?? sheet.DEFAULT_SCALE ?? 1);

  const w = c.w * scale;
  const h = c.h * scale;
  const px = object.pivotX ?? 0.5;
  const py = object.pivotY ?? 1;

  const ix = (object.x - object.y) * HW + (object.ajusteX ?? 0);
  const iy = (object.x + object.y) * HH + (object.ajusteY ?? 0);

  // skewY: inclina o eixo longo (y' = y + skewY * x) sem esticar a altura.
  // Positivo = a ponta direita desce. Aplicado em espaço de TELA,
  // depois do espelhamento, então vale igual para objetos espelhados.
  const skewY = object.skewY ?? 0;
  const escalaY = object.escalaY ?? 1;

  const banda = fatiaObjeto(object, c.h);
  ctx.save();
  const filtro = filtroObjeto(object);
  if (filtro) ctx.filter = filtro;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(ix, iy);
  if (skewY !== 0 || escalaY !== 1) ctx.transform(1, skewY, 0, escalaY, 0, 0);
  if (object.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(c.canvas, 0, banda.sy, c.w, banda.sh,
    -w * px, -h * py + banda.sy * scale, w, banda.sh * scale);
  ctx.filter = 'none';
  ctx.restore();

  // Debug H: cruz vermelha mostra o ponto de âncora no mundo
  if (isDebugEnabled() && !object.__slice) {
    ctx.save();
    ctx.strokeStyle = '#ff3b3b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ix - 6, iy); ctx.lineTo(ix + 6, iy);
    ctx.moveTo(ix, iy - 6); ctx.lineTo(ix, iy + 6);
    ctx.stroke();
    ctx.restore();
  }
  return true;
}

// Porta de elevador: fechada → luz verde → abrindo → aberta com painel
let avisouPorta = false;

function drawDoor(o) {
  const cfg = CONFIG.ELEVATOR_DOOR_SPRITE ?? { ID: 'elevator_door', SHEET_COLS: 4, SHEET_ROWS: 2, ESCALA: 0.45 };
  const image = getSprite(cfg.ID);
  const ref = image ? getFrame(image, 0, 0, cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop : null;

  // Reserva: folha indisponível → elevador antigo dos props
  if (!ref) {
    if (!avisouPorta) {
      console.warn(`[PORTA] Folha "${cfg.ID}" não carregou. Usando o elevador antigo.`);
      avisouPorta = true;
    }
    // Fallback simples caso a spritesheet de porta falhe.
    // Não chama drawMapObject para evitar depender do state aqui.
    return;
  }

  const t = performance.now() / 1000;
  const modo = o.porta.modo ?? 'auto';
  let rc = [0, 0];

  if (modo === 'trancada') {
    rc = [1, 0];                                              // luz vermelha
  } else if (modo === 'glitch' && (o._abre ?? 0) <= 0.02) {
    // Fechada: pisca roxo de vez em quando. Perto: abre como as outras.
    const fase = Math.floor(t * 8);
    const sorteio = ((fase * 9301 + 49297) % 233280) / 233280;
    rc = sorteio < 0.18 ? [1, 2] : [0, 0];
  } else {
    const a = o._abre ?? 0;
    if (a <= 0.02) rc = (o._luz ?? 0) > 0 ? [1, 1] : [0, 0];  // verde = chegando
    else if (a >= 0.99) rc = [1, 3];                           // aberta com painel
    else rc = [0, Math.min(3, Math.max(1, Math.round(a * 3)))];
  }

  const c = getFrame(image, rc[1], rc[0], cfg.SHEET_COLS, cfg.SHEET_ROWS)?.crop ?? ref;

  // Mesma escala para todos os quadros, cada um preso pela própria base
  const S = o.scale ?? cfg.ESCALA ?? 0.45;
  const w = c.w * S;
  const h = c.h * S;
  const ix = (o.x - o.y) * HW;
  const iy = (o.x + o.y) * HH;

  // Ajuste fino opcional por quadro: AJUSTE_QUADRO: { '1,3': 2 }  (px, + desce)
  const ajusteQuadro = cfg.AJUSTE_QUADRO?.[`${rc[0]},${rc[1]}`] ?? 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.translate(ix, iy + (o.ajusteY ?? 0) + ajusteQuadro);
  if (o.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(c.canvas, -w / 2, -h, w, h);
  ctx.restore();
}
// =====================================================================
//  PLAYER
// =====================================================================
// As folhas novas foram limpas de JPGs com quadriculado embutido. Células
// inteiras mantêm a escala e os efeitos, sem recortar cada pose separadamente.
function drawArchetypeSheet(spriteId, col, row, ix, iy, flip = false, options = {}) {
  const image = getSprite(spriteId);
  if (!image) return false;
  let x0 = Math.round(col * image.width / 4), x1 = Math.round((col + 1) * image.width / 4);
  // A criatura da folha 10X extrapola a célula; incluir sua silhueta inteira.
  if (spriteId === 'player_10x_q' && col === 2) { x0 = Math.round(image.width * 0.468); x1 = Math.round(image.width * 0.78); }
  const rows = options.rows ?? 2;
  const y0 = Math.round(row * image.height / rows), y1 = Math.round((row + 1) * image.height / rows);
  // A altura útil do traje (~378 px) deve acompanhar a do civil (~450 px × 0,31).
  const scale = options.scale ?? 0.37;
  const w = (x1 - x0) * scale, h = (y1 - y0) * scale;
  ctx.save();
  const stride = options.walk ? Math.sin(performance.now() * 0.012) : 0;
  ctx.translate(ix + (options.offsetX ?? 0), iy - Math.abs(stride) * 1.8 + (options.offsetY ?? 0));
  if (flip) ctx.scale(-1, 1);
  if (options.walk) ctx.rotate(stride * 0.025);
  drawSmooth(image, x0, y0, x1 - x0, y1 - y0, -w / 2, -h * (options.anchor ?? 0.98), w, h);
  ctx.restore();
  return true;
}

function getVisualEffect(player) {
  if (player.ability?.scanning > 0 && state.progress.archetype !== 'motor_bio_forja') {
    const scans = {
      lamina_dominio_anciao: ['postura_dominio', '#ffd264'],
      mare_astral: ['senso_corrente', '#53d9f4'],
      nucleo_dez_forma: ['eco_scan', '#6bff92'],
    };
    const scan = scans[state.progress.archetype];
    if (scan) return { id: scan[0], color: scan[1], duration: 1, timeLeft: 1 - (performance.now() % 1200) / 1200 };
  }
  return player.ability?.effect;
}

function drawMareFrame(player, ix, iy, col, kind) {
  const profile = mareSheet(player.facing, kind);
  const sheet = profile && getSprite(profile.id);
  if (!sheet) return false;
  const width = sheet.width / 4, scale = .37;
  ctx.save(); ctx.translate(ix, iy);
  if (profile.flip) ctx.scale(-1, 1);
  drawSmooth(sheet, col * width, 0, width, sheet.height,
    -width * scale / 2, -sheet.height * scale * .98,
    width * scale, sheet.height * scale);
  ctx.restore(); player._topo = 140; return true;
}

// Peso da Quebra Sistemas: poeira no passo, vapor nos pistões e atrito das
// marretas. É visual de runtime — nada muda em dano, velocidade ou colisão.
function drawBrutaFx(player, ix, iy, gait) {
  const now = performance.now();
  ctx.save();
  ctx.lineCap = 'round';
  if (gait === 'walk') {
    const cycle = (now % 600) / 600;
    ctx.globalAlpha = .22 * (1 - cycle);
    ctx.fillStyle = '#c9d3d8';
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(ix + Math.cos(ang) * (8 + cycle * 16), iy + 1 + Math.sin(ang) * (3 + cycle * 5),
        4 + cycle * 5, 2 + cycle * 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Faíscas: a marreta arrasta no chão.
  if (gait === 'walk' || gait === 'idle') {
    ctx.globalAlpha = .75;
    ctx.strokeStyle = '#ffb02e';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const flick = Math.sin(now * .03 + i * 2.1) * 2;
      const bx = ix + (player.facing === 'left' ? 20 : -20) + i * 3;
      ctx.beginPath();
      ctx.moveTo(bx, iy - 2);
      ctx.lineTo(bx + (player.facing === 'left' ? 8 : -8), iy - 3 + flick);
      ctx.stroke();
    }
  }
  // Exaustão: ao parar, os pistões soltam uma rajada de vapor.
  const exhaust = player.nucleoRuntime?.exhaustion;
  if (exhaust?.timeLeft > 0) {
    const k = 1 - exhaust.timeLeft / (exhaust.duration || .9);
    ctx.globalAlpha = .5 * (1 - k);
    ctx.fillStyle = '#e8f2f4';
    for (let i = 0; i < 4; i++) {
      const lado = i % 2 === 0 ? 1 : -1;
      const raio = 3 + k * 9 + (i % 2) * 2;
      ctx.beginPath();
      ctx.arc(ix + lado * (5 + k * 12), iy - 44 - k * 26 - i * 3, raio, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// Vapor e faísca da ferramenta: o Bio-FORJA é biomecânica viva, então ele
// respira vapor mesmo parado, e cada ferramenta puxa uma cor de brilho.
// Puro enfeite de leitura — dano, velocidade e colisão não mudam.
const BIO_TOOL_GLOW = {
  lamina_de_forja: { cor: '#8ff2ff', lado: 'direita' },
  punho_de_impacto: { cor: '#ffc23d', lado: 'ambos' },
  gancho_magnetico: { cor: '#7dffd8', lado: 'esquerda' },
  asa_de_impulso: { cor: '#3fd0ff', lado: 'baixo' },
};

function drawBioForjaFx(player, ix, iy, gait) {
  const now = performance.now();
  // A ferramenta instalada muda a cor da bobina: o exo mostra o que carrega.
  const ferramenta = BIO_TOOL_GLOW[getSelectedToolId(state.progress)] ?? { cor: '#3fd0ff', lado: 'ambos' };
  ctx.save();
  ctx.lineCap = 'round';
  // Vapor dos pistões: sobe devagar, mais forte no passo.
  const sopro = gait === 'walk' ? 1 : .55;
  ctx.globalAlpha = .2 * sopro;
  ctx.fillStyle = '#dff0f2';
  for (let i = 0; i < 3; i++) {
    const ciclo = ((now * .0006) + i / 3) % 1;
    const lado = i % 2 === 0 ? -1 : 1;
    ctx.beginPath();
    ctx.ellipse(ix + lado * (7 + ciclo * 10), iy - 12 - ciclo * 26,
      2 + ciclo * 4, 1.6 + ciclo * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Espira da bobina da ferramenta: brilho curto, ritmado.
  const pulso = .45 + Math.sin(now * .006) * .25;
  ctx.globalAlpha = pulso * .8;
  ctx.strokeStyle = ferramenta.cor;
  ctx.lineWidth = 1.4;
  const lados = ferramenta.lado === 'ambos' ? [-1, 1] : ferramenta.lado === 'esquerda' ? [-1] : [1];
  if (ferramenta.lado === 'baixo') {
    for (let i = 0; i < 2; i++) {
      const bx = ix + (i === 0 ? -6 : 6);
      ctx.beginPath();
      ctx.moveTo(bx, iy - 2);
      ctx.lineTo(bx + (i === 0 ? -3 : 3), iy + 3);
      ctx.stroke();
    }
  } else {
    for (const lado of lados) {
      const bx = ix + lado * 13;
      ctx.beginPath();
      ctx.moveTo(bx, iy - 30);
      ctx.lineTo(bx + lado * 3, iy - 22);
      ctx.lineTo(bx - lado * 1, iy - 16);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// A ÁGUA DO MARÉ anda com o corpo: gotas que sobem e caem em volta das botas,
// um respingo no passo e um fio de vapor frio na exaustão do Q. É o mesmo
// carinho do vapor do Bio — leitura, não regra: nada muda em dano/colisão.
const MARE_TOOL_GLOW = {
  escudo_liquido: { cor: '#54ccff' },
  passo_abissal: { cor: '#73e9fa' },
  chicote_de_mare: { cor: '#a6f0ff' },
  senso_de_corrente: { cor: '#8cff9e' },
};

function drawMareFx(player, ix, iy, gait) {
  const now = performance.now();
  const corrente = MARE_TOOL_GLOW[getSelectedToolId(state.progress)] ?? { cor: '#53d9f4' };
  ctx.save();
  // Bolhas/drops orbitando os tornozelos, mais intensos no passo.
  const forca = gait === 'walk' ? 1 : .5;
  for (let i = 0; i < 4; i++) {
    const ciclo = ((now * .00045) + i / 4) % 1;
    const ang = (i / 4) * Math.PI * 2 + now * .0006;
    const raio = 9 + ciclo * 7;
    const px = ix + Math.cos(ang) * raio;
    const py = iy - 4 - ciclo * 22;
    ctx.globalAlpha = (1 - ciclo) * .55 * forca;
    ctx.fillStyle = corrente.cor;
    ctx.beginPath();
    ctx.ellipse(px, py, 1.6 + (1 - ciclo), 2.4 + (1 - ciclo) * 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Anel de correnteza raso no chão: lembra que o traje mexe com água.
  const pulso = .5 + Math.sin(now * .004) * .2;
  ctx.globalAlpha = pulso * .3 * forca;
  ctx.strokeStyle = corrente.cor;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(ix, iy + 1, 15, 6.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// A FREQUÊNCIA DO DOMÍNIO anda com o corpo: faíscas douradas que sobem das
// botas, um anel geométrico raso no chão e duas runas pequenas orbitando os
// ombros. É a leitura do arquétipo (peso, geometria, ouro antigo), no mesmo
// papel do vapor do Bio e da água do Maré: desenho, não regra.
const DOMINIO_TOOL_GLOW = {
  espada_de_dominio: { cor: '#ffd465' },
  escudo_de_dominio: { cor: '#b78cff' },
  postura_de_dominio: { cor: '#ff7d8f' },
  investida_de_dominio: { cor: '#ff9a5c' },
};

function drawDominioFx(player, ix, iy, gait) {
  const now = performance.now();
  const arma = DOMINIO_TOOL_GLOW[getSelectedToolId(state.progress)] ?? { cor: '#ffd465' };
  const forca = gait === 'walk' ? 1 : .55;
  ctx.save();
  // Faíscas douradas subindo das botas, com estalo no passo.
  for (let i = 0; i < 3; i++) {
    const ciclo = ((now * .0007) + i / 3) % 1;
    const lado = i === 1 ? 1 : -1;
    const px = ix + lado * (6 + ciclo * 5);
    const py = iy - 2 - ciclo * 26;
    ctx.globalAlpha = (1 - ciclo) * .7 * forca;
    ctx.fillStyle = arma.cor;
    ctx.fillRect(Math.round(px), Math.round(py), 1.6, 1.6 + (1 - ciclo) * 1.4);
  }
  // Anel geométrico raso: o traje carrega uma frequência antiga.
  const pulso = .5 + Math.sin(now * .0032) * .22;
  ctx.globalAlpha = pulso * .28 * forca;
  ctx.strokeStyle = arma.cor;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(ix, iy + 1, 13, 5.6, 0, 0, Math.PI * 2);
  ctx.stroke();
  // Duas runas pequenas orbitando a altura do ombro, sempre de perfil.
  for (let i = 0; i < 2; i++) {
    const ang = now * .0009 + i * Math.PI;
    const px = ix + Math.cos(ang) * 12;
    const py = iy - 30 + Math.sin(ang) * 4;
    ctx.globalAlpha = (.32 + Math.sin(ang) * .18) * forca;
    ctx.fillStyle = arma.cor;
    ctx.fillRect(Math.round(px) - 1, Math.round(py) - 3, 2.4, 5);
    ctx.fillRect(Math.round(px) - 2, Math.round(py) - 4, 4.6, 1.4);
  }
  ctx.restore();
}

function drawPlayerSprite(player, ix, iy) {
  // As folhas de referência têm poses, não quadros sequenciais. Usamos uma
  // pose provisória com os pulsos animados, sem fingir que são animações finais.
  const effect = getVisualEffect(player);
  // ULTIMATE DAS FORMAS DO NÚCLEO: execução desenhada, não só o efeito.
  // Carga (0,42 s) usa os dois primeiros quadros da folha da forma; a soltura
  // usa o impacto e a recuperação. Sem isso o F era só um anel procedural.
  // MOTOR BIO-FORJA: a Ultimate nível 1 é a ferramenta escolhida executando
  // o próprio golpe — cada uma tem folha (cúpula, serra, marreta, cabos,
  // propulsores). Fica antes do corpo parado do exo para o gesto aparecer.
  // Os QUATRO arquétipos têm execução desenhada do F: Núcleo 10X (por
  // forma), Bio-Forja (por ferramenta), Maré (por corrente) e Domínio (por
  // arma/postura). A ordem importa porque só um deles pode desenhar o corpo.
  const ultimateFrame = getUltimateFrame(state.progress, player)
    ?? getBioUltimateFrame(state.progress, player)
    ?? getMareUltimateFrame(state.progress, player)
    ?? getDominioUltimateFrame(state.progress, player);
  if (ultimateFrame) {
    const imagem = getSprite(ultimateFrame.sprite);
    if (imagem) {
      const w = imagem.width / ultimateFrame.cols, h = imagem.height;
      const escala = ultimateFrame.scale;
      // Um flash curto da cor da Ultimate no quadro do impacto dá o "estalo".
      if (ultimateFrame.phase === 'impact' && (player.ultimate?.flash?.timeLeft ?? 0) > 0) {
        ctx.save();
        ctx.globalAlpha = .28;
        ctx.fillStyle = ultimateFrame.flash ?? '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ix, iy - h * escala * .45, w * escala * .55, h * escala * .55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(ix, iy);
      if (player.facing === 'left') ctx.scale(-1, 1);
      drawSmooth(imagem, ultimateFrame.col * w, 0, w, h,
        -w * escala / 2, -ultimateFrame.footY * escala, w * escala, h * escala);
      ctx.restore();
      player._topo = Math.round(ultimateFrame.footY * escala);
      return true;
    }
  }
  const suit = player.equippedSuit;
  // O exo do Bio-FORJA respira: vapor de pistão e a bobina da ferramenta.
  if (suit === 'bio_forja') drawBioForjaFx(player, ix, iy, player.moving ? 'walk' : 'idle');
  // O Maré carrega água: gotas orbitando as botas e anel de correnteza.
  if (suit === 'mare') drawMareFx(player, ix, iy, player.moving ? 'walk' : 'idle');
  // O Domínio carrega frequência: faíscas de ouro, anel no chão e runas.
  if (suit === 'dominio') drawDominioFx(player, ix, iy, player.moving ? 'walk' : 'idle');
  // A segunda forma do Núcleo (Quebra Sistemas) desenha o próprio peso:
  // poeira no passo, faísca das marretas e vapor na exaustão.
  if (player.nucleoForm === NUCLEO_BRUTA) {
    drawBrutaFx(player, ix, iy, player.moving ? 'walk' : 'idle');
  }
  // Pancada de Peso (Q da Quebra): fagulhas elétricas nos pistões durante a
  // preparação. O efeito é separado da transformação — antes o id era o mesmo
  // e o jogo refazia a metamorfose em vez de socar.
  const cast = player.ability?.cast;
  if (cast?.id === 'pancada_quebra' && cast.timeLeft > 0) {
    const k = 1 - cast.timeLeft / (cast.duration || .55);
    ctx.save();
    ctx.globalAlpha = .35 + k * .6;
    ctx.strokeStyle = '#ffd45c';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i++) {
      const lado = i === 1 ? 1 : -1;
      const base = i * 2.1;
      ctx.beginPath();
      for (let seg = 0; seg < 3; seg++) {
        const px = ix + lado * (10 + seg * 4) + Math.sin(base + seg) * 2;
        const py = iy - 18 - seg * 9 - k * 6;
        if (seg === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Brilho no bloco de cabeça: a energia concentra antes do impacto.
    ctx.globalAlpha = .2 + k * .35;
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.ellipse(ix, iy - 46, 8 + k * 6, 10 + k * 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // ATAQUE DO EXO — quatro direções. Antes só existia a folha frontal: de
  // costas e de lado o soco acontecia sem arte. A lateral é espelhada para a
  // esquerda; a de costas é vista de trás, nunca espelhada.
  const attackFrame = getBioAttackFrame(state.progress, player);
  if (attackFrame && !effect) {
    const sheet = getSprite(attackFrame.sprite);
    if (sheet) {
      const escala = attackFrame.scale;
      const w = attackFrame.cell * escala, h = attackFrame.height * escala;
      ctx.save();
      ctx.translate(ix, iy);
      if (attackFrame.flip) ctx.scale(-1, 1);
      drawSmooth(sheet, attackFrame.col * attackFrame.cell, 0, attackFrame.cell, attackFrame.height,
        -w / 2, -attackFrame.footY * escala, w, h);
      ctx.restore();
      player._topo = Math.round(attackFrame.footY * escala);
      return true;
    }
  }
  const mareAttack = getMareAttack(state.progress, player);
  if (mareAttack && drawMareFrame(player, ix, iy, mareAttack.col, 'ataque')) return true;
  const dominioAttack = getDominioAttack(state.progress, player);
  if (dominioAttack && ['up', 'down'].includes(player.facing)) {
    const sheet = getSprite(player.facing === 'up' ? 'dominio_ataque_costas_0317' : 'dominio_ataque_frente_0317');
    if (sheet) {
      const w = sheet.width / 4, scale = .245;
      drawSmooth(sheet, dominioAttack.col * w, 0, w, sheet.height,
        ix - w * scale / 2, iy + 3 - 680 * scale, w * scale, sheet.height * scale);
      player._topo = 140; return true;
    }
  }
  if (dominioAttack && ['left', 'right'].includes(player.facing)) {
    const sheet = getSprite('dominio_ataque_lateral_0316');
    if (sheet) {
      // Mesma escala em todas as poses: a espada pode ir acima da cabeça
      // sem encolher o operador. Pivot comum medido no preparo da folha.
      const w = sheet.width / 4, scale = .21, footY = 737;
      ctx.save(); ctx.translate(ix, iy + 3);
      if (dominioAttack.flip) ctx.scale(-1, 1);
      drawSmooth(sheet, dominioAttack.col * w, 0, w, sheet.height,
        -w * scale / 2, -footY * scale, w * scale, sheet.height * scale);
      ctx.restore(); player._topo = 140; return true;
    }
  }
  const attackPose = getBasicAttackPose(state.progress, player);
  if (attackPose && drawArchetypeSheet(attackPose.sprite, attackPose.col, attackPose.row, ix, iy, attackPose.flip, { scale: attackPose.scale, anchor: attackPose.anchor })) {
    player._topo = 100;
    return true;
  }
  // TRANSFORMAÇÃO DO T — a sequência de 4 quadros que faltava. Antes o traje
  // trocava de folha no mesmo quadro, sem leitura nenhuma. Entrar corre a
  // folha 0→3; sair corre a mesma arte ao contrário (desmonta).
  const transformFrame = getTransformFrame(state.progress, player);
  if (transformFrame) {
    const sheet = getSprite(transformFrame.sprite);
    if (sheet) {
      const cell = 320, escala = .57;
      const w = cell * escala, h = cell * escala;
      // Clarão da cor do arquétipo no quadro de energia (1 e 2).
      if (transformFrame.phase === 'build') {
        ctx.save();
        ctx.globalAlpha = .22;
        ctx.fillStyle = transformFrame.color;
        ctx.beginPath();
        ctx.ellipse(ix, iy - h * .45, w * .42, h * .42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(ix, iy);
      if (player.facing === 'left') ctx.scale(-1, 1);
      drawSmooth(sheet, transformFrame.col * cell, 0, cell, cell,
        -w / 2, -276 * escala, w, h);
      ctx.restore();
      player._topo = Math.round(276 * escala);
      return true;
    }
  }
  // NÚCLEO: a identidade do arquétipo é o BRACELETE. Enquanto o corpo humano
  // está sendo digitalizado (primeiros 70% da transformação), quem desenha é
  // o operador acionando o bracelete; depois entra a criatura/placas.
  const braceletFrame = getNucleoBraceletFrame(state.progress, player);
  if (braceletFrame) {
    const sheet = getSprite(braceletFrame.sprite);
    if (sheet) {
      const cell = 320, escala = .57;
      const w = cell * escala, h = cell * escala;
      ctx.save();
      ctx.translate(ix, iy);
      if (player.facing === 'left') ctx.scale(-1, 1);
      drawSmooth(sheet, braceletFrame.col * cell, 0, cell, cell, -w / 2, -276 * escala, w, h);
      ctx.restore();
      player._topo = Math.round(276 * escala);
      return true;
    }
  }
  // Transformação do Núcleo: uma decisão só, escolhida por `effect.form`.
  // Aqui estava o defeito visual relatado: QUALQUER transformação desenhava a
  // folha do Pulso Veloz (o operador virando criatura), inclusive a da Quebra
  // Sistemas — que tem folha própria de placas de ferro se montando.
  if (state.progress.archetype === 'nucleo_dez_forma' && effect?.id === 'transformacao_10x') {
    const t = Math.max(0, Math.min(0.999, 1 - effect.timeLeft / effect.duration));
    const quadro = Math.floor(t * 4);
    if (effect.form === NUCLEO_BRUTA) {
      // Entrando, a montagem corre 0 → 3; retornando, o corpo se desfaz na
      // mesma arte ao contrário (sem inventar quadro que não existe).
      const col = effect.activating === false ? 3 - quadro : quadro;
      if (drawArchetypeSheet('player_10x_bruta_transformacao', col, 0, ix, iy, false, { rows: 1, scale: BRUTA_SCALE, anchor: BRUTA_FOOT_Y / 256 })) { player._topo = 150; return true; }
    } else {
      const frames = effect.activating ? [0, 1, 1, 2] : [2, 1, 3, 3];
      if (drawArchetypeSheet('player_10x_q', frames[quadro], 0, ix, iy, player.facing === 'left', { rows: 1, scale: 0.29, anchor: 0.78 })) { player._topo = 120; return true; }
    }
  }
  const pulseFrame = getVelozPulse(state.progress, player);
  if (pulseFrame) {
    const image = getSprite(pulseFrame.sprite);
    if (image) {
      const w = image.width / 6, h = image.height / 4, scale = .5;
      ctx.save(); ctx.translate(ix, iy);
      // As linhas acompanham a direção da ação, sem alterar deslocamento ou dano.
      const direction = {right:[1,0],left:[-1,0],down:[0,1],up:[0,-1]}[player.facing];
      ctx.strokeStyle = '#69ff9b'; ctx.globalAlpha = .7; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i=0; i<3; i++) {
        const x = -direction[0]*(16+i*7) + direction[1]*(i-1)*8;
        const y = -25-direction[1]*(8+i*4) - direction[0]*(i-1)*6;
        ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-direction[0]*14,y-direction[1]*7); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (pulseFrame.flip) ctx.scale(-1, 1);
      drawSmooth(image, pulseFrame.col * w, pulseFrame.row * h, w, h,
        -w * scale / 2, -pulseFrame.footY * scale, w * scale, h * scale);
      ctx.restore(); player._topo = 110; return true;
    }
  }
  const velozFrame = getVelozAnimation(state.progress, player, performance.now());
  if (velozFrame) {
    const image = getSprite(velozFrame.sprite);
    if (image) {
      // As folhas verticais têm 4 quadros em uma linha; as laterais, 6 × 4.
      const cols = velozFrame.cols ?? 6, rows = velozFrame.rows ?? 4;
      const w = image.width / cols, h = image.height / rows, scale = .5;
      ctx.save(); ctx.translate(ix, iy);
      if (velozFrame.flip) ctx.scale(-1, 1);
      drawSmooth(image, velozFrame.col * w, velozFrame.row * h, w, h,
        -w * scale / 2, -velozFrame.footY * scale, w * scale, h * scale);
      ctx.restore(); player._topo = 110; return true;
    }
  }
  // Segunda forma do Núcleo: Quebra Sistemas. Folhas próprias de 4 colunas,
  // apoio e escala comuns; o ataque tem prioridade sobre a caminhada.
  const bruta = getBrutaAnimation(state.progress, player, performance.now());
  if (bruta) {
    // Onda de choque do impacto da marreta: anel rasteiro no chão, sem
    // esconder o corpo. Ataque de costas também tem (o golpe existe mesmo
    // sem folha traseira própria).
    if (bruta.attack) {
      const choque = Math.max(0, 1 - (player.combat?.timeLeft ?? 0) / (player.combat?.duration || .48));
      if (choque > .45) {
        const k = (choque - .45) / .55;
        ctx.save();
        ctx.globalAlpha = (1 - k) * .7;
        ctx.strokeStyle = '#ffc94a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(ix, iy + 2, 14 + k * 40, 7 + k * 20, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    const image = getSprite(bruta.sprite);
    if (image) {
      const w = image.width / bruta.cols, h = image.height / bruta.rows, scale = bruta.scale;
      ctx.save(); ctx.translate(ix, iy);
      if (bruta.flip) ctx.scale(-1, 1);
      drawSmooth(image, bruta.col * w, bruta.row * h, w, h,
        -w * scale / 2, -bruta.footY * scale, w * scale, h * scale);
      ctx.restore();
      player._topo = 125;
      return true;
    }
  }
  if (state.progress.archetype === 'nucleo_dez_forma' && player.nucleoForm === 'forma_veloz') {
    if (drawArchetypeSheet('player_10x_q', 2, 0, ix, iy, player.facing === 'left', { rows: 1, scale: 0.29, anchor: 0.75, offsetX: player.facing === 'left' ? 14 : -14, walk: player.moving })) { player._topo = 120; return true; }
  }
  if (effect && state.progress.archetype === 'nucleo_dez_forma' && ['forma_veloz', 'eco_scan'].includes(effect.id)) {
    const elapsed = Math.max(0, Math.min(0.999, 1 - effect.timeLeft / effect.duration));
    const phase = Math.floor(elapsed * 4);
    // O cone do frame 2 tem quadriculado colorido embutido e invade a célula seguinte.
    const col = effect.id === 'eco_scan' ? [0, 1, 1, 3][phase] : phase;
    const id = effect.id === 'forma_veloz' ? 'player_10x_q' : 'player_10x_r';
    if (drawArchetypeSheet(id, col, 0, ix, iy, player.facing === 'left', { rows: 1, scale: 0.29, anchor: 0.78 })) {
      player._topo = 120;
      return true;
    }
  }
  // PASSO DE CORRENTE de costas: a folha lateral aprovada virava o corpo de
  // perfil no meio do avanço. Só a direção de cima tem esta troca — as outras
  // continuam com a folha lateral, que já está certa.
  const propulsorMare = getMarePropulsorFrame(state.progress, player);
  if (propulsorMare) {
    const sheet = getSprite(propulsorMare.sprite);
    if (sheet) {
      const w = propulsorMare.cell * propulsorMare.scale, h = propulsorMare.cell * propulsorMare.scale;
      drawSmooth(sheet, propulsorMare.col * propulsorMare.cell, 0, propulsorMare.cell, propulsorMare.cell,
        ix - w / 2, iy - propulsorMare.footY * propulsorMare.scale, w, h);
      player._topo = Math.round(propulsorMare.footY * propulsorMare.scale);
      return true;
    }
  }
  const equippedAction = (suit === 'dominio' && ['golpe_ruptura', 'postura_dominio'].includes(effect?.id)) ||
    (suit === 'mare' && ['passo_corrente', 'senso_corrente'].includes(effect?.id));
  if (equippedAction) {
    const elapsed = Math.max(0, Math.min(0.999, 1 - effect.timeLeft / effect.duration));
    let col = Math.floor(elapsed * 4), row = 0;
    let flip = player.facing === 'left';
    // A folha de R do Domínio contém poses direcionais, não frames temporais.
    if (effect.id === 'postura_dominio') {
      row = 1;
      col = player.facing === 'up' ? 1 : player.facing === 'down' ? 0 : 2;
      flip = player.facing === 'right';
    }
    const sheet = `player_${suit}_${effect.id === 'golpe_ruptura' || effect.id === 'passo_corrente' ? 'q' : 'r'}`;
    if (drawArchetypeSheet(sheet, col, row, ix, iy, flip)) {
      player._topo = 100;
      return true;
    }
  }
  const actionSprite = ACTION_SPRITES[effect?.id];
  if (actionSprite) {
    const image = getSprite(actionSprite.sprite);
    const col = actionSprite.column ?? (player.facing === 'down' ? 0 : player.facing === 'up' ? 2 : 1);
    const frame = getFrame(image, col, actionSprite.row, 4, actionSprite.rows)?.crop;
    if (frame) {
      const height = actionSprite.height;
      const width = height * frame.w / frame.h;
      ctx.save();
      ctx.translate(ix, iy);
      if (player.facing === 'left') ctx.scale(-1, 1);
      drawSmooth(frame.canvas, 0, 0, frame.w, frame.h, -width / 2, -height, width, height);
      ctx.restore();
      player._topo = height;
      return true;
    }
  }
  // ===============================================
  // 1. ANIMAÇÃO DE ESCANEAMENTO (R)
  // ===============================================
  if (player.ability?.scanning > 0 && state.progress.archetype === 'motor_bio_forja') {
    const sprite = CONFIG.PLAYER_BIO_FORJA_SCAN_SPRITE;
    const image = getSprite(sprite.ID);
    if (!image) return false;

    const col = sprite.DIRECTION_COLUMNS?.[player.facing] ?? 0;
    const fr = getFrame(image, col, 0, sprite.SHEET_COLS, sprite.SHEET_ROWS, { removeShadow: false });
    if (!fr) return false;

    const drawW = fr.cell.width * sprite.SCALE;
    const drawH = fr.cell.height * sprite.SCALE;
    const drawX = ix - drawW / 2;
    const drawY = iy - drawH * sprite.FEET_ANCHOR_Y;

    drawSmooth(fr.cell, 0, 0, fr.cell.width, fr.cell.height, drawX, drawY, drawW, drawH);
    player._topo = iy - (drawY + fr.crop.y * sprite.SCALE);
    return true;
  }

  // ===============================================
  // 2. ANIMAÇÃO DE DASH (Q)
  // ===============================================
  // PROPULSOR DE IMPULSO (Q): folha própria de avanço. Antes o exo deslizava
  // na célula de caminhada, com alpha .8, e o rastro era a única leitura.
  const propulsor = getBioPropulsorFrame(state.progress, player);
  if (propulsor) {
    const sheet = getSprite(propulsor.sprite);
    if (sheet) {
      const escala = propulsor.scale;
      const w = propulsor.cell * escala, h = propulsor.height * escala;
      ctx.save();
      ctx.translate(ix, iy);
      if (player.facing === 'left') ctx.scale(-1, 1);
      // Quadros de arranque ainda no chão; o pico do avanço sai do chão.
      const lift = propulsor.col === 2 ? 4 : propulsor.col === 1 ? 1 : 0;
      drawSmooth(sheet, propulsor.col * propulsor.cell, 0, propulsor.cell, propulsor.height,
        -w / 2, -propulsor.footY * escala - lift, w, h);
      ctx.restore();
      player._topo = Math.round(propulsor.footY * escala + lift);
      return true;
    }
  }
  if (player.ability?.active === 'bio_dash') {
    const config = CONFIG.PLAYER_BIO_FORJA_SPRITE;
    const image = getSprite(config.ID);
    if (!image) return false;

    const col = player.facing === 'up' ? 2 : 1; 
    const fr = getFrame(image, col, 1, config.SHEET_COLS, config.SHEET_ROWS);
    if (!fr) return false;

    const insetX = config.SOURCE_INSET_X ?? 0;
    const insetY = config.SOURCE_INSET_Y ?? 0;
    const sourceW = fr.cell.width - insetX * 2;
    const sourceH = fr.cell.height - insetY * 2;
    const drawW = sourceW * config.SCALE;
    const drawH = sourceH * config.SCALE;
    const drawX = ix - drawW / 2;
    const drawY = iy - drawH * config.FEET_ANCHOR_Y;
    const flip = player.facing === 'left';

    ctx.save();
    ctx.translate(drawX + drawW / 2, drawY + drawH);
    if (flip) ctx.scale(-1, 1);
    ctx.globalAlpha = 0.8;
    drawSmooth(fr.cell, insetX, insetY, sourceW, sourceH, -drawW / 2, -drawH, drawW, drawH);
    ctx.restore();

    player._topo = drawH;
    return true;
  }

    // ===============================================
  // 3. ANDAR / PARADO
  // ===============================================
  const mareWalk = getMareWalk(state.progress, player, performance.now());
  if (mareWalk && drawMareFrame(player, ix, iy, mareWalk.col, 'andar')) return true;
  const dominioWalk = getDominioWalk(state.progress, player, performance.now());
  if (dominioWalk && player.facing !== 'down') {
    const sheet = getSprite(player.facing === 'up' ? 'dominio_andar_costas_0317' : 'dominio_andar_lateral_0317');
    if (sheet) {
      const w = sheet.width / 4, scale = .245;
      ctx.save(); ctx.translate(ix, iy + 3);
      if (player.facing === 'left') ctx.scale(-1, 1);
      drawSmooth(sheet, dominioWalk.col * w, 0, w, sheet.height,
        -w * scale / 2, -680 * scale, w * scale, sheet.height * scale);
      ctx.restore(); player._topo = 140; return true;
    }
  }
  if (dominioWalk && player.facing === 'down') {
    const sheet = getSprite('dominio_andar_frente_0316');
    const frame = sheet && getFrame(sheet, dominioWalk.col, 0, 4, 1);
    if (frame) {
      const scale = 139.86 / frame.crop.h, base = iy + .36;
      drawSmooth(frame.cell, 0, 0, frame.cell.width, frame.cell.height,
        ix - 3 - frame.cell.width * scale / 2, base - (frame.crop.y + frame.crop.h) * scale,
        frame.cell.width * scale, frame.cell.height * scale);
      player._topo = iy - (base - frame.crop.h * scale);
      return true;
    }
  }
  if (suit === 'dominio' || suit === 'mare') {
    const col = player.facing === 'up' ? 2 : player.facing === 'down' ? 0 : 1;
    if (drawArchetypeSheet(`player_${suit}_lvl1`, col, 0, ix, iy, player.facing === 'left', { walk: player.moving, offsetY: suit === 'mare' ? 3 : 0 })) {
      player._topo = 100;
      return true;
    }
  }
  const walk = getBioWalkFrame(state.progress, player, performance.now());
  if (walk) {
    const profile = bioWalkSheet(player.facing);
    const sheet = getSprite(profile.id);
    const frame = sheet && getFrame(sheet, walk.col, 0, 4, 1);
    if (frame) {
      // Altura por direção medida na folha parada, sem deformação não uniforme.
      // O eixo da célula e o mesmo nível de apoio são mantidos por quadro.
      const scale = profile.height / frame.crop.h;
      const base = iy + profile.footOffset;
      ctx.save(); ctx.translate(ix, 0);
      if (profile.flip) ctx.scale(-1, 1);
      drawSmooth(frame.cell, 0, 0, frame.cell.width, frame.cell.height,
        -frame.cell.width * scale / 2, base - (frame.crop.y + frame.crop.h) * scale,
        frame.cell.width * scale, frame.cell.height * scale);
      ctx.restore();
      player._topo = iy - (base - frame.crop.h * scale);
      return true;
    }
  }
  const useBioForja = player.equippedSuit === 'bio_forja';
  const sprite = useBioForja ? CONFIG.PLAYER_BIO_FORJA_SPRITE : CONFIG.PLAYER_SPRITE;
  const image = getSprite(sprite.ID);
  if (!image) return false;

  const row = player.moving ? sprite.WALK_ROW :  sprite.IDLE_ROW;
  const column = sprite.DIRECTION_COLUMNS[player.facing] ?? 0;
  
  const fr = getFrame(image, column, row, sprite.SHEET_COLS, sprite.SHEET_ROWS, {
    removeShadow: !!sprite.REMOVE_SHADOW,
  });
  if (!fr) return false;

  const insetX = sprite.SOURCE_INSET_X ?? 0;
  const insetY = sprite.SOURCE_INSET_Y ?? 0;
  const sourceW = fr.cell.width - insetX * 2;
  const sourceH = fr.cell.height - insetY * 2;
  const drawW = sourceW * sprite.SCALE;
  const drawH = sourceH * sprite.SCALE;

  const pose = player.moving ? 'walk' : 'idle';
  const offset = sprite.POSE_OFFSETS?.[pose]?.[player.facing] ?? { x: 0, y: 0 };

  const drawX = ix - drawW / 2 + offset.x;
  const drawY = iy - drawH * sprite.FEET_ANCHOR_Y + offset.y;

  ctx.save();
  if (player.equippedSuit === 'dominio' || player.equippedSuit === 'mare') {
    ctx.shadowColor = player.equippedSuit === 'dominio' ? '#ffd264' : '#53d9f4';
    ctx.shadowBlur = 15;
  }
  // Fallback seguro caso a folha direcional ainda não esteja carregada.
  drawSmooth(fr.cell, insetX, insetY, sourceW, sourceH, drawX, drawY, drawW, drawH);
  ctx.restore();
  player._topo = iy - (drawY + Math.max(0, fr.crop.y - insetY) * sprite.SCALE);
  return true;
}
// =====================================================================
//  NEXO-04
//  Linha 0 = 4 direções | Linha 1 = 4 POSES (não são direções!)
//  Tudo desenhado preso pelos PÉS → nada flutua ao trocar de pose
// =====================================================================
const NEXO_DIRS = { down: [0, 0], right: [0, 1], up: [0, 2], left: [0, 3] };
const NEXO_POSES = { wave: [1, 0], tablet: [1, 1], phone: [1, 2], point: [1, 3] };

// Mede onde ficam os pés no quadro (uma vez só por quadro)
function pePos(fr) {
  if (fr._pe) return fr._pe;
  const c = fr.crop;
  const d = c.canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.w, c.h).data;
  const faixa = Math.max(3, Math.round(c.h * 0.06));
  let min = c.w, max = -1;

  for (let y = c.h - faixa; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      if (d[(y * c.w + x) * 4 + 3] > 40) {
        if (x < min) min = x;
        if (x > max) max = x;
      }
    }
  }

  fr._pe = { x: c.x + (max >= 0 ? (min + max) / 2 : c.w / 2), y: c.y + c.h };
  return fr._pe;
}

// =====================================================================
//  PERSONAGENS PRESOS PELOS PÉS
// =====================================================================


function drawFramePe(e, image, cfg, rc, ix, iy, S, flip, ajuste) {
  const fr = getFrame(image, rc[1], rc[0], cfg.SHEET_COLS, cfg.SHEET_ROWS);
  if (!fr) return false;
  const pe = pePos(fr);

  // "Amassadinha" rápida quando troca de quadro
  const t = performance.now() / 1000;
  const chave = `${rc[0]},${rc[1]},${flip}`;
  if (e._chave !== chave) { e._chave = chave; e._trocaT = t; }
  const k = Math.min(1, (t - (e._trocaT ?? -9)) / 0.14);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.translate(ix + (ajuste?.x ?? 0), iy + (ajuste?.y ?? 0));
  if (flip) ctx.scale(-1, 1);
  ctx.scale(1 + 0.04 * (1 - k), 1 - 0.06 * (1 - k));
  ctx.drawImage(fr.cell, -pe.x * S, -pe.y * S, fr.cell.width * S, fr.cell.height * S);
  ctx.restore();

  e._topo = (pe.y - fr.crop.y) * S;
  return true;
}

// =====================================================================
//  NEXO-04
// =====================================================================
// =====================================================================
//  NEXO-04
//  Usa NEXO_DIRS / NEXO_POSES (definidos acima). Não depende do config.
// =====================================================================
function drawNexoSprite(npc, ix, iy) {
  if (npc.sprite !== 'nexo_04' || !CONFIG.NEXO_04_SPRITE) return false;

  // A nova folha só oferece passos laterais utilizáveis; frente e costas
  // permanecem na folha original, sem forçar poses em direção incorreta.
  const lateral = getSprite('hub_nexo_lateral');
  if (npc.moving && lateral && ['left', 'right'].includes(npc.facing)) {
    const col = [2, 3, 4, 3][Math.floor(performance.now() / 190) % 4];
    const w = Math.floor(lateral.width / 6), h = Math.floor(lateral.height / 3);
    const box = getVisibleBox(lateral, col * w, h, w, h), scale = .32;
    ctx.save(); ctx.translate(ix, iy + 7);
    if (npc.facing === 'left') ctx.scale(-1, 1);
    ctx.drawImage(lateral, col * w, h, w, h, -(box.x + box.w / 2) * scale,
      -(box.y + box.h) * scale, w * scale, h * scale);
    ctx.restore(); npc._topo = 130; return true;
  }
  const cfg = CONFIG.NEXO_04_SPRITE;
  const image = getSprite(cfg.ID);
  if (!image) return false;

  // Andando: sempre a direção. Parado: a pose (se existir) ou a direção.
  const pose = !npc.moving ? NEXO_POSES[npc.pose] : null;
  const rc = pose ?? NEXO_DIRS[npc.facing] ?? NEXO_DIRS.down;
  const flip = !!pose && !!npc.poseFlip;

  // Andar: pulinho + gingado
  const t = performance.now() / 1000;
  const bob = npc.moving ? Math.abs(Math.sin(t * 9)) * 2.5 : 0;

  const folha = { SHEET_COLS: cfg.SHEET_COLS ?? 4, SHEET_ROWS: cfg.SHEET_ROWS ?? 2 };
  const ajuste = { x: 0, y: cfg.PE_AJUSTE_Y ?? 0 };

  return drawFramePe(npc, image, folha, rc, ix, iy - bob, cfg.SCALE ?? 0.35, flip, ajuste);
}

// =====================================================================
//  ROBÔ DE LIMPEZA
// =====================================================================
function drawRobo(e, ix, iy) {
  const cfg = CONFIG.ROBO_SPRITE;
  if (!cfg) return false;

  const image = getSprite(cfg.ID);
  if (!image) return false;

  const rc = (!e.moving && cfg.ESTADOS?.[e.estado]) || cfg.DIRECOES?.[e.dir] || [0, 0];
  const bob = e.moving ? Math.abs(Math.sin((performance.now() / 1000) * 14)) : 0;

  return drawFramePe(e, image, cfg, rc, ix, iy - bob, cfg.SCALE ?? 0.16, false);
}
// =====================================================================
//  ENTIDADES
// =====================================================================
// Uma pose provisória, espelhada de perfil: não é uma folha de caminhada.
function drawBolt(pet) {
  const image = getSprite('pet_bolt');
  if (!image) return;
  const x = (pet.x - pet.y) * HW, y = (pet.x + pet.y) * HH;
  drawShadow(x, y, .23);
  ctx.save(); ctx.translate(x, y - (pet.moving ? Math.abs(Math.sin(performance.now() / 120)) * 1.5 : 0));
  if (pet.facing === 'left') ctx.scale(-1, 1);
  ctx.drawImage(image, -30, -61, 60, 61); ctx.restore();
}

// Visual provisório: eco luminoso leve, sem dano nem colisão para o jogador.
function drawLumeo(pet) {
  const x = (pet.x - pet.y) * HW, y = (pet.x + pet.y) * HH;
  const bob = Math.sin(performance.now() / 360) * 2;
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x,y,9,4,0,0,Math.PI*2); ctx.fill();
  ctx.translate(x,y-15+bob); ctx.fillStyle = '#6bf6df'; ctx.strokeStyle = '#124c5a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0,0,9,0,Math.PI*2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#12384a'; ctx.fillRect(-5,-2,2,3); ctx.fillRect(3,-2,2,3);
  ctx.fillStyle = '#c8fff2'; ctx.beginPath(); ctx.arc(-3,-5,2,0,Math.PI*2); ctx.fill(); ctx.restore();
}

function drawShadow(ix, iy, alpha) {
  ctx.beginPath();
  ctx.ellipse(ix, iy, 13, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fill();
}
// =====================================================================
// COLETÁVEL — FRAGMENTO DE SINCRONIZAÇÃO
// =====================================================================

function drawCollectible(item, state) {
  // Saves antigos com Lúmeo mantêm seu vínculo e não repetem a missão.
  if (item.id.startsWith('lumeo_') && state.progress.flags?.companheiro_lumeo) return;
  // Não desenha se já foi coletado.
  if (state.progress.flags?.[`collected_${item.id}`]) {
    return;
  }

  // Não desenha enquanto requisito ainda não foi concluído.
  if (
    item.requiresFlag &&
    !state.progress.flags?.[item.requiresFlag]
  ) {
    return;
  }

  const ix = (item.x - item.y) * HW;
  const iy = (item.x + item.y) * HH;

  const time = performance.now() / 1000;
  const bob = Math.sin(time * 3 + item.x) * 4;

  // Brilho no chão.
  ctx.save();

  const gradient = ctx.createRadialGradient(
    ix,
    iy,
    2,
    ix,
    iy,
    26
  );

  gradient.addColorStop(0, 'rgba(53,230,211,0.42)');
  gradient.addColorStop(1, 'rgba(53,230,211,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(ix, iy, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Fragmento.
  ctx.save();
  ctx.translate(ix, iy - 16 - bob);
  ctx.rotate(time * 1.5);

  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(9, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(-9, 0);
  ctx.closePath();

  ctx.fillStyle = '#83fff5';
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0ba8b2';
  ctx.stroke();

  ctx.restore();

  ctx.restore();
}

// Efeitos de energia provisórios: cada poder tem cor e pulso próprios.
function drawAbilityEffects(state) {
  const player = state.player;
  const ability = player.ability;
  const effect = getVisualEffect(player);
  const reveal = ability?.reveal;
  ctx.save();
  if (reveal) {
    const target = state.objects.find(o => o.id === reveal.targetId && o.gate && !state.progress.flags?.[`gate_${o.id}`]);
    if (target) {
      const x = (target.x - target.y) * HW, y = (target.x + target.y) * HH;
      ctx.strokeStyle = reveal.color;
      ctx.globalAlpha = Math.min(0.9, reveal.timeLeft * 0.6);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y, 27, 11, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (effect) {
    const x = (player.x - player.y) * HW, y = (player.x + player.y) * HH;
    const t = Math.max(0, 1 - effect.timeLeft / effect.duration);
    const isScan = ['postura_dominio', 'senso_corrente', 'eco_scan', 'transformacao_10x'].includes(effect.id);
    ctx.strokeStyle = effect.color;
    ctx.globalAlpha = Math.max(0, 0.85 * (1 - t));
    ctx.lineWidth = 2.5;
    ctx.shadowColor = effect.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(x, y, (isScan ? 14 + 65 * t : 20 + 20 * t), (isScan ? 6 + 30 * t : 9 + 9 * t), 0, 0, Math.PI * 2);
    ctx.stroke();
    if (effect.id === 'transformacao_10x') {
      // Pulso e fragmentos de eco: feedback temporal sem alterar a câmera.
      ctx.globalAlpha = Math.sin(Math.PI * t) * 0.85;
      ctx.lineWidth = 2;
      for (let ring = 0; ring < 3; ring++) {
        const radius = 18 + ((t + ring / 3) % 1) * 76;
        ctx.beginPath(); ctx.ellipse(x, y - 8, radius, radius * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.fillStyle = effect.color ?? '#9cffbc';
      for (let i = 0; i < 16; i++) {
        const angle = i * Math.PI * 2 / 16 + t * 2;
        const r = 22 + 40 * t + (i % 3) * 7;
        const px = x + Math.cos(angle) * r;
        const py = y - 28 - (i % 5) * 14 + Math.sin(angle) * r * 0.35;
        ctx.fillRect(px, py, 3, 3);
      }
    }
    if (!isScan) {
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 25);
      ctx.lineTo(x + 15, y - 49);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// Ultimate: a forma do efeito segue o tipo da sobrecarga ativa.
//   burst/wave/surge → anéis no raio real
//   line             → cunha na direção apontada
//   dash             → rastro atrás do avanço
//   guard            → cúpula fechada no corpo
const ULTIMATE_FACING = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };

// Carga da Ultimate: a energia converge no corpo antes da soltura.
function drawUltimateCharge(state) {
  const ultimate = state.player?.ultimate;
  if (!ultimate?.charge) return;
  const player = state.player;
  const x = (player.x - player.y) * HW, y = (player.x + player.y) * HH;
  const duration = ultimate.chargeDuration || .42;
  const t = Math.max(0, Math.min(1, 1 - ultimate.charge / duration));
  const color = ultimate.chargeDefinition?.color ?? '#ffd465';
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  // Anéis que encolhem até o peito.
  for (let anel = 0; anel < 3; anel++) {
    const raio = (74 - t * 52) * (1 - anel * .22);
    ctx.globalAlpha = (.25 + t * .55) * (1 - anel * .25);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - 12, Math.max(4, raio), Math.max(2, raio * .42), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Cada arquétipo converge à sua maneira.
  ctx.globalAlpha = .35 + t * .5;
  const arquetipo = state.progress?.archetype;
  if (arquetipo === 'motor_bio_forja') {
    // Placas de forja girando e fechando.
    for (let i = 0; i < 8; i++) {
      const ang = i * Math.PI / 4 + t * 3;
      const raio = 46 - t * 32;
      const px = x + Math.cos(ang) * raio;
      const py = y - 12 + Math.sin(ang) * raio * .45;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang + t * 2);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  } else if (arquetipo === 'lamina_dominio_anciao') {
    // Runas verticais que se alinham.
    for (let i = 0; i < 6; i++) {
      const xr = x - 30 + i * 12;
      const altura = 10 + (i % 3) * 8;
      ctx.fillRect(xr, y - 26 - t * 10 - altura * (1 - t), 2, altura);
    }
  } else if (arquetipo === 'mare_astral') {
    // Gotas subindo em espiral.
    for (let i = 0; i < 10; i++) {
      const ang = i * Math.PI * 2 / 10 + t * 4;
      const raio = 44 - t * 30;
      ctx.beginPath();
      ctx.arc(x + Math.cos(ang) * raio, y - 6 + Math.sin(ang) * raio * .4 - t * 18, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (arquetipo === 'nucleo_dez_forma') {
    // Silhuetas de eco piscando atrás do corpo.
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = (.10 + t * .18) * (1 - i * .18);
      ctx.beginPath();
      ctx.ellipse(x - i * 6 + t * 4, y - 12 + i * 2, 12 - i, 22 - i * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const ang = i * Math.PI * 2 / 10 + t * 2.4;
      const raio = 42 - t * 30;
      ctx.fillRect(x + Math.cos(ang) * raio - 1, y - 10 + Math.sin(ang) * raio * .42 - t * 14, 2, 2);
    }
  }
  ctx.globalAlpha = .35 + t * .5;
  if (t > .85) {
    // Último instante: halo branco quente.
    ctx.globalAlpha = (t - .85) / .15 * .85;
    ctx.beginPath();
    ctx.ellipse(x, y - 12, 16 + (t - .85) * 260, 8 + (t - .85) * 120, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawUltimateEffect(state) {
  const ultimate = state.player?.ultimate;
  if (!ultimate?.effect) return;
  const effect = ultimate.effect;
  const player = state.player;
  const x = (player.x - player.y) * HW, y = (player.x + player.y) * HH;
  const t = Math.max(0, Math.min(1, 1 - effect.timeLeft / effect.duration));
  const kind = effect.kind ?? 'burst';
  const [fx, fy] = ULTIMATE_FACING[effect.facing] ?? ULTIMATE_FACING.down;
  const length = Math.hypot(fx, fy) || 1;
  const screenX = (fx - fy) / length * HW;
  const screenY = (fx + fy) / length * HH;
  const fxUnit = screenX / (Math.hypot(screenX, screenY) || 1);
  const fyUnit = screenY / (Math.hypot(screenX, screenY) || 1);

  ctx.save();
  ctx.shadowColor = effect.color;
  ctx.shadowBlur = 18;
  ctx.strokeStyle = effect.color;
  ctx.fillStyle = effect.color;

  // Cada Ultimate tem desenho próprio; o tipo (linha/onda/guarda...) é só o
  // formato do dano. Sem assinatura, cai no desenho genérico abaixo.
  if (drawUltimateSignature(ctx, {
    signature: effect.signature,
    kind,
    color: effect.color,
    x, y, t,
    dir: { x: fxUnit, y: fyUnit },
    radius: effect.radius ?? 0,
    range: effect.range ?? 0,
  })) {
    ctx.restore();
    return;
  }

  if (kind === 'line') {
    const alcance = Math.max(40, (effect.range ?? 6) * 34) * (0.35 + t * 0.75);
    const largura = alcance * 0.3;
    ctx.globalAlpha = Math.max(0, 1 - t) * .9;
    ctx.lineWidth = 3;
    for (let faixa = -1; faixa <= 1; faixa++) {
      const desvio = faixa * largura * 0.45;
      ctx.beginPath();
      ctx.moveTo(x + (-fyUnit) * desvio, y - 6 + fxUnit * desvio);
      ctx.lineTo(x + fxUnit * alcance + (-fyUnit) * desvio * 0.3, y + fyUnit * alcance - 6 + fxUnit * desvio * 0.3);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 1 - t) * .55;
    ctx.fillRect(x + fxUnit * alcance - 3, y - 8 + fyUnit * alcance, 6, 6);
  } else if (kind === 'dash') {
    ctx.globalAlpha = Math.max(0, 1 - t) * .85;
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const recuo = 18 + i * 16 + t * 26;
      ctx.globalAlpha = Math.max(0, 1 - t) * (.8 - i * .16);
      ctx.beginPath();
      ctx.moveTo(x - fxUnit * recuo - fyUnit * 7, y - 12 - fyUnit * recuo - fxUnit * 3);
      ctx.lineTo(x - fxUnit * recuo + fyUnit * 7, y - 12 - fyUnit * recuo + fxUnit * 3);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 1 - t) * .5;
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(x + (i % 5) * 11 - 22, y - 6 - (i % 3) * 9 - t * 12, 3, 3);
    }
  } else if (kind === 'guard') {
    const abertura = Math.PI * (.15 + t * .85);
    const raio = 30 + t * 26;
    ctx.globalAlpha = Math.max(0, 1 - t) * .95;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - 10, raio, raio * .78, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 1 - t) * .4;
    ctx.beginPath();
    ctx.ellipse(x, y - 2, raio * 1.15, raio * .34, 0, 0, abertura * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 1 - t) * .6;
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI + i * Math.PI / 5;
      ctx.fillRect(x + Math.cos(angle) * raio, y - 10 + Math.sin(angle) * raio * .78, 3, 3);
    }
  } else {
    const raioBase = Math.max(70, (effect.radius ?? 5) * 34);
    for (let ring = 0; ring < 3; ring++) {
      const progresso = Math.min(1, t * 1.25 + ring * .12);
      const raio = 26 + progresso * raioBase;
      ctx.globalAlpha = Math.max(0, (1 - progresso) * .9);
      ctx.lineWidth = 3 - ring * .6;
      ctx.beginPath();
      ctx.ellipse(x, y, raio, raio * .5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = Math.max(0, 1 - t) * .85;
    for (let i = 0; i < 18; i++) {
      const angle = i * Math.PI * 2 / 18;
      const raio = 30 + (i % 5) * 16 + t * (raioBase * .65);
      ctx.fillRect(x + Math.cos(angle) * raio - 1, y + Math.sin(angle) * raio * .5 - 2 - t * 24, 3, 3);
    }
  }
  ctx.restore();
}

function drawEntity(entity, state) {
  const ix = (entity.x - entity.y) * HW;
  const iy = (entity.x + entity.y) * HH;

  if (entity === state.player) {
    // A Quebra Sistemas é ferro: sombra mais larga e mais densa que o operador.
    if (entity.nucleoForm === NUCLEO_BRUTA) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath();
      ctx.ellipse(ix, iy, 21, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else drawShadow(ix, iy, 0.28);
    // Passo pesado: a câmera sente o chão a cada passada da Quebra Sistemas.
    // Tremor curto e fraco de propósito: some sozinho, sem quebrar leitura.
    if (entity.nucleoForm === NUCLEO_BRUTA && entity.moving && !entity.ability?.dash) {
      const passo = Math.floor(performance.now() / 150) % 4;
      const chave = `${passo}:${Math.floor(performance.now() / 600)}`;
      if (entity._brutaStep !== chave) {
        entity._brutaStep = chave;
        entity.ultimate ??= { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null };
        // Só dispara se o tremor da Ultimate não estiver ocupando a câmera.
        if (!entity.ultimate.shake || entity.ultimate.shake.source === 'passo') {
          entity.ultimate.shake = { timeLeft: .12, duration: .12, power: 2.2, source: 'passo' };
        }
      }
    }
    if (state.progress.archetype === 'nucleo_dez_forma' && entity.nucleoForm === 'forma_veloz' && entity.moving && !entity.ability?.dash) {
      const dir = { left: [-1,0], right: [1,0], up: [0,-1], down: [0,1] }[entity.facing] ?? [1,0];
      const pulse = .45 + .2 * Math.sin(performance.now() * .02);
      ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = '#83ffb1'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const ox = -dir[0] * (20 + i * 7) + dir[1] * (i - 1) * 5;
        const oy = -dir[1] * (9 + i * 4) - 15 + dir[0] * (i - 1) * 3;
        ctx.beginPath(); ctx.moveTo(ix + ox, iy + oy); ctx.lineTo(ix + ox - dir[0] * 13, iy + oy - dir[1] * 7); ctx.stroke();
      }
      ctx.restore();
    }
    // Reação corporal provisória para todos os ataques; não inventa folhas direcionais.
    const attack = entity.combat;
    const t = attack?.timeLeft > 0 ? 1 - attack.timeLeft / attack.duration : 0;
    const push = attack?.timeLeft > 0 ? Math.sin(Math.PI * t) * 4 : 0;
    const dx = attack ? (attack.dx - attack.dy) : 0, dy = attack ? (attack.dx + attack.dy) * .5 : 0;
    const length = Math.hypot(dx, dy) || 1;
    // Corpo se prepara durante a carga da Ultimate: peso para baixo e aura.
    const carga = entity.ultimate?.charge > 0
      ? 1 - entity.ultimate.charge / (entity.ultimate.chargeDuration || .42)
      : 0;
    const afundar = carga > 0 ? Math.sin(Math.PI * Math.min(1, carga)) * 3 : 0;
    if (drawPlayerSprite(entity, ix + dx / length * push, iy + dy / length * push + afundar)) return;

    ctx.beginPath();
    ctx.arc(ix, iy - 14, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    return;
  }

  if (entity.tipo === 'viajante_ambiental') {
    const image = getSprite('hub_viajante');
    if (image) {
      drawShadow(ix, iy, .24);
      const row = { down: 0, right: 1, up: 2, left: 3 }[entity.facing] ?? 0;
      const frame = entity.moving ? Math.floor((entity.visitorRuntime?.clock ?? 0) * 7) % 6 : 0;
      ctx.save(); ctx.translate(ix, iy);
      ctx.drawImage(image, frame * 256, row * 256, 256, 256, -68, -129, 136, 136);
      ctx.restore(); entity._topo = 122; return;
    }
    return; // Sem arte, não desenha uma cópia do NEXO.
  }
  if (entity.tipo === 'robo') {
    ctx.beginPath();
    ctx.ellipse(ix, iy, 9, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fill();
    if (drawRobo(entity, ix, iy)) return;
  } else {
    drawShadow(ix, iy, 0.32);
    if (drawNexoSprite(entity, ix, iy)) return;
  }

  ctx.beginPath();
  ctx.arc(ix, iy - 18, 10, 0, Math.PI * 2);
  ctx.fillStyle = entity.cor ?? '#35E6D3';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#fff';
  ctx.stroke();
}

function drawTarget(player) {
  if (!player.target) return;
  const t = player.target;
  ctx.beginPath();
  ctx.ellipse((t.x - t.y) * HW, (t.x + t.y) * HH, 10, 5, 0, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255,213,79,0.9)';
  ctx.stroke();
}

// =====================================================================
//  NOMES E BALÕES (coordenadas de tela)
// =====================================================================
function drawLabels(state) {
  const zoom = camera.zoom;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  ctx.font = `bold ${Math.max(9, Math.round(10 * zoom))}px monospace`;

  for (const actor of state.actors ?? []) {
    if (actor.semNome) continue;   // robôs não mostram nome
    const s = worldToScreen(actor.x, actor.y);
    if (s.x < -150 || s.x > view.w + 150 || s.y < -150 || s.y > view.h + 150) continue;

    const nome = (actor.nome ?? '').toUpperCase();
    const y = s.y - ((actor._topo ?? 32) + 6) * zoom;

    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeText(nome, s.x, y);
    ctx.fillStyle = '#fff';
    ctx.fillText(nome, s.x, y);
  }
  ctx.restore();
}

function wrapText(text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawBubbles(state) {
  ctx.save();
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const a of state.actors ?? []) {
    const b = a.bark;
    if (!b) continue;

    const s = worldToScreen(a.x, a.y);
    const base = s.y - ((a._topo ?? 40) + 20) * camera.zoom;
    const alpha = Math.max(0, Math.min(1, (b.total - b.timer) / 0.2, b.timer / 0.35));
    const lines = wrapText(b.texto, 210);
    const lh = 14;
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 18;
    const h = lines.length * lh + 10;
    const x = s.x - w / 2;
    const y = base - h - (1 - alpha) * 6;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 6);
    else ctx.rect(x, y, w, h);
    ctx.moveTo(s.x - 6, y + h);
    ctx.lineTo(s.x, y + h + 7);
    ctx.lineTo(s.x + 6, y + h);
    ctx.fillStyle = 'rgba(10,14,20,0.94)';
    ctx.strokeStyle = '#35E6D3';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e8fbff';
    lines.forEach((l, i) => ctx.fillText(l, s.x, y + 5 + lh / 2 + i * lh));
  }
  ctx.restore();
} 