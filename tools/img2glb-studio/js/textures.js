import * as THREE from 'three';

// Retângulos normalizados: o editor pode alterá-los sem mudar a imagem original.
export function defaultRegionsFromPixels(pixels, width, height) {
  const pixel = (x, y) => { const i = (y * width + x) * 4; return [pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]]; };
  const corners = [pixel(0, 0), pixel(width - 1, 0), pixel(0, height - 1), pixel(width - 1, height - 1)];
  const background = [0, 1, 2].map(i => corners.reduce((sum, c) => sum + c[i], 0) / 4);
  const foreground = (x, y) => {
    const p = pixel(x, y);
    if (p[3] < 32) return false;
    if (corners.some(c => c[3] < 32)) return true;
    return Math.hypot(p[0] - background[0], p[1] - background[1], p[2] - background[2]) > 35;
  };
  let minX = width, maxX = -1, minY = height, maxY = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (foreground(x, y)) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  if (maxX < minX || maxY - minY < height * 0.15) { minX = 0; maxX = width - 1; minY = 0; maxY = height - 1; }
  const span = maxY - minY + 1;
  const make = (start, end) => {
    const top = Math.max(0, Math.floor(minY + start * span)), bottom = Math.min(height - 1, Math.ceil(minY + end * span));
    let left = width, right = -1;
    for (let y = top; y <= bottom; y++) for (let x = minX; x <= maxX; x++) if (foreground(x, y)) { left = Math.min(left, x); right = Math.max(right, x); }
    if (right < left) { left = minX; right = maxX; }
    const padX = Math.max(2, (right - left) * 0.08), padY = Math.max(1, (bottom - top) * 0.025);
    const x = Math.max(0, left - padX), y = Math.max(0, top - padY);
    return { x: x / width, y: y / height, w: (Math.min(width, right + padX + 1) - x) / width, h: (Math.min(height, bottom + padY + 1) - y) / height };
  };
  const face = make(0, 0.15), torso = make(0.15, 0.41), legs = make(0.41, 1);
  // O tronco central não deve incorporar os braços inteiros da referência.
  torso.x += torso.w * 0.14; torso.w *= 0.72;
  return { face, torso, arms: make(0.16, 0.46), legs };
}

export function detectRegions(image) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 256 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return defaultRegionsFromPixels(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
}

// Remove somente fundo parecido com os cantos e conectado às bordas; sem IA.
// A máscara pode falhar quando roupa e fundo têm a mesma cor, por isso é opcional.
function backgroundMask(image) {
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(2, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(2, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const { width: w, height: h } = canvas, data = ctx.getImageData(0, 0, w, h);
  const corner = [0, w - 1, (h - 1) * w, h * w - 1];
  const bg = [0, 1, 2].map(k => corner.reduce((sum, index) => sum + data.data[index * 4 + k], 0) / 4);
  const transparent = corner.some(index => data.data[index * 4 + 3] < 32);
  const seen = new Uint8Array(w * h), stack = [];
  const add = index => {
    if (seen[index]) return; seen[index] = 1;
    const i = index * 4, diff = Math.hypot(data.data[i] - bg[0], data.data[i + 1] - bg[1], data.data[i + 2] - bg[2]);
    if (data.data[i + 3] < 32 || (!transparent && diff < 30)) stack.push(index);
  };
  for (let x = 0; x < w; x++) { add(x); add((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { add(y * w); add(y * w + w - 1); }
  const isBg = new Uint8Array(w * h);
  while (stack.length) {
    const index = stack.pop(); isBg[index] = 1; const x = index % w, y = Math.floor(index / w);
    if (x > 0) add(index - 1); if (x + 1 < w) add(index + 1); if (y > 0) add(index - w); if (y + 1 < h) add(index + w);
  }
  for (let i = 0; i < w * h; i++) { data.data[i * 4] = data.data[i * 4 + 1] = data.data[i * 4 + 2] = 255; data.data[i * 4 + 3] = isBg[i] ? 0 : 255; }
  ctx.putImageData(data, 0, 0); return canvas;
}

export function createRegionTextures(image, regions, enabled, colors, strength, removeBackground = true) {
  const maps = {}, mask = removeBackground ? backgroundMask(image) : null;
  const make = (key, rect, color) => {
    const canvas = document.createElement('canvas');
    const sx = rect.x * image.naturalWidth, sy = rect.y * image.naturalHeight;
    const sw = Math.max(1, rect.w * image.naturalWidth), sh = Math.max(1, rect.h * image.naturalHeight);
    const factor = Math.min(1, 512 / Math.max(sw, sh));
    canvas.width = Math.max(2, Math.round(sw * factor)); canvas.height = Math.max(2, Math.round(sh * factor));
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const overlay = document.createElement('canvas'); overlay.width = canvas.width; overlay.height = canvas.height;
    const layer = overlay.getContext('2d'); layer.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    layer.globalCompositeOperation = 'destination-in';
    if (mask) layer.drawImage(mask, rect.x * mask.width, rect.y * mask.height, rect.w * mask.width, rect.h * mask.height, 0, 0, canvas.width, canvas.height);
    // Esmaecimento nas bordas da projeção reduz a emenda com a cor lateral.
    const fade = layer.createLinearGradient(0, 0, canvas.width, 0);
    fade.addColorStop(0, 'rgba(255,255,255,0)'); fade.addColorStop(0.12, '#fff'); fade.addColorStop(0.88, '#fff'); fade.addColorStop(1, 'rgba(255,255,255,0)');
    layer.fillStyle = fade; layer.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = strength; ctx.drawImage(overlay, 0, 0);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; maps[key] = texture;
  };
  if (enabled.face) make('face', regions.face, colors.body);
  if (enabled.torso) make('torso', regions.torso, colors.top || colors.clothes);
  if (enabled.arms) {
    const r = regions.arms;
    for (const [side, x] of [['left', 0.62], ['right', 0]]) for (const [segment, y] of [['Upper', 0], ['Lower', 0.5]]) {
      make(side + 'Arm' + segment, { x: r.x + r.w * x, y: r.y + r.h * y, w: r.w * 0.38, h: r.h * 0.5 }, colors.body);
    }
  }
  if (enabled.legs) {
    const r = regions.legs;
    // +X aparece à direita da imagem frontal; divida cada perna e cada segmento.
    for (const [side, x] of [['left', 0.5], ['right', 0]]) {
      for (const [segment, y] of [['Upper', 0], ['Lower', 0.42]]) {
        make(side + segment, { x: r.x + r.w * x, y: r.y + r.h * y, w: r.w * 0.5, h: r.h * 0.42 }, colors.clothes);
      }
      make(side + 'Foot', { x: r.x + r.w * x, y: r.y + r.h * 0.84, w: r.w * 0.5, h: r.h * 0.16 }, colors.detail);
    }
  }
  return maps;
}
