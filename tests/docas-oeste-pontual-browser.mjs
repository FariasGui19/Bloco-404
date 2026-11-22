import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Oeste pontual browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??''}});
 try{
  const origin=process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000',url=origin+'/docs/previa-docas-oeste-pontual.html';
  const errors=[],pages=[];
  for(const suffix of ['','?baseline']){
   const p=await b.newPage({viewport:{width:1568,height:1100}});p.on('pageerror',e=>errors.push(e.message));
   await p.goto(url+suffix);await p.waitForFunction(()=>window.ready);await p.click('#pause');assert.equal(await p.locator('#status').textContent(),'Artes carregadas');pages.push(p);
  }
  const samples=[];for(const p of pages)samples.push(await p.evaluate(()=>{window.sampleSetor(3.2,'full');return document.querySelector('canvas').toDataURL();}));
  const report=await pages[0].evaluate(async images=>{
   const {RECORTE_OESTE,DECOR_OESTE_REMOVIDO,desenharAtmosferaOestePontual}=await import('/js/engine/docas-oeste-pontual.js');
   const c=document.createElement('canvas');c.width=1568;c.height=880;const g=c.getContext('2d');
   const data=[];for(const url of images){const img=new Image();img.src=url;await img.decode();g.clearRect(0,0,1568,880);g.drawImage(img,0,0);data.push(g.getImageData(0,0,1568,880).data);}
   g.clearRect(0,0,1568,880);g.beginPath();RECORTE_OESTE.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();g.fill();g.lineWidth=6;g.stroke();g.fillRect(...DECOR_OESTE_REMOVIDO.box);
   const mask=g.getImageData(0,0,1568,880).data;let inside=0,outside=0;let outsideMaxDelta=0,outsideAboveOne=0;const outsideBounds=[9999,9999,0,0];
   for(let i=0;i<data[0].length;i+=4)if(data[0][i]!==data[1][i]||data[0][i+1]!==data[1][i+1]||data[0][i+2]!==data[1][i+2]||data[0][i+3]!==data[1][i+3]){if(mask[i+3])inside++;else{outside++;const delta=Math.max(...[0,1,2,3].map(n=>Math.abs(data[0][i+n]-data[1][i+n])));outsideMaxDelta=Math.max(outsideMaxDelta,delta);if(delta>1)outsideAboveOne++;const x=(i/4)%1568,y=Math.floor(i/4/1568);outsideBounds[0]=Math.min(outsideBounds[0],x);outsideBounds[1]=Math.min(outsideBounds[1],y);outsideBounds[2]=Math.max(outsideBounds[2],x);outsideBounds[3]=Math.max(outsideBounds[3],y);}}
   const mist=(t,reduced)=>{g.clearRect(0,0,1568,880);desenharAtmosferaOestePontual(g,1,t,reduced);return c.toDataURL();};
   return {inside,outside,outsideBounds,outsideMaxDelta,outsideAboveOne,moves:mist(0,false)!==mist(4,false),stable:mist(0,true)===mist(9,true)};
  },samples);
  assert(report.inside>10000,'actual local replacement');assert.equal(report.outside,0,JSON.stringify(report)+' pixel-identical outside the local envelope plus 3px antialias guard and removed prop bounds');assert(report.moves&&report.stable,'local mist/reflection animate; reduced motion is stable');
  const trace=await pages[0].evaluate(async()=>{
   const {renderDocas}=await import('/js/engine/docas-view.js');const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');const {OESTE_PONTUAL_FRAMES}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-oeste-pontual.js');
   const c=document.createElement('canvas');c.width=1568;c.height=880;const g=c.getContext('2d'),seq=[];
   const original=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...a){if(img instanceof HTMLImageElement&&img.src.endsWith('/docas-oeste-pontual/atlas.png')){const entry=Object.entries(OESTE_PONTUAL_FRAMES).find(([,f])=>f.rect.every((v,i)=>a[i]===v));seq.push(entry?.[0]??'BAD_UV');}return original.call(this,img,...a);};
   const state={player:{x:300*2.5/64,y:440*2.5/22},objects:[],trainingTargets:[],progress:{flags:{}},docasAnimation:{elapsed:3.2}},before=JSON.stringify(state),storage=JSON.stringify(localStorage),physics=JSON.stringify(docas.geometriaDocas);
   try{renderDocas(g,{...docas},state,1960,1387.5,1568,880,.4,1,3200,()=>seq.push('PLAYER'));}finally{CanvasRenderingContext2D.prototype.drawImage=original;}
   return {seq,unchanged:before===JSON.stringify(state)&&storage===JSON.stringify(localStorage)&&physics===JSON.stringify(docas.geometriaDocas)};
  });
  for(const id of ['solo','arvore','palmeiras','cristais','abrigo','cerca'])assert.equal(trace.seq.filter(v=>v===id).length,1,id+' exactly one real layer');
  assert(trace.seq.indexOf('palmeiras')<trace.seq.indexOf('PLAYER'));assert(trace.seq.indexOf('PLAYER')<trace.seq.indexOf('cristais'));assert(trace.seq.indexOf('abrigo')<trace.seq.indexOf('cerca'));assert(trace.unchanged);assert.deepEqual(errors,[]);
  const partial=await b.newPage();await partial.route('**/docas-oeste-pontual/fundos-preservados.png',r=>r.abort());
  await partial.goto(url);await partial.waitForFunction(()=>window.ready);await partial.click('#pause');
  const fallback=await partial.evaluate(()=>{window.sampleSetor(3.2,'full');return document.querySelector('canvas').toDataURL();});
  assert.equal(fallback,samples[1],'partial asset failure must preserve the entire previous scene, not half-replace it');
  console.log(`Chromium oeste: ${report.inside} changed pixels inside; ZERO outside scope; six actual depth layers, actor occlusion, animated/reduced fog, physics/state/storage and baseline fallback OK.`);
 }finally{await b.close();}
}
