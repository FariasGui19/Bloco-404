// Reflexos e pulsos pintados sobre os recortes originais; não movem as bases.
// npm install --no-save --no-package-lock @napi-rs/canvas
import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { getFrame } = await import('../js/engine/sprite-clean.js');
const items = [
  ['relogio', 'enseada-camp/relogio', 'warm', .45],
  ['antena', 'enseada-camp/torre-radio', 'red', .25],
  ['bancada', 'enseada-camp/bancada', 'metal', .8],
  ['monolito', 'enseada-lote2/monolito-eco-vertical', 'cyan', 1],
  ['estela', 'enseada-8/estela-navegacao-runas-recortado', 'cyan', 1],
  ['piscina', 'enseada-lote2/piscina-sem-areia', 'water', 1],
  ['altar', 'enseada-espelho-revisado/altar', 'cyan', .78],
  ['espelho', 'enseada-espelho-revisado/espelho', 'cyan', .8],
  ['cristais', 'enseada-lote2/cristais-corais-oeste', 'crystal', 1],
  ['lanterna', 'enseada-sudeste/lanterna', 'warm', .9],
];
const n = 8, margin = 8, dir = 'assets/sprites/enseada-animacao-lote5';
fs.mkdirSync(dir, { recursive: true });
for (const [name, path, mode, ymax] of items) {
  const crop = getFrame(await loadImage(`assets/sprites/${path}.png`), 0, 0, 1, 1).crop;
  const { w, h } = crop, fw = w + margin * 2;
  const src = crop.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  const sheet = createCanvas(fw * n, h), out = sheet.getContext('2d');
  for (let k = 0; k < n; k++) {
    const frame = out.createImageData(fw, h), d = frame.data;
    const phase = k * Math.PI / 4;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = (y * w + x) * 4, t = (y * fw + x + margin) * 4;
      const [r, g, b, a] = src.subarray(s, s + 4);
      let mask = false;
      if (y / h < ymax && a > 30) {
        if (mode === 'warm') mask = r > 145 && g > 85 && r > b * 1.25;
        if (mode === 'red') mask = r > 120 && r > g * 1.5 && r > b * 1.35;
        if (mode === 'metal') mask = b > 90 && b > r * 1.05 && g > r;
        if (mode === 'cyan' || mode === 'water') mask = b > 100 && g > 100 && g > r * 1.12 && b > r * 1.1;
        if (mode === 'crystal') mask = b > 105 && b > r * 1.12 && b > g * 1.08;
      }
      // Uma onda lenta percorre só as cores iluminadas, sem pintar pedras,
      // madeira, transparência ou áreas fora da silhueta original.
      const wave = mask ? (Math.sin(phase + x / w * 3 + y / h * 2) - Math.sin(x / w * 3 + y / h * 2)) * 0.12 : 0;
      for (let c = 0; c < 3; c++) d[t + c] = wave >= 0 ? src[s + c] + (255 - src[s + c]) * wave : src[s + c] * (1 + wave);
      d[t + 3] = a;
    }
    out.putImageData(frame, k * fw, 0);
  }
  fs.writeFileSync(`${dir}/${name}.png`, sheet.toBuffer('image/png'));
  console.log(`${name}: ${w}x${h}`);
}
