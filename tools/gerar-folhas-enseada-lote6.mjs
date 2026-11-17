// Quadros derivados dos recortes do jogo. Não requer dependências em runtime.
// npm install --no-save --no-package-lock @napi-rs/canvas
import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { getFrame } = await import('../js/engine/sprite-clean.js');
const items = [
  ['cais-barco', 'enseada-cais-revisao/cais-barco', 'boat'],
  ['arvores-redondas', 'enseada-norte/arvores-redondas', 'wind'],
  ['mata-densa', 'enseada-nordeste/mata-transicao-densa', 'wind'],
  ['planta-cascata', 'enseada-estacao/planta-piscina', 'wind'],
  ['corais-amarelos', 'enseada-5/corais-amarelos', 'current'],
  ['coral-rosa', 'enseada-6/coral-rosa', 'current'],
  ['portal-correntes', 'enseada-correntes/portal-referencia', 'light'],
  ['pedras-runicas', 'enseada-cais-revisao/pedras', 'light'],
  ['concha', 'enseada-lote2/concha-perola-oeste', 'pearl'],
  ['tartaruga', 'enseada-5/tartaruga-marinha', 'current'],
];
const frames = 8, margin = 8, dir = 'assets/sprites/enseada-animacao-lote6';
fs.mkdirSync(dir, { recursive: true });
for (const [name, path, mode] of items) {
  const c = getFrame(await loadImage(`assets/sprites/${path}.png`), 0, 0, 1, 1).crop;
  const { w, h } = c, fw = w + 2 * margin;
  const src = c.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const sheet = createCanvas(fw * frames, h), out = sheet.getContext('2d');
  for (let k = 0; k < frames; k++) {
    const phase = k * Math.PI / 4;
    if (mode === 'boat') {
      // O píer (inclusive os postes) continua imóvel. A metade direita contém
      // somente o veleiro e a ponta da amarra. Quadro zero é a arte original.
      // Sobe em vez de descer para não cortar o casco no limite inferior.
      out.drawImage(c.canvas, 0, 0, 700, h, k * fw + margin, 0, 700, h);
      out.drawImage(c.canvas, 700, 0, w - 700, h,
        k * fw + margin + 700 + Math.round(4 * Math.sin(phase)),
        Math.round(5 * (Math.cos(phase) - 1)), w - 700, h);
      continue;
    }
    const frame = out.createImageData(fw, h), d = frame.data;
    for (let y = 0; y < h; y++) for (let x = 0; x < fw; x++) {
      const local = x - margin, v = y / h;
      let sx = local;
      if (mode === 'wind' || mode === 'current') {
        // Deslocamento decai até zero antes da base; não move troncos/pedras.
        const limit = mode === 'wind' ? .75 : .8;
        const weight = Math.max(0, 1 - v / limit) ** 1.6;
        sx = Math.round(local - Math.sin(phase) * Math.min(7, Math.max(2, w * .03)) * weight);
      }
      if (sx < 0 || sx >= w) continue;
      const s = (y * w + sx) * 4, t = (y * fw + x) * 4;
      const r = src[s], g = src[s + 1], b = src[s + 2];
      const lit = src[s + 3] > 30 && ((mode === 'light' && b > 100 && g > 100 && b > r * 1.1 && g > r * 1.1) || (mode === 'pearl' && r > 175 && g > 155 && b > 145 && v < .8));
      const f = lit ? (Math.sin(phase + sx / w * 3 + v * 2) - Math.sin(sx / w * 3 + v * 2)) * .14 : 0;
      for (let j = 0; j < 3; j++) d[t + j] = f >= 0 ? src[s + j] + (255 - src[s + j]) * f : src[s + j] * (1 + f);
      d[t + 3] = src[s + 3];
    }
    out.putImageData(frame, k * fw, 0);
  }
  fs.writeFileSync(`${dir}/${name}.png`, sheet.toBuffer('image/png'));
  console.log(`${name}: ${w}x${h}`);
}
