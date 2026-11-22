// Integração opcional com Chromium real, sem alterar o jogo ou seus saves.
// npm install --no-save --no-package-lock playwright-core
// BROWSER_EXECUTABLE=/caminho/para/chromium node --experimental-default-type=module tests/enseada-animacao-render-browser.mjs
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

if (!process.env.BROWSER_EXECUTABLE) {
  console.log('Integração visual ignorada: defina BROWSER_EXECUTABLE e instale playwright-core.');
} else {
  const { chromium } = await import('playwright-core');
  const root = process.cwd();
  const server = http.createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const file = path.resolve(root, '.' + name);
      if (!file.startsWith(root + path.sep)) throw new Error('path');
      const ext = path.extname(file), type = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' }[ext] ?? 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': type }); res.end(await fs.readFile(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/tests/fixtures/enseada-animacao.html`);
    await page.waitForFunction(() => window.ready, { timeout: 30000 });
    const result = await page.evaluate(() => {
      const results = window.results;
      const originalDraw = CanvasRenderingContext2D.prototype.drawImage;
      const originalNow = performance.now;
      let draws = [], now = 1000;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (image instanceof HTMLImageElement && (image.src.includes('/enseada-animacao-lote7/') || image.src.endsWith('/docas-cascos/enseada-cais-pesqueiro-folha.png'))) draws.push([image.src.split('/').pop(), args[0]]);
        return originalDraw.call(this, image, ...args);
      };
      const checked = [];
      for (const item of results) {
        const fw = item.crop[0] + 2 * item.margin;
        const observed = [];
        for (const ms of [1000, 1450]) {
          now = ms; draws = []; window.sample(item.id);
          const expected = Math.floor((ms / 1000 + item.phase) / item.period) % 8 * fw;
          observed.push(draws.some(([file, x]) => file === item.file && x === expected));
        }
        const image = window.getSprite(item.sprite), temp = document.createElement('canvas');
        temp.width = fw * 2; temp.height = item.crop[1];
        const ctx = temp.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, fw, temp.height, 0, 0, fw, temp.height);
        ctx.drawImage(image, fw * 2, 0, fw, temp.height, fw, 0, fw, temp.height);
        const pixels = ctx.getImageData(0, 0, temp.width, temp.height).data;
        let different = 0;
        for (let y = 0; y < temp.height; y++) for (let x = 0; x < fw; x++) {
          const a = (y * temp.width + x) * 4, b = a + fw * 4;
          if (pixels[a] !== pixels[b] || pixels[a+1] !== pixels[b+1] || pixels[a+2] !== pixels[b+2] || pixels[a+3] !== pixels[b+3]) different++;
        }
        checked.push({ ...item, observed, different });
      }
      CanvasRenderingContext2D.prototype.drawImage = originalDraw;
      Object.defineProperty(performance, 'now', { configurable: true, value: originalNow });
      return checked;
    });
    assert.equal(result.length, 10);
    for (const item of result) {
      assert(item.valid, `${item.id}: folha incompatível com recorte no navegador`);
      assert(item.observed.every(Boolean), `${item.id}: quadro não desenhado no renderer`);
      assert(item.different > 50, `${item.id}: quadros sem movimento significativo`);
    }
    const sea = await page.evaluate(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage, originalNow = performance.now;
      const caustics = window.seaCanvas(), seen = [];
      let now = 1000;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (image === caustics) seen.push({ x: args[0], y: args[1], alpha: this.globalAlpha });
        return original.call(this, image, ...args);
      };
      window.sample('cais_enseada_visual'); now = 1600; window.sample('cais_enseada_visual');
      CanvasRenderingContext2D.prototype.drawImage = original;
      Object.defineProperty(performance, 'now', { configurable: true, value: originalNow });
      return seen;
    });
    assert.equal(sea.length, 2, 'a camada de mar deve ser desenhada nos dois quadros');
    assert(sea.every(v => v.alpha > 0), 'a água deve permanecer visível sem folga');
    assert(sea[0].x !== sea[1].x || sea[0].y !== sea[1].y, 'a luz do mar deve se deslocar');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await page.evaluate(() => {
      const original = CanvasRenderingContext2D.prototype.drawImage, draws = [];
      CanvasRenderingContext2D.prototype.drawImage = function (image, ...args) {
        if (image instanceof HTMLImageElement && image.src.includes('/enseada-animacao-lote7/')) draws.push(image.src);
        return original.call(this, image, ...args);
      };
      window.sample('cais_enseada_visual');
      CanvasRenderingContext2D.prototype.drawImage = original;
      return draws.length;
    });
    assert.equal(reduced, 0, 'movimento reduzido deve usar a arte estática');
    assert.deepEqual(errors, []);
    console.log('Chromium: dez folhas carregadas e desenhadas pelo renderer em tempos distintos; movimento reduzido OK.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
