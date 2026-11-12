// js/engine/viaduto-view.js
// =====================================================================
// VIADUTO DOS VETORES — renderer side-view 2.5D próprio (Núcleo 10X)
// Mesma projeção de câmera do Aeroporto, mas cenário exterior tropical/
// industrial. A física continua layout/walkMask + colisão padrão.
// =====================================================================
import { getSprite } from './sprites.js';
import { getFrame } from './sprite-clean.js';
import { svWorldToScreen } from './camera.js';

const GREEN = '#8cff9e';
const AMBER = '#ffc94a';

function toScreen(wx, wy, cx, cy, vw, vh, zoom) {
  return svWorldToScreen(wx, wy, vw, vh, zoom);
}

function drawObject(ctx, obj, cx, cy, vw, vh, zoom) {
  const image = getSprite(obj.sprite);
  if (!image) return;
  const { x, y } = toScreen(obj.x, obj.y, cx, cy, vw, vh, zoom);
  if (x < -200 || x > vw + 200) return;
  const fr = getFrame(image, 0, 0, obj.sheetCols ?? 1, obj.sheetRows ?? 1);
  const src = fr?.cell ?? image;
  const scale = (obj.scale ?? 0.25) * zoom;
  const w = src.width * scale, h = src.height * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath(); ctx.ellipse(0, 0, Math.max(10, w * .28), 5 * zoom, 0, 0, Math.PI * 2); ctx.fill();
  if (obj.espelhar) ctx.scale(-1, 1);
  ctx.drawImage(src, -w / 2, -h * (obj.anchorY ?? .95), w, h);
  if (obj.interacao) {
    ctx.fillStyle = 'rgba(8,18,14,.85)';
    ctx.fillRect(-42 * zoom, -h - 18 * zoom, 84 * zoom, 13 * zoom);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1;
    ctx.strokeRect(-42 * zoom, -h - 18 * zoom, 84 * zoom, 13 * zoom);
    ctx.fillStyle = GREEN; ctx.font = `bold ${8 * zoom}px monospace`; ctx.textAlign = 'center';
    ctx.fillText('[E] TERMINAL', 0, -h - 8 * zoom);
  }
  ctx.restore();
}

function drawArch(ctx, wx, cx, cy, vw, vh, zoom, label, active) {
  const image = getSprite('nucleo_sala_arco_viaduto');
  const { x, y } = toScreen(wx, 3.15, cx, cy, vw, vh, zoom);
  if (x < -220 || x > vw + 220) return;
  const h = 168 * zoom, w = 136 * zoom;
  ctx.save();
  ctx.translate(x, y);
  if (image) {
    const fr = getFrame(image, 0, 0, 1, 1);
    const src = fr?.cell ?? image;
    ctx.drawImage(src, -w / 2, -h, w, h);
  } else {
    ctx.strokeStyle = active ? GREEN : '#426451'; ctx.lineWidth = 8 * zoom;
    ctx.strokeRect(-w / 2, -h, w, h);
  }
  ctx.fillStyle = 'rgba(6,16,12,.88)';
  ctx.fillRect(-78 * zoom, -h - 20 * zoom, 156 * zoom, 15 * zoom);
  ctx.strokeStyle = active ? GREEN : '#5d7a68'; ctx.lineWidth = 1;
  ctx.strokeRect(-78 * zoom, -h - 20 * zoom, 156 * zoom, 15 * zoom);
  ctx.fillStyle = active ? '#d8ffe4' : '#9db8a8';
  ctx.font = `bold ${8 * zoom}px monospace`; ctx.textAlign = 'center';
  ctx.fillText(label, 0, -h - 9 * zoom);
  ctx.restore();
}

