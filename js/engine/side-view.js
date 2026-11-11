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

// Placas do mezanino superior (agora no teto, fora da faixa dos pórticos)
const MEZZANINE_SIGNS = [
  { wx: 4.6, text: 'SETOR A · DESEMBARQUE', cor: '#35E6D3' },
  { wx: 14.6, text: 'SETOR B · MIRANTE ORBITAL', cor: '#53d9f4' },
  { wx: 27.6, text: 'SETOR C · DOCAS DE ARQUÉTIPO', cor: '#ffd54f' },
  { wx: 39.0, text: 'SETOR D · ENGENHARIA & CARGA', cor: '#ff9e44' },
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

// Arte gerada para o "aeroporto vivo" (tools/preparar-aeroporto.py)
const SHIP_SPRITES = {
  freighter: 'aeroporto_nave_cargueiro',
  cruiser: 'aeroporto_nave_cruzador',
  shuttle: 'aeroporto_nave_shuttle',
};
const SHIP_HEIGHT = { freighter: 46, cruiser: 30, shuttle: 24 };

// ---------------------------------------------------------------------
// ESCALA POR PROFUNDIDADE (pseudo-3D): quem anda pelo fundo da passarela
// (perto dos janelões) encolhe; quem vem para a borda frontal cresce.
// ---------------------------------------------------------------------
export function svDepthScale(wy) {
  const t = Math.min(1, Math.max(0, (wy - WALL_WORLD_Y) / (FLOOR_FRONT_Y - WALL_WORLD_Y)));
  return 0.8 + t * 0.34;
}

// ---------------------------------------------------------------------
// PARALLAX DINÂMICO COM O MOUSE (leve, estilo "estação orbital de verdade")
// Camada 1 move com o mouse; o foreground move no sentido oposto.
// ---------------------------------------------------------------------
const mouseFx = { target: 0.5, smooth: 0.5, ready: false };

function ensureMouseParallax() {
  if (mouseFx.ready) return;
  mouseFx.ready = true;
  try {
    const w = globalThis.window;
    w?.addEventListener?.('mousemove', (e) => {
      const vw = (typeof w.innerWidth === 'number' && w.innerWidth) || 1280;
      const cx = typeof e?.clientX === 'number' ? e.clientX : vw / 2;
      mouseFx.target = Math.min(1, Math.max(0, cx / vw));
    });
  } catch {
    // Ambiente sem window (testes headless): parallax fica centrado.
  }
}

function tickMouseShift() {
  ensureMouseParallax();
  mouseFx.smooth += (mouseFx.target - mouseFx.smooth) * 0.045;
  return (mouseFx.smooth - 0.5) * 2; // -1 (mouse à esquerda) .. +1 (direita)
}

// ---------------------------------------------------------------------
// ESTRELA CADENTE OCASIONAL do lado de fora (a cada ~7–16 s)
// ---------------------------------------------------------------------
let shootingStar = null;
let nextShootingStarAt = 5;

function drawShootingStar(ctx, viewW, windowH, t) {
  if (!shootingStar && t >= nextShootingStarAt) {
    shootingStar = { t0: t, x0: viewW * (0.55 + 0.4 * Math.abs(Math.sin(t * 3.7))), y0: windowH * 0.08 };
    nextShootingStarAt = t + 7 + Math.abs(Math.sin(t * 11.3)) * 9;
  }
  if (!shootingStar) return;
  const k = (t - shootingStar.t0) / 0.9;
  if (k >= 1) { shootingStar = null; return; }
  const hx = shootingStar.x0 - k * viewW * 0.4;
  const hy = shootingStar.y0 + k * windowH * 0.26;
  const tx = hx + viewW * 0.085;
  const ty = hy - windowH * 0.055;
  const fade = Math.sin(Math.PI * k);
  const grad = ctx.createLinearGradient(tx, ty, hx, hy);
  grad.addColorStop(0, 'rgba(216, 243, 255, 0)');
  grad.addColorStop(0.75, `rgba(216, 243, 255, ${0.55 * fade})`);
  grad.addColorStop(1, `rgba(255, 255, 255, ${0.95 * fade})`);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(hx, hy);
  ctx.stroke();
}

// ---------------------------------------------------------------------
// VÓRTICE DOS PORTAIS — a arte gerada (`aeroporto_portal_swirl`) é tingida
// em tempo de execução para cada cor de doca e girada em duas camadas
// (o braço espiral rodopiante é uma ÚNICA imagem rotacionada).
// ---------------------------------------------------------------------
const swirlTintCache = new Map();

function getTintedSwirl(hexColor) {
  if (swirlTintCache.has(hexColor)) return swirlTintCache.get(hexColor);
  try {
    const doc = globalThis.document;
    const src = getSprite('aeroporto_portal_swirl');
    if (!doc?.createElement || !src) return null;
    const SIZE = 256;
    const canvas = doc.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const g = canvas.getContext?.('2d');
    if (!g) return null;
    // 1) silhueta na cor da doca preservando o alpha do vórtice
    g.fillStyle = hexColor;
    g.fillRect(0, 0, SIZE, SIZE);
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(src, 0, 0, SIZE, SIZE);
    // 2) passa a luminância de volta por cima: o miolo branco continua branco
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.85;
    g.drawImage(src, 0, 0, SIZE, SIZE);
    swirlTintCache.set(hexColor, canvas);
    return canvas;
  } catch {
    return null;
  }
}

// Converte mundo -> tela usando a mesma fórmula da câmera
export function svToScreen(wx, wy, cameraX, cameraY, viewW, viewH, zoom) {
  return svWorldToScreen(wx, wy, viewW, viewH, zoom);
}

// =====================================================================
//  CAMADA 1: BACKGROUND ESPACIAL PROFUNDO
// =====================================================================
function drawSpaceLayer(ctx, map, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, mouseShift = 0) {
  const windowH = Math.max(80, wallBaseY);
  const t = time / 1000;
  const mousePx = mouseShift * 9; // deriva suave do céu com o mouse

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
    viewW * 0.5 - ((cameraX * 0.05) % (viewW * 0.6)) + mousePx,
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
    const rawX = (s.xNorm * spanW - cameraX * s.parallax + mousePx * 0.6) % spanW;
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

  drawShootingStar(ctx, viewW, windowH, t);

  // 1.4 Planetas anelado (IA) e rochoso + estações orbitais (parallax profundo)
  drawSpacePlanets(ctx, cameraX, viewW, windowH, zoom, t, mousePx);

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

    const parallaxX = -((cameraX * 0.22 * zoom - mousePx * 1.6) % drawW);
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
    drawSpaceShip(ctx, ship, cameraX, viewW, windowH, zoom, t, mousePx);
  }
  ctx.restore();
}

