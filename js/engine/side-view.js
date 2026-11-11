// js/engine/side-view.js
// =====================================================================
// RENDERIZAÇÃO SIDE-VIEW 2.5D — AEROPORTO CENTRAL (ZONA X10)
//
// Perspectiva frontal/lateral profunda estilo sci-fi anos 90
// (Flashback / Another World):
// 1. Background espacial (estrelas, planeta anelado, naves, arte panorâmica)
// 2. Camada intermediária (janelões inclinados, mezanino, colunas neon, portais)
// 3. Camada de gameplay com piso reflexivo espelhado em tempo real
// 4. Foreground cinematográfico (feixes de luz, silhuetas e grades de 1º plano)
// =====================================================================

import { getSprite } from './sprites.js';
import { getFrame } from './sprite-clean.js';
import { svWorldToScreen, SIDE_DEPTH_STEP, SIDE_FLOOR_Y } from './camera.js';

const TILE_W = 64;

// Limites verticais da passarela em coordenadas de mundo (y)
const WALL_WORLD_Y = 2.0;   // Base da parede de fundo / janelões / portais
const FLOOR_FRONT_Y = 7.15; // Borda frontal da passarela

// Cores temáticas e metadados visuais dos portais do Aeroporto
const PORTAL_THEMES = {
  voltar_ao_saguao: {
    cor: '#35E6D3',
    corSec: '#188894',
    codigo: 'GATE 00',
    titulo: 'SAGUÃO CENTRAL',
    subtitulo: 'RETORNO AO HUB',
  },
  portal_sala_bio_forja: {
    cor: '#35E6D3',
    corSec: '#169c8f',
    codigo: 'DOCA A1',
    titulo: 'MOTOR BIO-FORJA',
    subtitulo: 'SALA DE ARQUÉTIPO',
  },
  portal_sala_dominio: {
    cor: '#ffd54f',
    corSec: '#b87c14',
    codigo: 'DOCA B2',
    titulo: 'LÂMINA DOMÍNIO',
    subtitulo: 'SALA DE ARQUÉTIPO',
  },
  portal_sala_mare: {
    cor: '#4caeff',
    corSec: '#1b5fa8',
    codigo: 'DOCA C3',
    titulo: 'MARÉ ASTRAL',
    subtitulo: 'SALA DE ARQUÉTIPO',
  },
  portal_sala_nucleo: {
    cor: '#74ff8a',
    corSec: '#1e9640',
    codigo: 'DOCA D4',
    titulo: 'NÚCLEO 10X',
    subtitulo: 'SALA DE ARQUÉTIPO',
  },
  porta_area_carga: {
    cor: '#35E6D3',
    corSec: '#0e6f7a',
    codigo: 'HANGAR C-04',
    titulo: 'ÁREA DE CARGA',
    subtitulo: 'CALIBRAÇÃO DE ECO',
    isCargoDoor: true,
  },
};

// Posições X das grandes colunas estruturais ao longo da estação (0..44)
const PILLAR_X_POSITIONS = [1.0, 6.2, 11.8, 18.2, 24.5, 28.5, 32.5, 36.5, 42.8];

// Placas do mezanino superior
const MEZZANINE_SIGNS = [
  { wx: 4.5, text: 'SETOR A · DESEMBARQUE & RECEPÇÃO', cor: '#35E6D3' },
  { wx: 15.0, text: 'SETOR B · MIRANTE ORBITAL ZONA X10', cor: '#53d9f4' },
  { wx: 28.5, text: 'SETOR C · PORTAIS DE ARQUÉTIPO', cor: '#ffd54f' },
  { wx: 39.2, text: 'SETOR D · ENGENHARIA & CARGA', cor: '#ff9e44' },
];

// Estrelas pré-geradas de forma determinística (zero alocação por frame)
const STARS = Array.from({ length: 95 }, (_, i) => {
  const seed = (i * 1664525 + 1013904223) >>> 0;
  return {
    xNorm: ((seed & 0xffff) / 0xffff),
    yNorm: (((seed >>> 8) & 0xffff) / 0xffff) * 0.88,
    size: (i % 7 === 0) ? 2.4 : (i % 3 === 0 ? 1.7 : 1.1),
    parallax: (i % 3 === 0) ? 0.04 : (i % 3 === 1 ? 0.08 : 0.14),
    speed: 1.4 + (i % 5) * 0.7,
    phase: i * 1.17,
    color: i % 9 === 0 ? '#ffd54f' : (i % 4 === 0 ? '#6ef7ea' : '#d8f3ff'),
  };
});

// Frota de naves espaciais navegando no espaço exterior
const SPACE_SHIPS = [
  { yRatio: 0.24, speed: 18, dir: 1, scale: 1.15, type: 'freighter', offset: 120, color: '#35E6D3' },
  { yRatio: 0.42, speed: 34, dir: -1, scale: 0.75, type: 'cruiser', offset: 680, color: '#53d9f4' },
  { yRatio: 0.16, speed: 12, dir: -1, scale: 0.60, type: 'shuttle', offset: 1320, color: '#ffd54f' },
  { yRatio: 0.56, speed: 46, dir: 1, scale: 0.85, type: 'cruiser', offset: 410, color: '#74ff8a' },
  { yRatio: 0.33, speed: 25, dir: 1, scale: 0.55, type: 'shuttle', offset: 990, color: '#35E6D3' },
];

// Converte mundo -> tela usando a mesma fórmula da câmera
export function svToScreen(wx, wy, cameraX, cameraY, viewW, viewH, zoom) {
  return svWorldToScreen(wx, wy, viewW, viewH, zoom);
}

