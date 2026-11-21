// Same optional Chromium environment as docas-gameplay-live-browser.mjs.
import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE){console.log('Área central browser: ignorado; defina BROWSER_EXECUTABLE.');}
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1568,height:1150}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-docas-central.html`);
  await page.waitForFunction(()=>window.ready===true);await page.click('#pause');
  assert.equal(await page.locator('#status').textContent(),'Artes carregadas');
  const storage=await page.evaluate(()=>JSON.stringify(localStorage));
  const sample=async t=>page.evaluate(t=>{window.sampleCentral(t);return document.querySelector('canvas').toDataURL();},t);
  const first=await sample(0);assert.notEqual(first,await sample(2),'normal motion actually renders different pixels');
  await page.check('#reduced');assert.equal(await sample(0),await sample(5),'reduced mode freezes visual time');
  await page.uncheck('#reduced');assert.notEqual(await sample(0),await sample(2),'motion resumes');
  const drawn=await page.evaluate(()=>{
   const draw=CanvasRenderingContext2D.prototype.drawImage,urls=[];
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement)urls.push(img.src);return draw.call(this,img,...args);};
   try{window.sampleCentral(2);}finally{CanvasRenderingContext2D.prototype.drawImage=draw;}
   return urls;
  });
  for(const file of ['docas-vila-04/cabana-oeste.png','docas-vila-04/cabana-leste.png','docas-vila-04/galpao.png','docas-reconstrucao/galpao.png','docas-reconstrucao/torre.png'])assert(drawn.some(s=>s.endsWith(file)),`${file} drawn by real renderer`);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage,'preview never writes saves or motion preference');
  assert.deepEqual(errors,[]);
  console.log('Chromium central: artes, estruturas no render real, pixels animados/repouso/retomada, zero erros e storage intacto.');
 }finally{await browser.close();}
}
