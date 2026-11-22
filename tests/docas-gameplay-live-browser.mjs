// REAL index.html/menu/save/RAF test, not a preview fixture and no manual render.
// Run a static server (as with Live Server), then set BROWSER_EXECUTABLE,
// PLAYWRIGHT_MODULE and optionally BROWSER_LIBRARY_PATH/PREVIEW_ORIGIN.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
if(!process.env.BROWSER_EXECUTABLE){console.log('Gameplay live: ignorado; defina BROWSER_EXECUTABLE.');}
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??process.env.LD_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(()=>{
   window.liveTrace=null;
   const ellipse=CanvasRenderingContext2D.prototype.ellipse;
   CanvasRenderingContext2D.prototype.ellipse=function(...a){
    const fog=window.liveTrace?.fog;
    if(fog&&String(this.fillStyle).startsWith('rgba(185, 110, 171,')){fog.count++;fog.frames.add(`${a[0]}:${a[1]}`);}
    return ellipse.apply(this,a);
   };
   const gradient=CanvasRenderingContext2D.prototype.createRadialGradient;
   CanvasRenderingContext2D.prototype.createRadialGradient=function(...a){
    const g=gradient.apply(this,a);
    if(a[0]===287&&a[1]===254&&a[5]===29){
     const stop=g.addColorStop;
     g.addColorStop=function(offset,color){const lamp=window.liveTrace?.lamp;if(lamp&&offset===0){lamp.count++;lamp.frames.add(color);}return stop.call(this,offset,color);};
    }
    return g;
   };
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...a){
    const t=window.liveTrace;
    if(t&&img instanceof HTMLImageElement){
     const path=img.src;let group;
     if(path.includes('/docas-pesqueiro-03/casco-'))group='ship';
     if(path.includes('/docas-pesqueiro-03/mar-proa.'))group='water';
     if(path.includes('/docas-tentaculo-02/tentaculo-'))group='tentacle';
     if(path.includes('/docas-tentaculo-02/agua-anel.'))group='magenta';
     if(group){t[group].count++;t[group].frames.add(`${path.split('/').pop()}:${a[0]}:${a[1]}`);if(group==='ship'){const m=this.getTransform();t.ship.angles.add(Math.round(Math.atan2(m.b,m.a)*1e6));}}
    }
    return draw.call(this,img,...a);
   };
  });
  const origin=process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000';
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(()=>typeof window.__morfador==='function',null,{timeout:120000});
  await page.evaluate(async()=>{
   const {createNewSave}=await import('/js/game/save.js');
   const save=createNewSave(1,'QA loop real');
   save.world={lastMapId:'mare_cromatica_docas',lastSpawnId:'inicio'};
   save.progress.archetype='mare_astral';save.progress.onboardingCompleted=true;
   save.progress.flags={docas_neblina_alcancada:true,docas_sinal_interceptado:true};
   save.progress.mareCromatica={versaoCronometro:1,iniciada:false,restante:600};
   localStorage.setItem('BLOCO404_SAVE_SLOT_1',JSON.stringify(save));
  });
  async function enter(){
   await page.click('#startBtn');await page.click('.continue-btn');
   await page.waitForFunction(()=>!document.querySelector('#cromaticaHud').hidden);
   // Free camera frames both coastline tentacle and vessel. It does not modify
   // the visual clock, call render(), move the player or begin the mission.
   await page.evaluate(async()=>{
    const {camera}=await import('/js/engine/camera.js');
    camera.follow=false;camera.x=810;camera.y=1690;camera.zoom=.95;camera.targetZoom=.95;
   });
  }
  async function measure(){
   await page.evaluate(()=>{window.liveTrace={};for(const g of ['ship','water','tentacle','magenta','fog','lamp'])window.liveTrace[g]={count:0,frames:new Set(),angles:new Set()};});
   const before=await page.evaluate(async()=>{const {state}=await import('/js/game/state.js');return state.docasAnimation.elapsed;});
   await page.waitForTimeout(1200);
   return page.evaluate(async before=>{
    const {state}=await import('/js/game/state.js');
    const {lerMareCromatica}=await import('/js/game/mare-cromatica.js');
    const out={delta:state.docasAnimation.elapsed-before,mission:lerMareCromatica(state.progress),mode:document.querySelector('#docasMotion').value};
    for(const [g,t] of Object.entries(window.liveTrace))out[g]={count:t.count,frames:t.frames.size,angles:t.angles.size};
    window.liveTrace=null;return out;
   },before);
  }
  function live(report){
   assert(report.delta>.2,'real RAF advances presentation time');
   assert.equal(report.mission.iniciada,false);assert.equal(report.mission.restante,600,'waiting mission must not count down');
   for(const g of ['ship','water','tentacle','magenta']){assert(report[g].count>3,`${g} drawn by gameplay`);assert(report[g].frames>1,`${g} animates in real RAF`);}
   assert(report.ship.angles>1,'continuous nautical roll');
   assert(report.fog.frames>6,'fog ellipses move in live overlay');
   assert(report.lamp.frames>1,'actual cabin gradient pulses');
  }
  function still(report){
   assert(report.delta>.2,'underlying clock still runs');
   for(const g of ['ship','water','tentacle','magenta']){assert(report[g].count>3);assert.equal(report[g].frames,1,`${g} explicitly frozen`);}
   assert.equal(report.ship.angles,1);
   assert.equal(report.fog.frames,6,'six static fog ellipses');
   assert.equal(report.lamp.frames,1,'light pulse explicitly fixed');
  }
  await enter();assert.equal(await page.locator('#docasMotion').inputValue(),'normal');
  const animated=await measure();live(animated);
  await page.selectOption('#docasMotion','reduzido');const reduced=await measure();still(reduced);
  await page.selectOption('#docasMotion','normal');const resumed=await measure();live(resumed);
  // Early return from simulation must not affect scene time.
  await page.evaluate(()=>document.activeElement.blur());await page.keyboard.press('v');
  assert(await page.evaluate(async()=>{const m=await import('/js/game/background-calibration.js');return m.isBackgroundCalibrationEnabled();}));
  const calibration=await measure();live(calibration);await page.keyboard.press('v');
  await page.click('#abrirMapaTatico');
  const tactical=await measure();live(tactical);await page.click('#fecharMapaTatico');
  await page.selectOption('#docasMotion','sistema');const systemReduced=await measure();still(systemReduced);
  await page.emulateMedia({reducedMotion:'no-preference'});const systemAnimated=await measure();live(systemAnimated);
  await page.selectOption('#docasMotion','reduzido');
  await page.reload();await page.waitForFunction(()=>typeof window.__morfador==='function');
  assert.equal(await page.locator('#docasMotion').inputValue(),'reduzido','explicit choice survives reload');
  await enter();still(await measure());
  await page.selectOption('#docasMotion','normal');
  assert.deepEqual(errors,[]);
  if(process.env.CAPTURE_ART){mkdirSync('.qa',{recursive:true});writeFileSync('.qa/docas-live-report.json',JSON.stringify({animated,reduced,resumed,calibration,tactical,systemReduced,systemAnimated,errors},null,2));await page.screenshot({path:'.qa/docas-live-gameplay.png'});}
  console.log('index.html real: menu/save + RAF, waiting 10:00, ship/water/tentacle/magenta moving; explicit reduce/resume, system opt-in, reload and calibration OK.');
 }finally{await browser.close();}
}