// =====================================================================
//  CAMADA 1: BACKGROUND ESPACIAL PROFUNDO
// =====================================================================
function drawSpaceLayer(ctx, map, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY) {
  const windowH = Math.max(80, wallBaseY);
  const t = time / 1000;

  // 1.1 Gradiente do espaço sideral profundo
  const skyGrad = ctx.createLinearGradient(0, 0, 0, windowH);
  skyGrad.addColorStop(0, '#03060c');
  skyGrad.addColorStop(0.45, '#071222');
  skyGrad.addColorStop(0.82, '#0c2138');
  skyGrad.addColorStop(1, '#12314c');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, windowH);

  // 1.2 Nebulosa horizontal sutil
  const nebGrad = ctx.createRadialGradient(
    viewW * 0.5 - (cameraX * 0.05) % (viewW * 0.6),
    windowH * 0.42,
    10,
    viewW * 0.5,
    windowH * 0.45,
    Math.max(viewW, windowH) * 0.65
  );
  nebGrad.addColorStop(0, 'rgba(53, 230, 211, 0.14)');
  nebGrad.addColorStop(0.45, 'rgba(28, 118, 168, 0.08)');
  nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebGrad;
  ctx.fillRect(0, 0, viewW, windowH);

  // 1.3 Campo de estrelas cintilando em 3 subcamadas de parallax
  const spanW = Math.max(1400, viewW + 400);
  for (const s of STARS) {
    const rawX = (s.xNorm * spanW - cameraX * s.parallax) % spanW;
    const sx = rawX < 0 ? rawX + spanW : rawX;
    if (sx > viewW) continue;
    const sy = s.yNorm * (windowH * 0.92);
    const twinkle = 0.45 + 0.55 * Math.sin(t * s.speed + s.phase);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = s.color;
    const sz = s.size;
    ctx.fillRect(Math.round(sx), Math.round(sy), sz, sz);
    if (sz > 2 && twinkle > 0.8) {
      ctx.fillRect(Math.round(sx) - 2, Math.round(sy) + 0.5, sz + 4, 1);
      ctx.fillRect(Math.round(sx) + 0.5, Math.round(sy) - 2, 1, sz + 4);
    }
  }
  ctx.globalAlpha = 1;

  // 1.4 Planeta Anelado e Lua Orbital (parallax 0.07x)
  drawRingedPlanet(ctx, cameraX, viewW, windowH, zoom, t);

  // 1.5 Arte panorâmica (`aeroporto_background`) integrada nos janelões em parallax 0.22x
  const bgKey = map.meta?.sideViewBackground?.space ?? map.meta?.background?.sprite ?? 'aeroporto_background';
  const bgImg = bgKey ? getSprite(bgKey) : null;
  if (bgImg && bgImg.width > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, viewW, windowH);
    ctx.clip();

    // Escala a arte panorâmica para que a linha do piso da arte case com wallBaseY
    const targetH = Math.max(windowH * 1.32, 340 * zoom);
    const scale = targetH / bgImg.height;
    const drawW = bgImg.width * scale;
    const drawH = bgImg.height * scale;
    // Na arte 2672x1504, a linha do horizonte/piso do hangar fica a ~68% da altura
    const drawY = wallBaseY - drawH * 0.68;

    const parallaxX = -((cameraX * 0.22 * zoom) % drawW);
    let startX = parallaxX;
    if (startX > 0) startX -= drawW;

    ctx.globalAlpha = 0.52;
    for (let x = startX; x < viewW + drawW; x += drawW) {
      ctx.drawImage(bgImg, 0, 0, bgImg.width, bgImg.height, x, drawY, drawW + 1, drawH);
    }
    ctx.restore();
  }

  // 1.6 Naves espaciais sci-fi anos 90 cruzando o espaço lá fora
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, windowH - 6);
  ctx.clip();
  for (const ship of SPACE_SHIPS) {
    drawSpaceShip(ctx, ship, cameraX, viewW, windowH, zoom, t);
  }
  ctx.restore();
}

function drawRingedPlanet(ctx, cameraX, viewW, windowH, zoom, t) {
  const px = viewW * 0.64 - (cameraX * 0.065) * zoom;
  const py = windowH * 0.34;
  const r = Math.max(34, 48 * zoom);

  if (px < -r * 3 || px > viewW + r * 3) return;

  ctx.save();
  ctx.translate(px, py);

  // Halo atmosférico externo
  const halo = ctx.createRadialGradient(0, 0, r * 0.7, 0, 0, r * 1.9);
  halo.addColorStop(0, 'rgba(53, 230, 211, 0.18)');
  halo.addColorStop(0.6, 'rgba(22, 110, 160, 0.06)');
  halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2);
  ctx.fill();

  // Metade traseira do anel planetário
  ctx.save();
  ctx.rotate(-0.28);
  ctx.strokeStyle = 'rgba(83, 217, 244, 0.28)';
  ctx.lineWidth = Math.max(3, 5 * zoom);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.15, r * 0.42, 0, Math.PI, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Corpo do planeta
  const planetGrad = ctx.createLinearGradient(-r, -r, r, r);
  planetGrad.addColorStop(0, '#4be8dc');
  planetGrad.addColorStop(0.45, '#195a85');
  planetGrad.addColorStop(0.85, '#091829');
  planetGrad.addColorStop(1, '#040912');
  ctx.fillStyle = planetGrad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Metade frontal do anel planetário
  ctx.save();
  ctx.rotate(-0.28);
  ctx.strokeStyle = 'rgba(110, 247, 234, 0.52)';
  ctx.lineWidth = Math.max(3, 5 * zoom);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 2.15, r * 0.42, 0, 0, Math.PI);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 213, 79, 0.24)';
  ctx.lineWidth = Math.max(1.5, 2 * zoom);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.75, r * 0.32, 0, 0, Math.PI);
  ctx.stroke();
  ctx.restore();

  // Pequena estação orbital próxima ao planeta
  const satX = -r * 2.4;
  const satY = -r * 0.55 + Math.sin(t * 1.2) * 3;
  ctx.fillStyle = '#1b2c40';
  ctx.fillRect(satX - 14, satY - 3, 28, 6);
  ctx.fillStyle = '#2b4766';
  ctx.fillRect(satX - 4, satY - 11, 8, 22);
  ctx.fillStyle = Math.sin(t * 4) > 0 ? '#35E6D3' : '#ff6b6b';
  ctx.fillRect(satX - 1, satY - 13, 2, 2);

  ctx.restore();
}

