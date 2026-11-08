// js/engine/renderer.js
// =====================================================================
//  RENDERER
//  Chão (passada única) → brilhos → paredes/objetos/personagens por
//  profundidade → poeira → debug → nomes e balões
// =====================================================================
import { CONFIG, TILE } from '../config.js';
import { camera, view, worldToScreen, isoToWorld } from './camera.js';
import { getSprite } from './sprites.js';
import { createBeachSurface } from './beach-surface.js';
import { bridgeThresholdGeometry } from './bridge-geometry.js';
import { faunaFootAnchor } from '../game/fauna-costeira.js';
import { getFrame } from './sprite-clean.js';
import { drawAmbientBack, drawAmbientFront } from './ambient.js';
import { isDebugEnabled, drawDebugWorld } from '../game/debug.js';
import { ACTION_SPRITES } from '../data/action-sprites.js';
import { drawHubScreenFx, hasHubScreenFx } from './hub-screen-fx.js';
import { getVelozAnimation } from '../data/veloz-animation.js';
import { getBasicAttackPose } from '../data/basic-attack-poses.js';
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
  ctx.setTransform(
    z, 0, 0, z,
    (view.w / 2 - camera.x * camera.zoom) * dpr,
    (view.h / 2 - camera.y * camera.zoom) * dpr
  );

  updateVisibleRange(map);

  // O metrô modular volta a usar chão e tiles.
  if (!map.meta?.backgroundCoversFloor) {
    if (map.aguaPraia) {
      drawBeachSea(map);
      drawBeachRipples(map);
      drawBeachSurface(map);
    }
    drawFloors(map);
    if (map.id === 'hub_saguao') drawHubFloorMarkings();
    if (map.aguaPraia) drawBeachShore(map);

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
  drawBasicAttack(state.player);
  drawAbilityEffects(state);
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

// Textura de mar contínua em coordenadas de mundo. A distância é calculada
// até a areia (não até pontes), sem modificar a máscara de colisão.
const beachSeaCache = new WeakMap();
function drawBeachSea(map) {
  let texture = beachSeaCache.get(map);
  const rows = map.aguaPraia;
  const width = rows[0].length, height = rows.length;
  if (!texture) {
    const scale = 4;
    texture = document.createElement('canvas');
    texture.width = width * scale;
    texture.height = height * scale;
    const sea = texture.getContext('2d');
    const image = sea.createImageData(texture.width, texture.height);
    const shallow = [111, 200, 184], deep = [30, 99, 132];
    for (let py = 0; py < texture.height; py++) {
      for (let px = 0; px < texture.width; px++) {
        const wx = (px + 0.5) / scale, wy = (py + 0.5) / scale;
        let closest = 5;
        for (let y = Math.max(0, Math.floor(wy) - 5); y <= Math.min(height - 1, Math.floor(wy) + 5); y++) {
          for (let x = Math.max(0, Math.floor(wx) - 5); x <= Math.min(width - 1, Math.floor(wx) + 5); x++) {
            if (!'SMTPR'.includes(rows[y][x])) continue;
            const dx = Math.max(x - wx, 0, wx - (x + 1));
            const dy = Math.max(y - wy, 0, wy - (y + 1));
            closest = Math.min(closest, Math.hypot(dx, dy));
          }
        }
        // Degradê contínuo entre a margem e o mar aberto.
        const edge = Math.min(wx, wy, width - wx, height - wy);
        const border = Math.max(0, Math.min(1, edge / 1.6));
        const t = Math.max(Math.min(1, closest / 4.5), 1 - border * border * (3 - 2 * border));
        const smooth = t * t * (3 - 2 * t);
        const detail = (1 - smooth) * (Math.sin(wx * 4.1 + Math.sin(wy * 2.3)) * 3 + Math.sin(wy * 3.2 - wx * .7) * 2);
        const i = (py * texture.width + px) * 4;
        for (let c = 0; c < 3; c++) image.data[i + c] = shallow[c] * (1 - smooth) + deep[c] * smooth + detail;
        image.data[i + 3] = 255;
      }
    }
    sea.putImageData(image, 0, 0);
    beachSeaCache.set(map, texture);
  }
  ctx.save();
  ctx.transform(HW, HH, -HW, HH, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(texture, 0, 0, width, height);
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
    const rows = map.aguaPraia, scale = data.width / rows[0].length;
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

// Reflexos também no mar além dos limites do mapa: o fundo deixa de ser
// um vazio chapado, sem criar terrenos jogáveis nem alterar a colisão.
function drawBeachRipples(map) {
  const halfW = view.w / (2 * camera.zoom);
  const halfH = view.h / (2 * camera.zoom);
  const corners = [
    isoToWorld(camera.x - halfW, camera.y - halfH),
    isoToWorld(camera.x + halfW, camera.y - halfH),
    isoToWorld(camera.x + halfW, camera.y + halfH),
    isoToWorld(camera.x - halfW, camera.y + halfH),
  ];
  const spacing = 1.6;
  const x0 = Math.floor(Math.min(...corners.map(p => p.x)) / spacing) - 1;
  const x1 = Math.ceil(Math.max(...corners.map(p => p.x)) / spacing) + 1;
  const y0 = Math.floor(Math.min(...corners.map(p => p.y)) / spacing) - 1;
  const y1 = Math.ceil(Math.max(...corners.map(p => p.y)) / spacing) + 1;
  const rows = map.aguaPraia;

  ctx.save();
  const waveTime = performance.now() / 1000;
  ctx.strokeStyle = `rgba(176, 238, 226, ${0.22 + 0.05 * Math.sin(waveTime * 0.9)})`;
  ctx.lineWidth = 1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (hash(x + 319, y - 871) > 0.58) continue;
      const wx = (x + hash(x + 29, y + 17)) * spacing;
      const wy = (y + hash(x - 37, y + 53)) * spacing;
      const tile = rows[Math.floor(wy)]?.[Math.floor(wx)];
      if (tile && 'SMTPRBb'.includes(tile)) continue;
      const ix = (wx - wy) * HW + Math.sin(waveTime * 0.7 + x * 0.8 + y) * 2, iy = (wx + wy) * HH;
      const length = 6 + hash(x + 117, y - 62) * 10;
      ctx.moveTo(ix - length / 2, iy);
      ctx.quadraticCurveTo(ix, iy - 2.2, ix + length / 2, iy);
      if (hash(x - 19, y + 23) < 0.22) {
        ctx.moveTo(ix - length * 0.18, iy + 3);
        ctx.lineTo(ix + length * 0.22, iy + 3);
      }
    }
  }
  ctx.stroke();
  ctx.restore();
}

// Pequenos arcos de espuma interrompidos, em água junto à areia. Evita
// sublinhar os dentes da máscara com uma linha geométrica contínua.
function drawBeachShore(map) {
  const rows = map.aguaPraia;
  const sand = (x, y) => 'SMT'.includes(rows[y]?.[x] ?? ' ');
  ctx.save(); ctx.strokeStyle = 'rgba(222,255,240,.44)';
  ctx.lineWidth = 1.25; ctx.lineCap = 'round';
  const wave = performance.now() / 1000;
  for (let y = range.y0; y <= range.y1; y++) for (let x = range.x0; x <= range.x1; x++) {
    if (!'Yy'.includes(rows[y]?.[x] ?? ' ')) continue;
    const tx = (x-y)*HW, ty = (x+y)*HH;
    const edges = [
      [x-1,y,tx-HW,ty+HH,tx,ty], [x,y-1,tx,ty,tx+HW,ty+HH],
      [x+1,y,tx+HW,ty+HH,tx,ty+TH], [x,y+1,tx,ty+TH,tx-HW,ty+HH],
    ];
    for (const [nx,ny,ax,ay,bx,by] of edges) {
      if (!sand(nx,ny) || hash(x + nx*7, y + ny*11) < .22) continue;
      const shift = Math.sin(wave * .8 + x * .5 + y) * 1.5;
      const sx = ax*.8+bx*.2, sy = ay*.8+by*.2;
      const ex = ax*.2+bx*.8, ey = ay*.2+by*.8;
      ctx.beginPath(); ctx.moveTo(sx, sy + shift);
      ctx.quadraticCurveTo((ax+bx)/2, (ay+by)/2 + shift - 2, ex, ey + shift); ctx.stroke();
    }
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

function drawWorld(map, state) {
  drawList.length = 0;
  backList.length = 0;

  if (isDebugEnabled()) window.__objs = state.objects;

  const margem = 10;
  const visivel = (o) =>
    o.x >= range.x0 - margem && o.x <= range.x1 + margem &&
    o.y >= range.y0 - margem && o.y <= range.y1 + margem;

  for (const a of state.actors ?? []) drawList.push(a);
  if (state.companion && state.progress.flags?.companheiro_lumeo) drawList.push(state.companion);
  for (const a of state.fauna ?? []) if (visivel(a)) drawList.push(a);
  for (const target of state.trainingTargets ?? []) if (visivel(target)) drawList.push(target);

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
    } else if (item.renderType === 'trainingTarget') {
      drawTrainingTarget(item);
    } else if (item.renderType === 'companion') {
      drawLumeo(item);
    } else if (item.renderType === 'fauna') {
      drawCoastalFauna(item);
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
function drawCoastalFauna(a) {
  const crab = a.species === 'caranguejo';
  const image = getSprite(crab ? 'fauna_caranguejo' : 'fauna_costeira');
  if (!image) return;
  const cols = crab ? 4 : 8, rows = 4;
  const flight = a.species === 'gaivota' && a.fleeing;
  const row = crab ? (a.fleeing ? 2 : 0) : ({ gaivota: 1, peixes: 2, capivara: 3 }[a.species] ?? 0);
  const tick = Math.floor(a.clock * (a.fleeing ? 8 : 4));
  const col = crab ? tick % 4 : flight ? 4 + tick % 4 : a.species === 'gaivota' ? tick % 4 : a.species === 'capivara' ? tick % 7 : tick % 8;
  const width = crab ? 54 : a.species === 'peixes' ? 65 : a.species === 'capivara' ? 62 : 48;
  const cw = image.width / cols, ch = image.height / rows;
  const height = width * ch / cw;
  const x = (a.x - a.y) * HW, y = (a.x + a.y) * HH;
  ctx.save();
  if (a.species !== 'peixes') {
    ctx.fillStyle = 'rgba(12,25,24,.22)'; ctx.beginPath(); ctx.ellipse(x, y + 3, width * .22, 4, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.translate(x, y - (flight ? 18 + Math.sin(a.clock * 8) * 2 : 0));
  if (a.flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  const box = a.species === 'capivara' ? getVisibleBox(image, col * cw, row * ch, cw, ch) : null;
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
  if (['hub_vaso_novo', 'hub_reciclagem', 'hub_carrinho', 'hub_bebedouro'].includes(spriteId)) return { SHEET_COLS: 1, SHEET_ROWS: 1, DEFAULT_SCALE: .25, FEET_ANCHOR_Y: 1 };
  if (spriteId === 'costa_rochosa') return { SHEET_COLS: 4, SHEET_ROWS: 1, DEFAULT_SCALE: 1, FEET_ANCHOR_Y: 1 };
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
function drawBridgeThreshold(object, map) {
  const alongX = object.id === 'travessia_mare_eco' || object.id === 'fenda_estreita';
  const fissure = object.id === 'fenda_estreita';
  const broken = object.id === 'teleferico_quebrado';
  const center = bridgeThresholdGeometry(map?.aguaPraia, object, alongX ? 'x' : 'y') ?? { x: object.x, y: object.y, halfWidth: .92 };
  const x = (center.x - center.y) * HW, y = (center.x + center.y) * HH;
  const dx = (alongX ? -1 : 1) * HW * center.halfWidth, dy = HH * center.halfWidth;
  const t = performance.now() / 1000;
  ctx.save(); ctx.translate(x, y + 2);
  ctx.lineCap = 'round';
  // Base sombreada ajuda a ancorar o efeito às tábuas.
  ctx.strokeStyle = 'rgba(15,36,39,.7)'; ctx.lineWidth = 13;
  ctx.beginPath(); ctx.moveTo(-dx, -dy); ctx.lineTo(dx, dy); ctx.stroke();
  ctx.strokeStyle = broken ? '#dfae62' : fissure ? '#98edba' : '#66dfd8'; ctx.lineWidth = fissure ? 2 : 3;
  ctx.beginPath(); ctx.moveTo(-dx, -dy - 8);
  if (broken) {
    ctx.quadraticCurveTo(-dx*.65, -dy*.65-3, -dx*.22, -dy*.22-3);
    ctx.moveTo(dx*.22, dy*.22-3); ctx.quadraticCurveTo(dx*.65, dy*.65-3, dx, dy-8);
  } else ctx.quadraticCurveTo(Math.sin(t * 2) * 4, -6 + Math.sin(t * 2.5) * 2, dx, dy - 4);
  ctx.stroke();
  ctx.strokeStyle = fissure ? 'rgba(157,255,192,.65)' : 'rgba(195,255,244,.75)'; ctx.lineWidth = 1;
  for (let i = -1; i <= 1; i++) {
    if (broken && i !== 0) continue;
    const f = (i + Math.sin(t * 1.8 + i) * .15) / 2;
    const px = dx * f, py = dy * f;
    ctx.beginPath(); ctx.moveTo(px - (broken ? 2 : 7), py - 7); ctx.quadraticCurveTo(px, py - 11, px + (broken ? 2 : 7), py - 7); ctx.stroke();
  }
  // Estacas baixas de cada lado deixam clara a entrada no limiar.
  for (const side of [-1, 1]) {
    const px = dx * side, py = dy * side;
    ctx.strokeStyle = '#413f35'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(px, py + 3); ctx.lineTo(px, py - 18); ctx.stroke();
    ctx.strokeStyle = broken ? '#edbc78' : fissure ? '#83f2ae' : '#75e9e1'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(px, py - 15); ctx.lineTo(px, py - 10); ctx.stroke();
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

function drawMapObject(object, state) {
  if (object.hideWhenFlag && state.progress.flags?.[object.hideWhenFlag]) return;
  if (object.showWhenFlag && !state.progress.flags?.[object.showWhenFlag]) return; // NOVO

  if (['travessia_mare_eco', 'passagem_mare_eco', 'caverna_alagada', 'fenda_estreita', 'teleferico_quebrado'].includes(object.id)) { drawBridgeThreshold(object, state.world?.currentMap); return; }

  if (object.gate) {
    const x = (object.x - object.y) * HW, y = (object.x + object.y) * HH;
    ctx.save(); ctx.fillStyle = 'rgba(11,24,28,.28)'; ctx.beginPath();
    ctx.ellipse(x, y + 3, 30, 9, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

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
  ctx.translate(ix, iy - Math.abs(stride) * 1.8);
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

function drawPlayerSprite(player, ix, iy) {
  // As folhas de referência têm poses, não quadros sequenciais. Usamos uma
  // pose provisória com os pulsos animados, sem fingir que são animações finais.
  const effect = getVisualEffect(player);
  const suit = player.equippedSuit;
  // A folha nova é frontal: não a espelhamos nem fingimos vistas laterais/traseiras.
  const attack = player.combat;
  if (suit === 'bio_forja' && player.facing === 'down' && attack?.style === 'motor_bio_forja' && attack.timeLeft > 0 && !effect && !(player.ability?.scanning > 0)) {
    const sheet = getSprite('player_bio_ataque_frontal');
    if (sheet) {
      const phase = Math.max(0, Math.min(.9999, 1 - attack.timeLeft / attack.duration));
      const col = Math.floor(phase * 9), x0 = Math.round(col * sheet.width / 9), x1 = Math.round((col + 1) * sheet.width / 9);
      const scale = .19, w = (x1 - x0) * scale, h = sheet.height * scale;
      drawSmooth(sheet, x0, 0, x1 - x0, sheet.height, ix - w / 2, iy - h * .92, w, h);
      player._topo = 125;
      return true;
    }
  }
  const attackPose = getBasicAttackPose(state.progress, player);
  if (attackPose && drawArchetypeSheet(attackPose.sprite, attackPose.col, attackPose.row, ix, iy, attackPose.flip, { scale: attackPose.scale, anchor: attackPose.anchor })) {
    player._topo = 100;
    return true;
  }
  if (state.progress.archetype === 'nucleo_dez_forma' && effect?.id === 'transformacao_10x') {
    const t = Math.max(0, Math.min(0.999, 1 - effect.timeLeft / effect.duration));
    const frames = effect.activating ? [0, 1, 1, 2] : [2, 1, 3, 3];
    if (drawArchetypeSheet('player_10x_q', frames[Math.floor(t * 4)], 0, ix, iy, player.facing === 'left', { rows: 1, scale: 0.29, anchor: 0.78 })) { player._topo = 120; return true; }
  }
  const velozFrame = getVelozAnimation(state.progress, player, performance.now());
  if (velozFrame) {
    const image = getSprite(velozFrame.sprite);
    if (image) {
      const w = image.width / 6, h = image.height / 4, scale = .5;
      ctx.save(); ctx.translate(ix, iy);
      if (velozFrame.flip) ctx.scale(-1, 1);
      drawSmooth(image, velozFrame.col * w, velozFrame.row * h, w, h,
        -w * scale / 2, -velozFrame.footY * scale, w * scale, h * scale);
      ctx.restore(); player._topo = 110; return true;
    }
  }
  if (state.progress.archetype === 'nucleo_dez_forma' && player.nucleoForm === 'forma_veloz') {
    if (drawArchetypeSheet('player_10x_q', 2, 0, ix, iy, player.facing === 'left', { rows: 1, scale: 0.29, anchor: 0.78, walk: player.moving })) { player._topo = 120; return true; }
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
  if (suit === 'dominio' || suit === 'mare') {
    const col = player.facing === 'up' ? 2 : player.facing === 'down' ? 0 : 1;
    if (drawArchetypeSheet(`player_${suit}_lvl1`, col, 0, ix, iy, player.facing === 'left', { walk: player.moving })) {
      player._topo = 100;
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
      ctx.fillStyle = '#9cffbc';
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

function drawEntity(entity, state) {
  const ix = (entity.x - entity.y) * HW;
  const iy = (entity.x + entity.y) * HH;

  if (entity === state.player) {
    drawShadow(ix, iy, 0.28);
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
    if (drawPlayerSprite(entity, ix + dx / length * push, iy + dy / length * push)) return;

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