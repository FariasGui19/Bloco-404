// Optional Chromium integration. Provide BROWSER_EXECUTABLE, PLAYWRIGHT_MODULE
// (defaults to playwright-core), and optionally BROWSER_LIBRARY_PATH.
import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE){
  console.log('Docas browser: ignorado; defina BROWSER_EXECUTABLE.');
}else{
  const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
  const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
  try{
    const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'no-preference'});
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
    const origin=process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000';
    await page.goto(`${origin}/docs/previa-docas-cascos.html`);
    await page.waitForFunction(()=>window.ready===true);
    assert.equal(await page.locator('#status').textContent(),'Artes carregadas');
    const first=await page.locator('#tentacle').evaluate(c=>c.toDataURL());
    await page.waitForTimeout(200);
    const next=await page.locator('#tentacle').evaluate(c=>c.toDataURL());assert.notEqual(first,next,'limb actually moves');
    await page.locator('#reduced').check();await page.waitForTimeout(100);
    const rest=await page.locator('#tentacle').evaluate(c=>c.toDataURL());
    await page.waitForTimeout(180);
    assert.equal(rest,await page.locator('#tentacle').evaluate(c=>c.toDataURL()));
    // Exercise the actual map renderer, not just the isolated preview helper.
    await page.goto(`${origin}/tests/fixtures/enseada-animacao.html`);
    await page.waitForFunction(()=>window.ready===true);
    const source=await page.evaluate(()=>{
      const draw=CanvasRenderingContext2D.prototype.drawImage,urls=[];
      CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement)urls.push(img.src);return draw.call(this,img,...args);};
      try{window.sample('cais_enseada_visual');}finally{CanvasRenderingContext2D.prototype.drawImage=draw;}
      return urls;
    });
    assert(source.some(url=>url.endsWith('/docas-cascos/enseada-cais-pesqueiro-folha.png')),'actual renderer uses new dock/hull atlas without destructive cropping');
    assert.deepEqual(errors,[]);
    console.log('Chromium: recursos OK, movimento/repouso e atlas de embarque no renderizador real OK.');
  }finally{await browser.close();}
}