function drawSpaceShip(ctx, ship, cameraX, viewW, windowH, zoom, t) {
  const loopW = Math.max(2200, viewW + 900);
  const travel = (t * ship.speed + ship.offset) * ship.dir;
  const rawX = (travel - cameraX * 0.16 * zoom) % loopW;
  const x = rawX < -200 ? rawX + loopW : (rawX > loopW - 200 ? rawX - loopW : rawX);
  const y = windowH * ship.yRatio + Math.sin(t * 1.5 + ship.offset) * 3;
  const s = ship.scale * Math.max(0.75, zoom * 0.85);

  if (x < -160 || x > viewW + 160) return;

  ctx.save();
  ctx.translate(x, y);
  if (ship.dir < 0) ctx.scale(-1, 1);
  ctx.scale(s, s);

  // Rastro de plasma do propulsor
  const pulse = 0.7 + 0.3 * Math.sin(t * 16 + ship.offset);
  const trailGrad = ctx.createLinearGradient(-58, 0, -14, 0);
  trailGrad.addColorStop(0, 'rgba(53, 230, 211, 0)');
  trailGrad.addColorStop(1, ship.color === '#ffd54f' ? 'rgba(255, 213, 79, 0.75)' : 'rgba(53, 230, 211, 0.75)');
  ctx.fillStyle = trailGrad;
  ctx.fillRect(-58 * pulse, -3, 44 * pulse, 6);

  if (ship.type === 'freighter') {
    // Cargueiro espacial pesado estilo anos 90
    ctx.fillStyle = '#152334';
    ctx.fillRect(-26, -8, 52, 16);
    ctx.fillStyle = '#223852';
    ctx.fillRect(-18, -12, 28, 6);
    ctx.fillRect(10, -6, 22, 12);
    // Janelas da ponte e luzes de doca
    ctx.fillStyle = ship.color;
    ctx.fillRect(24, -3, 5, 3);
    ctx.fillRect(-12, -2, 6, 2);
    ctx.fillRect(0, -2, 6, 2);
    // Bocal do motor
    ctx.fillStyle = '#e8fbff';
    ctx.fillRect(-28, -5, 3, 10);
  } else if (ship.type === 'cruiser') {
    // Cruzador em cunha
    ctx.fillStyle = '#192a3e';
    ctx.beginPath();
    ctx.moveTo(-18, -7);
    ctx.lineTo(24, -1);
    ctx.lineTo(24, 3);
    ctx.lineTo(-18, 7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ship.color;
    ctx.fillRect(8, -2, 8, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-19, -3, 3, 6);
  } else {
    // Shuttle compacto
    ctx.fillStyle = '#21354d';
    ctx.fillRect(-12, -4, 24, 8);
    ctx.fillStyle = ship.color;
    ctx.fillRect(6, -2, 5, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-13, -2, 2, 4);
  }

  ctx.restore();
}

// =====================================================================
//  CAMADA 2: VIDROS PANORÂMICOS, ARCOS, MEZANINO E COLUNAS DE NEON
// =====================================================================
function drawMidStructuresLayer(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY) {
  const t = time / 1000;
  const windowH = Math.max(80, wallBaseY);

  // 2.1 Treliças diagonais e reflexo dos grandes janelões panorâmicos (parallax 0.48x)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, viewW, windowH);
  ctx.clip();

  const bayW = 220 * zoom;
  const shiftGlass = -((cameraX * 0.48 * zoom) % bayW);
  ctx.strokeStyle = 'rgba(26, 48, 72, 0.72)';
  ctx.lineWidth = Math.max(2, 3 * zoom);

  for (let x = shiftGlass - bayW; x < viewW + bayW; x += bayW) {
    // Montante vertical secundário da janela
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, windowH);
    ctx.stroke();

    // Treliça diagonal superior (estilo hangar espacial da arte de referência)
    ctx.beginPath();
    ctx.moveTo(x, windowH * 0.42);
    ctx.lineTo(x + bayW, 0);
    ctx.stroke();

    // Brilho diagonal no vidro
    ctx.fillStyle = 'rgba(83, 217, 244, 0.035)';
    ctx.beginPath();
    ctx.moveTo(x + bayW * 0.15, 0);
    ctx.lineTo(x + bayW * 0.38, 0);
    ctx.lineTo(x + bayW * 0.12, windowH);
    ctx.lineTo(x - bayW * 0.10, windowH);
    ctx.closePath();
    ctx.fill();
  }

  // 2.2 Mezanino / Passarela Superior Ao Fundo (parallax 0.62x)
  const mezzY = wallBaseY - 118 * zoom;
  if (mezzY > 20) {
    // Viga principal do mezanino
    ctx.fillStyle = '#0d1622';
    ctx.fillRect(0, mezzY, viewW, 16 * zoom);
    ctx.fillStyle = '#1b2d44';
    ctx.fillRect(0, mezzY, viewW, 3 * zoom);

    // Guarda-corpo superior com barras verticais e linha neon
    const railTop = mezzY - 14 * zoom;
    ctx.strokeStyle = 'rgba(53, 230, 211, 0.42)';
    ctx.lineWidth = Math.max(1, 1.5 * zoom);
    ctx.beginPath();
    ctx.moveTo(0, railTop);
    ctx.lineTo(viewW, railTop);
    ctx.stroke();

    // Luminárias pendentes sob o mezanino (luz âmbar/ciano como na arte)
    const lampStep = 160 * zoom;
    const lampShift = -((cameraX * 0.62 * zoom) % lampStep);
    for (let lx = lampShift - lampStep; lx < viewW + lampStep; lx += lampStep) {
      const ly = mezzY + 18 * zoom;
      // Haste
      ctx.fillStyle = '#253952';
      ctx.fillRect(lx - 1.5 * zoom, mezzY + 14 * zoom, 3 * zoom, 8 * zoom);
      // Cúpula da luminária
      ctx.fillStyle = '#ffe082';
      ctx.fillRect(lx - 8 * zoom, ly, 16 * zoom, 3.5 * zoom);
      // Halo suave
      const glow = ctx.createRadialGradient(lx, ly + 2 * zoom, 2, lx, ly + 10 * zoom, 38 * zoom);
      glow.addColorStop(0, 'rgba(255, 224, 130, 0.24)');
      glow.addColorStop(0.5, 'rgba(53, 230, 211, 0.08)');
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly + 8 * zoom, 38 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    // Placas informativas de setor no mezanino
    ctx.font = `bold ${Math.max(9, Math.round(10 * zoom))}px monospace`;
    ctx.textAlign = 'center';
    for (const sign of MEZZANINE_SIGNS) {
      const sx = (sign.wx * TILE_W - cameraX) * 0.72 * zoom + viewW / 2;
      if (sx < -200 || sx > viewW + 200) continue;
      const boxW = 230 * zoom;
      const boxH = 16 * zoom;
      ctx.fillStyle = 'rgba(8, 14, 22, 0.92)';
      ctx.fillRect(sx - boxW / 2, mezzY - 1 * zoom, boxW, boxH);
      ctx.strokeStyle = sign.cor;
      ctx.lineWidth = 1;
      ctx.strokeRect(sx - boxW / 2, mezzY - 1 * zoom, boxW, boxH);
      ctx.fillStyle = sign.cor;
      ctx.fillText(sign.text, sx, mezzY + 10.5 * zoom);
    }
  }

  // 2.3 Vigas arqueadas do teto do hangar
  const roofH = 26 * zoom;
  ctx.fillStyle = '#09101a';
  ctx.fillRect(0, 0, viewW, roofH);
  ctx.fillStyle = '#18293e';
  ctx.fillRect(0, roofH - 3 * zoom, viewW, 3 * zoom);

  ctx.restore();

  // 2.4 Mureta / Parede de ancoragem na base dos janelões (wallBaseY)
  const wallH = 38 * zoom;
  const wallTopY = wallBaseY - wallH;
  const wallGrad = ctx.createLinearGradient(0, wallTopY, 0, wallBaseY);
  wallGrad.addColorStop(0, '#18283c');
  wallGrad.addColorStop(0.25, '#101b29');
  wallGrad.addColorStop(1, '#0a111b');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, wallTopY, viewW, wallH);

  // Friso de neon ciano contínuo ao longo da mureta da estação
  ctx.fillStyle = 'rgba(53, 230, 211, 0.65)';
  ctx.fillRect(0, wallTopY + 3 * zoom, viewW, 2 * zoom);
  ctx.fillStyle = 'rgba(53, 230, 211, 0.28)';
  ctx.fillRect(0, wallBaseY - 3 * zoom, viewW, 2 * zoom);

  // 2.5 Grandes Colunas / Pilares Industriais com Luzes Neon Ciano (escala 1.0x do mundo)
  for (const pillarWx of PILLAR_X_POSITIONS) {
    const { x: px } = svToScreen(pillarWx, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
    if (px < -120 || px > viewW + 120) continue;
    drawIndustrialPillar(ctx, px, wallBaseY, zoom, t, pillarWx);
  }

  // 2.6 Portais Dimensionais Verticais Arqueados na Parede de Fundo
  drawSidePortalsOnWall(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, t);
}

function drawIndustrialPillar(ctx, px, wallBaseY, zoom, t, seed) {
  const w = 36 * zoom;
  const halfW = w / 2;

  ctx.save();
  // Corpo metálico vertical subindo do piso até o teto
  const grad = ctx.createLinearGradient(px - halfW, 0, px + halfW, 0);
  grad.addColorStop(0, '#0a111a');
  grad.addColorStop(0.2, '#1c2d42');
  grad.addColorStop(0.5, '#132030');
  grad.addColorStop(0.8, '#1c2d42');
  grad.addColorStop(1, '#090f17');
  ctx.fillStyle = grad;
  ctx.fillRect(px - halfW, 0, w, wallBaseY);

  // Braçadeiras horizontais no pilar
  ctx.fillStyle = '#263d58';
  for (let by = wallBaseY - 45 * zoom; by > 20; by -= 68 * zoom) {
    ctx.fillRect(px - halfW - 3 * zoom, by, w + 6 * zoom, 7 * zoom);
  }

  // Sapata pesada apoiada no piso
  ctx.fillStyle = '#182638';
  ctx.fillRect(px - halfW - 6 * zoom, wallBaseY - 14 * zoom, w + 12 * zoom, 15 * zoom);
  ctx.strokeStyle = '#35E6D3';
  ctx.lineWidth = Math.max(1, 1.2 * zoom);
  ctx.strokeRect(px - halfW - 6 * zoom, wallBaseY - 14 * zoom, w + 12 * zoom, 15 * zoom);

  // Filamento vertical de Neon Ciano no centro do pilar
  const pulse = 0.72 + 0.28 * Math.sin(t * 2.6 + seed);
  const stripW = Math.max(2, 4 * zoom);
  ctx.fillStyle = `rgba(53, 230, 211, ${0.85 * pulse})`;
  ctx.fillRect(px - stripW / 2, 12 * zoom, stripW, wallBaseY - 26 * zoom);

  // Halo ao redor do filamento de neon
  ctx.fillStyle = `rgba(53, 230, 211, ${0.14 * pulse})`;
  ctx.fillRect(px - stripW * 2.2, 12 * zoom, stripW * 4.4, wallBaseY - 26 * zoom);

  // Arco diagonal superior saindo do pilar (perspectiva de hangar)
  ctx.strokeStyle = '#192a3d';
  ctx.lineWidth = Math.max(3, 6 * zoom);
  ctx.beginPath();
  ctx.moveTo(px - halfW, 55 * zoom);
  ctx.lineTo(px - halfW - 38 * zoom, 0);
  ctx.moveTo(px + halfW, 55 * zoom);
  ctx.lineTo(px + halfW + 38 * zoom, 0);
  ctx.stroke();

  ctx.restore();
}

// =====================================================================
//  PORTAIS VERTICAIS ARQUEADOS NA PAREDE DA ESTAÇÃO
// =====================================================================
function drawSidePortalsOnWall(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, t) {
  const portals = map.portals ?? [];
  const player = state.player;

  for (const p of portals) {
    const runtimeX = p.x + 0.5;
    const runtimeY = p.y + 0.5;
    const { x: sx, y: sy } = svToScreen(runtimeX, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
    if (sx < -160 || sx > viewW + 160) continue;

    const theme = PORTAL_THEMES[p.id] ?? {
      cor: '#35E6D3',
      corSec: '#157a85',
      codigo: 'PORTAL',
      titulo: p.label ?? 'DESTINO',
      subtitulo: 'ACESSO DIMENSIONAL',
    };

    const locked = Boolean(p.requiresFlag && !state.progress?.flags?.[p.requiresFlag]);
    const mainColor = locked ? '#ff6b6b' : theme.cor;
    const dist = player ? Math.hypot(player.x - runtimeX, player.y - runtimeY) : 99;
    const near = dist <= (p.interactionDistance ?? 1.65);

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(zoom, zoom);

    const archW = theme.isCargoDoor ? 96 : 78;
    const archH = theme.isCargoDoor ? 108 : 98;
    const halfW = archW / 2;

    // Halo de energia atrás do arco
    const pulse = 0.78 + 0.22 * Math.sin(t * 3.8 + p.x);
    const backGlow = ctx.createRadialGradient(0, -archH * 0.48, 8, 0, -archH * 0.48, archW * 0.95);
    backGlow.addColorStop(0, locked ? 'rgba(255, 107, 107, 0.30)' : hexToRgba(mainColor, 0.34 * pulse));
    backGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = backGlow;
    ctx.beginPath();
    ctx.arc(0, -archH * 0.48, archW * 0.95, 0, Math.PI * 2);
    ctx.fill();

    // Plataforma / Soleira metálica no piso
    ctx.fillStyle = '#182638';
    ctx.fillRect(-halfW - 8, -6, archW + 16, 10);
    ctx.fillStyle = mainColor;
    ctx.fillRect(-halfW - 4, 1, archW + 8, 2);

    // Moldura industrial externa do pórtico
    ctx.fillStyle = '#0e1723';
    ctx.strokeStyle = near ? '#ffffff' : '#294463';
    ctx.lineWidth = near ? 2.2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(-halfW - 6, 0);
    ctx.lineTo(-halfW - 6, -archH * 0.62);
    ctx.arc(0, -archH * 0.62, halfW + 6, Math.PI, 0, false);
    ctx.lineTo(halfW + 6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Interior do portal (vórtice dimensional ou comporta trancada)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-halfW + 4, -2);
    ctx.lineTo(-halfW + 4, -archH * 0.62);
    ctx.arc(0, -archH * 0.62, halfW - 4, Math.PI, 0, false);
    ctx.lineTo(halfW - 4, -2);
    ctx.closePath();
    ctx.clip();

    if (locked) {
      // Comporta de hangar fechada com listras e feixes laser de contenção
      ctx.fillStyle = '#141923';
      ctx.fillRect(-halfW, -archH, archW, archH);
      ctx.strokeStyle = 'rgba(255, 107, 107, 0.65)';
      ctx.lineWidth = 2;
      for (let ly = -16; ly > -archH; ly -= 16) {
        ctx.beginPath();
        ctx.moveTo(-halfW, ly);
        ctx.lineTo(halfW, ly);
        ctx.stroke();
      }
      // Trava central âmbar/vermelha
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(-14, -archH * 0.55 - 8, 28, 16);
      ctx.fillStyle = '#0b0d12';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('LOCK', 0, -archH * 0.55 + 3);
    } else {
      // Vórtice dimensional ativo (estilo portal circular azul da arte de referência!)
      const vortexGrad = ctx.createRadialGradient(0, -archH * 0.52, 3, 0, -archH * 0.52, halfW);
      vortexGrad.addColorStop(0, '#ffffff');
      vortexGrad.addColorStop(0.28, mainColor);
      vortexGrad.addColorStop(0.72, theme.corSec);
      vortexGrad.addColorStop(1, '#06101c');
      ctx.fillStyle = vortexGrad;
      ctx.fillRect(-halfW, -archH, archW, archH);

      // Anéis concêntricos pulsantes no horizonte de eventos
      ctx.strokeStyle = '#e8fbff';
      for (let r = 0; r < 3; r++) {
        const ringPhase = ((t * 0.85 + r / 3) % 1);
        const radius = (halfW - 6) * ringPhase;
        ctx.globalAlpha = (1 - ringPhase) * 0.65;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -archH * 0.52, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // Arco de neon contornando o portal
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-halfW + 3, -2);
    ctx.lineTo(-halfW + 3, -archH * 0.62);
    ctx.arc(0, -archH * 0.62, halfW - 3, Math.PI, 0, false);
    ctx.lineTo(halfW - 3, -2);
    ctx.stroke();

    // Placa eletrônica no topo do pórtico
    const signY = -archH - 18;
    const signW = Math.max(96, archW + 26);
    ctx.fillStyle = 'rgba(8, 13, 21, 0.94)';
    ctx.fillRect(-signW / 2, signY, signW, 20);
    ctx.strokeStyle = mainColor;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-signW / 2, signY, signW, 20);

    ctx.textAlign = 'center';
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#9bb8d3';
    ctx.fillText(theme.codigo, 0, signY + 7);

    ctx.font = 'bold 8.5px monospace';
    ctx.fillStyle = mainColor;
    ctx.fillText(locked ? 'SEM SINCRONIA' : theme.titulo, 0, signY + 16);

    ctx.restore();
  }
}

// =====================================================================
//  CAMADA 3: PISO REFLEXIVO ESPELHADO + ENTIDADES 2.5D
// =====================================================================
function drawReflectiveFloor(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY, callbacks) {
  const floorH = Math.max(40, floorFrontY - wallBaseY);
  const t = time / 1000;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, wallBaseY, viewW, floorH);
  ctx.clip();

  // 3.1 Base polida escura do piso da estação
  const floorGrad = ctx.createLinearGradient(0, wallBaseY, 0, floorFrontY);
  floorGrad.addColorStop(0, '#0c1624');
  floorGrad.addColorStop(0.28, '#132235');
  floorGrad.addColorStop(0.75, '#0f1b2b');
  floorGrad.addColorStop(1, '#09101a');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, wallBaseY, viewW, floorH);

  // 3.2 Reflexos verticais difusos das Colunas de Neon Ciano no piso
  for (const pillarWx of PILLAR_X_POSITIONS) {
    const { x: px } = svToScreen(pillarWx, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
    if (px < -100 || px > viewW + 100) continue;
    const reflGrad = ctx.createLinearGradient(0, wallBaseY, 0, floorFrontY);
    reflGrad.addColorStop(0, 'rgba(53, 230, 211, 0.26)');
    reflGrad.addColorStop(0.65, 'rgba(53, 230, 211, 0.06)');
    reflGrad.addColorStop(1, 'rgba(53, 230, 211, 0)');
    ctx.fillStyle = reflGrad;
    ctx.fillRect(px - 10 * zoom, wallBaseY, 20 * zoom, floorH);
  }

  // 3.3 Reflexo luminoso intenso de cada Portal Dimensional no piso polido
  for (const p of map.portals ?? []) {
    const { x: sx } = svToScreen(p.x + 0.5, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
    if (sx < -140 || sx > viewW + 140) continue;
    const locked = Boolean(p.requiresFlag && !state.progress?.flags?.[p.requiresFlag]);
    const theme = PORTAL_THEMES[p.id];
    const color = locked ? '#ff6b6b' : (theme?.cor ?? '#35E6D3');
    const pulse = 0.75 + 0.25 * Math.sin(t * 3.8 + p.x);

    const pGrad = ctx.createRadialGradient(sx, wallBaseY + 6 * zoom, 4, sx, wallBaseY + floorH * 0.45, 68 * zoom);
    pGrad.addColorStop(0, hexToRgba(color, 0.38 * pulse));
    pGrad.addColorStop(0.55, hexToRgba(color, 0.12 * pulse));
    pGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = pGrad;
    ctx.fillRect(sx - 75 * zoom, wallBaseY, 150 * zoom, floorH);
  }

  // 3.4 Reflexo espelhado em tempo real dos Objetos, NPCs e Player no piso!
  drawMirroredEntitiesOnFloor(ctx, state, cameraX, cameraY, viewW, viewH, zoom, time, callbacks);

  // 3.5 Placas metálicas em perspectiva e trilhos de LED no piso
  ctx.strokeStyle = 'rgba(83, 217, 244, 0.11)';
  ctx.lineWidth = 1;
  // Linhas horizontais de profundidade das placas
  for (let wy = 2.5; wy <= 6.8; wy += 0.85) {
    const { y: ly } = svToScreen(0, wy, cameraX, cameraY, viewW, viewH, zoom);
    ctx.beginPath();
    ctx.moveTo(0, ly);
    ctx.lineTo(viewW, ly);
    ctx.stroke();
  }

  // Juntas transversais das placas com leve perspectiva a partir do centro da tela
  const centerX = viewW / 2;
  for (let wx = 0; wx <= 44; wx += 2) {
    const { x: topX } = svToScreen(wx, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
    const botX = centerX + (topX - centerX) * 1.24;
    if (Math.max(topX, botX) < -50 || Math.min(topX, botX) > viewW + 50) continue;
    ctx.beginPath();
    ctx.moveTo(topX, wallBaseY);
    ctx.lineTo(botX, floorFrontY);
    ctx.stroke();
  }

  // Trilhos condutores de LED ciano e âmbar ao longo da passarela principal
  const { y: laneTopY } = svToScreen(0, 2.85, cameraX, cameraY, viewW, viewH, zoom);
  const { y: laneBotY } = svToScreen(0, 6.25, cameraX, cameraY, viewW, viewH, zoom);

  ctx.strokeStyle = 'rgba(53, 230, 211, 0.42)';
  ctx.lineWidth = Math.max(1.2, 1.8 * zoom);
  ctx.beginPath();
  ctx.moveTo(0, laneTopY);
  ctx.lineTo(viewW, laneTopY);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 213, 79, 0.30)';
  ctx.beginPath();
  ctx.moveTo(0, laneBotY);
  ctx.lineTo(viewW, laneBotY);
  ctx.stroke();

  ctx.restore();

  // Meio-fio metálico na borda frontal da passarela (floorFrontY)
  ctx.fillStyle = '#1b2b3f';
  ctx.fillRect(0, floorFrontY - 2 * zoom, viewW, 6 * zoom);
  ctx.fillStyle = 'rgba(53, 230, 211, 0.5)';
  ctx.fillRect(0, floorFrontY - 2 * zoom, viewW, 1.5 * zoom);
}

function drawMirroredEntitiesOnFloor(ctx, state, cameraX, cameraY, viewW, viewH, zoom, time, callbacks) {
  // Objetos próximos
  for (const obj of state.objects ?? []) {
    if (obj.invisivel || obj.tipo === 'portao_visual') continue;
    if (obj.hideWhenFlag && state.progress?.flags?.[obj.hideWhenFlag]) continue;
    if (obj.showWhenFlag && !state.progress?.flags?.[obj.showWhenFlag]) continue;
    drawSideObject(ctx, obj, cameraX, cameraY, viewW, viewH, zoom, time, true);
  }

  // NPCs espelhados
  for (const actor of state.actors ?? []) {
    const { x, y } = svToScreen(actor.x, actor.y, cameraX, cameraY, viewW, viewH, zoom);
    if (x < -120 || x > viewW + 120) continue;
    ctx.save();
    ctx.translate(x, y + 2 * zoom);
    ctx.scale(zoom, -zoom * 0.42);
    ctx.globalAlpha = 0.18;
    if (callbacks.drawActor) callbacks.drawActor(actor, 0, 0);
    ctx.restore();
  }

  // Player espelhado no piso reflexivo
  if (state.player && callbacks.drawPlayer) {
    const { x, y } = svToScreen(state.player.x, state.player.y, cameraX, cameraY, viewW, viewH, zoom);
    ctx.save();
    ctx.translate(x, y + 2 * zoom);
    ctx.scale(zoom, -zoom * 0.42);
    ctx.globalAlpha = 0.20;
    callbacks.drawPlayer(state.player, 0, 0);
    ctx.restore();
  }
}

// Desenha um objeto do cenário em side-view (usando recorte limpo de sprite-clean)
export function drawSideObject(ctx, obj, cameraX, cameraY, viewW, viewH, zoom, time, isReflection = false) {
  // Portões visuais antigos são substituídos pelos pórticos arquitetônicos na parede
  if (obj.tipo === 'portao_visual') return;

  const image = getSprite(obj.sprite ?? 'hub_props');
  if (!image) return;

  const { x, y } = svToScreen(obj.x, obj.y, cameraX, cameraY, viewW, viewH, zoom);
  if (x < -180 || x > viewW + 180) return;

  const cols = obj.sheetCols ?? 4;
  const rows = obj.sheetRows ?? 4;
  const col = obj.frame?.col ?? 0;
  const row = obj.frame?.row ?? 0;
  const scale = (obj.scale ?? 0.45) * zoom;

  const fr = getFrame(image, col, row, cols, rows);
  const sourceCanvas = fr?.cell ?? image;
  const sx = fr ? 0 : col * (image.width / cols);
  const sy = fr ? 0 : row * (image.height / rows);
  const sw = fr ? fr.cell.width : image.width / cols;
  const sh = fr ? fr.cell.height : image.height / rows;

  const drawW = sw * scale;
  const drawH = sh * scale;

  ctx.save();
  ctx.translate(x, y);

  if (isReflection) {
    ctx.scale(1, -0.38);
    ctx.globalAlpha = 0.16;
  } else {
    // Sombra elíptica no chão sob o prop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(12, drawW * 0.28), Math.max(4, 6 * zoom), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (obj.espelhar) ctx.scale(-1, 1);

  if (obj.brilho && !isReflection) {
    const t = time / 1000;
    const alpha = (obj.brilho.forca ?? 0.2) * (0.75 + 0.25 * Math.sin(t * 3.2 + obj.x));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = obj.brilho.cor ?? '#35E6D3';
    ctx.beginPath();
    ctx.arc(0, -drawH * 0.35, drawW * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.drawImage(
    sourceCanvas,
    sx, sy, sw, sh,
    -drawW / 2,
    -drawH * (obj.anchorY ?? 0.92),
    drawW, drawH
  );

  // Indicador holográfico sci-fi acima de terminais interativos
  if (!isReflection && (obj.moduleSystem || obj.interacao)) {
    drawTerminalHologram(ctx, obj, stateRef, zoom, time, drawH);
  }

  ctx.restore();
}

let stateRef = null;

function drawTerminalHologram(ctx, obj, state, zoom, time, drawH) {
  const t = time / 1000;
  const bob = Math.sin(t * 3.5 + obj.x) * 3 * zoom;
  const isMaint = obj.moduleSystem?.id === 'airport_maintenance_terminal';
  const diagnosed = Boolean(state?.progress?.flags?.airportTerminalDiagnosed);

  const color = isMaint
    ? (diagnosed ? '#74ff8a' : '#ffd54f')
    : '#35E6D3';

  const label = isMaint
    ? (diagnosed ? 'LINK OK' : '[R] DIAGNÓSTICO')
    : 'INFO';

  const hy = -drawH * 0.78 + bob;

  ctx.save();
  ctx.font = `bold ${Math.max(8, Math.round(8.5 * zoom))}px monospace`;
  ctx.textAlign = 'center';
  const textW = ctx.measureText(label).width + 12 * zoom;
  const boxH = 14 * zoom;

  ctx.fillStyle = 'rgba(8, 14, 22, 0.88)';
  ctx.fillRect(-textW / 2, hy - boxH, textW, boxH);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(-textW / 2, hy - boxH, textW, boxH);

  ctx.fillStyle = color;
  ctx.fillText(label, 0, hy - 4 * zoom);
  ctx.restore();
}

// =====================================================================
//  CAMADA 4: FOREGROUND CINEMATOGRÁFICO (SILHUETAS, GRADES E LUZ VOLUMÉTRICA)
// =====================================================================
function drawForegroundLayer(ctx, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY) {
  const t = time / 1000;

  // 4.1 Feixes diagonais suaves de luz volumétrica vindos dos janelões
  ctx.save();
  const beamStep = 360 * zoom;
  const beamShift = -((cameraX * 0.85 * zoom) % beamStep);
  for (let bx = beamShift - beamStep; bx < viewW + beamStep; bx += beamStep) {
    const grad = ctx.createLinearGradient(bx, 30 * zoom, bx + 110 * zoom, floorFrontY);
    grad.addColorStop(0, 'rgba(83, 217, 244, 0.055)');
    grad.addColorStop(0.7, 'rgba(53, 230, 211, 0.02)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(bx, 24 * zoom);
    ctx.lineTo(bx + 90 * zoom, 24 * zoom);
    ctx.lineTo(bx + 200 * zoom, floorFrontY);
    ctx.lineTo(bx + 70 * zoom, floorFrontY);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // 4.2 Partículas de poeira quântica ciano flutuando na estação
  ctx.save();
  for (let i = 0; i < 24; i++) {
    const px = ((i * 197 - cameraX * 0.92 * zoom + Math.sin(t * 0.6 + i) * 18) % viewW + viewW) % viewW;
    const py = ((i * 89 + t * 8) % Math.max(120, floorFrontY - 30)) + 20;
    const alpha = 0.2 + 0.25 * Math.sin(t * 2.1 + i);
    ctx.fillStyle = `rgba(110, 247, 234, ${alpha})`;
    ctx.fillRect(px, py, 2, 2);
  }
  ctx.restore();

  // 4.3 Grade e dutos técnicos em primeiro plano (abaixo da passarela floorFrontY)
  if (floorFrontY < viewH) {
    const underH = viewH - floorFrontY;
    ctx.fillStyle = '#05080e';
    ctx.fillRect(0, floorFrontY + 4 * zoom, viewW, underH);

    // Treliça metálica em parallax 1.28x no rodapé
    const fgStep = 96 * zoom;
    const fgShift = -((cameraX * 1.28 * zoom) % fgStep);
    ctx.strokeStyle = '#111c2b';
    ctx.lineWidth = Math.max(2, 3 * zoom);
    for (let gx = fgShift - fgStep; gx < viewW + fgStep; gx += fgStep) {
      ctx.beginPath();
      ctx.moveTo(gx, floorFrontY + 5 * zoom);
      ctx.lineTo(gx + fgStep * 0.5, viewH);
      ctx.lineTo(gx + fgStep, floorFrontY + 5 * zoom);
      ctx.stroke();

      // Pequeno LED de balizamento no primeiro plano
      ctx.fillStyle = 'rgba(53, 230, 211, 0.35)';
      ctx.fillRect(gx - 2, floorFrontY + 10 * zoom, 4, 2);
    }
  }

  // 4.4 Silhuetas de vigas verticais de primeiro plano passando nas laterais (parallax 1.35x)
  const fgBeamSpan = 920 * zoom;
  const fgBeamX = -((cameraX * 1.35 * zoom) % fgBeamSpan);
  for (let fx = fgBeamX - fgBeamSpan; fx < viewW + fgBeamSpan; fx += fgBeamSpan) {
    // Fica mais translúcida perto do centro da tela para nunca obstruir o jogador
    const distFromCenter = Math.abs(fx - viewW / 2) / (viewW / 2 || 1);
    const alpha = Math.min(0.78, Math.max(0.14, distFromCenter * 0.85));
    const bw = 28 * zoom;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#04070d';
    ctx.fillRect(fx - bw / 2, 0, bw, viewH);
    ctx.fillStyle = '#17283b';
    ctx.fillRect(fx - bw / 2 + 2 * zoom, 0, 2 * zoom, viewH);
    ctx.restore();
  }
}

// =====================================================================
//  RENDERIZAÇÃO PRINCIPAL DO MAPA SIDE-VIEW
// =====================================================================
export function renderSideViewMap(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, dpr, time, callbacks = {}) {
  stateRef = state;

  // Coordenadas em pixels CSS (o transform já aplica dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = map.meta?.corFundo ?? '#060a10';
  ctx.fillRect(0, 0, viewW, viewH);

  const { y: wallBaseY } = svToScreen(0, WALL_WORLD_Y, cameraX, cameraY, viewW, viewH, zoom);
  const { y: floorFrontY } = svToScreen(0, FLOOR_FRONT_Y, cameraX, cameraY, viewW, viewH, zoom);

  // 1. Background Espacial (estrelas, planeta anelado, naves, arte espacial)
  drawSpaceLayer(ctx, map, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY);

  // 2. Camada Intermediária (janelões, mezanino, colunas de neon, portais verticais)
  drawMidStructuresLayer(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY);

  // 3. Piso Reflexivo Espelhado
  drawReflectiveFloor(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY, callbacks);

  // 4. Indicador de clique de movimento no piso
  if (state.player?.target) {
    const tPos = svToScreen(state.player.target.x, state.player.target.y, cameraX, cameraY, viewW, viewH, zoom);
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(tPos.x, tPos.y, 12 * zoom, 5 * zoom, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 5. Fila unificada 2.5D ordenada por profundidade Y (menor Y = mais ao fundo = desenhado antes)
  const renderQueue = [];

  for (const obj of state.objects ?? []) {
    if (obj.invisivel || obj.tipo === 'portao_visual') continue;
    if (obj.hideWhenFlag && state.progress?.flags?.[obj.hideWhenFlag]) continue;
    if (obj.showWhenFlag && !state.progress?.flags?.[obj.showWhenFlag]) continue;
    renderQueue.push({ kind: 'object', y: obj.y, item: obj });
  }

  for (const item of state.collectibles ?? []) {
    if (item.requiresFlag && !state.progress?.flags?.[item.requiresFlag]) continue;
    renderQueue.push({ kind: 'collectible', y: item.y, item });
  }

  for (const actor of state.actors ?? []) {
    renderQueue.push({ kind: 'actor', y: actor.y, item: actor });
  }

  if (state.player) {
    renderQueue.push({ kind: 'player', y: state.player.y, item: state.player });
  }

  renderQueue.sort((a, b) => a.y - b.y);

  for (const entry of renderQueue) {
    if (entry.kind === 'object' || entry.kind === 'collectible') {
      drawSideObject(ctx, entry.item, cameraX, cameraY, viewW, viewH, zoom, time, false);
    } else if (entry.kind === 'actor') {
      const { x, y } = svToScreen(entry.item.x, entry.item.y, cameraX, cameraY, viewW, viewH, zoom);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(zoom, zoom);
      if (callbacks.drawActor) {
        callbacks.drawActor(entry.item, 0, 0);
      }
      ctx.restore();
    } else if (entry.kind === 'player') {
      const { x, y } = svToScreen(entry.item.x, entry.item.y, cameraX, cameraY, viewW, viewH, zoom);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(zoom, zoom);
      if (callbacks.drawPlayer) {
        callbacks.drawPlayer(entry.item, 0, 0);
      }
      ctx.restore();

      // Anel de scan / diagnóstico (tecla R) em perspectiva side-view
      if (entry.item.ability?.scanning > 0) {
        const pulse = 1 - (entry.item.ability.scanning % 0.6) / 0.6;
        ctx.save();
        ctx.strokeStyle = 'rgba(53, 230, 211, 0.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, (24 + pulse * 68) * zoom, (9 + pulse * 24) * zoom, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // 6. Foreground Cinematográfico (feixes de luz, partículas e silhuetas de primeiro plano)
  drawForegroundLayer(ctx, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