function drawCollectible(ctx, item, cx, cy, vw, vh, zoom, t) {
  const { x, y } = toScreen(item.x, item.y, cx, cy, vw, vh, zoom);
  if (x < -80 || x > vw + 80) return;
  const bob = Math.sin(t * 3 + item.x) * 4 * zoom;
  ctx.save();
  ctx.translate(x, y - 18 * zoom - bob);
  ctx.rotate(t * 1.4);
  ctx.fillStyle = '#9dffb8'; ctx.strokeStyle = '#2f9c58'; ctx.lineWidth = 2 * zoom;
  ctx.beginPath();
  ctx.moveTo(0, -12 * zoom); ctx.lineTo(9 * zoom, 0); ctx.lineTo(0, 12 * zoom); ctx.lineTo(-9 * zoom, 0); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

export function renderViadutoVetores(ctx, map, state, cameraX, cameraY, viewW, viewH, zoom, dpr, time, callbacks = {}) {
  const t = time / 1000;
  const flags = state.progress?.flags ?? {};
  const active = !!flags.rota_viaduto_vetores_aberta;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = map.meta?.corFundo ?? '#0a1418';
  ctx.fillRect(0, 0, viewW, viewH);

  // 1) Panorama exterior com parallax suave (imagem procedural do pipeline).
  const pano = getSprite('nucleo_viaduto_panorama');
  const backY = toScreen(0, 2.6, cameraX, cameraY, viewW, viewH, zoom).y;
  if (pano) {
    const pw = viewW + 260, ph = pw * (pano.height / pano.width);
    const px = -130 - (cameraX * .08) % 130;
    ctx.drawImage(pano, px, backY - ph * .78, pw, ph);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, backY);
    g.addColorStop(0, '#0a1420'); g.addColorStop(1, '#2a5a5e');
    ctx.fillStyle = g; ctx.fillRect(0, 0, viewW, backY);
  }
  // Névoa viva sobre o canal.
  ctx.save();
  ctx.globalAlpha = .12;
  ctx.fillStyle = '#9fe0d4';
  for (let i = 0; i < 5; i++) {
    const x = ((t * 12 + i * 310) % (viewW + 300)) - 150;
    ctx.beginPath(); ctx.ellipse(x, backY - 24 + i * 7, 150, 12, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // 2) Tabuleiro metálico da passarela (mundo y=3..7).
  const yBack = toScreen(0, 3.0, cameraX, cameraY, viewW, viewH, zoom).y;
  const yFront = toScreen(0, 7.0, cameraX, cameraY, viewW, viewH, zoom).y;
  const x0 = toScreen(1, 0, cameraX, cameraY, viewW, viewH, zoom).x;
  const x1 = toScreen(33, 0, cameraX, cameraY, viewW, viewH, zoom).x;
  ctx.fillStyle = '#151f1d';
  ctx.fillRect(x0, yBack, x1 - x0, yFront - yBack);
  // Placas longitudinais com juntas e faixas de indução.
  for (let wx = 1; wx < 33; wx++) {
    const sx = toScreen(wx, 0, cameraX, cameraY, viewW, viewH, zoom).x;
    const ex = toScreen(wx + 1, 0, cameraX, cameraY, viewW, viewH, zoom).x;
    ctx.fillStyle = wx % 2 ? '#1b2724' : '#182320';
    ctx.fillRect(sx, yBack, ex - sx, yFront - yBack);
    ctx.strokeStyle = '#0b120f'; ctx.lineWidth = 1.5 * zoom;
    ctx.beginPath(); ctx.moveTo(sx, yBack); ctx.lineTo(sx, yFront); ctx.stroke();
    if (wx % 3 === 0) {
      ctx.fillStyle = active ? 'rgba(140,255,158,.55)' : 'rgba(80,130,95,.35)';
      ctx.fillRect(sx + 8 * zoom, yBack + 8 * zoom, 18 * zoom, 3 * zoom);
    }
  }
  // Guarda-corpos traseiro e dianteiro.
  for (const [gy, color] of [[yBack, '#2c4038'], [yFront, '#385044']]) {
    ctx.strokeStyle = color; ctx.lineWidth = 5 * zoom;
    ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); ctx.stroke();
    ctx.strokeStyle = active ? GREEN : '#4c7a5e'; ctx.lineWidth = 1.5 * zoom;
    ctx.beginPath(); ctx.moveTo(x0, gy - 3 * zoom); ctx.lineTo(x1, gy - 3 * zoom); ctx.stroke();
  }
  // Vigas de sustentação descendo para o canal.
  for (let wx = 3; wx < 33; wx += 5) {
    const sx = toScreen(wx, 0, cameraX, cameraY, viewW, viewH, zoom).x;
    ctx.fillStyle = '#0d1512';
    ctx.fillRect(sx - 6 * zoom, yFront, 12 * zoom, viewH - yFront);
    ctx.strokeStyle = '#24382e'; ctx.lineWidth = 2 * zoom;
    ctx.beginPath(); ctx.moveTo(sx - 16 * zoom, yFront + 30 * zoom); ctx.lineTo(sx + 16 * zoom, yFront + 70 * zoom); ctx.stroke();
  }

  // 3) Cargo pod ambiental no trilho inferior (não colide, não é portal).
  const podX = toScreen(2 + ((t * 1.6) % 30), 8.3, cameraX, cameraY, viewW, viewH, zoom).x;
  const podY = toScreen(0, 8.3, cameraX, cameraY, viewW, viewH, zoom).y;
  ctx.save();
  ctx.translate(podX, podY);
  ctx.fillStyle = '#202c28'; ctx.fillRect(-46 * zoom, -22 * zoom, 92 * zoom, 22 * zoom);
  ctx.fillStyle = active ? GREEN : '#4c7a5e'; ctx.fillRect(-38 * zoom, -16 * zoom, 76 * zoom, 3 * zoom);
  ctx.fillStyle = AMBER; ctx.fillRect(34 * zoom, -12 * zoom, 6 * zoom, 6 * zoom);
  ctx.restore();

  // 4) Arcos de manutenção e portais reais.
  drawArch(ctx, 1.5, cameraX, cameraY, viewW, viewH, zoom, 'BASE DOS VETORES', active);
  drawArch(ctx, 12.0, cameraX, cameraY, viewW, viewH, zoom, 'VÃO CENTRAL', active);
  drawArch(ctx, 23.0, cameraX, cameraY, viewW, viewH, zoom, 'SETOR EXTERNO', active);
  drawArch(ctx, 31.5, cameraX, cameraY, viewW, viewH, zoom, 'ESTAÇÃO QUE RESPIRA', active);

  // 5) Fila de entidades ordenada por profundidade Y.
  const queue = [];
  for (const obj of state.objects ?? []) queue.push({ kind: 'object', y: obj.y, item: obj });
  for (const item of state.collectibles ?? []) {
    if (item.requiresFlag && !flags[item.requiresFlag]) continue;
    if (flags[`collected_${item.id}`]) continue;
    queue.push({ kind: 'collectible', y: item.y, item });
  }
  if (state.player) queue.push({ kind: 'player', y: state.player.y, item: state.player });
  queue.sort((a, b) => a.y - b.y);
  for (const entry of queue) {
    if (entry.kind === 'object') drawObject(ctx, entry.item, cameraX, cameraY, viewW, viewH, zoom);
    else if (entry.kind === 'collectible') drawCollectible(ctx, entry.item, cameraX, cameraY, viewW, viewH, zoom, t);
    else {
      const p = entry.item;
      const { x, y } = toScreen(p.x, p.y, cameraX, cameraY, viewW, viewH, zoom);
      ctx.save(); ctx.translate(x, y); ctx.scale(zoom, zoom);
      callbacks.drawPlayer?.(p, 0, 0);
      ctx.restore();
    }
  }

  // 6) Indicador de clique e HUD de rota.
  if (state.player?.target) {
    const p = toScreen(state.player.target.x, state.player.target.y, cameraX, cameraY, viewW, viewH, zoom);
    ctx.strokeStyle = GREEN; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 12 * zoom, 5 * zoom, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.save();
  const hudX = Math.max(16, viewW / 2 - 150);
  ctx.fillStyle = 'rgba(6,16,12,.82)';
  ctx.fillRect(hudX, 16, 300, 42);
  ctx.strokeStyle = active ? GREEN : '#5d7a68'; ctx.lineWidth = 1;
  ctx.strokeRect(hudX, 16, 300, 42);
  ctx.fillStyle = '#d8ffe4'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left';
  ctx.fillText('VIADUTO DOS VETORES', hudX + 12, 34);
  ctx.fillStyle = '#9db8a8'; ctx.font = '9px monospace';
  ctx.fillText('BASE DOS VETORES  ←→  ESTAÇÃO QUE RESPIRA', hudX + 12, 49);
  ctx.restore();
}
