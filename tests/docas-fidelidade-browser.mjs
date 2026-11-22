import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Fidelidade browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const b=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??''}});
 try{
  const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const origin=process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000';
  await p.goto(origin+'/docs/previa-docas-fidelidade.html');await p.waitForFunction(()=>window.ready);await p.click('#pause');
  assert.equal(await p.locator('#status').textContent(),'Artes carregadas');
  const result=await p.evaluate(async()=>{
   const {renderDocas}=await import('/js/engine/docas-view.js');const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');
   const {desenharMarPerimetral}=await import('/js/engine/docas-mar-perimetral.js');
   const c=document.createElement('canvas');c.width=1568;c.height=882;const g=c.getContext('2d');
   const original=CanvasRenderingContext2D.prototype.drawImage,sequence=[];
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(img instanceof HTMLImageElement)sequence.push({url:img.src,args});return original.call(this,img,...args);};
   const state={player:{x:650*2.5/64,y:420*2.5/22},objects:[],trainingTargets:[],progress:{flags:{}},docasAnimation:{elapsed:3}};
   const storage=JSON.stringify(localStorage),before=JSON.stringify(state);let sea={};
   try{
    renderDocas(g,{...docas},state,1960,1387.5,1568,882,.4,1,3000,()=>sequence.push({url:'PLAYER'}));
    for(const [side,left,top] of [['west',-400,150],['north',350,-250],['east',1450,200],['south',800,1000]]){
     const sample=(t,reduced)=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,1568,882);g.translate(-left,-top);desenharMarPerimetral(g,docas,1,t,reduced,{left,right:left+400,top,bottom:top+300});return c.toDataURL();};
     const start=sequence.length;const moving=sample(0,false)!==sample(3,false),rest=sample(0,true)===sample(9,true);
     sea[side]={moving,rest,usesWater:sequence.slice(start).some(r=>r.url.endsWith('/docas-fidelidade/mar.png'))};
    }
   }finally{CanvasRenderingContext2D.prototype.drawImage=original;}
   return {sequence,sea,unchanged:before===JSON.stringify(state)&&storage===JSON.stringify(localStorage)};
  });
  const seq=result.sequence,find=file=>seq.findIndex(r=>r.url.endsWith(file));
  assert(seq.findIndex(r=>r.url.endsWith('/docas-fidelidade/fundos-enraizados.png')||r.url.endsWith('/docas-oeste-pontual/fundos-preservados.png'))<find('PLAYER'),'rear cabin obeys foot385, behind actor at420');
  assert(find('PLAYER')<find('/docas-fidelidade/abrigo-oeste.png'),'actor at420 is behind porch at451');
  const rear=seq.filter(r=>(r.url.endsWith('/docas-fidelidade/fundos-enraizados.png')||r.url.endsWith('/docas-oeste-pontual/fundos-preservados.png')));
  // Revision: 32 animated crown strips plus ONE rigid lower cabin band.
  // Do not mistake the crown-only crops for duplicate complete buildings.
  assert.equal(rear.length,33,'one crown pass and one rigid cabin pass');
  assert.equal(rear.filter(r=>r.args[5]>=238).length,1,'cabin/bank is drawn exactly once');
  assert(rear.slice(0,32).every(r=>r.args.length===8&&r.args[5]<238),'all other draws crop only the canopy');
  assert.equal(rear.at(-1).args[5],238,'roofline/roots remain rigid');

  assert.equal(seq.filter(r=>r.url.endsWith('/docas-fidelidade/acesso-cais.png')).length,1,'one crisp shore connection');
  assert(!seq.some(r=>r.url.endsWith('/escada-mare.png')||r.url.endsWith('/escada-oeste.png')),'old double stair block is not drawn');
  assert.equal(seq.filter(r=>r.url.endsWith('/docas-fidelidade/costa-sudeste.png')).length,1,'one continuous coastline');
  assert.equal(seq.filter(r=>r.url.endsWith('/docas-acabamento/promontorio.png')).length,1,'oval platform under annex is removed; tower support remains');
  for(const [side,r] of Object.entries(result.sea))assert(r.moving&&r.rest&&r.usesWater,side+' authored sea, animation and reduced mode');
  assert(result.unchanged);assert.deepEqual(errors,[]);
  // All new files failing must still leave the pre-existing scene usable.
  const fallback=await b.newPage();await fallback.route('**/assets/sprites/docas-fidelidade/**',route=>route.abort());
  const fallbackErrors=[];fallback.on('pageerror',e=>fallbackErrors.push(e.message));
  await fallback.goto(origin+'/docs/previa-docas-fidelidade.html');await fallback.waitForFunction(()=>window.ready);await fallback.click('#pause');await fallback.evaluate(()=>window.sampleSetor(3,'full'));
  assert.equal(await fallback.locator('#status').textContent(),'Falha ao carregar arte');assert.deepEqual(fallbackErrors,[]);
  console.log('Chromium fidelidade: three scene replacements, foot-based occlusion, no duplicate cabin/oval platform, four authored moving sea regions, stable reduced mode, unchanged state/storage and missing-assets fallback OK.');
 }finally{await b.close();}
}
