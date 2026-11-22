// Optional: run HTTP server and provide BROWSER_EXECUTABLE, PLAYWRIGHT_MODULE,
// BROWSER_LIBRARY_PATH as in docas-lotes-browser.mjs. No player's save is used.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
if(!process.env.BROWSER_EXECUTABLE){console.log('Pesqueiro 03 browser: ignorado; defina BROWSER_EXECUTABLE.');}
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1360,height:1040},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-pesqueiro-03.html`);
  await page.waitForFunction(()=>window.ready===true);await page.locator('#pause').click();
  assert.equal(await page.locator('#status').textContent(),'10 folhas novas carregadas');
  const checked=await page.evaluate(()=>{
   const original=CanvasRenderingContext2D.prototype.drawImage,seen=new Set();
   CanvasRenderingContext2D.prototype.drawImage=function(img,...a){if(img instanceof HTMLImageElement&&img.src.includes('/docas-pesqueiro-03/'))seen.add(img.src.split('/').pop());return original.call(this,img,...a);};
   let a,b,c;
   try{
    for(let i=0;i<48;i++)window.sample(i*6.4/48,false);
    window.sample(0,false);a=document.querySelector('canvas').toDataURL();
    window.sample(2,false);b=document.querySelector('canvas').toDataURL();
    window.sample(2,true);c=document.querySelector('canvas').toDataURL();
    window.sample(20,true);
    return {sheets:[...seen],moves:a!==b,still:c===document.querySelector('canvas').toDataURL()};
   }finally{CanvasRenderingContext2D.prototype.drawImage=original;}
  });
  assert.equal(checked.sheets.length,10,'all ten sheets actually drawn');assert(checked.moves);assert(checked.still);assert.deepEqual(errors,[]);
  if(process.env.CAPTURE_ART){
   mkdirSync('.qa/pesqueiro-03',{recursive:true});
   for(let i=0;i<48;i++){
    const png=await page.evaluate(t=>{window.sample(t,false);return document.querySelector('canvas').toDataURL();},i*6.4/48);
    writeFileSync(`.qa/pesqueiro-03/${String(i).padStart(2,'0')}.png`,Buffer.from(png.split(',')[1],'base64'));
   }
   await page.locator('#detail').check();
   const png=await page.evaluate(()=>{window.sample(1.6,false);return document.querySelector('canvas').toDataURL();});
   writeFileSync('.qa/pesqueiro-03-encaixe.png',Buffer.from(png.split(',')[1],'base64'));
  }
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/tests/fixtures/docas-pesqueiro-03.html`);
  await page.waitForFunction(()=>window.ready===true);
  const order=await page.evaluate(()=>{
   const original=CanvasRenderingContext2D.prototype.drawImage,urls=[];
   CanvasRenderingContext2D.prototype.drawImage=function(img,...a){if(img instanceof HTMLImageElement)urls.push(img.src);return original.call(this,img,...a);};
   try{window.sampleFull(2);return urls;}finally{CanvasRenderingContext2D.prototype.drawImage=original;}
  });
  const coast=order.findIndex(s=>s.includes('/docas-costa-oeste/mar.'));
  const water=order.findIndex(s=>s.includes('/docas-pesqueiro-03/mar-proa.'));
  const deck=order.findIndex(s=>s.includes('/docas-cais-sul/deck.'));
  assert(coast>=0&&coast<water&&water<deck,'real renderer draws ship water above west sea and below deck');
  assert(order.some(s=>s.includes('/docas-pesqueiro-03/casco-')),'real map uses new hull');
  if(process.env.CAPTURE_ART)await page.screenshot({path:'.qa/pesqueiro-03-mapa.png'});
  assert.deepEqual(errors,[]);
  console.log('Chromium: dez folhas desenhadas, repouso estável e ordem mar/costa/casco no mapa real OK; sem erros de página/HTTP.');
 }finally{await browser.close();}
}
