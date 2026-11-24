// Navegador real opcional, seguindo a convenção dos testes do projeto.
// Requer servidor HTTP, Playwright e BROWSER_EXECUTABLE.
import assert from 'node:assert/strict';
import { sample, glb } from './fixtures.mjs';
if (!process.env.BROWSER_EXECUTABLE) {
  console.log('GLB browser: ignorado; configure BROWSER_EXECUTABLE e PLAYWRIGHT_MODULE.');
} else {
  const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'],
    env: { ...process.env, LD_LIBRARY_PATH: process.env.BROWSER_LIBRARY_PATH ?? '' } });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:8000'}/tools/img2glb-studio/`);
    await page.waitForSelector('.dimension-viewport canvas', { timeout: 120000 });
    const storage = await page.evaluate(() => JSON.stringify(localStorage));
    await page.locator('#glb-file').setInputFiles({ name: 'animated.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from(sample()) });
    await page.waitForFunction(() => !document.querySelector('#model-controls').hidden);
    assert.match(await page.locator('#model-info').innerText(), /1 ossos · 1 clipe/);
    assert.equal(await page.evaluate(() => document.activeElement.tagName), 'CANVAS');
    await page.selectOption('#clip', '0');
    const before = await page.locator('.dimension-flight').textContent();
    await page.keyboard.down('w'); await page.waitForTimeout(1500); await page.keyboard.up('w');
    assert.notEqual(await page.locator('.dimension-flight').textContent(), before);
    await page.locator('#rotate').click();
    await page.locator('#glb-file').setInputFiles({ name: 'invalid.glb', mimeType: 'model/gltf-binary', buffer: Buffer.from('invalid') });
    await page.waitForFunction(() => document.querySelector('#status').classList.contains('error'));
    assert.equal(await page.locator('#model-controls').isHidden(), false);
    const positions = Buffer.alloc(36); [0,0,0, 1,0,0, 0,2,0].forEach((n,i) => positions.writeFloatLE(n,i*4));
    const staticGLB = glb({ asset:{version:'2.0'},buffers:[{byteLength:36}],bufferViews:[{buffer:0,byteOffset:0,byteLength:36}],accessors:[{bufferView:0,componentType:5126,count:3,type:'VEC3',min:[0,0,0],max:[1,2,0]}],meshes:[{primitives:[{attributes:{POSITION:0}}]}],nodes:[{mesh:0}],scenes:[{nodes:[0]}],scene:0 },positions);
    await page.locator('#glb-file').setInputFiles({ name:'static.glb',mimeType:'model/gltf-binary',buffer:Buffer.from(staticGLB) });
    await page.waitForFunction(() => document.querySelector('#status').textContent.includes('static.glb'));
    assert.match(await page.locator('#model-info').innerText(), /0 clipe/); assert.equal(await page.locator('#clip').isDisabled(), true);
    await page.locator('#remove').click(); assert.equal(await page.locator('#model-controls').isHidden(), true);
    assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), storage); assert.deepEqual(errors, []);
    console.log('GLB browser: rig animado, arquivo estático, erro, movimento e save isolado OK.');
  } finally { await browser.close(); }
}
