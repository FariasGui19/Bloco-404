// Dez folhas de movimento visível, derivadas dos recortes do jogo.
// npm install --no-save --no-package-lock @napi-rs/canvas
import fs from 'node:fs';
import { createCanvas, loadImage } from '@napi-rs/canvas';
globalThis.document = { createElement: () => createCanvas(1, 1) };
const { getFrame } = await import('../js/engine/sprite-clean.js');
const items = [
  ['cachoeira', 'enseada-estacao-revisada/montanha', 'waterfall'],
  ['piscina', 'enseada-lote2/piscina-sem-areia', 'pool'],
  ['fogueira', 'enseada-camp/fogueira', 'fire'],
  ['barco', 'enseada-cais-revisao/cais-barco', 'boat'],
  ['portal', 'enseada-correntes/portal-referencia', 'portal'],
  ['palmeira-alta', 'enseada-nordeste/palmeira-nordeste', 'wind'],
  ['palmeira-baixa', 'enseada-norte/palmeira-baixa', 'wind'],
  ['palmeira-jovem', 'enseada-6/palmeira-jovem', 'wind'],
  ['palmeira-media', 'enseada-norte/palmeira-media', 'wind'],
  ['arvore-camp', 'enseada-camp/arvore-referencia-a', 'wind'],
];
const n = 8, margin = 24, dir = 'assets/sprites/enseada-animacao-lote7';
fs.mkdirSync(dir, { recursive: true });
for (const [name, path, mode] of items) {
  const c = getFrame(await loadImage(`assets/sprites/${path}.png`), 0, 0, 1, 1).crop;
  const { w, h } = c, fw = w + margin * 2;
  const sheet = createCanvas(fw * n, h), out = sheet.getContext('2d');
  const src = c.canvas.getContext('2d').getImageData(0, 0, w, h).data;
  for (let k = 0; k < n; k++) {
    const phase = k * Math.PI * 2 / n;
    const frame = createCanvas(fw, h), g = frame.getContext('2d');
    if (mode === 'wind' || mode === 'fire') {
      const img = g.createImageData(fw, h), d = img.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < fw; x++) {
        const v = y / h;
        // O tronco/apoio não se move; a copa inteira faz um arco perceptível.
        const limit = mode === 'wind' ? .70 : .66;
        const weight = Math.max(0, Math.min(1, (limit - v) / (mode === 'wind' ? .30 : .38)));
        const amount = mode === 'wind' ? Math.min(21, Math.max(7, w * .07)) : 5;
        const offset = Math.sin(phase) * Math.cos(v * .6);
        const sx = Math.round(x - margin - offset * amount * weight);
        if (sx < 0 || sx >= w) continue;
        const s = (y * w + sx) * 4, t = (y * fw + x) * 4;
        d[t] = src[s]; d[t+1] = src[s+1]; d[t+2] = src[s+2]; d[t+3] = src[s+3];
      }
      g.putImageData(img, 0, 0);
    } else if (mode === 'boat') {
      // O píer e seus seis postes permanecem imóveis. O barco sobe e
      // desce; a extremidade da corda acompanha a proa.
      g.drawImage(c.canvas, margin, 0);
      g.clearRect(margin + 700, 0, w - 700, h);
      const dx = Math.round(18 * Math.sin(phase)), dy = Math.round(9 * (Math.cos(phase) - 1));
      g.drawImage(c.canvas, 700, 0, w - 700, h, margin + 700 + dx, dy, w - 700, h);
      // Por cima da corda original, uma pequena extensão liga-a à proa.
      g.lineCap = 'round';
      for (const [color, width] of [['#33231b', 5], ['#a97950', 2]]) {
        g.strokeStyle = color; g.lineWidth = width;
        g.beginPath(); g.moveTo(margin + 690, 446);
        g.quadraticCurveTo(margin + 725 + dx * .5, 463 + dy * .4, margin + 757 + dx, 451 + dy); g.stroke();
      }
    } else {
      g.drawImage(c.canvas, margin, 0);
      g.save(); g.translate(margin, 0);
      if (mode === 'waterfall') {
        // Cachoeira: faixas e espuma confinadas à lâmina, sem pintar a rocha.
        g.save(); g.beginPath();
        g.moveTo(405,190); g.bezierCurveTo(455,230,495,264,515,320);
        g.bezierCurveTo(532,375,527,485,529,550);
        g.lineTo(595,577); g.lineTo(587,500); g.lineTo(577,370);
        g.bezierCurveTo(570,292,507,248,445,192); g.closePath(); g.clip();
        g.lineCap='round';
        for (let i=0; i<14; i++) {
          const f=(k/n + i/14)%1, y=310+f*260, x=530+(i%5)*11;
          g.strokeStyle = i%3 ? 'rgba(197,255,252,.55)' : 'rgba(255,255,255,.82)';
          g.lineWidth = i%3 ? 3 : 5; g.beginPath(); g.moveTo(x,y); g.lineTo(x+2,y+16+i%3*8); g.stroke();
        }
        g.restore();
        for (let i=0; i<3; i++) {
          const f=(k/n+i/3)%1;
          g.strokeStyle=`rgba(215,255,255,${.62*(1-f)})`;g.lineWidth=3;
          g.beginPath();g.ellipse(560,590,12+f*62,4+f*15,0,0,Math.PI*2);g.stroke();
        }
      } else if (mode === 'pool') {
        // Superfície delimitada pelo interior da bacia, pedras fixas.
        g.beginPath(); g.moveTo(75,220); g.bezierCurveTo(95,155,190,125,270,132);
        g.bezierCurveTo(390,125,490,147,555,210);g.lineTo(540,300);
        g.bezierCurveTo(470,370,210,390,100,310);g.closePath();g.clip();
        for(let i=0;i<4;i++) {
          const f=(k/n+i/4)%1;
          g.strokeStyle=`rgba(204,255,246,${.65*(1-f)})`;g.lineWidth=3;
          g.beginPath();g.ellipse(300+(i%2)*90,240+(i%2)*25,15+f*67,5+f*25,0,.15,Math.PI*1.75);g.stroke();
        }
      } else if (mode === 'portal') {
        g.beginPath();g.ellipse(60,75,18,36,0,0,Math.PI*2);g.clip();
        for(let i=0;i<3;i++) {
          const f=(k/n+i/3)%1;g.strokeStyle=`rgba(142,255,255,${.68*(1-f)})`;g.lineWidth=2;
          g.beginPath();g.ellipse(60,75,3+f*15,7+f*27,phase*.18,0,Math.PI*1.65);g.stroke();
        }
      }
      g.restore();
    }
    out.drawImage(frame, k * fw, 0);
  }
  fs.writeFileSync(`${dir}/${name}.png`, sheet.toBuffer('image/png'));
  console.log(`${name}: ${w}x${h}`);
}
