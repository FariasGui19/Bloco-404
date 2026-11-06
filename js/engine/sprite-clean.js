// js/engine/sprite-clean.js
// =====================================================================
//  LIMPEZA DE QUADROS
//  Cada quadro vira uma imagem separada e limpa (mesmo tamanho do
//  quadro original). Roda UMA vez por quadro e fica guardado.
//   - remove fundo sólido (se houver)
//   - remove sombra cinza embutida (opcional)
//   - mantém só o boneco principal (apaga pedaços do vizinho)
// =====================================================================
const cache = new WeakMap();

export function getFrame(image, col, row, cols, rows, opts = {}) {
  if (!image) return null;

  let porImagem = cache.get(image);
  if (!porImagem) {
    porImagem = new Map();
    cache.set(image, porImagem);
  }

  const key = `${cols}x${rows}|${col},${row}|${opts.removeShadow ? 1 : 0}`;
  if (porImagem.has(key)) return porImagem.get(key);

  let res = null;
  try {
    res = processar(image, col, row, cols, rows, opts);
  } catch (error) {
    console.warn('[SPRITE] Falha ao limpar quadro:', error);
  }

  porImagem.set(key, res);
  return res;
}

// ---------------------------------------------------------------------
function processar(image, col, row, cols, rows, { removeShadow = false, tolerancia = 60 }) {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;

  const x0 = Math.round((col * iw) / cols);
  const y0 = Math.round((row * ih) / rows);
  const w = Math.round(((col + 1) * iw) / cols) - x0;
  const h = Math.round(((row + 1) * ih) / rows) - y0;

  const cell = document.createElement('canvas');
  cell.width = w;
  cell.height = h;
  const g = cell.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, x0, y0, w, h, 0, 0, w, h);

  const img = g.getImageData(0, 0, w, h);
  const d = img.data;

  removerFundo(d, w, h, tolerancia);
  if (removeShadow) removerSombra(d, w, h);
  const bbox = manterPrincipal(d, w, h);

  g.putImageData(img, 0, 0);
  if (!bbox) return null;

  // Versão recortada (usada por chão e paredes)
  const crop = document.createElement('canvas');
  crop.width = bbox.w;
  crop.height = bbox.h;
  crop.getContext('2d').drawImage(cell, bbox.x, bbox.y, bbox.w, bbox.h, 0, 0, bbox.w, bbox.h);

  return { cell, crop: { canvas: crop, ...bbox } };
}

