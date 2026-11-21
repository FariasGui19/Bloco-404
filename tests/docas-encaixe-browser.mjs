import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Encaixe browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1568,height:1150}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-docas-encaixe.html`);await page.waitForFunction(()=>window.ready===true);await page.click('#pause');
  assert.equal(await page.locator('#status').textContent(),'Artes carregadas');
  const storage=await page.evaluate(()=>JSON.stringify(localStorage));
  const sample=()=>page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.evaluate(()=>window.sampleCentral(3));const after=await sample();
  await page.check('#before');await page.evaluate(()=>window.sampleCentral(3));assert.notEqual(after,await sample(),'real previous composition remains available for comparison');
  await page.uncheck('#before');await page.evaluate(()=>window.sampleCentral(3));assert.equal(after,await sample(),'switching back is deterministic');
  const report=await page.evaluate(async()=>{
   const {desenharEncaixe}=await import('/js/engine/docas-encaixe.js');
   const {PECAS_ENCAIXE}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-encaixe.js');
   const {renderDocas}=await import('/js/engine/docas-view.js');
   const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');
   const canvas=document.createElement('canvas');canvas.width=1568;canvas.height=882;const ctx=canvas.getContext('2d');
   const pixels=(id,t,reduced)=>{ctx.clearRect(0,0,1568,882);desenharEncaixe(ctx,id,1,t,reduced);return canvas.toDataURL();};
   const animated={};for(const id of ['galpao','torre','cristal-a','palmeira-c','camara'])animated[id]={moves:pixels(id,0,false)!==pixels(id,2,false),stable:pixels(id,0,true)===pixels(id,9,true)};
   const original=CanvasRenderingContext2D.prototype.drawImage,sequence=[];
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
    if(img instanceof HTMLImageElement&&img.src.includes('/docas-encaixe/')){
     const entry=Object.entries(PECAS_ENCAIXE).find(([,p])=>img.src.endsWith(`/${p.sheet}.png`)&&p.rect.every((v,i)=>args[i]===v));
     sequence.push(entry?.[0]??'INVALID_UV');
    }return original.call(this,img,...args);
   };
   const state={player:{x:850*2.5/64,y:450*2.5/22},objects:[],trainingTargets:[],progress:{flags:{}},docasAnimation:{elapsed:2}};
   const before=JSON.stringify(state);
   try{renderDocas(ctx,{...docas},state,1960,1387.5,1568,882,.4,1,2000,()=>sequence.push('PLAYER'));}finally{CanvasRenderingContext2D.prototype.drawImage=original;}
   return {animated,sequence,noWrites:before===JSON.stringify(state)};
  });
  for(const [id,r] of Object.entries(report.animated)){assert(r.moves,`${id}: own pixels animate`);assert(r.stable,`${id}: reduced motion stable`);}
  assert(report.noWrites);assert(!report.sequence.includes('INVALID_UV'));
  for(const id of ['galpao','central_fundos','torre','penhasco','escada','patio'])assert(report.sequence.includes(id),`${id}: actual map renderer uses atlas frame`);
  assert(report.sequence.indexOf('central_fundos')<report.sequence.indexOf('PLAYER'));
  assert(report.sequence.indexOf('PLAYER')<report.sequence.indexOf('galpao'));
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);assert.deepEqual(errors,[]);
  console.log('Chromium encaixe: UVs reais, camadas/oclusão, antes/depois, cinco animações isoladas, repouso estável, storage e estado intactos.');
 }finally{await browser.close();}
}
