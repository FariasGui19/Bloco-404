import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Cirúrgico browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1568,height:1150}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-docas-cirurgico.html`);await page.waitForFunction(()=>window.ready===true);await page.click('#pause');
  assert.equal(await page.locator('#status').textContent(),'Artes carregadas');const storage=await page.evaluate(()=>JSON.stringify(localStorage));
  await page.click('#north');
  const sample=async t=>page.evaluate(t=>{window.sampleCentral(t);return document.querySelector('canvas').toDataURL();},t);
  assert.notEqual(await sample(0),await sample(3),'northern camera actually animates');
  await page.check('#reduced');assert.equal(await sample(0),await sample(8),'northern reduced motion stable');await page.uncheck('#reduced');
  const report=await page.evaluate(async()=>{
   const {renderDocas}=await import('/js/engine/docas-view.js');
   const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');
   const {desenharEncaixe,registroEncaixe}=await import('/js/engine/docas-encaixe.js');
   const {desenharMarSuperior}=await import('/js/engine/docas-mar-superior.js');
   const canvas=document.createElement('canvas');canvas.width=900;canvas.height=600;const ctx=canvas.getContext('2d');
   const state={player:{x:20,y:50},objects:[],trainingTargets:[],progress:{flags:{}},docasAnimation:{elapsed:0}};
   const originalState=JSON.stringify(state);
   function outside(t){state.docasAnimation.elapsed=t;renderDocas(ctx,docas,state,300,-700,900,600,.5,1,t*1000,()=>{});return canvas.toDataURL();}
   const a=outside(0),b=outside(2);state.docasAnimation.elapsed=0;
   const gradients=[],radial=ctx.createRadialGradient.bind(ctx);
   ctx.createRadialGradient=(...args)=>{gradients.push(args);return radial(...args);};
   desenharEncaixe(ctx,'cristal-c',1,2,false);
   ctx.createRadialGradient=radial;
   const crystal=registroEncaixe('cristal-c'),glow=gradients.at(-1);
   // Isolated ocean pixels, so passing cannot be caused by a moving ship.
   function ocean(t,reduced){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,900,600);ctx.translate(0,300);desenharMarSuperior(ctx,1,t,reduced,{left:0,right:900,top:-300,bottom:300});return canvas.toDataURL();}
   const oceanMoves=ocean(0,false)!==ocean(3,false),rest=ocean(0,true)===ocean(9,true);
   return {outsideMoves:a!==b,noStateWrites:originalState===JSON.stringify(state),glowAttached:glow[0]>=crystal.x&&glow[0]<=crystal.x+crystal.w&&glow[1]>=crystal.y&&glow[1]<=crystal.y+crystal.h,oceanMoves,rest};
  });
  assert(report.outsideMoves);assert(report.noStateWrites);assert(report.glowAttached,'crystal halo follows transformed crop');assert(report.oceanMoves);assert(report.rest);
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);assert.deepEqual(errors,[]);
  console.log('Chromium cirúrgico: câmera norte/Y negativo, água/tentáculos isolados, redução/retomada, halo aderente, estado/storage e HTTP/JS OK.');
 }finally{await browser.close();}
}
