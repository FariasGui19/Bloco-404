import { perspectivaSubmersa } from './perspectiva-submersa.js';
import { posicaoVidaRota } from '../game/vida-rota-mare.js';
import { animacaoMar } from '../game/mar-vivo.js';
import { encontroConcluido, posicaoEncontro } from '../game/encontros-mare.js';
// js/engine/renderer.js
// =====================================================================
//  RENDERER
//  Chão (passada única) → brilhos → paredes/objetos/personagens por
//  profundidade → poeira → debug → nomes e balões
// =====================================================================
import { CONFIG, TILE } from '../config.js';
import { camera, view, worldToScreen, worldToIso, isoToWorld } from './camera.js';
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
import { tintaDoClima, atualizarParticulas, climaVisivelNoMapa, neblinaDoClima } from '../game/clima.js';
import { renderSideViewMap } from './side-view.js';
import { renderViadutoVetores } from './viaduto-view.js';
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
import { desenharCascata, desenharRespingo, desenharAnelEspuma } from './cascata.js';
import { desenharPocas } from './pocas.js';
import { desenharNadador, desenharBoias, desenharMarcadorDeTreino } from './nado-desenho.js';
import { lerArvore, boiasDoLimite } from '../game/nado-arvore.js';
import { cabecaSubmersa } from '../game/nado.js';

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
  const estavaEm3d = !!state.player?.nado?.perspectiva3d;
  const perspectiva = perspectivaSubmersa(map, state, view);
  if (estavaEm3d && !state.player?.nado?.perspectiva3d && state.player) {
    // A câmera pode estar solta após um arrasto em terra. Durante o 3D ela
    // não é visível; no retorno, não deixe o jogador fora da tela no mar.
    const p = worldToIso(state.player.x, state.player.y);
    camera.x = p.x; camera.y = p.y;
  }
  // Quando a transição terminou não desenhamos o mapa isométrico escondido:
  // isso evita pagar dois renderizadores durante todo o mergulho.
  if (perspectiva?.alpha >= .995) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(perspectiva.canvas, 0, 0, view.w, view.h);
    vinhetaSubmersa(state, view);
    return;
  }

  // SIDE-VIEW: Aeroporto Central usa perspectiva frontal/lateral profunda
  if (map.meta?.sideView) {
    const renderSide = map.meta?.estiloSala === 'viaduto_vetores' ? renderViadutoVetores : renderSideViewMap;
    renderSide(
      ctx, map, state,
      camera.x, camera.y,
      view.w, view.h,
      camera.zoom, dpr,
      performance.now(),
      {
        drawPlayer: (p, px, py) => {
          drawShadow(px, py, 0.28);
          if (!drawPlayerSprite(p, px, py)) {
            ctx.beginPath();
            ctx.arc(px, py - 14, 9, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          }
        },
        drawActor: (a, ax, ay) => {
          drawShadow(ax, ay, 0.30);
          if (a.sprite === 'guia_aeroporto' && drawGuiaSprite(a, ax, ay)) return;
          if (a.tipo === 'viajante_ambiental' && drawViajanteSprite(a, ax, ay)) return;
          if (a.tipo === 'robo' && drawRobo(a, ax, ay)) return;
          if (drawNexoSprite(a, ax, ay)) return;
          ctx.beginPath();
          ctx.arc(ax, ay - 18, 10, 0, Math.PI * 2);
          ctx.fillStyle = a.cor ?? '#35E6D3';
          ctx.fill();
        },
      }
    );
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawLabels(state);
    drawBubbles(state);
    return;
  }

  // ISOMÉTRICO (padrão)
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
  const nadoCamera = state.player?.nado;
  if (nadoCamera?.mareAstral && nadoCamera.profundidade > 1.25 && nadoCamera.arrancada > 0) {
    const força = Math.min(2.2, nadoCamera.arrancada * 5);
    shakeX += Math.sin(performance.now() * .08) * força;
    shakeY += Math.cos(performance.now() * .095) * força * .6;
  }
  mundoZ = z;
  mundoTx = (view.w / 2 - camera.x * camera.zoom + shakeX) * dpr;
  mundoTy = (view.h / 2 - camera.y * camera.zoom + shakeY) * dpr;
  ctx.setTransform(z, 0, 0, z, mundoTx, mundoTy);
  prepararEscalados(z);

  updateVisibleRange(map);

  // O metrô modular volta a usar chão e tiles.
  if (!map.meta?.backgroundCoversFloor) {
    if (map.aguaPraia) {
      // Na Dársena Maré Astral, recorta a água contínua exatamente dentro da bacia do Grande Aquário Oceânico (x=14.35..21, y=1..11).
      const clipMareAquario = map.meta?.estiloSala === 'mare_astral';
      if (clipMareAquario) {
        const p = (x, y) => [(x - y) * HW, (x + y) * HH];
        const [a0, a1] = p(15.0, 1.0);
        const [b0, b1] = p(21.0, 1.0);
        const [c0, c1] = p(21.0, 11.0);
        const [d0, d1] = p(15.0, 11.0);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.lineTo(c0, c1); ctx.lineTo(d0, d1);
        ctx.closePath();
        ctx.clip();
      }
      // AREIA primeiro, MAR por cima: o mar recorta a própria borda pelo campo
      // de costa (`beach-water.js`), então a linha d'água é curva em vez de
      // seguir a borda quadrada das células de areia.
      if (map.id !== 'ilha_estacao_bio' && map.meta?.estiloSala !== 'mare_astral') drawBeachSurface(map);
      drawBeachSea(map);
      const imersao = intensidadeSubmersa(state.player?.nado);
      if (imersao > 0) drawFundoSubmerso(map, imersao);
      drawVidaAquatica(map, state);
      if (map.vidaRota) drawVidaRota(map, state);
      if (map.fundoMar) drawFundoMarVivo(map);
      if (map.encontrosMare) drawEncontrosMare(map, state);
      if (imersao < .5) { drawBeachRipples(map); if (map.ondasMar) drawOndasMarVivo(map, state); }
      if (clipMareAquario) ctx.restore();
      // Poças de treino: água por cima da areia (zona, não célula da grade).
      desenharPocas(ctx, map, performance.now() / 1000, HW, HH);
      // Cordão de boias: o limite do degrau de nado, só perto do operador.
      const nivelNado = lerArvore(state.progress).nivel;
      if (nivelNado === 1 || nivelNado === 2) {
        desenharBoias(ctx, boiasDoLimite(map, nivelNado), state.player, range, performance.now() / 1000, HW, HH);
      }
    }
    // O nadador no fundo é desenhado antes das passarelas da superfície.
    if (nadadorNoFundo(state.player, map)) drawEntity(state.player, state);
    if (map.meta?.estiloSala === 'bio_forja') drawBioForjaUnderlay(map, state);
    if (map.meta?.estiloSala === 'dominio_anciao') drawDominioUnderlay(map, state);
    if (map.meta?.estiloSala === 'mare_astral') drawMareAstralUnderlay(map, state);
    if (map.meta?.estiloSala === 'nucleo_10x') drawNucleo10xUnderlay(map, state);
    if (map.meta?.estiloSala === 'carga_eco' || map.meta?.estiloSala === 'frequencia_limiar') drawCargoEcoUnderlay(map, state);
    drawFloors(map, state);
    drawHazards(state.hazards);
    if (map.id === 'hub_saguao') drawHubFloorMarkings();
    if (map.id === 'ilha_praia_inicial') drawBeachStation(map);
    if (map.id === 'ilha_enseada_ecos') { drawFrequencyExteriorFloor(state); drawObjectContactShadows(map); }
    if (map.id === 'bio_sala_controle') drawBioControlFloor();
    if (map.meta?.estiloSala === 'bio_forja') drawBioForjaFloorOverlay(map, state);
    if (map.meta?.estiloSala === 'dominio_anciao') drawDominioFloorOverlay(map, state);
    if (map.meta?.estiloSala === 'mare_astral') drawMareAstralFloorOverlay(map, state);
    if (map.meta?.estiloSala === 'nucleo_10x') drawNucleo10xFloorOverlay(map, state);
    if (map.meta?.estiloSala === 'carga_eco') {
      drawCargoEcoFloorOverlay(map, state);
      drawObjectContactShadows(map);
    }
    if (map.meta?.estiloSala === 'frequencia_limiar') {
      drawFrequencyStationFloor(state);
      drawObjectContactShadows(map);
    }
    if (map.id === 'ilha_estacao_bio') {
      drawStationPaving(map);
      drawStationCanalRims(map);
      drawStationBridges(map);
      drawBioNetwork(map);
      drawStationRoute(map);
      drawObjectContactShadows(map);
    }
    // Máquinas pintadas do Núcleo também assentam no piso: sombra difusa +
    // contato duro vindas do campo `sombra:[w,h]` de cada objeto.
    if (map.meta?.estiloSala === 'nucleo_10x') drawObjectContactShadows(map);

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
  drawMarcadorDeTreino(map, state);
  drawBasicAttack(state.player);
  drawAbilityEffects(state);
  drawUltimateCharge(state);
  drawUltimateEffect(state);
  drawAmbientFront(ctx, map, HW, HH);
  // CLIMA por último entre as camadas de mundo: chuva e tinta cobrem
  // tudo (inclusive o jogador), mas nunca a HUD, que é DOM.
  if (climaVisivelNoMapa(map)) drawClima(ctx, state, view);
  drawTarget(state.player);

  if (isDebugEnabled()) drawDebugWorld(ctx, map, state, CONFIG.TILE_W, CONFIG.TILE_H);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Atmosfera submersa cobre o mundo, nunca a HUD.
  const imersaoTela = map.aguaPraia ? intensidadeSubmersa(state.player?.nado) : 0;
  if (imersaoTela > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0,65,91,${(imersaoTela * .16).toFixed(3)})`;
    ctx.fillRect(0, 0, view.w, view.h);
    const g = ctx.createRadialGradient(view.w * .5, view.h * .45, view.h * .15, view.w * .5, view.h * .5, Math.max(view.w, view.h) * .72);
    g.addColorStop(0, 'rgba(0,20,30,0)');
    g.addColorStop(1, `rgba(0,26,46,${(imersaoTela * .42).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }
  // Vinheta tática de Postura do Domínio [R]: fecha o foco periférico em obsidiana e ouro
  if (map.meta?.estiloSala === 'dominio_anciao' && (state.player?.ability?.reveal?.timeLeft ?? 0) > 0) {
    const rev = state.player.ability.reveal;
    const peso = Math.min(1, rev.timeLeft / 0.45) * Math.min(1, (4.1 - rev.timeLeft) / 0.25 + 0.35);
    ctx.save();
    const vg = ctx.createRadialGradient(
      view.w * 0.5, view.h * 0.5, Math.min(view.w, view.h) * 0.28,
      view.w * 0.5, view.h * 0.5, Math.max(view.w, view.h) * 0.72
    );
    vg.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vg.addColorStop(0.72, `rgba(18, 11, 6, ${(0.22 * peso).toFixed(3)})`);
    vg.addColorStop(1, `rgba(42, 24, 6, ${(0.46 * peso).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.strokeStyle = `rgba(255, 212, 92, ${(0.28 * peso).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, view.w - 20, view.h - 20);
    ctx.restore();
  }
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
  if (perspectiva) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save(); ctx.globalAlpha = perspectiva.alpha;
    ctx.drawImage(perspectiva.canvas, 0, 0, view.w, view.h);
    vinhetaSubmersa(state, view); ctx.restore();
  }
}

function vinhetaSubmersa(state, view) {
  const profundidade = state.player?.nado?.profundidade ?? 1.25;
  const intensidade = Math.max(0, Math.min(.45, .16 + (profundidade - 1.25) * .3));
  const raio = Math.max(view.w, view.h) * .65;
  const gradiente = ctx.createRadialGradient(view.w / 2, view.h / 2, raio * .25, view.w / 2, view.h / 2, raio);
  gradiente.addColorStop(0, 'rgba(0,18,32,0)');
  gradiente.addColorStop(1, `rgba(0,18,32,${intensidade})`);
  ctx.fillStyle = gradiente; ctx.fillRect(0, 0, view.w, view.h);
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
export function nadadorNoFundo(player, map) {
  const n = player?.nado;
  return !!(map?.aguaPraia && n?.ativo && n.mareAstral && n.profundidade > 1.25);
}

function drawFloors(map, state) {
  for (let d = range.x0 + range.y0; d <= range.x1 + range.y1; d++) {
    const xs = Math.max(range.x0, d - range.y1);
    const xe = Math.min(range.x1, d - range.y0);

    for (let x = xs; x <= xe; x++) {
      const y = d - x;
      const type = map.layout[y][x];
      if (type !== TILE.WALL) {
        const deck = map.aguaPraia?.[y]?.[x];
        const acima = nadadorNoFundo(state?.player, map) && deck && 'Bb'.includes(deck);
        if (acima) { ctx.save(); ctx.globalAlpha = .38; }
        drawFloorTile(type, x, y, map);
        if (acima) ctx.restore();
      }
    }
  }
}

// O mar é uma textura única ASSADA por mapa (js/engine/beach-water.js):
// degradê, bancos submersos, cáusticas, espuma da margem e linha de espuma
// recuada vêm todos dela. Antes isso era recalculado pixel a pixel no
// primeiro frame e as ondas/espuma eram redesenhadas a cada quadro.
// FOLGA DE DESEMPENHO: efeitos de enfeite (a luz que balança no mar) só
// existem enquanto a máquina segura a taxa de quadros. Mede o intervalo
// real entre quadros (média móvel) e liga/desliga com histerese; se o
// enfeite derrubar a taxa duas vezes, fica desligado até recarregar.
const folga = { dt: 16.7, ultimo: 0, nivel: 0, alvo: 1, quedas: 0 };
function medirFolga() {
  const agora = performance.now();
  if (folga.ultimo) {
    const dt = Math.min(80, agora - folga.ultimo);
    folga.dt += (dt - folga.dt) * .04;
    if (folga.quedas >= 2) folga.alvo = 0;
    else if (folga.dt > 23 && folga.alvo === 1) { folga.alvo = 0; if (folga.nivel > .5) folga.quedas++; }
    else if (folga.dt < 19 && folga.alvo === 0) folga.alvo = 1;
    // Sobe devagar (2 s), desce depressa (0,4 s).
    const passo = dt / 1000 * (folga.alvo > folga.nivel ? .5 : 2.5);
    folga.nivel += Math.max(-passo, Math.min(passo, folga.alvo - folga.nivel));
  }
  folga.ultimo = agora;
  return folga.nivel;
}
export function nivelDeFolga() { return folga.nivel; }

function drawBeachSea(map) {
  const sea = getSeaCanvas(map);
  if (!sea) return;
  const m = sea.margem ?? 0;
  const cols = map.aguaPraia[0].length + m * 2, lines = map.aguaPraia.length + m * 2;
  ctx.save();
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sea.canvas, -m, -m, cols, lines);
  // LUZ QUE BALANÇA: a rede de cáusticas já vem assada no mar (custo zero).
  // Com folga, uma segunda rede desliza devagar por cima dela — as duas se
  // cruzando é o que faz a água "dançar". É UM drawImage a mais, de uma
  // textura pronta; sem folga, não é desenhada.
  const nivel = medirFolga();
  if (sea.causticas && nivel > .02) {
    const t = performance.now() / 1000;
    ctx.globalAlpha = nivel * (.34 + Math.sin(t * .8) * .06);
    ctx.drawImage(sea.causticas,
      -m + .43 + Math.sin(t * .27) * .22, -m + .31 + Math.cos(t * .21) * .18, cols, lines);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// A câmera isométrica preserva o rumo, os obstáculos e os pontos de interação.
// O fundo é uma camada do mesmo mundo, não um teleporte para um mapa falso.
export function intensidadeSubmersa(nado) {
  if (!nado?.ativo || !nado.mareAstral || nado.naPoca) return 0;
  return Math.max(0, Math.min(1, (nado.profundidade - 1.0) / .55));
}

const fundoSubmersoCache = new WeakMap();
function drawFundoSubmerso(map, intensidade) {
  const imagem = getSprite('fundo_mar_mare');
  if (!imagem) return; // carregamento falhou: mantém o mar normal
  let tela = fundoSubmersoCache.get(map);
  if (!tela) {
    // Um único canvas por mapa; custo e memória não dependem do zoom.
    const escala = 8, rows = map.aguaPraia, cols = rows[0].length;
    const padrao = document.createElement('canvas');
    padrao.width = 64; padrao.height = 64;
    padrao.getContext('2d').drawImage(imagem, 0, 0, 64, 64);
    tela = document.createElement('canvas');
    tela.width = cols * escala; tela.height = rows.length * escala;
    const pincel = tela.getContext('2d');
    pincel.fillStyle = pincel.createPattern(padrao, 'repeat');
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < cols; x++) {
      if ('YyDdX'.includes(rows[y][x]) || (map.aguaSobPontes && 'Bb'.includes(rows[y][x]))) pincel.fillRect(x * escala, y * escala, escala, escala);
    }
    fundoSubmersoCache.set(map, tela);
  }
  ctx.save();
  ctx.globalAlpha = intensidade * .95;
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(tela, 0, 0, map.aguaPraia[0].length, map.aguaPraia.length);
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
  // O mundo está transformado pela câmera (zoom/translação); o clima é
  // uma camada de tela. Restaurar ao sair preserva os demais desenhos.
  ctx.save();
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  // 1. TINTA: esfria e escurece a cena inteira. É o efeito mais barato
  //    e o que mais se lê de longe — em ressaca a praia "fecha".
  const tinta = tintaDoClima(clima);
  if (tinta.a > 0.004) {
    ctx.save();
    ctx.fillStyle = `rgba(${tinta.r},${tinta.g},${tinta.b},${tinta.a.toFixed(3)})`;
    ctx.fillRect(0, 0, view.w, view.h);
    ctx.restore();
  }

  // Névoa translúcida sem partículas: entra e sai junto ao clima e não
  // encobre a HUD. Mais densa no horizonte, sem bloquear visão da costa.
  const neblina = neblinaDoClima(clima);
  if (neblina > .01) {
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, `rgba(196,222,224,${(.24*neblina).toFixed(3)})`);
    g.addColorStop(1, `rgba(196,222,224,${(.04*neblina).toFixed(3)})`);
    ctx.fillStyle=g;ctx.fillRect(0,0,view.w,view.h);
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
  ctx.restore();
}

// Orçamento definido pelo mapa; ondas e pingos nunca criam partículas por
// quadro. A ressaca aumenta a espuma, não a colisão nem o tamanho do mapa.
function drawOndasMarVivo(map, state) {
  const reduzir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t = performance.now() / 1000;
  const { clima } = state;
  for (let i = 0; i < map.ondasMar.length; i++) {
    const p = map.ondasMar[i];
    if (p.x < range.x0-2 || p.x > range.x1+2 || p.y < range.y0-2 || p.y > range.y1+2) continue;
    const a = animacaoMar(i, t, clima, reduzir);
    const img = getSprite(p.tipo ? 'mar_vivo_onda_larga' : 'mar_vivo_onda_crista');
    const x=(p.x-p.y)*HW, y=(p.x+p.y)*HH;
    if (img) {
      const w=p.tipo ? 62 : 35, h=w*img.height/img.width*.62;
      ctx.save(); ctx.globalAlpha=a.espuma * .52; ctx.translate(x, y + a.deslocamento*4);
      ctx.rotate(a.inclinacao); ctx.drawImage(img,-w/2,-h/2,w,h); ctx.restore();
    }
    if (a.chuva > .12 && i % 2 === 0) {
      const splash=getSprite('mar_vivo_chuva_mar');
      if (splash) { const pulso=reduzir ? .45 : Math.max(0,Math.sin(a.fase*2));
        ctx.save(); ctx.globalAlpha=a.chuva*pulso*.45; ctx.drawImage(splash,x-13,y-6,26,13); ctx.restore(); }
    }
  }
}
function drawFundoMarVivo(map) {
  for (const p of map.fundoMar) {
    if (p.x < range.x0-2 || p.x > range.x1+2 || p.y < range.y0-2 || p.y > range.y1+2) continue;
    const img=getSprite(`mar_vivo_${p.tipo.replaceAll('-', '_')}`); if (!img) continue;
    const w=42*p.tamanho,h=w*img.height/img.width,x=(p.x-p.y)*HW,y=(p.x+p.y)*HH;
    ctx.save();ctx.globalAlpha=.26;ctx.drawImage(img,x-w/2,y-h/2,w,h);ctx.restore();
  }
}
function drawEncontrosMare(map, state) {
  const reduzido=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t=reduzido ? 0 : performance.now()/1000;
  for (let i=0;i<map.encontrosMare.length;i++) {
    const p=map.encontrosMare[i], concluido=encontroConcluido(state.progress,p.id);
    if (p.id === 'rede' && concluido) continue;
    if (p.x < range.x0-2 || p.x > range.x1+2 || p.y < range.y0-2 || p.y > range.y1+2) continue;
    const id=concluido && p.spriteConcluido ? p.spriteConcluido : p.sprite;
    const img=getSprite(`mare_encontro_${id.replaceAll('-', '_')}`); if (!img) continue;
    const w=48*p.tamanho,h=w*img.height/img.width;
    const pos=posicaoEncontro(p,state.progress,t,reduzido);
    const x=(pos.x-pos.y)*HW,y=(pos.x+pos.y)*HH;
    ctx.save();ctx.globalAlpha=state.player.nado?.submerso ? .8 : .3;
    ctx.translate(x,y-pos.altura*18);
    ctx.drawImage(img,-w/2,-h*.72,w,h);
    if (!concluido && state.player.nado?.submerso) {
      ctx.fillStyle='#c7fff1';ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(0,-h*.8,2.5,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
}

function drawFlutuanteMar(object, state) {
  const img=getSprite(`mar_vivo_${object.flutuanteMar.replaceAll('-', '_')}`); if (!img) return;
  const reduzir=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const a=animacaoMar(object.x+object.y,performance.now()/1000,state.clima,reduzir);
  const x=(object.x-object.y)*HW,y=(object.x+object.y)*HH,w=object.larguraPx,h=w*img.height/img.width;
  ctx.save();ctx.translate(x,y+a.deslocamento*2);ctx.rotate(a.inclinacao);
  ctx.drawImage(img,-w/2,-h*.72,w,h);ctx.restore();
}

// Na superfície, silhuetas sob a água; a versão submersa usa os mesmos
// trajetos em sprites 3D. Culling e limite fixo mantêm o custo pequeno.
function drawVidaRota(map, state) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t = performance.now()/1000;
  for (let i=0; i<map.vidaRota.length; i++) {
    const item = map.vidaRota[i], p = posicaoVidaRota(item,i,t,reduced);
    if (p.x < range.x0-2 || p.x > range.x1+2 || p.y < range.y0-2 || p.y > range.y1+2) continue;
    const image = getSprite(`rota_mare_${item.tipo.replaceAll('-', '_')}`); if (!image) continue;
    const w = (item.tipo === 'alga' ? 27 : 48) * item.tamanho, h = w*image.height/image.width;
    const x=(p.x-p.y)*HW, y=(p.x+p.y)*HH;
    ctx.save();ctx.translate(x,y);ctx.rotate(p.inclinacao);
    ctx.globalAlpha = item.tipo === 'golfinho' || item.tipo === 'tartaruga' ? .53 : .29;
    ctx.drawImage(image,-w/2,-h/2,w,h);ctx.restore();
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
  // Cabeça na água (o gesto de mergulhar): é o que abre os raios de sol.
  const submerso = cabecaSubmersa(nado);

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
  const coralAstral = getSprite('coral_astral_submerso');
  const fundoVisivel = intensidadeSubmersa(nado) > .35;
  for (const r of elementosDeRecife(vida.recifes)) {
    if (!dentro(r.x, r.y)) continue;
    const ix = (r.x - r.y) * HW, iy = (r.x + r.y) * HH;
    const balanco = Math.sin(t * 1.1 + r.fase) * 1.6;
    const s = r.tamanho;
    if (r.tipo === 0 && fundoVisivel && coralAstral) {
      // Arte própria, discreta e ancorada no fundo; o desenho procedural
      // continua sendo o fallback e a leitura da superfície.
      const w = 25 * s, h = 27 * s;
      ctx.save(); ctx.globalAlpha = .9;
      ctx.drawImage(coralAstral, ix - w / 2 + balanco * .2, iy - h, w, h);
      ctx.restore();
    } else if (r.tipo === 0) {
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

  // Estacas reais do fundo, posicionadas pela mesma lista da colisão.
  if (fundoVisivel) for (const pilar of map.pilaresSubmersos ?? []) {
    if (!dentro(pilar.x, pilar.y, 2)) continue;
    const px = (pilar.x - pilar.y) * HW, py = (pilar.x + pilar.y) * HH;
    const r = (pilar.raio ?? .16) * HW;
    ctx.save(); ctx.fillStyle = '#254451'; ctx.strokeStyle = '#73b8b3'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(px, py + 2, r + 3, (r + 3) * .5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(px - r, py - 20, r * 2, 20); ctx.strokeRect(px - r, py - 20, r * 2, 20);
    ctx.restore();
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

  // O Senso submerso marca o eco real, sem criar coletáveis ou socorros.
  const sonar = player?.ability?.sonarAquatico;
  if (submerso && sonar && dentro(sonar.x, sonar.y, 2)) {
    const sx = (sonar.x - sonar.y) * HW, sy = (sonar.x + sonar.y) * HH;
    ctx.save(); ctx.strokeStyle = '#9fffee'; ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(1, sonar.timeLeft) * (.55 + .25 * Math.sin(t * 5));
    ctx.beginPath(); ctx.ellipse(sx, sy, 18 + Math.sin(t * 4) * 3, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy - 12); ctx.lineTo(sx, sy - 25); ctx.stroke(); ctx.restore();
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

// COSTÃO ROCHOSO: a ponta de pedra é UM bloco de basalto, não um piso de
// ladrilhos. A altura vem de um ruído largo (platôs de 2–3 células com
// degraus entre eles) e a cor varia devagar, então as células se fundem;
// as faces só aparecem onde a pedra da frente é mais baixa ou é mar.
// Desenho puro (um losango, até duas faces e três riscos por célula).
function alturaCostao(x, y) {
  const n = Math.sin(x * .9 + y * .35) + Math.sin(y * .8 - x * .25 + 1.7);
  return 8 + Math.round((n + 2) * 1.4) * 3;
}

function drawCostao(x, y, tx, ty, map) {
  const eh = (i, j) => Boolean(map.costao[`${i},${j}`]);
  const alt = alturaCostao(x, y);
  const topo = ty - alt;
  const r = hash(x, y), r2 = hash(x + 31, y + 17);
  const tom = Math.sin(x * .55 - y * .4) * 5 + Math.sin(x * .2 + y * .7 + 2) * 4;

  // Faces da frente: até a pedra vizinha (se for mais baixa) ou até o mar.
  const quedaSO = eh(x, y + 1) ? alt - alturaCostao(x, y + 1) : alt + 3;
  const quedaSE = eh(x + 1, y) ? alt - alturaCostao(x + 1, y) : alt + 3;
  if (quedaSO > 0) {
    quad(tx - HW - .5, topo + HH, tx, topo + TH, tx, topo + TH + quedaSO, tx - HW - .5, topo + HH + quedaSO,
      tint('#55504a', tom * .6), null);
  }
  if (quedaSE > 0) {
    quad(tx, topo + TH, tx + HW + .5, topo + HH, tx + HW + .5, topo + HH + quedaSE, tx, topo + TH + quedaSE,
      tint('#403c37', tom * .6), null);
  }
  // Topo, meio pixel maior que a célula: vizinhas do mesmo platô se fundem.
  quad(tx, topo - .6, tx + HW + 1, topo + HH, tx, topo + TH + .6, tx - HW - 1, topo + HH,
    tint('#7b756b', tom + r * 4 - 2), null);

  // Aresta gasta (clara) onde a laje acaba num degrau.
  if (quedaSO > 0 || quedaSE > 0) {
    ctx.strokeStyle = 'rgba(214,206,190,.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (quedaSO > 0) { ctx.moveTo(tx - HW, topo + HH); ctx.lineTo(tx, topo + TH); }
    if (quedaSE > 0) { ctx.moveTo(tx, topo + TH); ctx.lineTo(tx + HW, topo + HH); }
    ctx.stroke();
  }
  // Rachadura que atravessa a célula (sai e chega em bordas diferentes).
  ctx.strokeStyle = 'rgba(38,34,30,.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx - HW * (.75 - r * .5), topo + HH * (.75 + r * .5));
  ctx.lineTo(tx + HW * (r2 * .4 - .2), topo + HH * (.7 + r2 * .6));
  ctx.lineTo(tx + HW * (.3 + r * .45), topo + HH * (1.3 - r2 * .5));
  ctx.stroke();
  // Mancha clara de pedra lavada e musgo em algumas lajes.
  ctx.fillStyle = 'rgba(160,152,138,.3)';
  ctx.beginPath();
  ctx.ellipse(tx + (r2 - .5) * HW * .8, topo + HH * (.75 + r * .5), HW * (.2 + r * .16), HH * (.2 + r2 * .14), 0, 0, Math.PI * 2);
  ctx.fill();
  if (r2 > .58) {
    ctx.fillStyle = r > .5 ? 'rgba(92,128,54,.6)' : 'rgba(122,140,60,.5)';
    ctx.beginPath();
    ctx.ellipse(tx + (r - .5) * HW * .7, topo + HH * (1 + (r2 - .8)), HW * (.2 + r * .14), HH * .24, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Espuma no pé das faces que tocam o mar.
  const g = map.aguaPraia;
  const mar = (i, j) => { const c = g[j]?.[i]; return c == null || 'YyDdX'.includes(c); };
  const marSO = mar(x, y + 1), marSE = mar(x + 1, y);
  if (marSO || marSE) {
    ctx.strokeStyle = 'rgba(240,255,250,.75)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (marSO) { ctx.moveTo(tx - HW, ty + HH + 3); ctx.lineTo(tx, ty + TH + 3); }
    if (marSE) { ctx.moveTo(tx, ty + TH + 3); ctx.lineTo(tx + HW, ty + HH + 3); }
    ctx.stroke();
  }
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

  // Costão: laje de pedra escura com poças de maré (não é placa de sprite).
  if (map.costao?.[`${x},${y}`]) { drawCostao(x, y, tx, ty, map); return; }

  // Oficina Inicial — Motor Bio-Forja: placas de ferro/bronze e grades luminosas.
  if (map.meta?.estiloSala === 'bio_forja') {
    if (drawBioForjaFloorTile(x, y, tx, ty, map)) return;
  }

  // Santuário do Anel — Lâmina Domínio Ancião: obsidiana kintsugi e grelhas rúnicas douradas.
  if (map.meta?.estiloSala === 'dominio_anciao') {
    if (drawDominioFloorTile(x, y, tx, ty)) return;
  }

  // Dársena Abissal — Maré Astral: ardósia úmida com veios ciano e grelhas hidráulicas submersas.
  if (map.meta?.estiloSala === 'mare_astral') {
    if (drawMareAstralFloorTile(x, y, tx, ty)) return;
  }

  // Base dos Vetores — Núcleo 10X: grafite usinado e trilhos de indução.
  if (map.meta?.estiloSala === 'nucleo_10x') {
    if (drawNucleo10xFloorTile(x, y, tx, ty)) return;
  }
  // Área de Carga viva: piso pintado do módulo, não placa genérica.
  if (map.meta?.estiloSala === 'carga_eco' || map.meta?.estiloSala === 'frequencia_limiar') {
    if (drawCargoEcoFloorTile(x, y, tx, ty, map)) return;
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

// =====================================================================
// OFICINA INICIAL — MOTOR BIO-FORJA (piso, fundação e rede viva)
// =====================================================================
function ehGradeBioForja(x, y) {
  // Baia do Banco de Reconstrução, pista central de impulso e relicário leste.
  if (x >= 4 && x <= 7 && y >= 1 && y <= 3) return true;
  if (x >= 7 && x <= 10 && (y === 5 || y === 6)) return true;
  if (x >= 11 && x <= 13 && y >= 4 && y <= 7) return true;
  if ((x === 3 || x === 4) && y === 9) return true;
  return false;
}

function drawBioForjaFloorTile(x, y, tx, ty) {
  const usaGrade = ehGradeBioForja(x, y);
  const spriteId = usaGrade ? 'bio_sala_piso_grade' : 'bio_sala_piso_placa';
  const img = getSprite(spriteId);
  const f = img && getFrame(img, 0, 0, 1, 1)?.crop;
  if (!f) {
    const base = usaGrade ? '#1d312c' : '#242c29';
    quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, base, '#121a18', 1);
    return true;
  }
  const w = CONFIG.TILE_W * 1.03;
  const h = w * (f.h / f.w);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Pequena variação espelhada quebra repetição sem desalinhar o bisel 2:1.
  const flip = !usaGrade && ((x * 7 + y * 13) & 1) === 1;
  ctx.translate(tx, ty - 0.8);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();
  return true;
}

function drawBioForjaUnderlay(map, curState) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const synced = !!curState?.progress?.flags?.oficina_bio_sincronizada;
  const gateOpen = !!curState?.progress?.flags?.gate_grade_impeto_vivo;

  ctx.save();
  // 1) Halo atmosférico subterrâneo sob a oficina (elimina o vazio chapado).
  const [cx, cy] = p(cols * 0.52, rows * 0.52);
  const amb = ctx.createRadialGradient(cx, cy, 40, cx, cy, 480);
  amb.addColorStop(0, synced ? 'rgba(42, 118, 98, 0.28)' : 'rgba(24, 78, 68, 0.22)');
  amb.addColorStop(0.6, 'rgba(11, 32, 29, 0.14)');
  amb.addColorStop(1, 'rgba(5, 10, 10, 0)');
  ctx.fillStyle = amb;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 16, 490, 265, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2) Sombra projetada da plataforma suspensa.
  const [nX, nY] = p(0.8, 0.8);
  const [eX, eY] = p(cols + 0.15, 0.8);
  const [sX, sY] = p(cols + 0.15, rows + 0.15);
  const [wX, wY] = p(0.8, rows + 0.15);
  ctx.fillStyle = 'rgba(2, 6, 7, 0.68)';
  ctx.beginPath();
  ctx.moveTo(wX, wY + 14);
  ctx.lineTo(sX, sY + 34);
  ctx.lineTo(eX, eY + 30);
  ctx.lineTo(eX, eY + 6);
  ctx.lineTo(sX, sY + 6);
  ctx.lineTo(wX, wY + 2);
  ctx.closePath();
  ctx.fill();

  // 3) Laje estrutural escura sob todo o piso e sob a divisória x=10.
  const [fN0, fN1] = p(1, 1);
  const [fE0, fE1] = p(cols, 1);
  const [fS0, fS1] = p(cols, rows);
  const [fW0, fW1] = p(1, rows);
  quad(fN0, fN1, fE0, fE1, fS0, fS1, fW0, fW1, '#141d1b', '#0c1312', 2);

  // 4) Saia arquitetônica frontal esculpida (ferro forjado + nervuras de bronze + fendas bio).
  const skirtH = 26;
  const glowColor = synced ? '#7efce0' : gateOpen ? '#35e6d3' : '#2aa89a';
  // Face sudoeste: (1, rows) -> (cols, rows)
  for (let x = 1; x < cols; x++) {
    const [ax, ay] = p(x, rows);
    const [bx, by] = p(x + 1, rows);
    quad(ax, ay, bx, by, bx, by + skirtH, ax, ay + skirtH, (x % 2 === 0) ? '#232d2b' : '#1e2726', '#101716', 1);
    // Friso de bronze oxidado superior
    quad(ax, ay, bx, by, bx, by + 5, ax, ay + 5, '#5a4631', '#281f16', 0.8);
    // Nervura estrutural vertical
    ctx.strokeStyle = '#6e563c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 1);
    ctx.lineTo(ax, ay + skirtH - 1);
    ctx.stroke();
    // Fenda bioluminescente alternada
    if (x % 2 === 0) {
      const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5 + 14;
      ctx.strokeStyle = '#0c1716';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx - 8, my - 4);
      ctx.lineTo(mx + 8, my + 4);
      ctx.stroke();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(mx - 7, my - 3.5);
      ctx.lineTo(mx + 7, my + 3.5);
      ctx.stroke();
    }
  }
  // Face sudeste: (cols, 1) -> (cols, rows)
  for (let y = 1; y < rows; y++) {
    const [ax, ay] = p(cols, y);
    const [bx, by] = p(cols, y + 1);
    quad(ax, ay, bx, by, bx, by + skirtH, ax, ay + skirtH, (y % 2 === 0) ? '#1a2322' : '#161e1d', '#0d1413', 1);
    quad(ax, ay, bx, by, bx, by + 5, ax, ay + 5, '#473726', '#211911', 0.8);
    ctx.strokeStyle = '#57432e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay + 1);
    ctx.lineTo(ax, ay + skirtH - 1);
    ctx.stroke();
    if (y === 5 || y === 6 || y % 3 === 0) {
      const mx = (ax + bx) * 0.5, my = (ay + by) * 0.5 + 14;
      ctx.strokeStyle = '#091211';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(mx + 8, my - 4);
      ctx.lineTo(mx - 8, my + 4);
      ctx.stroke();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(mx + 7, my - 3.5);
      ctx.lineTo(mx - 7, my + 3.5);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawBioForjaFloorOverlay(map, curState) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const diagnosed = !!flags.bio_placa_diagnostico;
  const gateOpen = !!flags.gate_grade_impeto_vivo;
  const fragmentTaken = !!flags.collected_fragmento_eco_bio;
  const southRepaired = !!flags.gate_condutor_oficina_bio;
  const synced = !!flags.oficina_bio_sincronizada;
  const t = performance.now() / 1000;
  const pulse = 0.72 + Math.sin(t * 3.2) * 0.22;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1) Moldura de bronze da Baia do Banco de Reconstrução (x=4..8, y=1.15..4.15)
  {
    const [a0, a1] = p(4.1, 1.18);
    const [b0, b1] = p(7.9, 1.18);
    const [c0, c1] = p(7.9, 4.05);
    const [d0, d1] = p(4.1, 4.05);
    ctx.strokeStyle = 'rgba(14, 24, 22, 0.85)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.lineTo(c0, c1); ctx.lineTo(d0, d1); ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = synced ? '#ffd36e' : '#8b6c47';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Halo esmeralda sob o tanque central do Banco de Reconstrução (6.0, 2.55)
    const [bx, by] = p(6.0, 2.65);
    const g = ctx.createRadialGradient(bx, by, 6, bx, by, 56);
    g.addColorStop(0, synced ? 'rgba(126, 252, 224, 0.42)' : 'rgba(53, 230, 211, 0.24)');
    g.addColorStop(1, 'rgba(53, 230, 211, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(bx, by, 56, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2) Soleira da Eclusa Doca A1 (x=1.08..2.65, y=4.85..6.75)
  {
    const [a0, a1] = p(1.08, 4.85);
    const [b0, b1] = p(2.65, 4.85);
    const [c0, c1] = p(2.65, 6.75);
    const [d0, d1] = p(1.08, 6.75);
    quad(a0, a1, b0, b1, c0, c1, d0, d1, 'rgba(20, 32, 30, 0.58)', '#7c613e', 1.6);
    const [lx, ly] = p(2.05, 5.85);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.transform(1, -0.5, 1, 0.5, 0, 0);
    ctx.fillStyle = 'rgba(53, 230, 211, 0.78)';
    ctx.font = 'bold 6.5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('◂ DOCA A1', 0, 2);
    ctx.restore();
  }

  // 3) Rede viva de conduítes de bio-energia no piso
  const drawConduit = (pts, active, overdrive = false) => {
    // Calha escura
    ctx.strokeStyle = 'rgba(9, 18, 17, 0.92)';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    pts.forEach(([wx, wy], i) => {
      const [sx, sy] = p(wx, wy);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Borda de bronze
    ctx.strokeStyle = 'rgba(118, 91, 58, 0.62)';
    ctx.lineWidth = 3.8;
    ctx.stroke();

    // Filamento de plasma/seiva
    ctx.strokeStyle = overdrive
      ? `rgba(146, 255, 224, ${(0.78 + 0.2 * pulse).toFixed(2)})`
      : active
        ? `rgba(53, 230, 211, ${(0.65 + 0.25 * pulse).toFixed(2)})`
        : 'rgba(208, 148, 72, 0.52)';
    ctx.lineWidth = active ? 2.2 : 1.6;
    ctx.stroke();

    // Pulso viajante luminoso ao longo do conduíte
    const segs = pts.length - 1;
    if (segs > 0) {
      const prog = ((t * (active ? 0.65 : 0.28)) % 1) * segs;
      const idx = Math.min(segs - 1, Math.floor(prog));
      const frac = prog - idx;
      const wx = pts[idx][0] + (pts[idx + 1][0] - pts[idx][0]) * frac;
      const wy = pts[idx][1] + (pts[idx + 1][1] - pts[idx][1]) * frac;
      const [px, py] = p(wx, wy);
      ctx.fillStyle = overdrive ? '#fff3b8' : active ? '#aefcf0' : '#f0b96b';
      ctx.beginPath();
      ctx.arc(px, py, active ? 2.6 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Tronco principal: Eclusa -> Terminal -> Banco -> Pista -> Grade -> Relicário
  drawConduit([[1.9, 5.8], [3.3, 5.8], [3.3, 3.2], [5.2, 3.2]], true, synced);
  drawConduit([[6.0, 3.85], [6.0, 6.0], [10.5, 6.0]], diagnosed || gateOpen, synced);
  drawConduit([[10.5, 6.0], [12.5, 6.0]], gateOpen, synced);
  // Ramal das incubadoras do relicário
  drawConduit([[12.5, 6.0], [12.5, 2.7]], gateOpen, synced);
  drawConduit([[12.5, 6.0], [12.5, 9.3]], gateOpen, synced);
  // Ramal sul (estação auxiliar de pressão e treino)
  drawConduit([[6.0, 6.0], [6.0, 8.2], [4.0, 9.5]], southRepaired || synced, synced);

  // 4) Pista tática de Impulso (x=7.2..9.9, y=6.0) apontando para a Grade (10.5, 6.0)
  {
    const chevColor = gateOpen
      ? 'rgba(110, 242, 198, 0.42)'
      : diagnosed
        ? `rgba(53, 230, 211, ${(0.62 + 0.32 * pulse).toFixed(2)})`
        : 'rgba(232, 172, 84, 0.55)';

    for (let i = 0; i < 3; i++) {
      const cx = 7.55 + i * 0.82;
      const cy = 6.0;
      const [pL0, pL1] = p(cx - 0.22, cy - 0.42);
      const [pM0, pM1] = p(cx + 0.26, cy);
      const [pR0, pR1] = p(cx - 0.22, cy + 0.42);
      ctx.strokeStyle = chevColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pL0, pL1);
      ctx.lineTo(pM0, pM1);
      ctx.lineTo(pR0, pR1);
      ctx.stroke();
    }
  }

  // 5) Altar / Berço do Fragmento de Eco no Relicário Leste (12.5, 6.0)
  {
    const [sx, sy] = p(12.5, 6.0);
    // Plataforma octogonal concêntrica em bronze e jade
    const drawIsoOct = (r, fill, stroke, lw = 1.5) => {
      const k = r * 0.72;
      const pts = [
        [r, 0], [k, k], [0, r], [-k, k],
        [-r, 0], [-k, -k], [0, -r], [k, -k],
      ];
      ctx.beginPath();
      pts.forEach(([ox, oy], idx) => {
        const [px, py] = p(12.5 + ox, 6.0 + oy);
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    drawIsoOct(1.05, 'rgba(20, 31, 29, 0.88)', '#7d613e', 2);
    drawIsoOct(0.72, 'rgba(16, 44, 40, 0.92)', synced ? '#ffd36e' : '#35e6d3', 1.6);
    drawIsoOct(0.38, !fragmentTaken ? 'rgba(53, 230, 211, 0.34)' : 'rgba(32, 72, 66, 0.45)', '#9efce9', 1.2);

    if (!fragmentTaken) {
      const beam = ctx.createRadialGradient(sx, sy - 10, 3, sx, sy - 4, 44);
      beam.addColorStop(0, 'rgba(130, 255, 232, 0.36)');
      beam.addColorStop(1, 'rgba(53, 230, 211, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 42, 21, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 6) Meio-fio de corte arquitetônico nas bordas frontais (cols e rows)
  {
    const [e0, e1] = p(cols, 1);
    const [s0, s1] = p(cols, rows);
    const [w0, w1] = p(1, rows);
    ctx.strokeStyle = '#141c1b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w0, w1); ctx.lineTo(s0, s1); ctx.lineTo(e0, e1);
    ctx.stroke();
    ctx.strokeStyle = '#7b6040';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w0, w1 - 1); ctx.lineTo(s0, s1 - 1); ctx.lineTo(e0, e1 - 1);
    ctx.stroke();
  }

  ctx.restore();
}

function ehRunaDominio(x, y) {
  // Passarela Imperial (y=5..6) da Doca B2 até o Trono da Coroa + adro do Altar da Lâmina
  if ((y === 5 || y === 6) && x >= 2 && x <= 13) return true;
  if (x >= 5 && x <= 7 && y >= 2 && y <= 3) return true;
  if (x >= 11 && x <= 13 && y >= 4 && y <= 7) return true;
  return false;
}

function drawDominioFloorTile(x, y, tx, ty) {
  const usaRuna = ehRunaDominio(x, y);
  const spriteId = usaRuna ? 'dom_sala_piso_runa' : 'dom_sala_piso_obsidiana';
  const img = getSprite(spriteId);
  const f = img && getFrame(img, 0, 0, 1, 1)?.crop;
  if (!f) {
    const base = usaRuna ? '#352613' : '#1b1920';
    quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, base, '#0e0c12', 1);
    return true;
  }
  const w = CONFIG.TILE_W * 1.03;
  const h = w * (f.h / f.w);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const flip = !usaRuna && ((x * 11 + y * 5) & 1) === 1;
  ctx.translate(tx, ty - 0.8);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();
  return true;
}

function drawDominioUnderlay(map, curState) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const consagrado = !!flags.santuario_dominio_consagrado;
  const gateOpen = !!flags.gate_lacre_frequencia_sala;

  ctx.save();
  // 1) Abismo vulcânico-solar sob o santuário suspenso de obsidiana
  const [cx, cy] = p((cols + 1) * 0.5, (rows + 1) * 0.5);
  const abyss = ctx.createRadialGradient(cx, cy + 28, 36, cx, cy + 28, 600);
  abyss.addColorStop(0, consagrado ? 'rgba(245, 182, 56, 0.28)' : gateOpen ? 'rgba(218, 138, 34, 0.22)' : 'rgba(176, 98, 22, 0.17)');
  abyss.addColorStop(0.55, 'rgba(34, 18, 10, 0.52)');
  abyss.addColorStop(1, 'rgba(8, 6, 10, 0)');
  ctx.fillStyle = abyss;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 32, 620, 320, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2) Saia monumental em basalto negro e bronze dourado nas bordas frontais
  const skirtH = 30;
  const [eTopX, eTopY] = p(cols, 1);
  const [sMidX, sMidY] = p(cols, rows);
  const [wTopX, wTopY] = p(1, rows);

  // Face sudeste (x = cols, y = 1..rows)
  quad(
    sMidX, sMidY,
    eTopX, eTopY,
    eTopX, eTopY + skirtH,
    sMidX, sMidY + skirtH,
    '#15131a', '#09080c', 1.2
  );
  // Face sudoeste (y = rows, x = 1..cols)
  quad(
    wTopX, wTopY,
    sMidX, sMidY,
    sMidX, sMidY + skirtH,
    wTopX, wTopY + skirtH,
    '#1d1923', '#09080c', 1.2
  );

  // Friso real de bronze dourado ao longo da fundação
  ctx.strokeStyle = consagrado ? '#ffd54f' : '#a87d34';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wTopX, wTopY + 7);
  ctx.lineTo(sMidX, sMidY + 7);
  ctx.lineTo(eTopX, eTopY + 7);
  ctx.stroke();

  // Nervuras e respiradouros solares na saia sudoeste e sudeste
  const glowColor = consagrado ? '#ffe27a' : '#f0a429';
  for (let x = 2; x < cols; x += 2) {
    const [rx, ry] = p(x, rows);
    ctx.strokeStyle = '#3b2e22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 2);
    ctx.lineTo(rx, ry + skirtH - 2);
    ctx.stroke();

    const [vx0, vy0] = p(x + 0.65, rows);
    const [vx1, vy1] = p(x + 1.35, rows);
    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(vx0, vy0 + 16);
    ctx.lineTo(vx1, vy1 + 16);
    ctx.stroke();
  }
  for (let y = 2; y < rows; y += 2) {
    const [rx, ry] = p(cols, y);
    ctx.strokeStyle = '#2c231b';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(rx, ry + 2);
    ctx.lineTo(rx, ry + skirtH - 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawDominioFloorOverlay(map, curState) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const scanned = !!flags.scan_lacre_sala;
  const gateOpen = !!flags.gate_lacre_frequencia_sala;
  const fragmentTaken = !!flags.collected_fragmento_eco_dominio;
  const consagrado = !!flags.santuario_dominio_consagrado;
  const stanceActive = (curState?.player?.ability?.reveal?.timeLeft ?? 0) > 0;
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.4);

  ctx.save();

  // 1) Trilhos imperiais de bronze flanqueando a Passarela de Ruptura (y=5..7)
  const drawRail = (x0, y0, x1, y1, color, w = 2.2) => {
    const [ax, ay] = p(x0, y0);
    const [bx, by] = p(x1, y1);
    ctx.strokeStyle = '#120f16';
    ctx.lineWidth = w + 3.2;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  };
  const railTone = consagrado ? '#ffe074' : gateOpen ? '#edb847' : '#9c7430';
  drawRail(1.3, 5.0, 13.4, 5.0, railTone, 2.2);
  drawRail(1.3, 7.0, 13.4, 7.0, railTone, 2.2);

  // 2) O ANEL DE RUPTURA — grande círculo concêntrico rúnico no centro da nave (6.4, 6.0)
  {
    const rcx = 6.4, rcy = 6.0;
    const [icx, icy] = p(rcx, rcy);
    const drawIsoCircle = (radW, stroke, lw, fill = null, dash = null) => {
      ctx.save();
      if (dash) ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.ellipse(icx, icy, radW * HW * 1.414, radW * HH * 1.414, 0, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
      ctx.restore();
    };

    const ringGlow = consagrado
      ? 'rgba(255, 224, 112, 0.92)'
      : stanceActive || scanned
        ? `rgba(255, 210, 88, ${(0.66 + 0.28 * pulse).toFixed(2)})`
        : 'rgba(198, 148, 56, 0.72)';

    drawIsoCircle(2.25, '#120f17', 7, 'rgba(18, 14, 20, 0.42)');
    drawIsoCircle(2.25, ringGlow, 2.6);
    drawIsoCircle(1.82, '#8b6629', 1.6);
    drawIsoCircle(1.18, ringGlow, 1.8, consagrado ? 'rgba(255, 196, 64, 0.10)' : 'rgba(24, 18, 14, 0.32)');

    // 16 glifos rúnicos radiais entre o anel externo (2.25) e o interno (1.82)
    ctx.strokeStyle = stanceActive || consagrado ? '#ffe588' : '#d69f3a';
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 16; i++) {
      const ang = (i / 16) * Math.PI * 2 + (consagrado ? t * 0.08 : 0);
      const wx0 = rcx + Math.cos(ang) * 1.86;
      const wy0 = rcy + Math.sin(ang) * 1.86;
      const wx1 = rcx + Math.cos(ang) * 2.19;
      const wy1 = rcy + Math.sin(ang) * 2.19;
      const [gx0, gy0] = p(wx0, wy0);
      const [gx1, gy1] = p(wx1, wy1);
      ctx.beginPath();
      ctx.moveTo(gx0, gy0);
      ctx.lineTo(gx1, gy1);
      ctx.stroke();
    }

    // Brasão de lâmina apontando da coroa do Anel direto para o Lacre (10.5, 6.0)
    const [b0x, b0y] = p(7.6, 6.0);
    const [bLx, bLy] = p(8.35, 5.68);
    const [bTx, bTy] = p(9.75, 6.0);
    const [bRx, bRy] = p(8.35, 6.32);
    ctx.fillStyle = stanceActive || scanned ? 'rgba(255, 204, 72, 0.34)' : 'rgba(176, 128, 44, 0.22)';
    ctx.strokeStyle = ringGlow;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(b0x, b0y);
    ctx.lineTo(bLx, bLy);
    ctx.lineTo(bTx, bTy);
    ctx.lineTo(bRx, bRy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // 3) Veios de falha harmônica (revelados por Postura do Domínio [R]) + fenda de Ruptura [Q]
  if (stanceActive || scanned || gateOpen) {
    const veinAlpha = gateOpen ? 0.55 : stanceActive ? (0.72 + 0.26 * pulse) : (0.42 + 0.24 * pulse);
    const drawFault = (pts, width, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      pts.forEach(([wx, wy], i) => {
        const [px, py] = p(wx, wy);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    };
    const veinCol = `rgba(255, 212, 84, ${veinAlpha.toFixed(2)})`;
    drawFault([[8.2, 5.75], [9.0, 5.55], [9.7, 5.82], [10.45, 5.95]], 2.2, veinCol);
    drawFault([[8.2, 6.25], [9.1, 6.42], [9.8, 6.18], [10.45, 6.05]], 2.2, veinCol);
  }

  // Fenda sísmica permanente onde o Lacre de Frequência foi partido ao meio
  if (gateOpen) {
    const [s0x, s0y] = p(10.45, 4.95);
    const [sMx, sMy] = p(10.52, 6.0);
    const [s1x, s1y] = p(10.45, 7.05);
    ctx.strokeStyle = '#0d090c';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(s0x, s0y); ctx.lineTo(sMx, sMy); ctx.lineTo(s1x, s1y); ctx.stroke();
    ctx.strokeStyle = consagrado ? '#ffe680' : '#ffab2e';
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.moveTo(s0x, s0y); ctx.lineTo(sMx, sMy); ctx.lineTo(s1x, s1y); ctx.stroke();
  }

  // 4) Trono Octogonal da Coroa Antiga (12.5, 6.0) na Câmara Leste
  {
    const [sx, sy] = p(12.5, 6.0);
    const drawIsoOct = (r, fill, stroke, lw = 1.6) => {
      const k = r * 0.72;
      const pts = [
        [r, 0], [k, k], [0, r], [-k, k],
        [-r, 0], [-k, -k], [0, -r], [k, -k],
      ];
      ctx.beginPath();
      pts.forEach(([ox, oy], idx) => {
        const [px, py] = p(12.5 + ox, 6.0 + oy);
        if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    drawIsoOct(1.08, 'rgba(18, 15, 22, 0.92)', '#9e7632', 2.2);
    drawIsoOct(0.74, 'rgba(32, 22, 14, 0.94)', consagrado ? '#ffe680' : '#f2b63d', 1.8);
    drawIsoOct(0.38, !fragmentTaken ? 'rgba(255, 198, 68, 0.36)' : 'rgba(56, 38, 18, 0.52)', '#ffe89c', 1.3);

    if (!fragmentTaken) {
      const beam = ctx.createRadialGradient(sx, sy - 10, 3, sx, sy - 4, 46);
      beam.addColorStop(0, 'rgba(255, 226, 122, 0.42)');
      beam.addColorStop(1, 'rgba(245, 168, 36, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 44, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5) Meio-fio de corte arquitetônico nas bordas frontais
  {
    const [e0, e1] = p(cols, 1);
    const [s0, s1] = p(cols, rows);
    const [w0, w1] = p(1, rows);
    ctx.strokeStyle = '#0d0b11';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w0, w1); ctx.lineTo(s0, s1); ctx.lineTo(e0, e1);
    ctx.stroke();
    ctx.strokeStyle = consagrado ? '#ffd54f' : '#967030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w0, w1 - 1); ctx.lineTo(s0, s1 - 1); ctx.lineTo(e0, e1 - 1);
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
function drawObjectContactShadows() {
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
    if (!o.sombra || o.oculto || (o.hideWhenFlag && state.progress?.flags?.[o.hideWhenFlag]) ||
        (o.showWhenFlag && !state.progress?.flags?.[o.showWhenFlag])) continue;
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
    } else if (o.colunas?.count > 1) {
      // PAREDÃO: uma parede comprida corre ao longo de uma borda, então cada
      // trecho dela está a uma profundidade diferente. O PNG é desenhado em
      // TIRAS VERTICAIS, cada uma ordenada pelo ponto do pé onde ela pisa:
      // quem passa na frente fica na frente, quem nada por trás fica atrás.
      // As tiras são montadas uma vez por objeto (cenário não se mexe).
      let tiras = o.__tiras;
      if (!tiras) {
        const { count, esq, dir } = o.colunas;
        tiras = Array.from({ length: count }, (_, i) => ({
          ...o,
          __coluna: { index: i, count },
          depthOffset: esq + (dir - esq) * ((i + .5) / count),
        }));
        o.__tiras = tiras;
      }
      for (const tira of tiras) drawList.push(tira);
    } else drawList.push(o);
  }

  // Guarda-corpos das pontes Bio: cada trecho é um item com x+y real.
  for (const rail of map.bioBridgeRails ?? []) {
    if (visivel(rail)) drawList.push(rail);
  }

  for (const item of state.collectibles ?? []) {
    if (visivel(item)) drawList.push(item);
  }

  if (!nadadorNoFundo(state.player, map)) drawList.push(state.player);
  // ...o resto da função continua igual (sort, drawItem, loops)
  drawList.sort((a, b) => depthOf(a) - depthOf(b));
  backList.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const drawItem = (item) => {
    if (item.renderType === 'object') {
      if (item.gate && nadadorNoFundo(state.player, map)) {
        ctx.save(); ctx.globalAlpha = .35; drawMapObject(item, state); ctx.restore();
      } else drawMapObject(item, state);
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

  // Paredão de fundo (`ordem` negativa): a falésia de onde o túnel sai é
  // desenhada ANTES da fachada, então o pórtico fica encaixado na rocha.
  for (const o of backList) if ((o.ordem ?? 0) < 0) drawMapObject(o, state);
  // Fachada no extremo do trilho, atrás do trem; é cenográfica, não portal.
  if (map.id === 'ilha_praia_inicial') {
    const rail = backList.find(o => o.id === 'trilho_dimensional_principal');
    if (rail) drawBeachRailTunnel(rail);
  }
  // Casca estrutural das paredes externas da Oficina Bio-Forja / Santuário Domínio / Dársena Maré (atrás de backList).
  if (map.meta?.estiloSala === 'bio_forja') drawBioForjaOuterWallShell(map);
  if (map.meta?.estiloSala === 'dominio_anciao') drawDominioOuterWallShell(map);
  if (map.meta?.estiloSala === 'mare_astral') drawMareAstralOuterWallShell(map);
  if (map.meta?.estiloSala === 'nucleo_10x') drawNucleo10xOuterWallShell(map);
  if (map.meta?.estiloSala === 'carga_eco' && map.meta?.useBackgroundWalls) drawCargoEcoWallShell(map);
  if (map.meta?.estiloSala === 'frequencia_limiar' && map.meta?.useBackgroundWalls) drawFrequencyStationWalls(map);
  // Camada de fundo (trilho, trem, painéis murais): atrás de tudo, só acima do chão.
  for (const o of backList) if ((o.ordem ?? 0) >= 0) drawMapObject(o, state);
  if (map.meta?.estiloSala === 'mare_astral') drawMareAstralWindowLife(map, state);

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

  if (map.meta?.estiloSala === 'bio_forja') drawBioForjaHudCallouts(map, state);
  if (map.meta?.estiloSala === 'dominio_anciao') drawDominioHudCallouts(map, state);
  if (map.meta?.estiloSala === 'mare_astral') drawMareAstralHudCallouts(map, state);
  if (map.meta?.estiloSala === 'nucleo_10x') drawNucleo10xHudCallouts(map, state);
  if (map.meta?.estiloSala === 'carga_eco') drawCargoEcoHudCallouts(map, state);
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
  return { x: end.x + HW + 31, y: end.y + 25 };
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

  if (map.meta?.estiloSala === 'bio_forja') {
    drawBioForjaWallTile(x, y, front);
    return;
  }

  if (map.meta?.estiloSala === 'dominio_anciao') {
    drawDominioWallTile(x, y, front);
    return;
  }

  if (map.meta?.estiloSala === 'mare_astral') {
    drawMareAstralWallTile(x, y, front, map);
    return;
  }

  if (map.meta?.estiloSala === 'nucleo_10x') {
    drawNucleo10xWallTile(x, y, front);
    return;
  }

  if (!front && (x === 0 || y === 0) && map.meta?.estiloParede !== 'simples') {
    if (drawWallSprite(x, y, map)) return;
  }

  drawWallProcedural(x, y, front);
}

function drawBioForjaOuterWallShell(map) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const wallH = 66;
  const thick = 0.42;

  ctx.save();
  // Ala noroeste (x=1, y=1..rows): respaldo contínuo em ferro e bronze oxidado
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(1, rows);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(1 - thick, rows);
    // Face interna visível entre painéis
    quad(i1x, i1y, i0x, i0y, i0x, i0y - wallH, i1x, i1y - wallH, '#1d2725', '#101716', 1);
    // Topo de coroamento da muralha noroeste
    quad(o1x, o1y - wallH, o0x, o0y - wallH, i0x, i0y - wallH, i1x, i1y - wallH, '#2c3835', '#5e4932', 1.2);
    // Testa frontal do topo na ponta oeste
    quad(o1x, o1y, i1x, i1y, i1x, i1y - wallH, o1x, o1y - wallH, '#25302e', '#121918', 1);
  }
  // Ala nordeste (y=1, x=1..cols): respaldo contínuo em ferro e bronze oxidado
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(cols, 1);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(cols, 1 - thick);
    quad(i0x, i0y, i1x, i1y, i1x, i1y - wallH, i0x, i0y - wallH, '#18211f', '#101716', 1);
    quad(o0x, o0y - wallH, o1x, o1y - wallH, i1x, i1y - wallH, i0x, i0y - wallH, '#26312f', '#523f2b', 1.2);
    quad(i1x, i1y, o1x, o1y, o1x, o1y - wallH, i1x, i1y - wallH, '#151e1d', '#0f1615', 1);
  }
  ctx.restore();
}

function drawBioForjaHudCallouts(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const diagnosed = !!flags.bio_placa_diagnostico;
  const gateOpen = !!flags.gate_grade_impeto_vivo;
  const synced = !!flags.oficina_bio_sincronizada;

  ctx.save();
  // 1) Dica tática na pista de impulso (sempre nítida acima dos pilares)
  {
    const [hx, hy] = p(7.65, 6.95);
    const label = gateOpen
      ? (synced ? 'OFICINA SINCRONIZADA' : 'PASSAGEM ESTABILIZADA')
      : diagnosed
        ? 'ALINHE E USE [Q] IMPULSO ▸'
        : '1º [R] DIAGNOSTICAR GRADE';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'center';
    const halfW = Math.ceil(ctx.measureText(label).width * 0.5) + 7;
    ctx.fillStyle = 'rgba(8, 20, 20, 0.88)';
    ctx.fillRect(hx - halfW, hy - 8, halfW * 2, 13);
    ctx.strokeStyle = gateOpen ? 'rgba(110, 242, 198, 0.6)' : diagnosed ? '#35e6d3' : '#d89b48';
    ctx.lineWidth = 1;
    ctx.strokeRect(hx - halfW, hy - 8, halfW * 2, 13);
    ctx.fillStyle = gateOpen ? '#b8f7e2' : diagnosed ? '#c8fff7' : '#ffe2b0';
    ctx.fillText(label, hx, hy + 1.5);
  }

  // 2) Etiqueta de trava exposta sobre a Grade de Ímpeto Vivo após [R]
  if (diagnosed && !gateOpen) {
    const [gx, gy] = p(10.5, 6.0);
    const cx = gx, cy = gy - 66;
    const badge = 'TRAVA EXPOSTA · [Q]';
    ctx.font = 'bold 7.5px monospace';
    ctx.textAlign = 'center';
    const hw = Math.ceil(ctx.measureText(badge).width * 0.5) + 7;
    ctx.fillStyle = 'rgba(6, 22, 22, 0.92)';
    ctx.fillRect(cx - hw, cy - 8, hw * 2, 13);
    ctx.strokeStyle = '#35e6d3';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(cx - hw, cy - 8, hw * 2, 13);
    ctx.fillStyle = '#d4fff6';
    ctx.fillText(badge, cx, cy + 1.5);
  }
  ctx.restore();
}

function drawBioForjaWallTile(x, y, front) {
  // Bordas frontais usam meio-fio + saia; paredes externas (x=0, y=0) usam
  // casca contínua + painéis murais em backList (nunca cobrem objetos!).
  if (front || x === 0 || y === 0) return;

  const tx = (x - y) * HW;
  const ty = (x + y) * HH;

  // Sapatas dos dois pilares de contenção que ladeiam a Grade de Ímpeto Vivo.
  if (x === 10 && (y === 4 || y === 7)) {
    const h = 9;
    quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - h, tx - HW, ty + HH - h, '#2b3634', '#141c1b', 1);
    quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - h, tx, ty + TH - h, '#202928', '#141c1b', 1);
    quad(tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h, '#5c4731', '#221a12', 1);
    return;
  }

  // Anteparo interno de contenção Bio-Forja (x=10): blindagem isométrica de
  // meia-altura (46 px) com almofadas metálicas, tubulação de cobre e plasma.
  const h = 46;
  const synced = !!state.progress?.flags?.oficina_bio_sincronizada;
  const active = synced || !!state.progress?.flags?.gate_grade_impeto_vivo || !!state.progress?.flags?.bio_placa_diagnostico;

  // Face esquerda (voltada para a oficina oeste)
  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - h, tx - HW, ty + HH - h, '#283432', '#121a19', 1);
  // Almofada recuada escura na face oeste
  quad(
    tx - HW * 0.84, ty + HH * 1.16 - 8,
    tx - HW * 0.16, ty + HH * 1.84 - 8,
    tx - HW * 0.16, ty + HH * 1.84 - h + 9,
    tx - HW * 0.84, ty + HH * 1.16 - h + 9,
    '#1c2625', '#0f1615', 0.9
  );
  // Rodapé e friso superior de bronze oxidado na face esquerda
  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - 6, tx - HW, ty + HH - 6, '#624b33', '#1e1710', 0.8);
  quad(tx - HW, ty + HH - h + 6, tx, ty + TH - h + 6, tx, ty + TH - h, tx - HW, ty + HH - h, '#7b5f41', '#241b12', 0.8);

  // Face direita (voltada para o relicário leste)
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - h, tx, ty + TH - h, '#1d2726', '#111817', 1);
  quad(
    tx + HW * 0.16, ty + HH * 1.84 - 8,
    tx + HW * 0.84, ty + HH * 1.16 - 8,
    tx + HW * 0.84, ty + HH * 1.16 - h + 9,
    tx + HW * 0.16, ty + HH * 1.84 - h + 9,
    '#151d1c', '#0d1312', 0.9
  );
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - 6, tx, ty + TH - 6, '#4b3a27', '#1b150e', 0.8);
  quad(tx, ty + TH - h + 6, tx + HW, ty + HH - h + 6, tx + HW, ty + HH - h, tx, ty + TH - h, '#5e4831', '#201810', 0.8);

  // Tubo vertical de cobre + visor de plasma na face oeste
  ctx.save();
  ctx.strokeStyle = '#9c6638';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(tx - HW * 0.5, ty + HH * 1.5 - 6);
  ctx.lineTo(tx - HW * 0.5, ty + HH * 1.5 - h + 6);
  ctx.stroke();

  ctx.strokeStyle = active ? '#35e6d3' : '#d89b48';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(tx - HW * 0.76, ty + HH * 1.24 - h * 0.50);
  ctx.lineTo(tx - HW * 0.24, ty + HH * 1.76 - h * 0.50);
  ctx.stroke();

  // Topo chanfrado com trilho energético correndo ao longo do eixo y (rumo à grade)
  quad(tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h, '#33413e', '#6d5439', 1);
  const cTopX = tx + HW * 0.5, cTopY = ty + HH * 0.5 - h;
  const cBotX = tx - HW * 0.5, cBotY = ty + HH * 1.5 - h;
  ctx.strokeStyle = '#101a19';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cTopX, cTopY);
  ctx.lineTo(cBotX, cBotY);
  ctx.stroke();
  ctx.strokeStyle = synced ? '#9effe6' : active ? '#35e6d3' : '#d89b48';
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
}

function drawDominioOuterWallShell(map) {
  const cols = map.layout[0].length - 1; // 14
  const rows = map.layout.length - 1;    // 11
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const wallH = 68;
  const thick = 0.44;

  ctx.save();
  // Ala noroeste (x=1, y=1..rows): respaldo contínuo em obsidiana negra e bronze real
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(1, rows);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(1 - thick, rows);
    quad(i1x, i1y, i0x, i0y, i0x, i0y - wallH, i1x, i1y - wallH, '#16141c', '#0a080d', 1);
    quad(o1x, o1y - wallH, o0x, o0y - wallH, i0x, i0y - wallH, i1x, i1y - wallH, '#24202d', '#8e6b2d', 1.2);
    quad(o1x, o1y, i1x, i1y, i1x, i1y - wallH, o1x, o1y - wallH, '#1d1925', '#0b090f', 1);
  }
  // Ala nordeste (y=1, x=1..cols): respaldo contínuo em obsidiana negra e bronze real
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(cols, 1);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(cols, 1 - thick);
    quad(i0x, i0y, i1x, i1y, i1x, i1y - wallH, i0x, i0y - wallH, '#121018', '#0a080d', 1);
    quad(o0x, o0y - wallH, o1x, o1y - wallH, i1x, i1y - wallH, i0x, i0y - wallH, '#1f1b28', '#826128', 1.2);
    quad(i1x, i1y, o1x, o1y, o1x, o1y - wallH, i1x, i1y - wallH, '#110e16', '#09070c', 1);
  }
  ctx.restore();
}

function drawDominioHudCallouts(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const scanned = !!flags.scan_lacre_sala;
  const gateOpen = !!flags.gate_lacre_frequencia_sala;
  const consagrado = !!flags.santuario_dominio_consagrado;
  const stanceActive = (curState?.player?.ability?.reveal?.timeLeft ?? 0) > 0;
  const t = performance.now() / 1000;

  ctx.save();
  // Letreiro dourado na Doca B2 (acima do pórtico oeste, sem cobrir as runas do lintel)
  {
    const [dx, dy] = p(1.05, 5.95);
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(14, 11, 18, 0.90)';
    ctx.fillRect(dx - 29, dy - 92, 58, 14);
    ctx.strokeStyle = consagrado ? '#ffe074' : '#c9963a';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 29, dy - 92, 58, 14);
    ctx.fillStyle = consagrado ? '#fff0ad' : '#ffd54f';
    ctx.fillText('DOCA B2', dx, dy - 82);
  }

  // Mira harmônica do ponto frágil sobre o Lacre de Frequência (após [R], antes de [Q])
  if ((stanceActive || scanned) && !gateOpen) {
    const [gx, gy] = p(10.5, 6.0);
    const r = 13 + 3.2 * Math.sin(t * 6.0);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 26 - r);
    ctx.lineTo(gx + r, gy - 26);
    ctx.lineTo(gx, gy - 26 + r);
    ctx.lineTo(gx - r, gy - 26);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(18, 12, 8, 0.90)';
    ctx.fillRect(gx - 54, gy - 58, 108, 14);
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.78)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - 54, gy - 58, 108, 14);
    ctx.fillStyle = '#ffe380';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PONTO FRÁGIL • [Q]', gx, gy - 48);
  }

  // Rasgo luminoso de clivagem no instante em que Golpe de Ruptura [Q] parte um obstáculo
  const flash = curState?.player?.ability?.ruptureFlash;
  if (flash && flash.timeLeft > 0 && flash.duration > 0) {
    const k = flash.timeLeft / flash.duration;
    const [fx, fy] = p(flash.x, flash.y);
    const rad = (1 - k) * 68 + 14;
    ctx.save();
    ctx.strokeStyle = `rgba(255, 224, 112, ${(0.85 * k).toFixed(3)})`;
    ctx.lineWidth = 3.2 * k + 0.8;
    ctx.beginPath();
    ctx.ellipse(fx, fy - 12, rad, rad * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Traço diagonal de espada cortando o selo ao meio
    const len = 54 * (0.65 + 0.35 * (1 - k));
    ctx.strokeStyle = `rgba(255, 248, 210, ${(0.95 * k).toFixed(3)})`;
    ctx.lineWidth = 4.5 * k;
    ctx.beginPath();
    ctx.moveTo(fx - len, fy - 34 - len * 0.42);
    ctx.lineTo(fx + len, fy - 10 + len * 0.42);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function ehGradeMare(x, y) {
  // Canal central de corrente (y=5..6), berço do Núcleo Hidrodimensional e galeria dos janelões
  if ((y === 5 || y === 6) && x >= 2 && x <= 13) return true;
  if (x >= 5 && x <= 7 && y >= 2 && y <= 3) return true;
  if (y === 1 && (x === 3 || x === 4 || x === 7 || x === 8 || x === 12)) return true;
  return false;
}

function drawMareAstralFloorTile(x, y, tx, ty) {
  const usaGrade = ehGradeMare(x, y);
  const spriteId = usaGrade ? 'mare_sala_piso_grade' : 'mare_sala_piso_ardosia';
  const img = getSprite(spriteId);
  const f = img && getFrame(img, 0, 0, 1, 1)?.crop;
  if (!f) {
    const base = usaGrade ? '#0d3146' : '#122230';
    quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, base, '#08131d', 1);
    return true;
  }
  const w = CONFIG.TILE_W * 1.03;
  const h = w * (f.h / f.w);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const flip = !usaGrade && ((x * 7 + y * 13) & 1) === 1;
  ctx.translate(tx, ty - 0.8);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();
  return true;
}

function drawMareAstralUnderlay(map, curState) {
  const cols = map.layout[0].length - 1; // 21
  const rows = map.layout.length - 1;    // 11
  const dockCols = 14;
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const sincronizada = !!flags.darsena_mare_sincronizada;
  const rotaAberta = !!flags.gate_comporta_aquario_mare;

  ctx.save();
  // 1) Halo abissal pelágico sob a Dársena + Grande Aquário Oceânico
  const [cx, cy] = p((cols + 1) * 0.5, (rows + 1) * 0.5);
  const abyss = ctx.createRadialGradient(cx, cy + 24, 40, cx, cy + 24, 780);
  abyss.addColorStop(0, sincronizada ? 'rgba(53, 230, 211, 0.30)' : 'rgba(28, 168, 212, 0.22)');
  abyss.addColorStop(0.55, 'rgba(6, 32, 52, 0.62)');
  abyss.addColorStop(1, 'rgba(3, 12, 22, 0)');
  ctx.fillStyle = abyss;
  ctx.beginPath();
  ctx.ellipse(cx, cy + 28, 820, 390, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2) Saia submarina rebitada da Dársena (x=1..14, y=rows) + saia oceânica do Grande Aquário (x=14..cols)
  const skirtH = 30;
  const [wTopX, wTopY] = p(1, rows);
  const [dMidX, dMidY] = p(dockCols, rows);
  const [sMidX, sMidY] = p(cols, rows);
  const [eTopX, eTopY] = p(cols, 1);

  // Face sudoeste da Dársena (titânio naval)
  quad(wTopX, wTopY, dMidX, dMidY, dMidX, dMidY + skirtH, wTopX, wTopY + skirtH, '#10202e', '#07111a', 1.2);
  // Face sudoeste e sudeste da Bacia Oceânica (basalto marinho + vidro temperado abissal)
  quad(dMidX, dMidY, sMidX, sMidY, sMidX, sMidY + skirtH, dMidX, dMidY + skirtH, '#09293d', '#06131e', 1.2);
  quad(sMidX, sMidY, eTopX, eTopY, eTopX, eTopY + skirtH, sMidX, sMidY + skirtH, '#072234', '#051019', 1.2);

  // Friso de bronze naval contínuo
  ctx.strokeStyle = sincronizada ? '#4ef2e4' : '#8c7548';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(wTopX, wTopY + 7);
  ctx.lineTo(sMidX, sMidY + 7);
  ctx.lineTo(eTopX, eTopY + 7);
  ctx.stroke();

  // Vigias bioluminescentes ao longo da saia frontal
  for (let x = 2; x < cols; x += 2) {
    const [rx, ry] = p(x, rows);
    const isSea = x > dockCols;
    ctx.fillStyle = isSea ? (rotaAberta ? '#5cf7eb' : '#25b8d4') : (sincronizada ? '#4ef2e4' : '#2aa6bd');
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(rx, ry + 16, isSea ? 7 : 4.5, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMareAstralFloorOverlay(map, curState) {
  const cols = map.layout[0].length - 1; // 21
  const rows = map.layout.length - 1;    // 11
  const dockCols = 14;
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const gateOpen = !!flags.gate_fluxo_contido_sala;
  const sincronizada = !!flags.darsena_mare_sincronizada;
  const valvulaAtiva = !!flags.valvula_pressao_mare_equalizada;
  const comportaAberta = !!flags.gate_comporta_aquario_mare;
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 2.6);

  ctx.save();

  // 1) Correntes bioluminescentes pulsando sob as grelhas da Dársena (x=2..13, y=5..6)
  {
    const [a0, a1] = p(2.0, 6.0);
    const [b0, b1] = p(13.6, 6.0);
    const boost = (sincronizada ? 0.16 : 0) + (valvulaAtiva ? 0.10 : 0);
    ctx.strokeStyle = `rgba(53, 230, 211, ${(0.22 + boost + 0.12 * pulse).toFixed(3)})`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(a0, a1);
    ctx.lineTo(b0, b1);
    ctx.stroke();

    // Partículas laminares correndo rumo ao Grande Aquário a leste
    for (let i = 0; i < 6; i++) {
      const u = ((t * 0.24 + i / 6) % 1);
      const wx = 2.2 + u * (gateOpen ? 11.4 : 7.8);
      const [px, py] = p(wx, 5.95 + 0.18 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(150, 252, 255, ${(0.55 * (1 - Math.abs(u - 0.5) * 1.4)).toFixed(3)})`;
      ctx.beginPath();
      ctx.ellipse(px, py, 5, 2.3, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2) Anel hidro-harmônico sob o Núcleo Hidrodimensional (6.1, 3.5) e sob o Relicário (12.5, 6.0)
  {
    const [gx, gy] = p(6.1, 3.5);
    const grad = ctx.createRadialGradient(gx, gy, 6, gx, gy, 74);
    grad.addColorStop(0, sincronizada ? 'rgba(92, 247, 235, 0.42)' : 'rgba(42, 198, 224, 0.26)');
    grad.addColorStop(1, 'rgba(12, 60, 88, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 74, 37, 0, 0, Math.PI * 2);
    ctx.fill();

    const [rx, ry] = p(12.5, 6.0);
    const rGrad = ctx.createRadialGradient(rx, ry, 4, rx, ry, 54);
    rGrad.addColorStop(0, gateOpen ? 'rgba(92, 247, 235, 0.40)' : 'rgba(38, 178, 210, 0.22)');
    rGrad.addColorStop(1, 'rgba(10, 48, 72, 0)');
    ctx.fillStyle = rGrad;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 52, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) Degraus submersos da rampa náutica (x=14..15, y=5..7) rumo ao Grande Aquário Oceânico
  {
    for (let step = 0; step < 3; step++) {
      const sx0 = dockCols + step * 0.32;
      const sx1 = sx0 + 0.30;
      const [r0x, r0y] = p(sx0, 5.06);
      const [r1x, r1y] = p(sx1, 5.06);
      const [r2x, r2y] = p(sx1, 6.94);
      const [r3x, r3y] = p(sx0, 6.94);
      const alpha = (0.76 - step * 0.20).toFixed(2);
      quad(
        r0x, r0y, r1x, r1y, r2x, r2y, r3x, r3y,
        `rgba(24, 58, 78, ${alpha})`,
        comportaAberta ? 'rgba(92, 247, 235, 0.68)' : 'rgba(140, 117, 72, 0.58)',
        1
      );
    }
  }

  // 4) Vida abissal extra dentro do Grande Aquário Oceânico (x=15..20, y=1..10):
  //    águas-vivas bioluminescentes, anéis de corrente rumo ao Arco da Enseada e cáusticas
  {
    const medusas = [
      { bx: 16.2, by: 2.8, amp: 0.42, spd: 0.75, ph: 0.4, sz: 8.5 },
      { bx: 18.4, by: 3.4, amp: 0.50, spd: 0.62, ph: 2.1, sz: 10.0 },
      { bx: 16.8, by: 8.6, amp: 0.46, spd: 0.68, ph: 3.7, sz: 9.2 },
      { bx: 19.1, by: 8.2, amp: 0.38, spd: 0.82, ph: 5.0, sz: 7.8 },
      { bx: 17.6, by: 5.9, amp: 0.34, spd: 0.90, ph: 1.3, sz: 8.0 },
    ];
    for (const m of medusas) {
      const wx = m.bx + Math.cos(t * m.spd + m.ph) * m.amp * 0.6;
      const wy = m.by + Math.sin(t * m.spd + m.ph) * m.amp;
      const [mx, my] = p(wx, wy);
      const bell = m.sz * (0.88 + 0.16 * Math.sin(t * 3.1 + m.ph));

      const halo = ctx.createRadialGradient(mx, my, 1, mx, my, bell * 2.3);
      halo.addColorStop(0, 'rgba(130, 255, 248, 0.42)');
      halo.addColorStop(1, 'rgba(30, 180, 210, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(mx, my, bell * 2.3, 0, Math.PI * 2);
      ctx.fill();

      // Umbela translúcida da água-viva
      ctx.fillStyle = 'rgba(116, 250, 242, 0.62)';
      ctx.strokeStyle = 'rgba(200, 255, 255, 0.82)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(mx, my, bell, bell * 0.62, -0.3, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tentáculos ondulantes
      ctx.strokeStyle = 'rgba(126, 248, 255, 0.48)';
      ctx.lineWidth = 1;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(mx + k * bell * 0.42, my);
        ctx.quadraticCurveTo(
          mx + k * bell * 0.5 + Math.sin(t * 4 + m.ph + k) * 4,
          my + bell * 0.7,
          mx + k * bell * 0.35 - Math.cos(t * 3.4 + m.ph) * 3,
          my + bell * 1.35
        );
        ctx.stroke();
      }
    }

    // Trilha luminosa de corrente guiando da rampa (15.0, 6.0) até o Arco da Enseada (19.6, 5.8)
    for (let i = 0; i < 4; i++) {
      const wx = 15.4 + i * 1.15;
      const [cx, cy] = p(wx, 5.95);
      const glow = 0.24 + 0.18 * Math.sin(t * 2.8 - i * 0.8);
      ctx.strokeStyle = `rgba(92, 247, 235, ${glow.toFixed(3)})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 16, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 5) Meio-fio arquitetônico frontal ao redor de toda a sala + aquário
  {
    const [e0, e1] = p(cols, 1);
    const [s0, s1] = p(cols, rows);
    const [w0, w1] = p(1, rows);
    ctx.strokeStyle = '#07131d';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(w0, w1); ctx.lineTo(s0, s1); ctx.lineTo(e0, e1);
    ctx.stroke();
    ctx.strokeStyle = sincronizada ? '#4ef2e4' : '#8c7548';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w0, w1 - 1); ctx.lineTo(s0, s1 - 1); ctx.lineTo(e0, e1 - 1);
    ctx.stroke();
  }

  ctx.restore();
}

function drawMareAstralOuterWallShell(map) {
  const cols = map.layout[0].length - 1; // 21
  const rows = map.layout.length - 1;    // 11
  const dockCols = 14;
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const wallH = 68;
  const seaWallH = 26;
  const thick = 0.44;

  ctx.save();
  // Ala noroeste (x=1, y=1..rows): antepara submarina em aço-titânio e bronze
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(1, rows);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(1 - thick, rows);
    quad(i1x, i1y, i0x, i0y, i0x, i0y - wallH, i1x, i1y - wallH, '#0f1f2d', '#071019', 1);
    quad(o1x, o1y - wallH, o0x, o0y - wallH, i0x, i0y - wallH, i1x, i1y - wallH, '#1b3347', '#8a7346', 1.2);
    quad(o1x, o1y, i1x, i1y, i1x, i1y - wallH, o1x, o1y - wallH, '#152838', '#08121b', 1);
  }
  // Ala nordeste da Dársena (y=1, x=1..dockCols): galeria dos janelões do aquário
  {
    const [i0x, i0y] = p(1, 1);
    const [i1x, i1y] = p(dockCols, 1);
    const [o0x, o0y] = p(1 - thick, 1 - thick);
    const [o1x, o1y] = p(dockCols, 1 - thick);
    quad(i0x, i0y, i1x, i1y, i1x, i1y - wallH, i0x, i0y - wallH, '#0d1c29', '#071019', 1);
    quad(o0x, o0y - wallH, o1x, o1y - wallH, i1x, i1y - wallH, i0x, i0y - wallH, '#193042', '#8a7346', 1.2);
    quad(i1x, i1y, o1x, o1y, o1x, o1y - wallH, i1x, i1y - wallH, '#0f202e', '#071019', 1);
  }
  // Borda nordeste rebaixada do Grande Aquário Oceânico (y=1, x=dockCols..cols): parapeito oceânico aberto
  {
    const [i0x, i0y] = p(dockCols, 1);
    const [i1x, i1y] = p(cols, 1);
    const [o0x, o0y] = p(dockCols, 1 - thick);
    const [o1x, o1y] = p(cols, 1 - thick);
    quad(i0x, i0y, i1x, i1y, i1x, i1y - seaWallH, i0x, i0y - seaWallH, '#0c283b', '#07141f', 1);
    quad(o0x, o0y - seaWallH, o1x, o1y - seaWallH, i1x, i1y - seaWallH, i0x, i0y - seaWallH, '#194258', '#44c9c2', 1.2);
  }
  ctx.restore();
}

function drawMareAstralWindowLife(map, curState) {
  // Animação viva contida exatamente dentro dos 3 janelões panorâmicos da parede nordeste (y=1.0)
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const t = performance.now() / 1000;
  const windows = [
    { wx: 5.25, wy: 1.0, seed: 1.1 },
    { wx: 8.35, wy: 1.0, seed: 3.4 },
    { wx: 12.55, wy: 1.0, seed: 5.7 },
  ];

  ctx.save();
  for (const w of windows) {
    const [cx, cy] = p(w.wx, w.wy);
    // Feixes de luz cáustica suaves dentro da moldura do vidro
    for (let k = -1; k <= 1; k++) {
      const sway = Math.sin(t * 1.1 + w.seed + k) * 3.5;
      const bx = cx + k * 18 + sway;
      const by = cy - 34 + k * 9;
      const ray = ctx.createLinearGradient(bx - 4, by - 16, bx + 6, by + 14);
      ray.addColorStop(0, 'rgba(130, 252, 255, 0.20)');
      ray.addColorStop(1, 'rgba(30, 170, 210, 0)');
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.moveTo(bx - 4, by - 15);
      ctx.lineTo(bx + 4, by - 12);
      ctx.lineTo(bx + 8, by + 13);
      ctx.lineTo(bx - 2, by + 10);
      ctx.closePath();
      ctx.fill();
    }

    // Cardume luminoso cruzando suavemente o janelão ao longo do eixo +2:+1
    for (let f = 0; f < 3; f++) {
      const u = ((t * 0.14 + w.seed * 0.2 + f * 0.31) % 1) - 0.5;
      const fx = cx + u * 58;
      const fy = cy - 33 + u * 29 + Math.sin(t * 2.4 + f + w.seed) * 2.5;
      ctx.fillStyle = 'rgba(148, 252, 255, 0.56)';
      ctx.beginPath();
      ctx.ellipse(fx, fy, 3.0, 1.3, 0.46, 0, Math.PI * 2);
      ctx.fill();
    }

    // Esporos bioluminescentes ascendentes dentro do vidro
    for (let s = 0; s < 4; s++) {
      const v = (t * 0.26 + s * 0.24 + w.seed) % 1;
      const sx = cx + (s - 1.5) * 13 + Math.sin(t * 1.8 + s) * 2;
      const sy = cy - 18 + (s - 1.5) * 6.5 - v * 24;
      ctx.fillStyle = `rgba(176, 255, 252, ${(0.60 * (1 - v)).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawMareAstralHudCallouts(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const scanned = !!flags.scan_fluxo_sala;
  const gateOpen = !!flags.gate_fluxo_contido_sala;
  const sincronizada = !!flags.darsena_mare_sincronizada;
  const comportaAberta = !!flags.gate_comporta_aquario_mare;
  const nadoPronto = !!flags.aprendeu_a_nadar || lerArvore(curState?.progress).nivel >= 4;
  const revealActive = (curState?.player?.ability?.reveal?.timeLeft ?? 0) > 0;
  const t = performance.now() / 1000;

  ctx.save();
  // 1) Letreiro náutico centrado no lintel da Eclusa Doca A2
  {
    const [dx, dy] = p(1.05, 5.95);
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(7, 19, 29, 0.90)';
    ctx.fillRect(dx - 29, dy - 92, 58, 14);
    ctx.strokeStyle = sincronizada ? '#5cf7eb' : '#2fb8cc';
    ctx.lineWidth = 1;
    ctx.strokeRect(dx - 29, dy - 92, 58, 14);
    ctx.fillStyle = sincronizada ? '#b8ffff' : '#6eeeff';
    ctx.fillText('DOCA A2', dx, dy - 82);
  }

  // 2) Janela laminar revelada pelo Senso de Corrente [R] sobre o Fluxo Contido
  if ((revealActive || scanned) && !gateOpen) {
    const [gx, gy] = p(10.5, 6.0);
    const r = 13 + 3.0 * Math.sin(t * 5.6);
    ctx.strokeStyle = '#5cf7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy - 26, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(6, 22, 34, 0.90)';
    ctx.fillRect(gx - 58, gy - 58, 116, 14);
    ctx.strokeStyle = 'rgba(92, 247, 235, 0.80)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx - 58, gy - 58, 116, 14);
    ctx.fillStyle = '#9efcff';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('JANELA LAMINAR • [Q]', gx, gy - 48);
  }

  // 3) Indicador da Comporta do Aquário / Rota de Nado Livre para a Enseada dos Ecos
  if (gateOpen) {
    const [ax, ay] = comportaAberta ? p(18.5, 5.7) : p(13.85, 4.65);
    const prontoAbrir = !comportaAberta && sincronizada && !!flags.visitou_praia_inicial && nadoPronto;
    const label = comportaAberta
      ? 'CONDUTO -> ENSEADA DOS ECOS'
      : prontoAbrir
        ? 'ABRIR ROTA OCEÂNICA • [E]'
        : 'ROTA MARINHA • TREINE NA PRAIA';
    const w = label.length * 5.2 + 14;
    const yOff = comportaAberta ? 86 : 74;
    ctx.fillStyle = 'rgba(6, 22, 34, 0.88)';
    ctx.fillRect(ax - w / 2, ay - yOff, w, 14);
    ctx.strokeStyle = comportaAberta || prontoAbrir ? '#5cf7eb' : '#6c8ea3';
    ctx.lineWidth = 1;
    ctx.strokeRect(ax - w / 2, ay - yOff, w, 14);
    ctx.fillStyle = comportaAberta || prontoAbrir ? '#b8ffff' : '#a8c8d8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, ax, ay - yOff + 10);
  }

  // 4) Onda de expansão fluida no Passo de Corrente [Q] / abertura da comporta
  const tideFlash = curState?.player?.ability?.tideFlash;
  if (tideFlash && tideFlash.timeLeft > 0 && tideFlash.duration > 0) {
    const k = tideFlash.timeLeft / tideFlash.duration;
    const [fx, fy] = p(tideFlash.x, tideFlash.y);
    const rad = (1 - k) * 76 + 16;
    ctx.strokeStyle = `rgba(92, 247, 235, ${(0.88 * k).toFixed(3)})`;
    ctx.lineWidth = 3.2 * k + 0.8;
    ctx.beginPath();
    ctx.ellipse(fx, fy - 10, rad, rad * 0.5, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMareAstralWallTile(x, y, front, map) {
  if (front || x === 0 || y === 0) return;
  const water = map?.aguaPraia?.[y]?.[x];
  if (water && 'YyDdX'.includes(water)) return;

  const tx = (x - y) * HW;
  const ty = (x + y) * HH;
  const flags = state?.progress?.flags ?? {};
  const sincronizada = !!flags.darsena_mare_sincronizada;
  const active = sincronizada || !!flags.gate_fluxo_contido_sala || !!flags.scan_fluxo_sala;
  const cyanStroke = sincronizada ? '#7efcff' : active ? '#4ef2e4' : '#2b8ea8';

  // Cais leste rebaixado (x = 14): mureta náutica de ardósia e bronze entre o Relicário e o Aquário
  const isSeawall = x === 14;
  const h = isSeawall ? 20 : 48;

  // Face sudoeste
  quad(
    tx - HW, ty + HH,
    tx, ty + TH,
    tx, ty + TH - h,
    tx - HW, ty + HH - h,
    isSeawall ? '#132838' : '#102231',
    '#07111a',
    1
  );
  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - 5, tx - HW, ty + HH - 5, '#6d5b38', '#141c24', 0.8);
  quad(tx - HW, ty + HH - h + 5, tx, ty + TH - h + 5, tx, ty + TH - h, tx - HW, ty + HH - h, '#8c7548', '#18222c', 0.8);

  // Face sudeste
  quad(
    tx, ty + TH,
    tx + HW, ty + HH,
    tx + HW, ty + HH - h,
    tx, ty + TH - h,
    isSeawall ? '#0e2231' : '#0c1b27',
    '#060f17',
    0.9
  );
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - 5, tx, ty + TH - 5, '#594a2d', '#111820', 0.8);
  quad(tx, ty + TH - h + 5, tx + HW, ty + HH - h + 5, tx + HW, ty + HH - h, tx, ty + TH - h, '#75613b', '#141d26', 0.8);

  // Topo em titânio naval com duto hidrodinâmico ciano rumo ao pórtico
  quad(tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h, '#1c3548', '#8a7346', 1);
  ctx.save();
  if (!isSeawall) {
    ctx.strokeStyle = cyanStroke;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(tx - HW * 0.5, ty + HH * 1.5 - 8);
    ctx.lineTo(tx - HW * 0.5, ty + HH * 1.5 - h + 8);
    ctx.stroke();
  }
  const cTopX = tx + HW * 0.5, cTopY = ty + HH * 0.5 - h;
  const cBotX = tx - HW * 0.5, cBotY = ty + HH * 1.5 - h;
  ctx.strokeStyle = '#07131d';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(cTopX, cTopY);
  ctx.lineTo(cBotX, cBotY);
  ctx.stroke();
  ctx.strokeStyle = cyanStroke;
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.restore();
}

// =====================================================================
// BASE DOS VETORES — NÚCLEO 10X (grafite usinado, indução verde-neon)
// =====================================================================
// =====================================================================
// ÁREA DE CARGA VIVA — bay compacto por arquétipo (R → Q → fragmento).
// Mesmo tamanho das câmaras antigas; a vida é luz, esteira, guindaste,
// drone de conferência e campo da trava. Nada aqui decide colisão.
// =====================================================================
function drawCargoEcoFloorTile(x, y, tx, ty, map) {
  const spriteId = {
    bio: 'bio_sala_piso_placa',
    dominio: 'dom_sala_piso_obsidiana',
    mare: 'mare_sala_piso_ardosia',
    nucleo: 'nucleo_sala_piso_grafite',
  }[map.meta?.cargoKey] ?? 'nucleo_sala_piso_grafite';
  const img = getSprite(spriteId);
  const f = img && getFrame(img, 0, 0, 1, 1)?.crop;
  if (!f) return false;
  const w = CONFIG.TILE_W * 1.03;
  const h = w * (f.h / f.w);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const flip = ((x * 7 + y * 13) & 1) === 1;
  ctx.translate(tx, ty - 0.8);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();
  return true;
}

// Casca do bay: paredes-contêiner baixas e divisória de carga no lugar dos
// blocos genéricos. Colisão continua vindo do layout/walkMask.
function drawCargoEcoWallShell(map) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const theme = cargoTheme(map);
  const cols = map.layout[0].length - 1, rows = map.layout.length - 1;
  const h = 20;
  ctx.save();
  const panel = (x0, y0, x1, y1, fill) => {
    const [ax, ay] = p(x0, y0), [bx, by] = p(x1, y1);
    quad(ax, ay, bx, by, bx, by - h, ax, ay - h, fill, '#05080c', 1);
    ctx.strokeStyle = theme; ctx.globalAlpha = 0.32; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ax, ay - h + 5); ctx.lineTo(bx, by - h + 5); ctx.stroke();
    ctx.globalAlpha = 1;
  };
  for (let x = 1; x < cols; x++) {
    panel(x, 1, x + 1, 1, '#141c26');
    panel(x, rows, x + 1, rows, '#0e151e');
  }
  for (let y = 1; y < rows; y++) {
    panel(1, y, 1, y + 1, '#101822');
    panel(cols, y, cols, y + 1, '#0c131b');
  }
  // As divisórias acompanham TODOS os tiles sólidos internos, inclusive os
  // da Bio-Forja. Sua altura baixa mantém a leitura da sala e da passagem.
  for (let d = 2; d < cols + rows; d++) {
    for (let x = 1; x < cols; x++) {
      const y = d - x;
      if (y < 1 || y >= rows || map.layout[y]?.[x] !== 1) continue;
      // A divisória termina no MESMO plano dos postes da trava. Cubos de
      // um tile inteiro engoliam as extremidades mesmo com o sprite alinhado.
      const divider = x === (map.meta?.cargoKey === 'bio' ? 10 : 5);
      const x0 = divider ? x + .46 : x, x1 = divider ? x + .54 : x + 1;
      const [ax, ay] = p(x0, y), [bx, by] = p(x1, y);
      const [cx, cy] = p(x1, y + 1), [dx, dy] = p(x0, y + 1);
      const ch = 24;
      quad(ax, ay - ch, bx, by - ch, cx, cy - ch, dx, dy - ch, '#202c37', '#101820', 1);
      quad(dx, dy, cx, cy, cx, cy - ch, dx, dy - ch, '#121c25', '#080e14', 1);
      quad(bx, by, cx, cy, cx, cy - ch, bx, by - ch, '#101922', '#080e14', 1);
      ctx.strokeStyle = theme; ctx.globalAlpha = 0.28; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(dx + 3, dy - 6); ctx.lineTo(cx - 3, cy - 6); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
}

// Plataformas, trilhas e circuitos são cenografia: não alteram colisão.
function frequencyPoint(x, y) { return [(x - y) * HW, (x + y) * HH]; }
function frequencySlab(x0, y0, x1, y1, fill, line = '#73837e') {
  const a = frequencyPoint(x0, y0), b = frequencyPoint(x1, y0);
  const c = frequencyPoint(x1, y1), d = frequencyPoint(x0, y1);
  quad(...a, ...b, ...c, ...d, fill, line, 1);
}
function frequencyLine(points, color, width) {
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(...frequencyPoint(...points[0]));
  for (const point of points.slice(1)) ctx.lineTo(...frequencyPoint(...point));
  ctx.stroke();
}

function drawFrequencyExteriorFloor(curState) {
  ctx.save();
  // Pequeno cais técnico em pedra, integrado à areia sob a entrada.
  frequencySlab(16.4, 9.2, 19.6, 12.2, '#59615a', '#3d4743');
  frequencySlab(16.55, 9.35, 19.45, 12.05, '#767b6c', '#9b9c88');
  for (let x = 17; x < 19.5; x += .55) frequencyLine([[x, 9.4], [x, 12]], 'rgba(44,57,53,.35)', 1);
  // Passarela baixa de manutenção liga o receptor à soleira, sem ocupar a rota da praia.
  frequencyLine([[12.5, 14.5], [14.5, 14.5], [16.9, 11.55], [18.5, 11.25]], 'rgba(51,53,44,.42)', 13);
  frequencyLine([[12.5, 14.5], [14.5, 14.5], [16.9, 11.55], [18.5, 11.25]], '#a8a18a', 8);
  frequencyLine([[12.5, 14.5], [14.5, 14.5], [16.9, 11.55], [18.5, 11.25]], 'rgba(50,71,64,.7)', 1);
  const [rx, ry] = frequencyPoint(12.5, 14.5);
  // Contato sob o pedestal, não uma sombra separada à frente.
  ctx.fillStyle = 'rgba(38,42,36,.35)'; ctx.beginPath(); ctx.ellipse(rx, ry - 5, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
  // A iluminação da soleira confirma o sinal, sem substituir o aviso textual.
  ctx.fillStyle = curState.progress?.flags?.frequencia666Registrada ? '#75e8d2' : '#d4a76d';
  for (const [x,y] of [[18.15,11.45],[18.9,11.45]]) { const [px,py]=frequencyPoint(x,y); ctx.beginPath(); ctx.ellipse(px,py,3,1.5,0,0,Math.PI*2);ctx.fill(); }
  ctx.restore();
}

function drawFrequencyStationWalls(map) {
  const cols = map.layout[0].length - 1, rows = map.layout.length - 1, h = 31;
  ctx.save();
  function panel(x0,y0,x1,y1,back, height = h) {
    const h = height;
    const [ax,ay]=frequencyPoint(x0,y0), [bx,by]=frequencyPoint(x1,y1);
    quad(ax,ay,bx,by,bx,by-h,ax,ay-h,back ? '#1d2a30' : '#101b21','#071015',1);
    ctx.strokeStyle = '#65746e'; ctx.globalAlpha = .55; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(ax,ay-h+4);ctx.lineTo(bx,by-h+4);ctx.stroke();
    ctx.strokeStyle = '#44bbae'; ctx.globalAlpha = .45;
    ctx.beginPath();ctx.moveTo(ax,ay-7);ctx.lineTo(bx,by-7);ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle='#9b885f';ctx.beginPath();ctx.arc((ax+bx)/2,(ay+by)/2-h+9,1.5,0,Math.PI*2);ctx.fill();
  }
  for (let x=1;x<cols;x++) { panel(x,1,x+1,1,true); panel(x,rows,x+1,rows,false); }
  for (let y=1;y<rows;y++) { panel(1,y,1,y+1,true, y >= 7 && y <= 9 ? 102 : h); panel(cols,y,cols,y+1,false); }
  // Tubulação presa à parede de fundo e janelas de serviço: detalhes fixos,
  // desenhados no mesmo plano isométrico que os painéis da casca.
  for (const offset of [13, 17]) {
    const [ax,ay]=frequencyPoint(1,1), [bx,by]=frequencyPoint(cols,1);
    ctx.strokeStyle=offset===13?'#080f12':'#8b8266';ctx.lineWidth=offset===13?4:1.2;
    ctx.beginPath();ctx.moveTo(ax,ay-offset);ctx.lineTo(bx,by-offset);ctx.stroke();
  }
  for (const x of [2,3,11,12]) {
    const a=frequencyPoint(x+.15,1), b=frequencyPoint(x+.85,1);
    quad(a[0],a[1]-20,b[0],b[1]-20,b[0],b[1]-29,a[0],a[1]-29,'#0b292d','#50665e',1);
    ctx.strokeStyle='#4cc7bd';ctx.globalAlpha=.6;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(a[0]+2,a[1]-24);ctx.lineTo(b[0]-2,b[1]-24);ctx.stroke();ctx.globalAlpha=1;
  }
  ctx.restore();
}

function drawFrequencyStationFloor(curState) {
  const p = frequencyPoint, objects = curState.objects ?? [], flags = curState.progress?.flags ?? {};
  const control = objects.find(o => o.id === 'console_limiar_666');
  if (!control) return;
  const [cx, cy] = p(control.x, control.y);
  ctx.save();
  // Dais em dois níveis, moldura e placas em vez de um piso uniforme.
  frequencySlab(5.7,1.25,9.4,4.35,'#172b2d','#5e7974');
  frequencySlab(5.95,1.5,9.15,4.05,'#26383a','#ad9b71');
  frequencySlab(6.2,1.75,8.9,3.8,'#17282c','#546b63');
  frequencySlab(1,7.2,2.25,9.7,'rgba(26,45,45,.85)','#766d55');
  frequencySlab(2.0,5.3,4.4,7.35,'rgba(26,45,45,.85)','#766d55');
  frequencySlab(12.3,5.5,13.8,7.2,'rgba(26,45,45,.85)','#766d55');
  // Corredor central e faixa de segurança guiam até o limiar.
  frequencySlab(6.65,4.4,8.35,8.8,'rgba(33,53,54,.72)','#718177');
  for(let y=4.65;y<8.7;y+=.42) frequencyLine([[6.72,y],[6.94,y+.16]],'rgba(212,164,78,.65)',2);
  // Conduítes seguem cantos da arquitetura, sem atravessar aleatoriamente a sala.
  const anchors = [
    ['ancora_666_origem', 'freq666_ancora_origem', '#ffc878', 'rgba(255,170,65,.24)'],
    ['ancora_666_retorno', 'freq666_ancora_retorno', '#79e8d4', 'rgba(74,245,208,.23)'],
    ['ancora_666_memoria', 'freq666_ancora_memoria', '#b9a8ff', 'rgba(159,139,255,.24)'],
  ];
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t = reduced ? 0 : performance.now()/1000;
  for (const [id, flag, activeColor, activeGlow] of anchors) {
    const item = objects.find(o => o.id === id); if (!item) continue;
    const [x, y] = p(item.x, item.y);
    const route = [[item.x,item.y],[control.x,item.y],[control.x,control.y]];
    frequencyLine(route,'#090f13',8); frequencyLine(route,'#52615a',4);
    frequencyLine(route,flags[flag] ? activeColor : '#a67949',1.5);
    ctx.strokeStyle=flags[flag]?activeColor:'#ca9a55';ctx.globalAlpha=.75;ctx.lineWidth=1.4;
    ctx.beginPath();ctx.ellipse(x,y-5,24,11,0,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.ellipse(x,y-5,19,8,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
    const glow=ctx.createRadialGradient(x,y,1,x,y,32);glow.addColorStop(0,flags[flag]?activeGlow:'rgba(247,169,74,.13)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(x,y,32,14,0,0,Math.PI*2);ctx.fill();
    if (flags[flag]) { const q=(t*.25)%1; const [px,py]=p(item.x+(control.x-item.x)*q,item.y);ctx.fillStyle='#bcfff0';ctx.beginPath();ctx.arc(px,py,2,0,Math.PI*2);ctx.fill(); }
  }
  const gate = objects.find(o => o.id === 'anel_limiar_666');
  if (gate) {
    const [gx,gy]=p(gate.x,gate.y);
    frequencyLine([[control.x,control.y],[gate.x,gate.y]],'#090f13',8);
    frequencyLine([[control.x,control.y],[gate.x,gate.y]],flags.freq666_limiar_estavel?'#65e5cf':'#a07850',2);
    ctx.strokeStyle=flags.freq666_limiar_estavel?'#70e7d4':'#b5905a';ctx.globalAlpha=.45;ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(gx,gy-7,70,20,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
  }
  // Partículas discretas de luz, congeladas quando movimento reduzido é pedido.
  const mote = getSprite('freq666_fx_poeira');
  if (mote) { ctx.save(); ctx.globalCompositeOperation='screen'; ctx.globalAlpha=.28;
    for (let i=0;i<6;i++) { const [mx,my]=p(3+(i*1.7)%9, 3+(i*2.3)%5);
      ctx.drawImage(mote,mx-2,my-18-(reduced?0:(t*3+i*7)%18),4,4); } ctx.restore(); }
  // Marcas de orientação diferenciadas por forma e cor, sem depender da cor.
  ctx.font='bold 7px monospace'; ctx.textAlign='center';ctx.fillStyle='rgba(205,223,199,.75)';
  for (const [x,y,label] of [[3.5,4.15,'I  ORIGEM'],[11.5,4.2,'II  RETORNO'],[11.5,8.2,'III  MEMÓRIA']]) { const [px,py]=p(x,y);ctx.fillText(label,px,py); }
  ctx.restore();
}

// Sobreposições discretas na arte existente: nenhum objeto ou interação extra.
function drawFrequencyObjectLife(object, image) {
  const ids = ['terminal_frequencia_666', 'registro_estacao_666', 'baliza_666_receptor',
    'baliza_666_entrada', 'reator_estacao_666', 'console_limiar_666'];
  if (!ids.includes(object.id)) return;
  const frame = getFrame(image, 0, 0, 1, 1)?.crop;
  if (!frame) return;
  const w = object.larguraPx, h = w * frame.h / frame.w;
  const x = (object.x - object.y) * HW + (object.ajusteX ?? 0) - w * (object.pivotX ?? .5);
  const y = (object.x + object.y) * HH + (object.ajusteY ?? 0) - h * (object.pivotY ?? 1);
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t = reduced ? 0 : performance.now() / 1000;
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  if (object.id === 'terminal_frequencia_666' || object.id === 'registro_estacao_666') {
    const fx = getSprite('freq666_fx_sinal');
    if (fx) { ctx.globalAlpha = .25 + .12 * Math.sin(t * 2); ctx.drawImage(fx, x+w*.48, y+h*.40, w*.18, h*.035); }
  } else if (object.id.startsWith('baliza_666_')) {
    const fx = getSprite('freq666_fx_baliza');
    if (fx) { ctx.globalAlpha = .24 + .08 * Math.sin(t * 1.7); ctx.drawImage(fx, x+w*.23, y+h*.20, w*.54, w*.54); }
  } else if (object.id === 'reator_estacao_666') {
    const fx = getSprite('freq666_fx_vapor');
    if (fx) { ctx.globalAlpha = .12 + .05 * Math.sin(t); ctx.drawImage(fx, x+w*.38, y-h*.14 - (reduced ? 0 : (t*2)%5), w*.16, h*.20); }
  } else {
    const fx = getSprite('freq666_fx_centelha');
    if (fx) { ctx.globalAlpha = .13 + .10 * Math.max(0, Math.sin(t * 2)); ctx.drawImage(fx, x+w*.49, y+h*.18, w*.12, w*.12); }
  }
  ctx.restore();
}

function drawFrequencyThreshold(object, curState) {
  const image = getSprite(object.sprite);
  const config = getObjectSpriteConfig(object.sprite);
  if (!image || !drawCroppedObject(object,image,config)) return;
  const frame = getFrame(image,0,0,1,1)?.crop;
  if (!frame) return;
  const w=object.larguraPx, h=w*frame.h/frame.w;
  const x=(object.x-object.y)*HW, y=(object.x+object.y)*HH;
  const stable=!!curState.progress?.flags?.freq666_limiar_estavel;
  const reduced=typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const t=reduced ? 0 : performance.now()/1000;
  // Vórtice limitado à abertura da própria arte; o aro nunca é apagado.
  ctx.save();ctx.translate(x-w*.02,y-h*((object.pivotY ?? 1)-.395));ctx.rotate(-.25);
  ctx.beginPath();ctx.ellipse(0,0,w*.205,h*.225,0,0,Math.PI*2);ctx.clip();
  if (!stable) { ctx.fillStyle='rgba(4,11,14,.84)';ctx.fillRect(-w,-h,w*2,h*2); }
  else {
    const vortex = getSprite('freq666_fx_vortice');
    if (vortex) {
      ctx.save(); ctx.globalAlpha = .18 + .05 * Math.sin(t * 1.2);
      ctx.rotate(t * .07); ctx.drawImage(vortex, -w*.22, -h*.22, w*.44, h*.44); ctx.restore();
    }
    const light=ctx.createRadialGradient(0,0,1,0,0,w*.2);
    light.addColorStop(0,'rgba(239,92,86,.35)');light.addColorStop(.45,'rgba(72,231,204,.12)');light.addColorStop(1,'rgba(6,25,26,0)');
    ctx.fillStyle=light;ctx.fillRect(-w,-h,w*2,h*2);
    ctx.strokeStyle='rgba(150,255,235,.28)';ctx.lineWidth=1;
    for(let i=0;i<3;i++){ const r=9+i*6;ctx.beginPath();ctx.ellipse(0,0,r,r*1.38,t*.22+i,0,Math.PI*1.2);ctx.stroke(); }
  }
  ctx.restore();
}

function cargoTheme(map) { return map.meta?.corTema || '#35E6D3'; }
function cargoGateObject(curState) {
  return (curState?.objects ?? []).find(o => o?.gate || o?.dashPassable) ?? null;
}
function cargoFragmentObject(curState) {
  return (curState?.collectibles ?? []).find(c => c.id === 'fragmento_sincronizacao') ?? null;
}
function cargoGateOpen(gate, flags) {
  if (!gate) return false;
  if (gate.dashPassable) return !!flags.fragmentoSincronizacaoColetado;
  return !!(gate.aberto || flags[`gate_${gate.id}`]);
}

function drawCargoEcoUnderlay(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const theme = cargoTheme(map);
  const cols = map.layout[0].length - 1, rows = map.layout.length - 1;
  const [cx, cy] = p((cols + 1) / 2, (rows + 1) / 2);
  ctx.save();
  const halo = ctx.createRadialGradient(cx, cy + 16, 24, cx, cy + 16, 520);
  halo.addColorStop(0, 'rgba(20,32,40,0.55)');
  halo.addColorStop(0.6, 'rgba(8,14,20,0.72)');
  halo.addColorStop(1, 'rgba(3,6,10,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.ellipse(cx, cy + 18, 560, 280, 0, 0, Math.PI * 2); ctx.fill();
  // Um brilho difuso, sem a elipse sólida que parecia uma plataforma.
  const tintHalo = ctx.createRadialGradient(cx, cy + 18, 20, cx, cy + 18, 390);
  tintHalo.addColorStop(0, theme); tintHalo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.10; ctx.fillStyle = tintHalo;
  ctx.beginPath(); ctx.ellipse(cx, cy + 18, 390, 195, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  const skirt = 22;
  const [wTopX, wTopY] = p(1, rows);
  const [sMidX, sMidY] = p(cols, rows);
  const [eTopX, eTopY] = p(cols, 1);
  quad(wTopX, wTopY, sMidX, sMidY, sMidX, sMidY + skirt, wTopX, wTopY + skirt, '#0c1218', '#05080c', 1);
  quad(sMidX, sMidY, eTopX, eTopY, eTopX, eTopY + skirt, sMidX, sMidY + skirt, '#0a1016', '#05080c', 1);
  ctx.strokeStyle = theme; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(wTopX, wTopY + 5); ctx.lineTo(sMidX, sMidY + 5); ctx.lineTo(eTopX, eTopY + 5); ctx.stroke();
  ctx.restore();
}

function drawCargoEcoFloorOverlay(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const theme = cargoTheme(map);
  const flags = curState?.progress?.flags ?? {};
  const gate = cargoGateObject(curState);
  const frag = cargoFragmentObject(curState);
  const t = performance.now() / 1000;
  const open = cargoGateOpen(gate, flags);
  ctx.save();

  // A rota acompanha o corredor de cada planta, sem cortar paredes.
  const spawn = map.spawnPoints?.vindo_do_aeroporto ?? { x: 2.5, y: 4.5 };
  const route = map.meta?.cargoKey === 'bio'
    ? [spawn, { x: 5.5, y: 9.5 }, { x: 5.5, y: 5.5 }, { x: 10.5, y: 5.5 }, { x: 11.5, y: 5.5 }]
    : [spawn, { x: 5.5, y: 4.5 }];
  if (frag) route.push({ x: frag.x, y: frag.y });
  const points = route.map(({ x, y }) => p(x, y));
  const trace = () => {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(10,16,22,0.7)'; ctx.lineWidth = 10; trace();
  ctx.strokeStyle = theme; ctx.globalAlpha = 0.13; ctx.lineWidth = 6; trace();
  ctx.globalAlpha = 1;
  const segments = points.slice(1).map((point, i) => ({
    from: points[i], to: point,
    length: Math.hypot(point[0] - points[i][0], point[1] - points[i][1]),
  }));
  const total = segments.reduce((sum, segment) => sum + segment.length, 0);
  if (total > 0) for (let i = 0; i < 10; i++) {
    let distance = ((t * 0.16 + i / 10) % 1) * total;
    for (const segment of segments) {
      if (distance > segment.length) { distance -= segment.length; continue; }
      if (!segment.length) continue;
      const u = distance / segment.length;
      const x = segment.from[0] + (segment.to[0] - segment.from[0]) * u;
      const y = segment.from[1] + (segment.to[1] - segment.from[1]) * u;
      ctx.fillStyle = theme; ctx.globalAlpha = 0.35;
      ctx.beginPath(); ctx.ellipse(x, y, 3, 1.5, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
  }
  ctx.globalAlpha = 1;

  if (gate) {
    // Marcas nas duas aproximações, projetadas no próprio piso.
    ctx.strokeStyle = open ? theme : '#ffc94a';
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = open ? 0.3 : 0.42 + 0.16 * Math.sin(t * 4);
    for (const side of [-1, 1]) {
      const [mx, my] = p(gate.x + side * 0.65, gate.y);
      ctx.beginPath(); ctx.moveTo(mx - 5, my + 1); ctx.lineTo(mx, my + 4); ctx.lineTo(mx + 5, my + 1); ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // O campo já está pintado na arte da trava. Um retângulo frontal aqui
    // criava uma segunda barreira flutuante e fora da perspectiva.

  }

  // Berço do fragmento: feixe contido + anéis de sincronização.
  if (frag && (!frag.requiresFlag || flags[frag.requiresFlag]) && !flags[`collected_${frag.id}`]) {
    const [bx, by] = p(frag.x, frag.y);
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    const beam = ctx.createLinearGradient(bx, by - 96, bx, by);
    beam.addColorStop(0, 'rgba(234,255,244,0)');
    beam.addColorStop(1, theme);
    ctx.globalAlpha = 0.16 + 0.1 * pulse; ctx.fillStyle = beam;
    ctx.beginPath(); ctx.moveTo(bx - 10, by - 96); ctx.lineTo(bx + 10, by - 96);
    ctx.lineTo(bx + 20, by); ctx.lineTo(bx - 20, by); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = theme; ctx.lineWidth = 1.6;
    for (let r = 0; r < 2; r++) {
      const ph = (t * 0.5 + r / 2) % 1;
      ctx.globalAlpha = 0.45 * (1 - ph);
      ctx.beginPath(); ctx.ellipse(bx, by + 4, 18 + ph * 26, (18 + ph * 26) * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawCargoEcoHudCallouts(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const theme = cargoTheme(map);
  const flags = curState?.progress?.flags ?? {};
  const gate = cargoGateObject(curState);
  const frag = cargoFragmentObject(curState);
  const open = cargoGateOpen(gate, flags);
  const t = performance.now() / 1000;
  ctx.save();
  ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';

  // Indicação discreta apenas ao se aproximar; o HUD de interação já traz
  // os detalhes. Não deixar placas permanentes cobrindo a arte e o jogador.
  if (gate && !open && curState.player &&
      Math.hypot(curState.player.x - gate.x, curState.player.y - gate.y) < 2.2) {
    const [gx, gy] = p(gate.x, gate.y);
    const scanned = gate.gate?.scanFlag ? flags[gate.gate.scanFlag] : flags.cargoSecurityDiagnosed;
    const label = scanned ? 'USE [Q]' : 'LEIA COM [R]';
    ctx.font = 'bold 7px monospace';
    const w = label.length * 4.2 + 10;
    ctx.fillStyle = 'rgba(6,10,16,0.84)'; ctx.fillRect(gx - w / 2, gy - 58, w, 12);
    ctx.strokeStyle = scanned ? theme : '#ffc94a'; ctx.lineWidth = 0.7;
    ctx.strokeRect(gx - w / 2, gy - 58, w, 12);
    ctx.fillStyle = '#eafff4'; ctx.fillText(label, gx, gy - 49);
  }

  // Drone de conferência: patrulha curta, luz de leitura, sem colisão.
  const u = (Math.sin(t * 0.45) + 1) / 2;
  const [d0x, d0y] = p(2.4, 2.1), [d1x, d1y] = p(7.6, 2.1);
  const dx = d0x + (d1x - d0x) * u, dy = d0y + (d1y - d0y) * u - 42 + Math.sin(t * 2.2) * 3;
  ctx.globalAlpha = 0.12; ctx.fillStyle = theme;
  ctx.beginPath(); ctx.moveTo(dx - 4, dy + 6); ctx.lineTo(dx + 4, dy + 6); ctx.lineTo(dx + 18, dy + 48); ctx.lineTo(dx - 18, dy + 48); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#1b2733'; ctx.strokeStyle = theme; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(dx, dy, 9, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = 'rgba(223,247,255,0.7)';
  ctx.beginPath(); ctx.moveTo(dx - 12, dy - 3); ctx.lineTo(dx + 12, dy - 3); ctx.stroke();
  ctx.fillStyle = Math.sin(t * 6) > 0 ? '#ff6b6b' : theme; ctx.fillRect(dx - 1, dy - 1, 2, 2);
  ctx.restore();
}

// Eclusa do Viaduto na Base dos Vetores: filme de energia animado, varredura
// e status. O arco é espelhado na fonte de tela para olhar para a rota.
function drawNucleo10xViadutoGate(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const rota = !!flags.rota_viaduto_vetores_aberta;
  const [ax, ay] = p(16.5, 5.7);
  const t = performance.now() / 1000;
  const color = rota ? '#8cff9e' : '#ffc94a';
  ctx.save();
  ctx.strokeStyle = color; ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 3);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(ax, ay + 5, 40, 18, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.translate(ax, ay - 46);
  // O filme acompanha o plano isométrico da eclusa, não um retângulo de frente.
  ctx.transform(1, 0.5, 0, 1, 0, 0);
  const w = 54, h = 78;
  const film = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  film.addColorStop(0, 'rgba(6,18,10,0.05)');
  film.addColorStop(0.5, color);
  film.addColorStop(1, 'rgba(6,18,10,0.05)');
  ctx.globalAlpha = rota ? 0.22 : 0.14; ctx.fillStyle = film;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalAlpha = rota ? 0.75 : 0.5; ctx.strokeStyle = color; ctx.lineWidth = 1.4;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  const scan = (t * (rota ? 0.5 : 0.28)) % 1;
  const sy = -h / 2 + scan * h;
  ctx.globalAlpha = 0.8; ctx.fillStyle = '#eafff4';
  ctx.fillRect(-w / 2, sy - 1.5, w, 3);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 3; i++) {
    const cy = -h / 2 + ((t * 0.35 + i / 3) % 1) * h;
    ctx.beginPath(); ctx.moveTo(-10, cy - 4); ctx.lineTo(0, cy); ctx.lineTo(-10, cy + 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, cy - 4); ctx.lineTo(0, cy); ctx.lineTo(10, cy + 4); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = color;
  ctx.fillRect(-w / 2 - 4, -h / 2 + 6, 3, 3);
  ctx.fillRect(w / 2 + 1, -h / 2 + 6, 3, 3);
  ctx.restore();
}

function drawNucleo10xFloorTile(x, y, tx, ty) {
  const pista = (y === 5 || y === 6) && x >= 2 && x <= 16;
  const spriteId = pista ? 'nucleo_sala_piso_cinetico' : 'nucleo_sala_piso_grafite';
  const img = getSprite(spriteId);
  const f = img && getFrame(img, 0, 0, 1, 1)?.crop;
  if (!f) {
    quad(tx, ty, tx + HW, ty + HH, tx, ty + TH, tx - HW, ty + HH, pista ? '#18261e' : '#172019', '#0a120d', 1);
    return true;
  }
  const w = CONFIG.TILE_W * 1.03;
  const h = w * (f.h / f.w);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  const flip = !pista && ((x * 7 + y * 13) & 1) === 1;
  ctx.translate(tx, ty - 0.8);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(f.canvas, 0, 0, f.w, f.h, -w / 2, 0, w, h);
  ctx.restore();
  return true;
}

function drawNucleo10xUnderlay(map, curState) {
  const cols = map.layout[0].length - 1;
  const rows = map.layout.length - 1;
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const sincronizada = !!flags.base_vetores_sincronizada;
  const rota = !!flags.rota_viaduto_vetores_aberta;
  ctx.save();
  const [cx, cy] = p((cols + 1) * 0.5, (rows + 1) * 0.5);
  const halo = ctx.createRadialGradient(cx, cy + 20, 30, cx, cy + 20, 720);
  halo.addColorStop(0, sincronizada ? 'rgba(116,255,138,0.26)' : 'rgba(64,180,96,0.18)');
  halo.addColorStop(0.55, 'rgba(10,32,18,0.58)');
  halo.addColorStop(1, 'rgba(4,10,6,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.ellipse(cx, cy + 24, 760, 360, 0, 0, Math.PI * 2); ctx.fill();

  const skirtH = 26;
  const [wTopX, wTopY] = p(1, rows);
  const [sMidX, sMidY] = p(cols, rows);
  const [eTopX, eTopY] = p(cols, 1);
  quad(wTopX, wTopY, sMidX, sMidY, sMidX, sMidY + skirtH, wTopX, wTopY + skirtH, '#101a14', '#060c08', 1.2);
  quad(sMidX, sMidY, eTopX, eTopY, eTopX, eTopY + skirtH, sMidX, sMidY + skirtH, '#0c1510', '#050a06', 1.2);
  ctx.strokeStyle = sincronizada ? '#8cff9e' : rota ? '#5fbf78' : '#315c40';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wTopX, wTopY + 6); ctx.lineTo(sMidX, sMidY + 6); ctx.lineTo(eTopX, eTopY + 6); ctx.stroke();
  for (let x = 2; x < cols; x += 2) {
    const [rx, ry] = p(x, rows);
    ctx.fillStyle = sincronizada ? '#9dffb8' : '#3f7a52';
    ctx.globalAlpha = 0.72;
    ctx.beginPath(); ctx.ellipse(rx, ry + 14, 4.5, 3.0, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawNucleo10xFloorOverlay(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const gateOpen = !!flags.gate_malha_cinetica_sala;
  const sincronizada = !!flags.base_vetores_sincronizada;
  const calibrado = !!flags.regulador_inercia_nucleo_calibrado;
  const rota = !!flags.rota_viaduto_vetores_aberta;
  const t = performance.now() / 1000;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.1);
  ctx.save();

  // Trilho de indução da pista de aceleração (vão duplo y=5..6).
  const [a0, a1] = p(2.0, 6.0);
  const [b0, b1] = p(gateOpen ? 16.2 : 9.6, 6.0);
  const boost = (sincronizada ? 0.16 : 0) + (calibrado ? 0.10 : 0);
  ctx.strokeStyle = `rgba(140,255,158,${(0.22 + boost + 0.12 * pulse).toFixed(3)})`;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const u = ((t * 0.28 + i / 6) % 1);
    const wx = 2.2 + u * (gateOpen ? 13.8 : 7.2);
    const [px, py] = p(wx, 5.95 + 0.16 * Math.sin(t * 3 + i));
    ctx.fillStyle = `rgba(190,255,205,${(0.55 * (1 - Math.abs(u - 0.5) * 1.4)).toFixed(3)})`;
    ctx.beginPath(); ctx.ellipse(px, py, 5, 2.3, -0.45, 0, Math.PI * 2); ctx.fill();
  }

  // Anéis adaptativos do Eixo de Adaptação no piso.
  const [ex, ey] = p(6.0, 2.5);
  for (let r = 0; r < 3; r++) {
    const phase = ((t * (sincronizada ? 0.55 : 0.32) + r / 3) % 1);
    const rad = 26 + phase * (sincronizada ? 62 : 44);
    ctx.strokeStyle = `rgba(140,255,158,${(0.42 * (1 - phase)).toFixed(3)})`;
    ctx.lineWidth = 2.2 - phase * 1.2;
    ctx.beginPath(); ctx.ellipse(ex, ey + 6, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // Relicário de Vetor: halo contido até o fragmento ser recolhido.
  if (!flags.collected_fragmento_eco_nucleo) {
    const [rx, ry] = p(12.5, 6.0);
    ctx.strokeStyle = `rgba(157,255,184,${(0.35 + 0.25 * pulse).toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(rx, ry + 4, 30, 15, 0, 0, Math.PI * 2); ctx.stroke();
  }

  // Contrapeso: faixas de carga âmbar; após partido, fratura verde.
  const [cx, cy] = p(12.7, 8.9);
  ctx.strokeStyle = rota ? 'rgba(140,255,158,0.55)' : `rgba(255,201,74,${(0.35 + 0.25 * pulse).toFixed(3)})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(cx, cy + 4, 34, 17, 0, 0, Math.PI * 2); ctx.stroke();
  if (rota) {
    ctx.strokeStyle = 'rgba(190,255,205,0.7)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(cx - 18, cy - 6); ctx.lineTo(cx - 4, cy + 4); ctx.lineTo(cx + 10, cy - 8); ctx.stroke();
  }

  // Regulador calibrado: pequeno volante de carga no piso sul.
  if (calibrado) {
    const [gx, gy] = p(2.7, 9.0);
    ctx.strokeStyle = 'rgba(255,201,74,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(gx, gy + 4, 24, 12, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawNucleo10xOuterWallShell(map) {
  const cols = map.layout[0].length - 1;
  const rows = map.layout.length - 1;
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const h = 14;
  const thick = 0.40;
  ctx.save();
  const [i0x, i0y] = p(1, 1);
  const [i1x, i1y] = p(1, rows);
  const [o0x, o0y] = p(1 - thick, 1 - thick);
  const [o1x, o1y] = p(1 - thick, rows);
  quad(i1x, i1y, i0x, i0y, i0x, i0y - h, i1x, i1y - h, '#111a15', '#060c08', 1);
  quad(o1x, o1y - h, o0x, o0y - h, i0x, i0y - h, i1x, i1y - h, '#1d2a22', '#315c40', 1.1);
  const [j1x, j1y] = p(cols, 1);
  const [q1x, q1y] = p(cols, 1 - thick);
  quad(i0x, i0y, j1x, j1y, j1x, j1y - h, i0x, i0y - h, '#0e1712', '#060c08', 1);
  quad(o0x, o0y - h, q1x, q1y - h, j1x, j1y - h, i0x, i0y - h, '#1a261f', '#315c40', 1.1);
  ctx.restore();
}

function drawNucleo10xHudCallouts(map, curState) {
  const p = (x, y) => [(x - y) * HW, (x + y) * HH];
  const flags = curState?.progress?.flags ?? {};
  const scanned = !!flags.scan_malha_sala;
  const gateOpen = !!flags.gate_malha_cinetica_sala;
  const sincronizada = !!flags.base_vetores_sincronizada;
  const rota = !!flags.rota_viaduto_vetores_aberta;
  const revealActive = (curState?.player?.ability?.reveal?.timeLeft ?? 0) > 0;
  const t = performance.now() / 1000;
  ctx.save();
  drawNucleo10xViadutoGate(map, curState);

  const [dx, dy] = p(1.5, 5.5);
  ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(7,16,10,0.90)'; ctx.fillRect(dx - 29, dy - 92, 58, 14);
  ctx.strokeStyle = sincronizada ? '#8cff9e' : '#3f7a52'; ctx.lineWidth = 1;
  ctx.strokeRect(dx - 29, dy - 92, 58, 14);
  ctx.fillStyle = sincronizada ? '#d8ffe4' : '#9dffb8'; ctx.fillText('DOCA D4', dx, dy - 82);

  if ((revealActive || scanned) && !gateOpen) {
    const [gx, gy] = p(10.5, 6.0);
    const r = 13 + 3.0 * Math.sin(t * 5.6);
    ctx.strokeStyle = '#8cff9e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(gx, gy - 26, r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(6,18,10,0.90)'; ctx.fillRect(gx - 62, gy - 58, 124, 14);
    ctx.strokeStyle = 'rgba(140,255,158,0.80)'; ctx.lineWidth = 1;
    ctx.strokeRect(gx - 62, gy - 58, 124, 14);
    ctx.fillStyle = '#c8ffd8'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText('JANELA CINÉTICA • [Q]', gx, gy - 48);
  }

  if (gateOpen) {
    const [ax, ay] = p(16.5, 5.7);
    const label = rota ? 'VIADUTO -> ESTAÇÃO QUE RESPIRA' : 'VIADUTO • CONTRAPESO SELADO';
    const w = label.length * 5.2 + 14;
    ctx.fillStyle = 'rgba(6,18,10,0.88)'; ctx.fillRect(ax - w / 2, ay - 86, w, 14);
    ctx.strokeStyle = rota ? '#8cff9e' : '#6c8a76'; ctx.lineWidth = 1;
    ctx.strokeRect(ax - w / 2, ay - 86, w, 14);
    ctx.fillStyle = rota ? '#d8ffe4' : '#a8c8b4'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    ctx.fillText(label, ax, ay - 76);
  }

  const massFlash = curState?.player?.ability?.massFlash;
  if (massFlash && massFlash.timeLeft > 0 && massFlash.duration > 0) {
    const k = massFlash.timeLeft / massFlash.duration;
    const [fx, fy] = p(massFlash.x, massFlash.y);
    const rad = (1 - k) * 82 + 18;
    ctx.strokeStyle = `rgba(255,201,74,${(0.88 * k).toFixed(3)})`;
    ctx.lineWidth = 3.4 * k + 0.8;
    ctx.beginPath(); ctx.ellipse(fx, fy - 8, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const tideFlash = curState?.player?.ability?.tideFlash;
  if (tideFlash && tideFlash.timeLeft > 0 && tideFlash.duration > 0) {
    const k = tideFlash.timeLeft / tideFlash.duration;
    const [fx, fy] = p(tideFlash.x, tideFlash.y);
    const rad = (1 - k) * 76 + 16;
    ctx.strokeStyle = `rgba(140,255,158,${(0.88 * k).toFixed(3)})`;
    ctx.lineWidth = 3.2 * k + 0.8;
    ctx.beginPath(); ctx.ellipse(fx, fy - 10, rad, rad * 0.5, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawNucleo10xWallTile(x, y, front) {
  if (front || x === 0 || y === 0) return;
  if (x !== 10 && x !== 14) return;
  const tx = (x - y) * HW, ty = (x + y) * HH;
  const h = 22;
  const flags = state?.progress?.flags ?? {};
  const active = !!flags.gate_malha_cinetica_sala || !!flags.scan_malha_sala;
  const stroke = active ? '#8cff9e' : '#315c40';
  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - h, tx - HW, ty + HH - h, '#121c16', '#060c08', 1);
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - h, tx, ty + TH - h, '#0e1712', '#050a06', 0.9);
  quad(tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h, '#1d2a22', stroke, 1);
  ctx.save();
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.8;
  ctx.beginPath(); ctx.moveTo(tx - HW * 0.5, ty + HH * 1.5 - 6); ctx.lineTo(tx - HW * 0.5, ty + HH * 1.5 - h + 6); ctx.stroke();
  ctx.restore();
}

function drawDominioWallTile(x, y, front) {
  if (front) return;
  if (x === 0 || y === 0) return;

  // Divisória interna do Santuário (x = 10): blocos de obsidiana entalhada e ouro real
  const tx = (x - y) * HW;
  const ty = (x + y) * HH;
  const h = 50;
  const flags = state?.progress?.flags ?? {};
  const consagrado = !!flags.santuario_dominio_consagrado;
  const active = consagrado || !!flags.gate_lacre_frequencia_sala || !!flags.scan_lacre_sala;
  const goldStroke = consagrado ? '#ffe074' : active ? '#f5b83d' : '#96702e';

  // Face sudoeste (voltada para o Anel de Ruptura)
  quad(
    tx - HW, ty + HH,
    tx, ty + TH,
    tx, ty + TH - h,
    tx - HW, ty + HH - h,
    '#1c1824', '#0c0a10', 1
  );
  // Frisos de bronze dourado na base e na cornija
  quad(tx - HW, ty + HH, tx, ty + TH, tx, ty + TH - 6, tx - HW, ty + HH - 6, '#6e5224', '#1d150c', 0.8);
  quad(tx - HW, ty + HH - h + 6, tx, ty + TH - h + 6, tx, ty + TH - h, tx - HW, ty + HH - h, '#87652c', '#22180e', 0.8);

  // Face sudeste (voltada para a Câmara da Coroa)
  quad(
    tx, ty + TH,
    tx + HW, ty + HH,
    tx + HW, ty + HH - h,
    tx, ty + TH - h,
    '#14111a', '#09070d', 0.9
  );
  quad(tx, ty + TH, tx + HW, ty + HH, tx + HW, ty + HH - 6, tx, ty + TH - 6, '#57401c', '#18110a', 0.8);
  quad(tx, ty + TH - h + 6, tx + HW, ty + HH - h + 6, tx + HW, ty + HH - h, tx, ty + TH - h, '#6e5224', '#1d150c', 0.8);

  // Entalhe rúnico vertical dourado na face oeste
  ctx.save();
  ctx.strokeStyle = goldStroke;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(tx - HW * 0.5, ty + HH * 1.5 - 8);
  ctx.lineTo(tx - HW * 0.5, ty + HH * 1.5 - h + 8);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(tx - HW * 0.72, ty + HH * 1.28 - h * 0.52);
  ctx.lineTo(tx - HW * 0.28, ty + HH * 1.72 - h * 0.52);
  ctx.stroke();

  // Topo de obsidiana com canal harmônico dourado rumo aos pilares do Lacre
  quad(tx, ty - h, tx + HW, ty + HH - h, tx, ty + TH - h, tx - HW, ty + HH - h, '#282334', '#8e6b2d', 1);
  const cTopX = tx + HW * 0.5, cTopY = ty + HH * 0.5 - h;
  const cBotX = tx - HW * 0.5, cBotY = ty + HH * 1.5 - h;
  ctx.strokeStyle = '#0d0a12';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cTopX, cTopY);
  ctx.lineTo(cBotX, cBotY);
  ctx.stroke();
  ctx.strokeStyle = goldStroke;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();
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
  if (typeof spriteId === 'string' && spriteId.startsWith('freq666_')) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (typeof spriteId === 'string' && (spriteId.startsWith('bio_sala_') || spriteId.startsWith('dom_sala_') || spriteId.startsWith('mare_sala_') || spriteId.startsWith('nucleo_sala_') || spriteId.startsWith('viaduto_'))) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (['sala_bio_maquina', 'sala_bio_grade', 'sala_dominio_lacre', 'sala_mare_fluxo', 'sala_nucleo_malha', 'aero_painel_partidas', 'aero_carrinho_bagagem', 'aero_totem_holo', 'aero_planta_aliena'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (['bio_terminal', 'bio_reator', 'bio_ponte', 'bio_estufa', 'bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria', 'bio_plataforma', 'bio_margem_canto', 'bio_margem_cano', 'bio_margem_ruina', 'bio_margem_mureta', 'bio_condutor_quebrado', 'bio_condutor_ativo', 'bio_regulador_quebrado', 'bio_regulador_ativo', 'bio_mato_cano', 'bio_mato_ventilacao', 'bio_mato_barris', 'bio_mato_fissura', 'bio_cabeceira', 'bio_distribuidor', 'bio_margem_baixa', 'bio_fundacao'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (['hub_vaso_novo', 'hub_reciclagem', 'hub_carrinho', 'hub_bebedouro'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: .25, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'costa_rochosa') return { SHEET_COLS: 4, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  // Praia 11: relevo (uma peça por PNG) e os dois atlas extras de flora/rochedo.
  if (typeof spriteId === 'string' && spriteId.startsWith('relevo_')) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'costa_rochosa_2' || spriteId === 'vegetacao_tropical_2') return { SHEET_COLS: 8, SHEET_ROWS: 3, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
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

function drawBioGateResonance(object, curState) {
  const diagnosed = !!curState?.progress?.flags?.bio_placa_diagnostico;
  if (!diagnosed) return;
  const ix = (object.x - object.y) * HW + (object.ajusteX ?? 0);
  const iy = (object.x + object.y) * HH + (object.ajusteY ?? 0);
  const t = performance.now() / 1000;
  const pulse = 0.65 + Math.sin(t * 5.2) * 0.3;

  ctx.save();
  const cx = ix, cy = iy - 28;
  ctx.strokeStyle = `rgba(126, 252, 224, ${pulse.toFixed(2)})`;
  ctx.lineWidth = 1.6;
  const r = 11 + Math.sin(t * 4) * 1.5;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * r, cy + sy * (r * 0.45));
    ctx.lineTo(cx + sx * r, cy + sy * r * 0.85);
    ctx.lineTo(cx + sx * (r * 0.55), cy + sy * r * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

function drawMapObject(object, state) {
  if (object.invisivel) return;
  if (object.hideWhenFlag && state.progress.flags?.[object.hideWhenFlag]) return;
  if (object.showWhenFlag && !state.progress.flags?.[object.showWhenFlag]) return; // NOVO

  if (['rocha_rachada', 'travessia_mare_eco', 'passagem_mare_eco', 'caverna_alagada', 'fenda_estreita', 'teleferico_quebrado'].includes(object.id)) { drawBridgeThreshold(object, state.world?.currentMap, state); return; }

  if (object.gate && (!object.__coluna || object.__coluna.index === 0)) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save(); ctx.fillStyle = 'rgba(11,24,28,.28)'; ctx.beginPath();
    ctx.ellipse(x, y + 3, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  if (object.flutuanteMar) { drawFlutuanteMar(object, state); return; }
  if (object.bioMarker) { drawBioMarker(object); return; }
  if (object.cableStation) { drawCableStation(object); return; }
  if (object.tipo === 'holograma_decorativo') { drawHubHologram(object); return; }
  if (object.tipo === 'limiar_frequencia') { drawFrequencyThreshold(object, state); return; }
  if (object.porta) { drawDoor(object); return; }
  if (object.routeMarker) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save();
    ctx.strokeStyle = '#9fffe3'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 12, 5, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x, y - 30); ctx.stroke();
    ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
    // A caixa acompanha o texto: nomes longos ("POÇA DA CASCATA") cabem.
    const meia = Math.max(38, Math.ceil(ctx.measureText(object.routeMarker).width / 2) + 8);
    ctx.fillStyle = '#0c393c'; ctx.fillRect(x - meia, y - 48, meia * 2, 18);
    ctx.strokeRect(x - meia, y - 48, meia * 2, 18);
    ctx.fillStyle = '#e1fff1';
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

  if (object.useCrop && drawCroppedObject(object, image, sheet)) {
    drawFrequencyObjectLife(object, image);
    if (object.id === 'grade_impeto_vivo' && (!object.__coluna || object.__coluna.index === object.__coluna.count - 1)) {
      drawBioGateResonance(object, state);
    }
    return;
  }

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

// ---------------------------------------------------------------------
// SPRITES JÁ NA ESCALA DA TELA
//
// A praia tem centenas de objetos pintados em alta resolução e reduzidos
// na hora (`larguraPx`). Reduzir com filtro a cada quadro é o que mais
// pesa quando o canvas roda por software (máquina sem aceleração): no
// perfil da Ilha A eram 25 ms de 58. Com o zoom PARADO, cada recorte é
// reduzido UMA vez (com o filtro bom) e depois só copiado, pixel a
// pixel, alinhado ao pixel da tela.
//
// Fica no caminho antigo (direto, com filtro): zoom em movimento, peça
// ampliada, com skew/escalaY, com filtro de estado, ou acima do orçamento
// de memória. O cache inteiro é descartado quando o zoom muda.
// ---------------------------------------------------------------------
const ESCALADOS_MAX_BYTES = 96 * 1024 * 1024;
const ESCALADOS_POR_QUADRO = 10;       // construções por quadro: sem tranco
// Até quanto de AMPLIAÇÃO ainda vale guardar (zoom de perto): acima disto
// a cópia ficaria grande demais e o desenho direto resolve.
const ESCALADOS_MAX_K = 2.6;
let mundoZ = 1, mundoTx = 0, mundoTy = 0;
let escalados = new Map();             // canvas do recorte → Map(chave → canvas)
let escaladosBytes = 0, escaladosZoom = 0, escaladosNoQuadro = 0;
let zoomAnterior = 0, quadrosComZoomParado = 0, escaladosAtivo = false;

function prepararEscalados(z) {
  escaladosNoQuadro = 0;
  quadrosComZoomParado = Math.abs(z - zoomAnterior) <= z * 1e-6 ? quadrosComZoomParado + 1 : 0;
  zoomAnterior = z;
  // O que foi reduzido para outro zoom não serve mais.
  if (escaladosBytes && Math.abs(z - escaladosZoom) > z * 2e-4) {
    escalados = new Map();
    escaladosBytes = 0;
  }
  escaladosAtivo = quadrosComZoomParado >= 10;
  if (escaladosAtivo && !escaladosBytes) escaladosZoom = z;
}

/** Estado do cache, para os testes e para o painel de debug. */
export function estadoDosEscalados() {
  let pecas = 0;
  for (const porFonte of escalados.values()) pecas += porFonte.size;
  return { pecas, bytes: escaladosBytes, ativo: escaladosAtivo, zoom: escaladosZoom };
}

function spriteEscalado(fonte, k, espelhar) {
  const lw = Math.max(1, Math.round(fonte.width * k));
  const lh = Math.max(1, Math.round(fonte.height * k));
  let porFonte = escalados.get(fonte);
  const chave = espelhar ? -lw : lw;
  let pronto = porFonte?.get(chave);
  if (pronto) return pronto;
  const bytes = lw * lh * 4;
  if (escaladosNoQuadro >= ESCALADOS_POR_QUADRO || escaladosBytes + bytes > ESCALADOS_MAX_BYTES) return null;
  pronto = document.createElement('canvas');
  pronto.width = lw;
  pronto.height = lh;
  const g = pronto.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  if (espelhar) { g.translate(lw, 0); g.scale(-1, 1); }
  g.drawImage(fonte, 0, 0, lw, lh);
  if (!porFonte) { porFonte = new Map(); escalados.set(fonte, porFonte); }
  porFonte.set(chave, pronto);
  escaladosBytes += bytes;
  escaladosNoQuadro++;
  return pronto;
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
  // Tira vertical de um paredão (ver `drawWorld`). Um pixel de sobra de cada
  // lado: as tiras se sobrepõem e a emenda nunca aparece como risco.
  const tira = object.__coluna;
  let sx = 0, sw = c.w;
  if (tira) {
    sx = Math.max(0, Math.floor(c.w * tira.index / tira.count) - 1);
    sw = Math.min(c.w, Math.ceil(c.w * (tira.index + 1) / tira.count) + 1) - sx;
  }
  const inteiro = !object.__slice && (!tira || tira.index === 0);
  const agora = performance.now() / 1000;
  // Pedra no mar: a espuma nasce ANTES da pedra (fica por baixo do sprite).
  if (object.espuma && inteiro) {
    desenharAnelEspuma(ctx, ix + (object.espumaX ?? 0), iy + (object.espumaY ?? 0), object.espuma, agora, (object.x * 7 + object.y * 13) | 0);
  }
  ctx.save();
  // A extremidade traseira entra na abertura, não atravessa a moldura.
  if (object.id === 'trilho_dimensional_principal' && state.world?.currentMap?.id === 'ilha_praia_inicial') {
    const boca = beachTunnelAnchor(object, c);
    ctx.beginPath(); ctx.rect(boca.x - 34, -10000, 20000, 20000); ctx.clip();
  }
  const filtro = filtroObjeto(object);
  // Cópia 1:1 do sprite já reduzido (ver "SPRITES JÁ NA ESCALA DA TELA").
  const kTela = scale * escaladosZoom;
  const pronto = escaladosAtivo && !filtro && skewY === 0 && escalaY === 1 && kTela <= ESCALADOS_MAX_K
    ? spriteEscalado(c.canvas, kTela, Boolean(object.espelhar))
    : null;
  if (pronto) {
    const lw = pronto.width, lh = pronto.height;
    // Canto da peça INTEIRA em pixels da tela: todas as tiras e faixas da
    // mesma peça partem dele, então nunca abrem fresta entre si.
    const esquerda = object.espelhar ? ix + w * px - w : ix - w * px;
    const ox = Math.round(esquerda * mundoZ + mundoTx);
    const oy = Math.round((iy - h * py) * mundoZ + mundoTy);
    let x0 = Math.floor(sx * kTela), x1 = Math.min(lw, Math.ceil((sx + sw) * kTela));
    if (object.espelhar) { const a = lw - x1; x1 = lw - x0; x0 = a; }
    const y0 = Math.floor(banda.sy * kTela), y1 = Math.min(lh, Math.ceil((banda.sy + banda.sh) * kTela));
    if (x1 > x0 && y1 > y0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pronto, x0, y0, x1 - x0, y1 - y0, ox + x0, oy + y0, x1 - x0, y1 - y0);
      ctx.setTransform(mundoZ, 0, 0, mundoZ, mundoTx, mundoTy);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.translate(ix, iy);
    if (object.espelhar) ctx.scale(-1, 1);
  } else {
    if (filtro) ctx.filter = filtro;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.translate(ix, iy);
    if (skewY !== 0 || escalaY !== 1) ctx.transform(1, skewY, 0, escalaY, 0, 0);
    if (object.espelhar) ctx.scale(-1, 1);
    ctx.drawImage(c.canvas, sx, banda.sy, sw, banda.sh,
      -w * px + sx * scale, -h * py + banda.sy * scale, sw * scale, banda.sh * scale);
    ctx.filter = 'none';
  }
  // Queda-d'água: fios animados recortados pela máscara da arte, e o
  // respingo onde ela bate. Mesmo sistema de coordenadas da peça.
  if (object.cascata && inteiro) {
    desenharCascata(ctx, { mascaraId: object.cascata, crop: c, x: -w * px, y: -h * py, w, h, t: agora });
    const r = object.respingo;
    if (r) desenharRespingo(ctx, r.x ?? 0, r.y ?? 0, r.largura ?? 26, agora, (object.x * 5 + object.y * 3) | 0);
  }
  ctx.restore();

  // Debug H: cruz vermelha mostra o ponto de âncora no mundo
  if (isDebugEnabled() && inteiro) {
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
      ctx.translate(ultimateFrame.offsetX ?? 0, 0);
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

  // spriteScale opcional por ator: unidades maiores/menores que o padrão (L-9 do aeroporto)
  const scale = (cfg.SCALE ?? 0.16) * (e.spriteScale ?? 1);
  return drawFramePe(e, image, cfg, rc, ix, iy - bob, scale, false);
}

// =====================================================================
//  GUIA DO AEROPORTO — sprite próprio (5 poses em linha: frente, dir, costas, esq, aceno)
// =====================================================================
function drawGuiaSprite(npc, ix, iy) {
  const image = getSprite('guia_aeroporto');
  if (!image) return false;

  const isWave = npc.pose === 'wave' || npc.talking || Boolean(npc.bark);
  const col = isWave
    ? 4
    : ({ down: 0, right: 1, up: 2, left: 3 }[npc.facing ?? 'down'] ?? 0);

  const fr = getFrame(image, col, 0, 5, 1, { tolerancia: 14 });
  if (!fr) return false;

  const pe = pePos(fr);
  const scale = 0.215;
  const bob = npc.moving ? Math.abs(Math.sin(performance.now() / 120)) * 2 : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'medium';
  ctx.translate(ix, iy - bob);
  ctx.drawImage(
    fr.cell,
    -pe.x * scale,
    -pe.y * scale,
    fr.cell.width * scale,
    fr.cell.height * scale
  );
  ctx.restore();

  npc._topo = Math.round((pe.y - fr.crop.y) * scale);
  return true;
}

// Viajante ambiental (saguão e aeroporto): 4 vistas × 6 quadros a 256px.
// Sem folha direcional de caminhada — só oscilação entre quadros do ciclo.
function drawViajanteSprite(entity, ix, iy) {
  const image = getSprite('hub_viajante');
  if (!image) return false;
  const row = { down: 0, right: 1, up: 2, left: 3 }[entity.facing] ?? 0;
  const passo = entity.visitorRuntime?.clock ?? 0;
  const frame = entity.moving ? Math.floor(passo * 7) % 6 : 0;
  const oscilacao = entity.moving ? (1 - Math.cos(passo * 14 * Math.PI)) * .45 : 0;
  ctx.save();
  ctx.translate(ix, iy - oscilacao);
  ctx.drawImage(image, frame * 256, row * 256, 256, 256, -68, -129, 136, 136);
  ctx.restore();
  entity._topo = 122;
  return true;
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

  const isDominioFrag = item.id === 'fragmento_eco_dominio';
  gradient.addColorStop(0, isDominioFrag ? 'rgba(255,213,79,0.52)' : 'rgba(53,230,211,0.42)');
  gradient.addColorStop(1, isDominioFrag ? 'rgba(255,172,42,0)' : 'rgba(53,230,211,0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(ix, iy, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nas câmaras de carga, o cristal já integra a arte do berço.
  if (state.world?.currentMap?.meta?.estiloSala === 'carga_eco' &&
      (state.objects ?? []).some(o => o.id.startsWith('berco_fragmento_'))) {
    ctx.restore();
    return;
  }

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

  ctx.fillStyle = isDominioFrag ? '#ffe994' : '#83fff5';
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = isDominioFrag ? '#d48d1e' : '#0ba8b2';
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

// Poça de treino: enquanto as duas primeiras provas (boiar e respirar) não
// saem, a poça fica marcada no mundo — é o "vá para lá" da missão.
function drawMarcadorDeTreino(map, state) {
  if (!map.pocas?.length || !state.player) return;
  const arvore = lerArvore(state.progress);
  if (arvore.nivel >= 2) return;
  const poca = map.pocas.find(p => p.treino);
  if (!poca) return;
  const d = Math.hypot(state.player.x - poca.x, state.player.y - poca.y);
  // Dentro da poça o painel do degrau já explica: o marcador recua.
  const forca = Math.max(0, Math.min(1, (d - 1.2) / 1.6));
  desenharMarcadorDeTreino(ctx, poca, performance.now() / 1000, HW, HH,
    arvore.nivel === 0 ? 'POÇA DE TREINO · BOIAR' : 'POÇA DE TREINO · RESPIRAR', forca);
}

function drawEntity(entity, state) {
  const ix = (entity.x - entity.y) * HW;
  const iy = (entity.x + entity.y) * HH;

  if (entity === state.player) {
    // NADANDO: o corpo deita, gira na direção do nado e ondula. Ataque,
    // habilidade e Ultimate continuam com a arte de pé (o operador se
    // ergue na água para golpear), então só entra quando o corpo está livre.
    // Histerese: na franja da praia `nado.ativo` liga e desliga a cada
    // passo; sem isto o corpo piscava entre em pé e deitado.
    const querDeitar = Boolean(entity.nado?.ativo);
    const deitando = entity._nadoVis ?? (querDeitar ? 1 : 0);
    entity._nadoVis = Math.max(0, Math.min(1, deitando + (querDeitar ? 1 : -1) * .12));
    if (entity._nadoVis > .5 && entity.nado
      && (entity.nado?.ativo || (!(entity.combat?.timeLeft > 0)
      && !(entity.ultimate?.charge > 0)
      && !getVisualEffect(entity)))
      && desenharNadador(ctx, entity, ix, iy, {
        arquetipo: state.progress.archetype, HW, HH, t: performance.now() / 1000,
      })) return;
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
    drawShadow(ix, iy, .24);
    drawViajanteSprite(entity, ix, iy); // sem arte, não desenha uma cópia do NEXO
    return;
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
    if (entity.sprite === 'guia_aeroporto' && drawGuiaSprite(entity, ix, iy)) return;
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