// Planetas gerados por IA + estações orbitais. Se a arte falhar ao carregar,
// cai no desenho procedural original (drawRingedPlanet) — nunca some o céu.
function drawSpacePlanets(ctx, cameraX, viewW, windowH, zoom, t, mousePx = 0) {
  const ringed = getSprite('aeroporto_planeta_anelado');
  const red = getSprite('aeroporto_planeta_vermelho');

  if (!ringed && !red) {
    drawRingedPlanet(ctx, cameraX, viewW, windowH, zoom, t);
    return;
  }

  // 1.5a Planeta rochoso âmbar (bem ao longe, parallax 0.04x)
  if (red) {
    const px = viewW * 0.17 - cameraX * 0.04 * zoom + mousePx * 0.5;
    const py = windowH * 0.20 + Math.sin(t * 0.18) * 2;
    const size = Math.max(64, 88 * zoom);
    if (px > -size && px < viewW + size) {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(red, px - size / 2, py - size / 2, size, size * (red.height / red.width));
      ctx.restore();
    }
  }

  // 1.5b Planeta gasoso anelado (parallax 0.065x)
  const px = viewW * 0.64 - cameraX * 0.065 * zoom + mousePx;
  const py = windowH * 0.33;
  const size = Math.max(120, 190 * zoom);
  const aspect = ringed ? ringed.height / ringed.width : 0.84;
  if (ringed && px > -size * 1.5 && px < viewW + size * 1.5) {
    // Halo atmosférico externo
    const halo = ctx.createRadialGradient(px, py, size * 0.28, px, py, size * 0.85);
    halo.addColorStop(0, 'rgba(53, 230, 211, 0.22)');
    halo.addColorStop(0.6, 'rgba(22, 110, 160, 0.07)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(px, py, size * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.drawImage(ringed, px - size / 2, py - (size * aspect) / 2, size, size * aspect);

    // Pequena estação orbital perto do planeta (silhueta + farol piscando)
    const satX = px - size * 0.52;
    const satY = py - size * 0.30 + Math.sin(t * 1.2) * 3;
    ctx.fillStyle = '#16273a';
    ctx.fillRect(satX - 14, satY - 3, 28, 6);
    ctx.fillRect(satX - 4, satY - 11, 8, 22);
    ctx.fillStyle = Math.sin(t * 4) > 0 ? '#35E6D3' : '#ff6b6b';
    ctx.fillRect(satX - 1, satY - 13, 2, 2);
  } else if (!ringed) {
    drawRingedPlanet(ctx, cameraX, viewW, windowH, zoom, t);
  }
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

function drawSpaceShip(ctx, ship, cameraX, viewW, windowH, zoom, t, mousePx = 0) {
  const loopW = Math.max(2200, viewW + 900);
  const travel = (t * ship.speed + ship.offset) * ship.dir;
  const rawX = (travel - cameraX * 0.16 * zoom + mousePx * 1.5) % loopW;
  const x = rawX < -200 ? rawX + loopW : (rawX > loopW - 200 ? rawX - loopW : rawX);
  const y = windowH * ship.yRatio + Math.sin(t * 1.5 + ship.offset) * 3;
  const s = ship.scale * Math.max(0.75, zoom * 0.85);

  if (x < -260 || x > viewW + 260) return;

  const img = SHIP_SPRITES[ship.type] ? getSprite(SHIP_SPRITES[ship.type]) : null;
  const targetH = (SHIP_HEIGHT[ship.type] ?? 30) * s;
  const pulse = 0.7 + 0.3 * Math.sin(t * 16 + ship.offset);

  ctx.save();
  ctx.translate(x, y);
  if (ship.dir < 0) ctx.scale(-1, 1);

  // Rastro de plasma do propulsor (sempre, mesmo com a arte nova)
  const trailLen = (img ? targetH * 1.9 : 52 * s) * pulse;
  const trailGrad = ctx.createLinearGradient(-trailLen - (img ? targetH * 1.5 : 14 * s), 0, -(img ? targetH * 1.5 : 14 * s), 0);
  trailGrad.addColorStop(0, 'rgba(53, 230, 211, 0)');
  trailGrad.addColorStop(1, ship.color === '#ffd54f' ? 'rgba(255, 213, 79, 0.75)' : 'rgba(53, 230, 211, 0.75)');
  ctx.fillStyle = trailGrad;
  ctx.fillRect(-trailLen - (img ? targetH * 1.5 : 14 * s), -2.6 * s, trailLen, 5.2 * s);

  if (img) {
    // Arte gerada: nave real em pixel art, com clarão do motor e faróis
    const w = targetH * (img.width / img.height);
    // Clarão do motor (aditivo) tremulando na popa
    const flare = ctx.createRadialGradient(-w / 2, 0, 1, -w / 2, 0, targetH * 0.55 * (0.8 + 0.4 * pulse));
    flare.addColorStop(0, ship.color === '#ffd54f' ? 'rgba(255, 224, 130, 0.9)' : 'rgba(140, 255, 235, 0.9)');
    flare.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = flare;
    ctx.fillRect(-w / 2 - targetH, -targetH * 0.6, targetH * 1.2, targetH * 1.2);
    ctx.restore();

    ctx.drawImage(img, -w / 2, -targetH / 2, w, targetH);

    // Faróis de navegação: vermelho na proa / verde na boreste, alternando
    const blink = Math.sin(t * 5.5 + ship.offset) > 0;
    ctx.fillStyle = blink ? '#ff5f5f' : '#35ff8a';
    ctx.fillRect(w / 2 - 2, -1.2, 3, 2.4);
  } else {
    ctx.scale(s, s);
    drawSpaceShipBody(ctx, ship);
  }

  ctx.restore();
}

// Silhueta vetorial original (fallback caso a arte não carregue)
function drawSpaceShipBody(ctx, ship) {
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
  // Ancorado acima da faixa das placas dos pórticos para não disputar
  // espaço com "DOCA A1..D4" (antes os textos se sobrepunham).
  const mezzY = wallBaseY - 156 * zoom;
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

    // Luminárias pendentes sob o mezanino (luz âmbar/ciano como na arte).
    // Uma ou outra pisca de vez em quando — estação grande, lâmpada velha.
    const lampStep = 150 * zoom;
    const lampShift = -((cameraX * 0.62 * zoom) % lampStep);
    for (let lx = lampShift - lampStep; lx < viewW + lampStep; lx += lampStep) {
      const ly = mezzY + 17 * zoom;
      const lampSeed = Math.abs(Math.sin(lx * 12.9898) * 43758.5453) % 1;
      const flick = Math.sin(t * 7 + lampSeed * 97) > 0.93 ? 0.35 : 1;
      // Haste
      ctx.fillStyle = '#253952';
      ctx.fillRect(lx - 1.5 * zoom, mezzY + 13 * zoom, 3 * zoom, 6 * zoom);
      // Cúpula da luminária
      ctx.fillStyle = `rgba(255, 224, 130, ${flick})`;
      ctx.fillRect(lx - 8 * zoom, ly, 16 * zoom, 3.2 * zoom);
      // Halo suave
      const glow = ctx.createRadialGradient(lx, ly + 2 * zoom, 2, lx, ly + 8 * zoom, 30 * zoom);
      glow.addColorStop(0, `rgba(255, 224, 130, ${0.24 * flick})`);
      glow.addColorStop(0.5, `rgba(53, 230, 211, ${0.08 * flick})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(lx, ly + 7 * zoom, 30 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }

    // Painel de LED corrido na face da viga do mezanino (boas-vindas +
    // estado real da Área de Carga, lido do save)
    drawMezzanineTicker(ctx, state, viewW, mezzY, zoom, t);
  }

  // 2.3 Vigas arqueadas do teto do hangar
  const roofH = 26 * zoom;
  ctx.fillStyle = '#09101a';
  ctx.fillRect(0, 0, viewW, roofH);
  ctx.fillStyle = '#18293e';
  ctx.fillRect(0, roofH - 3 * zoom, viewW, 3 * zoom);

  // Faróis vermelhos de balizamento ao longo da treliça do teto
  for (const bx of [0.18, 0.5, 0.82]) {
    const lx = viewW * bx;
    const on = Math.sin(t * 2.1 + bx * 9) > 0.2;
    ctx.fillStyle = on ? '#ff5f5f' : 'rgba(255, 95, 95, 0.25)';
    ctx.fillRect(lx - 1.5 * zoom, roofH - 10 * zoom, 3 * zoom, 2.5 * zoom);
    if (on) {
      ctx.fillStyle = 'rgba(255, 95, 95, 0.18)';
      ctx.beginPath();
      ctx.arc(lx, roofH - 9 * zoom, 6 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Placas de setor na faixa do teto (não disputam mais com os pórticos)
  ctx.font = `bold ${Math.max(8, Math.round(8.5 * zoom))}px monospace`;
  ctx.textAlign = 'center';
  for (const sign of MEZZANINE_SIGNS) {
    const sx = (sign.wx * TILE_W - cameraX) * 0.72 * zoom + viewW / 2;
    if (sx < -160 || sx > viewW + 160) continue;
    const boxW = 168 * zoom;
    const boxH = 13.5 * zoom;
    ctx.fillStyle = 'rgba(10, 16, 26, 0.88)';
    ctx.fillRect(sx - boxW / 2, 4.5 * zoom, boxW, boxH);
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = sign.cor;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - boxW / 2, 4.5 * zoom, boxW, boxH);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = sign.cor;
    ctx.fillText(sign.text, sx, 14.5 * zoom);
    ctx.globalAlpha = 1;
  }

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

// Painel de LED corrido na viga do mezanino: saudação da estação e estado
// real da Área de Carga (lido do save). Âmbar ponto-matricial sobre escuro.
function drawMezzanineTicker(ctx, state, viewW, mezzY, zoom, t) {
  const cargaLiberada = Boolean(state?.progress?.flags?.airportTerminalDiagnosed);
  const status = cargaLiberada
    ? 'ÁREA DE CARGA LIBERADA PARA EMBARQUE'
    : 'ÁREA DE CARGA EM CONTENÇÃO — DIAGNÓSTICO DE TERMINAL NECESSÁRIO';
  const ticker = `BLOCO 404 ▪ AEROPORTO CENTRAL — ZONA X10 ▪ BEM-VINDO, VIAJANTE ▪ ${status} ▪ DOCAS A1 BIO-FORJA ▪ B2 DOMÍNIO ▪ C3 MARÉ ASTRAL ▪ D4 NÚCLEO 10X ▪ OPERAÇÃO NORMAL ▪ `;

  const stripY = mezzY + 2.5 * zoom;
  const stripH = 11 * zoom;

  // Face escura da viga com leve viés
  ctx.fillStyle = 'rgba(5, 9, 15, 0.72)';
  ctx.fillRect(0, stripY, viewW, stripH);
  ctx.fillStyle = 'rgba(255, 202, 102, 0.10)';
  ctx.fillRect(0, stripY + stripH - 1.2 * zoom, viewW, 1.2 * zoom);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, stripY, viewW, stripH);
  ctx.clip();
  ctx.font = `bold ${Math.max(7.5, 8.5 * zoom)}px monospace`;
  ctx.textAlign = 'left';
  const textWidth = Math.max(1, ctx.measureText(ticker).width);
  const offset = (t * 52 * zoom) % textWidth;
  ctx.fillStyle = '#ffc966';
  ctx.shadowColor = 'rgba(255, 201, 102, 0.55)';
  ctx.shadowBlur = 4 * zoom;
  for (let x = -offset; x < viewW; x += textWidth) {
    ctx.fillText(ticker, x, stripY + stripH - 3 * zoom);
  }
  ctx.restore();
  ctx.shadowBlur = 0;
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
      // Feixe de varredura do sistema de segurança descendo a comporta
      const scanY = -archH + ((t * 34) % archH);
      const scan = ctx.createLinearGradient(0, scanY - 13, 0, scanY + 13);
      scan.addColorStop(0, 'rgba(255, 90, 90, 0)');
      scan.addColorStop(0.5, 'rgba(255, 90, 90, 0.5)');
      scan.addColorStop(1, 'rgba(255, 90, 90, 0)');
      ctx.fillStyle = scan;
      ctx.fillRect(-halfW, scanY - 13, archW, 26);
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

      // Arte gerada do vórtice rodopiante — duas camadas girando em sentidos
      // opostos, tingidas na cor da doca (o braço espiral é uma única imagem)
      const swirl = getTintedSwirl(mainColor);
      const cx = 0;
      const cy = -archH * 0.52;
      if (swirl) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(cx, cy);
        const R = halfW * 1.45;
        ctx.rotate(t * 0.85 + p.x * 0.7);
        ctx.globalAlpha = 0.95;
        ctx.drawImage(swirl, -R, -R, R * 2, R * 2);
        ctx.rotate(-t * 1.85 + 1.2);
        ctx.globalAlpha = 0.7;
        const R2 = R * 0.58;
        ctx.drawImage(swirl, -R2, -R2, R2 * 2, R2 * 2);
        ctx.restore();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

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

      // Faíscas espirais caindo para dentro do portal
      const cy2 = -archH * 0.52;
      for (let i = 0; i < 7; i++) {
        const ph = (t * 0.42 + i / 7 + p.x * 0.11) % 1;
        const ang = i * 2.399963 + t * 0.55;
        const rad = (1 - ph) * (halfW * 0.95);
        const px = Math.cos(ang) * rad;
        const py = cy2 + Math.sin(ang) * rad * 0.88;
        const sz = 1 + ph * 1.6;
        ctx.globalAlpha = 0.15 + ph * 0.75;
        ctx.fillStyle = '#eafffb';
        ctx.fillRect(px - sz / 2, py - sz / 2, sz, sz);
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

    // Comporta trancada: moldura de perigo "marching ants" por cima do neon
    if (locked) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -t * 30;
      ctx.strokeStyle = 'rgba(255, 120, 120, 0.95)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-halfW + 3, -2);
      ctx.lineTo(-halfW + 3, -archH * 0.62);
      ctx.arc(0, -archH * 0.62, halfW - 3, Math.PI, 0, false);
      ctx.lineTo(halfW - 3, -2);
      ctx.stroke();
      ctx.restore();
    }

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

  // 3.6 Varredura de reflexo especular — um "brilho de chão molhado"
  // atravessando a passarela a cada poucos segundos
  const sheenX = ((t * 72) % (viewW + 1600)) - 800;
  const sheen = ctx.createLinearGradient(sheenX - 230, 0, sheenX + 230, 0);
  sheen.addColorStop(0, 'rgba(190, 235, 255, 0)');
  sheen.addColorStop(0.5, 'rgba(190, 235, 255, 0.085)');
  sheen.addColorStop(1, 'rgba(190, 235, 255, 0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.moveTo(sheenX - 230, wallBaseY);
  ctx.lineTo(sheenX + 230, wallBaseY);
  ctx.lineTo(sheenX + 430, floorFrontY);
  ctx.lineTo(sheenX - 30, floorFrontY);
  ctx.closePath();
  ctx.fill();

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
    const ds = svDepthScale(actor.y);
    const { x, y } = svToScreen(actor.x, actor.y, cameraX, cameraY, viewW, viewH, zoom);
    if (x < -120 || x > viewW + 120) continue;
    ctx.save();
    ctx.translate(x, y + 2 * zoom);
    ctx.scale(zoom * ds, -zoom * ds * 0.42);
    ctx.globalAlpha = 0.18;
    if (callbacks.drawActor) callbacks.drawActor(actor, 0, 0);
    ctx.restore();
  }

  // Player espelhado no piso reflexivo
  if (state.player && callbacks.drawPlayer) {
    const ds = svDepthScale(state.player.y);
    const { x, y } = svToScreen(state.player.x, state.player.y, cameraX, cameraY, viewW, viewH, zoom);
    ctx.save();
    ctx.translate(x, y + 2 * zoom);
    ctx.scale(zoom * ds, -zoom * ds * 0.42);
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
  const scale = (obj.scale ?? 0.45) * zoom * svDepthScale(obj.y);

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
function drawForegroundLayer(ctx, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY, mouseShift = 0) {
  const t = time / 1000;
  const mousePx = mouseShift * 12;

  // 4.1 Feixes diagonais suaves de luz volumétrica vindos dos janelões
  ctx.save();
  const beamStep = 360 * zoom;
  const beamShift = -((cameraX * 0.85 * zoom + mousePx * 0.7) % beamStep);
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
  for (let i = 0; i < 36; i++) {
    const px = ((i * 197 - cameraX * 0.92 * zoom + Math.sin(t * 0.6 + i) * 18 - mousePx * 0.5) % viewW + viewW) % viewW;
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
  const fgBeamX = -((cameraX * 1.35 * zoom + mousePx * 1.2) % fgBeamSpan);
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
  const mouseShift = tickMouseShift();

  // 1. Background Espacial (estrelas, planeta anelado, naves, arte espacial)
  drawSpaceLayer(ctx, map, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, mouseShift);

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
      const ds = svDepthScale(entry.item.y);
      const { x, y } = svToScreen(entry.item.x, entry.item.y, cameraX, cameraY, viewW, viewH, zoom);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(zoom * ds, zoom * ds);
      if (callbacks.drawActor) {
        callbacks.drawActor(entry.item, 0, 0);
      }
      ctx.restore();
      // Mantém a altura do sprite coerente com a escala de profundidade
      // para o rótulo flutuante (drawLabels multiplica por zoom).
      if (entry.item._topo) entry.item._topo = Math.round(entry.item._topo * ds);
    } else if (entry.kind === 'player') {
      const ds = svDepthScale(entry.item.y);
      const { x, y } = svToScreen(entry.item.x, entry.item.y, cameraX, cameraY, viewW, viewH, zoom);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(zoom * ds, zoom * ds);
      if (callbacks.drawPlayer) {
        callbacks.drawPlayer(entry.item, 0, 0);
      }
      ctx.restore();
      if (entry.item._topo) entry.item._topo = Math.round(entry.item._topo * ds);

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
  drawForegroundLayer(ctx, cameraX, cameraY, viewW, viewH, zoom, time, wallBaseY, floorFrontY, mouseShift);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
