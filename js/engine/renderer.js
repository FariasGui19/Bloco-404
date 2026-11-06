// js/engine/renderer.js
// =====================================================================
//  RENDERER
//  Chão (passada única) → brilhos → paredes/objetos/personagens por
//  profundidade → poeira → debug → nomes e balões
// =====================================================================
import { CONFIG, TILE } from '../config.js';
import { camera, view, worldToScreen, isoToWorld } from './camera.js';
import { getSprite } from './sprites.js';
import { getFrame } from './sprite-clean.js';
import { drawAmbientBack, drawAmbientFront } from './ambient.js';
import { isDebugEnabled, drawDebugWorld } from '../game/debug.js';

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
  ctx.setTransform(
    z, 0, 0, z,
    (view.w / 2 - camera.x * camera.zoom) * dpr,
    (view.h / 2 - camera.y * camera.zoom) * dpr
  );

  updateVisibleRange(map);

  // O metrô modular volta a usar chão e tiles.
  if (!map.meta?.backgroundCoversFloor) {
    drawFloors(map);

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
  drawWorld(map, state);
  drawAmbientFront(ctx, map, HW, HH);
  drawTarget(state.player);

  if (isDebugEnabled()) drawDebugWorld(ctx, map, state, CONFIG.TILE_W, CONFIG.TILE_H);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

function drawFloorTile(type, x, y, map) {
  const tx = (x - y) * HW;
  const ty = (x + y) * HH;

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
  const base = map.corChao ?? '#1b1f27';
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

function drawWorld(map, state) {
  drawList.length = 0;
  backList.length = 0;

  if (isDebugEnabled()) window.__objs = state.objects;

  const margem = 10;
  const visivel = (o) =>
    o.x >= range.x0 - margem && o.x <= range.x1 + margem &&
    o.y >= range.y0 - margem && o.y <= range.y1 + margem;

  for (const a of state.actors ?? []) drawList.push(a);

  for (const o of state.objects ?? []) {
    if (o.camada === 'fundo') backList.push(o);      // trem/trilho sempre
    else if (visivel(o)) drawList.push(o);
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
    } else if (item.renderType === 'collectible') {
      drawCollectible(item, state);
    } else {
      drawEntity(item, state);
    }
  };

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
function drawMapObject(object, state) {
  if (object.hideWhenFlag && state.progress.flags?.[object.hideWhenFlag]) return;
  if (object.showWhenFlag && !state.progress.flags?.[object.showWhenFlag]) return; // NOVO

  if (object.porta) { drawDoor(object); return; }
  // ...

  const sheet = getObjectSpriteConfig(object.sprite);
  const image = getSprite(object.sprite ?? sheet.ID);
  if (!image || !sheet) return;

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

  ctx.save();
  if (object.filter) ctx.filter = object.filter;
  ctx.translate(ix + (object.ajusteX ?? 0), iy + (object.ajusteY ?? 0));
  if (object.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(
    image,
    col * frameW, row * frameH, frameW, frameH,
    -drawW / 2, -drawH * (object.anchorY ?? sheet.FEET_ANCHOR_Y),
    drawW, drawH
  );
  ctx.filter = 'none';
  ctx.restore();
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

  ctx.save();
  if (object.filter) ctx.filter = object.filter;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(ix, iy);
  if (skewY !== 0 || escalaY !== 1) ctx.transform(1, skewY, 0, escalaY, 0, 0);
  if (object.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(c.canvas, 0, 0, c.w, c.h, -w * px, -h * py, w, h);
  ctx.filter = 'none';
  ctx.restore();

  // Debug H: cruz vermelha mostra o ponto de âncora no mundo
  if (isDebugEnabled()) {
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
function drawPlayerSprite(player, ix, iy) {
  // ===============================================
  // 1. ANIMAÇÃO DE ESCANEAMENTO (R)
  // ===============================================
  if (player.ability?.scanning > 0) {
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

  drawSmooth(fr.cell, insetX, insetY, sourceW, sourceH, drawX, drawY, drawW, drawH);
  
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

function drawEntity(entity, state) {
  const ix = (entity.x - entity.y) * HW;
  const iy = (entity.x + entity.y) * HH;

  if (entity === state.player) {
    drawShadow(ix, iy, 0.28);
    if (drawPlayerSprite(entity, ix, iy)) return;

    ctx.beginPath();
    ctx.arc(ix, iy - 14, 9, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
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