// ---------------------------------------------------------------------
//  FUNDO: "inunda" a partir das bordas do quadro
// ---------------------------------------------------------------------
function removerFundo(d, w, h, tol) {
  const cantos = [0, w - 1, (h - 1) * w, h * w - 1];
  const opaco = cantos.find((p) => d[p * 4 + 3] > 20);
  if (opaco === undefined) return;   // fundo já é transparente

  const i0 = opaco * 4;
  const br = d[i0], bgG = d[i0 + 1], bb = d[i0 + 2];

  const perto = (i, t2) => {
    const dr = d[i] - br, dg = d[i + 1] - bgG, db = d[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= t2;
  };

  const tol2 = tol * tol;
  const visto = new Uint8Array(w * h);
  const pilha = new Int32Array(w * h);
  let sp = 0;

  const empurra = (p) => {
    if (visto[p]) return;
    visto[p] = 1;
    if (perto(p * 4, tol2)) {
      d[p * 4 + 3] = 0;
      pilha[sp++] = p;
    }
  };

  for (let x = 0; x < w; x++) { empurra(x); empurra((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { empurra(y * w); empurra(y * w + w - 1); }

  while (sp) {
    const p = pilha[--sp];
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) empurra(p - 1);
    if (x < w - 1) empurra(p + 1);
    if (y > 0) empurra(p - w);
    if (y < h - 1) empurra(p + w);
  }

  // Franja clara colada no contorno
  const apagar = [];
  for (let p = 0; p < w * h; p++) {
    if (d[p * 4 + 3] === 0) continue;
    const x = p % w;
    const y = (p / w) | 0;
    const borda =
      (x > 0 && d[(p - 1) * 4 + 3] === 0) ||
      (x < w - 1 && d[(p + 1) * 4 + 3] === 0) ||
      (y > 0 && d[(p - w) * 4 + 3] === 0) ||
      (y < h - 1 && d[(p + w) * 4 + 3] === 0);
    if (borda && perto(p * 4, 80 * 80)) apagar.push(p);
  }
  for (const p of apagar) d[p * 4 + 3] = 0;
}

// ---------------------------------------------------------------------
//  SOMBRA EMBUTIDA: cinza neutro, só na parte de baixo, colado no vazio
// ---------------------------------------------------------------------
function ehSombra(d, i) {
  const mx = Math.max(d[i], d[i + 1], d[i + 2]);
  const mn = Math.min(d[i], d[i + 1], d[i + 2]);
  return mx - mn <= 26 && mx >= 90 && mx <= 225;
}

function removerSombra(d, w, h) {
  const yMin = Math.floor(h * 0.75);
  const visto = new Uint8Array(w * h);
  const pilha = [];

  for (let y = yMin; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (d[p * 4 + 3] <= 40) { visto[p] = 1; pilha.push(p); }
    }
  }

  while (pilha.length) {
    const p = pilha.pop();
    const x = p % w;
    const y = (p / w) | 0;
    const viz = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];

    for (const [nx, ny] of viz) {
      if (nx < 0 || nx >= w || ny < yMin || ny >= h) continue;
      const q = ny * w + nx;
      if (visto[q]) continue;
      visto[q] = 1;
      if (d[q * 4 + 3] > 40 && ehSombra(d, q * 4)) {
        d[q * 4 + 3] = 0;
        pilha.push(q);
      }
    }
  }
}

// ---------------------------------------------------------------------
//  BONECO PRINCIPAL: maior pedaço + pedacinhos soltos perto dele.
//  Pedaço que encosta na borda do quadro = vizinho → apagado.
// ---------------------------------------------------------------------
function manterPrincipal(d, w, h) {
  const label = new Int32Array(w * h);
  const comps = [];
  const pilha = [];

  for (let p = 0; p < w * h; p++) {
    if (label[p] || d[p * 4 + 3] <= 40) continue;

    const c = { id: comps.length + 1, area: 0, minX: w, minY: h, maxX: -1, maxY: -1, borda: false };
    label[p] = c.id;
    pilha.push(p);

    while (pilha.length) {
      const q = pilha.pop();
      const x = q % w;
      const y = (q / w) | 0;

      c.area++;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) c.borda = true;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const n = ny * w + nx;
          if (!label[n] && d[n * 4 + 3] > 40) {
            label[n] = c.id;
            pilha.push(n);
          }
        }
      }
    }

    comps.push(c);
  }

  if (!comps.length) return null;

  const main = comps.reduce((a, b) => (b.area > a.area ? b : a));
  const manter = new Uint8Array(comps.length + 1);
  manter[main.id] = 1;

  const gap = h * 0.12;
  for (const c of comps) {
    if (c === main || c.borda || c.area < 6) continue;
    const gx = Math.max(0, main.minX - c.maxX, c.minX - main.maxX);
    const gy = Math.max(0, main.minY - c.maxY, c.minY - main.maxY);
    if (gx <= gap && gy <= gap) manter[c.id] = 1;
  }

  const fica = (p) => label[p] && manter[label[p]];
  let minX = w, minY = h, maxX = -1, maxY = -1;
  const apagar = [];

  for (let p = 0; p < w * h; p++) {
    if (!d[p * 4 + 3]) continue;
    const x = p % w;
    const y = (p / w) | 0;

    if (fica(p)) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      continue;
    }

    if (label[p]) { apagar.push(p); continue; }   // pedaço descartado

    // Pixel quase transparente: só fica se encostar no boneco
    let perto = false;
    for (let dy = -1; dy <= 1 && !perto; dy++) {
      for (let dx = -1; dx <= 1 && !perto; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && fica(ny * w + nx)) perto = true;
      }
    }
    if (!perto) apagar.push(p);
  }

  for (const p of apagar) d[p * 4 + 3] = 0;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}