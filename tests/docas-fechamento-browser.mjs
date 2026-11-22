import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Fechamento browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1568,height:1150}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-docas-fechamento.html`);await page.waitForFunction(()=>window.ready===true);await page.click('#pause');
  assert.equal(await page.locator('#status').textContent(),'Artes carregadas');const storage=await page.evaluate(()=>JSON.stringify(localStorage));
  const result=await page.evaluate(async()=>{
   const {desenharMarPerimetral}=await import('/js/engine/docas-mar-perimetral.js');
   const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');
   const {desenharPecaFechamento}=await import('/js/engine/docas-fechamento.js');
   const canvas=document.createElement('canvas');canvas.width=1568;canvas.height=882;const ctx=canvas.getContext('2d');
   const zones={north:[-100,700,-250,100],east:[1400,1700,400,800],south:[940,1500,850,1100],west:[-250,80,300,650]};
   const sample=(z,t,reduced)=>{
    const [left,right,top,bottom]=z;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1568,882);
    ctx.setTransform(1568/(right-left),0,0,882/(bottom-top),-left*1568/(right-left),-top*882/(bottom-top));
    desenharMarPerimetral(ctx,docas,1,t,reduced,{left,right,top,bottom});return canvas.toDataURL();
   };
   const water={};for(const [id,z] of Object.entries(zones))water[id]={moves:sample(z,0,false)!==sample(z,3,false),stable:sample(z,0,true)===sample(z,9,true)};
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1568,882);desenharMarPerimetral(ctx,docas,1,3,false,{left:0,right:1568,top:0,bottom:882});
   // Every sampled land point, including polygon overlaps, must stay clear.
   const land={};for(const [id,x,y] of [['workshop',875,420],['plateauOverlap',1090,210],['rearCabin',665,365]])land[id]=ctx.getImageData(x,y,1,1).data[3];
   const images={};for(const id of ['casinha','encosta']){
    const draw=(t,reduced)=>{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,1568,882);desenharPecaFechamento(ctx,id,1,t,reduced);return canvas.toDataURL();};
    images[id]={moves:draw(0,false)!==draw(2,false),stable:draw(0,true)===draw(7,true)};
   }
   return {water,land,images};
  });
  for(const [id,r] of Object.entries(result.water)){assert(r.moves,id+' isolated ocean animates');assert(r.stable,id+' reduced mode stable');}
  for(const [id,a] of Object.entries(result.land))assert.equal(a,0,id+' protected from water');
  for(const [id,r] of Object.entries(result.images)){assert(r.moves,id+' subtle animation');assert(r.stable,id+' reduced stable');}
  for(const sector of ['full','north','east','south','west'])await page.evaluate(sector=>window.sampleSetor(3,sector),sector);
  const drawUrls=await page.evaluate(()=>{
   const draw=CanvasRenderingContext2D.prototype.drawImage,urls=[];
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement)urls.push(img.src);return draw.call(this,img,...args);};
   try{window.sampleSetor(3,'full');}finally{CanvasRenderingContext2D.prototype.drawImage=draw;}return urls;
  });
  assert(drawUrls.some(s=>s.endsWith('/docas-fidelidade/fundos-enraizados.png')),'rooted bank integrated, not preview-only');
  assert(drawUrls.some(s=>s.endsWith('/docas-fidelidade/abrigo-oeste.png')),'replacement cabin integrated, not preview-only');
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage)),storage);assert.deepEqual(errors,[]);
  console.log('Chromium fechamento: mar isolado nos quatro lados, terra/sobreposição protegidas, duas artes animadas, cinco câmeras, storage e recursos OK.');
 }finally{await browser.close();}
}
