import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
if (!process.env.BROWSER_EXECUTABLE) { console.log('Polish browser: configure Chromium/Playwright.'); } else {
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright-core');
mkdirSync('.qa', {recursive:true});
const browser = await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH ?? ''}});
try {
const page = await browser.newPage({viewport:{width:1440,height:900}}), errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.goto(`${process.env.PREVIEW_ORIGIN ?? 'http://127.0.0.1:8000'}/docs/setor-limiar-3d.html`);
const storage=await page.evaluate(()=>JSON.stringify(localStorage));
await page.click('#inspect');
await page.waitForFunction(()=>window.labGallery?.stats.triangles>0,null,{timeout:60000});
await page.evaluate(()=>window.labGallery.setAngle(Math.PI));
await page.screenshot({path:'.qa/polish-back.png'});
await page.evaluate(()=>window.labGallery.setAngle(0));
await page.screenshot({path:'.qa/polish-equipped.png'});
await page.selectOption('#sculpt-clothing','civilian');
assert(await page.evaluate(()=>window.labGallery.models.every(m=>m.root.userData.identity.clothing==='civilian')));
await page.screenshot({path:'.qa/polish-civilian.png'});
await page.click('#sculpt-close'); await page.click('#enter');
await page.waitForFunction(()=>window.labDimension.mode==='3d',null,{timeout:120000});
await page.waitForSelector('.dimension-nucleo:not([hidden])');
assert.equal(await page.locator('.nucleo-card.locked').count(),1);
await page.waitForFunction(()=>!document.querySelector('.dimension-nucleo [data-spatial-key="KeyT"]').disabled,null,{timeout:60000});
await page.locator('.dimension-nucleo [data-spatial-key="KeyT"]').click();
await page.waitForFunction(()=>!!window.labDimension.runtime.operator.root.userData.identity.form,null,{timeout:60000});
assert.match(await page.locator('.nucleo-state').innerText(),/ATIVA/);
await page.screenshot({path:'.qa/polish-hud-active.png'});
await page.waitForFunction(()=>!document.querySelector('.dimension-nucleo [data-spatial-key="KeyT"]').disabled,null,{timeout:60000});
await page.locator('.dimension-nucleo [data-spatial-key="KeyT"]').click();
await page.waitForFunction(()=>!window.labDimension.runtime.operator.root.userData.identity.form,null,{timeout:60000});
await page.waitForFunction(()=>document.querySelector('.nucleo-state').textContent.includes('RECARREGANDO'),null,{timeout:60000});
await page.screenshot({path:'.qa/polish-hud-recharge.png'});
for(const id of ['motor_bio_forja','mare_astral','lamina_dominio_anciao']) {
 await page.selectOption('#archetype',id);
 await page.waitForFunction(id=>window.labDimension.runtime.operator.root.userData.identity.archetype===id,id,{timeout:60000});
 await page.waitForFunction(()=>!document.querySelector('.dimension-nucleo')?.offsetParent,null,{timeout:10000}).catch(()=>{});
 assert.equal(await page.locator('.dimension-nucleo').isVisible(),false);
 assert.equal(await page.evaluate(()=>window.labDimension.runtime.operator.root.userData.identity.clothing),'civilian');
 await page.locator('.dimension-viewport canvas').focus(); await page.keyboard.press('t');
 await page.waitForFunction(()=>window.labDimension.runtime.operator.root.userData.identity.clothing!=='civilian',null,{timeout:60000});
 await page.keyboard.press('t');
 await page.waitForFunction(()=>window.labDimension.runtime.operator.root.userData.identity.clothing==='civilian',null,{timeout:60000});
}
await page.selectOption('#archetype','nucleo_dez_forma');
await page.setViewportSize({width:390,height:844});
await page.waitForSelector('.dimension-nucleo:not([hidden])');
const box=await page.locator('.dimension-nucleo').boundingBox(); assert(box.x>=0&&box.x+box.width<=390);
await page.screenshot({path:'.qa/polish-mobile.png'});
assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);assert.deepEqual(errors,[]);
console.log('Polish browser: civil/equipped gallery and real T toggles, native HUD buttons/active/recharge/locked/mobile, storage unchanged, no page errors OK.');
} finally {await browser.close()}

}
