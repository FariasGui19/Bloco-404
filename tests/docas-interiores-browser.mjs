import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
if(!process.env.BROWSER_EXECUTABLE)console.log('Interiores browser: ignorado; defina BROWSER_EXECUTABLE.');
else {
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??''}});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.status()+' '+r.url());});
  // Observe actual WebAudio destinations without changing their processing.
  await page.addInitScript(()=>{window.batchDraws=new Set();window.batch3Draws=new Set();const draw=CanvasRenderingContext2D.prototype.drawImage;CanvasRenderingContext2D.prototype.drawImage=function(img,...a){if(img instanceof HTMLImageElement&&img.src.includes('/docas-interiores-lote2/'))window.batchDraws.add(img.src.split('/').pop());if(img instanceof HTMLImageElement&&img.src.includes('/docas-interiores-lote3/'))window.batch3Draws.add(img.src.split('/').pop());return draw.call(this,img,...a);};const Native=window.AudioContext;if(!Native)return;window.audioContexts=[];window.AudioContext=class extends Native{constructor(...a){super(...a);window.audioContexts.push(this);}};});
  const origin=process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000';await page.goto(origin+'/index.html');await page.waitForFunction(()=>typeof window.__morfador==='function',null,{timeout:120000});
  assert.equal(await page.evaluate(()=>window.audioContexts.length),0,'no autoplay');
  await page.evaluate(async()=>{const {createNewSave}=await import('/js/game/save.js');const s=createNewSave(1,'QA interiores');s.world={lastMapId:'mare_cromatica_docas',lastSpawnId:'inicio'};s.progress.archetype='mare_astral';s.progress.onboardingCompleted=true;s.progress.flags={docas_neblina_alcancada:true,docas_sinal_interceptado:true};s.progress.mareCromatica={versaoCronometro:1,iniciada:false,restante:600};localStorage.setItem('BLOCO404_SAVE_SLOT_1',JSON.stringify(s));});
  await page.click('#startBtn');await page.click('.continue-btn');await page.waitForFunction(()=>!document.querySelector('#cromaticaHud').hidden);
  await page.click('#cromaticaSound');assert.equal(await page.locator('#cromaticaSound').getAttribute('aria-pressed'),'true');assert.equal(await page.evaluate(()=>window.audioContexts.length),1);
  const baseline=await page.evaluate(async()=>{const {state}=await import('/js/game/state.js');return {inventory:JSON.stringify(state.progress.inventory),health:state.player.health,energy:state.player.energy};});
  // Compute a route with the real collision gate, then execute its actual
  // substepped edges. E is still handled by the normal input/portal system.
  async function walkTo(id){
   const result=await page.evaluate(async id=>{
    const {state}=await import('/js/game/state.js'),{canStandAt,moveWithCollision}=await import('/js/game/collision.js'),{findNearestInteraction}=await import('/js/game/interactions.js');
    const map=state.world.currentMap,step=.25,start=[Math.floor(state.player.x/step),Math.floor(state.player.y/step)],queue=[start],prev=new Map([[start.join(','),null]]),initial={x:state.player.x,y:state.player.y};let goal=null;
    for(let i=0;i<queue.length;i++){
     const [x,y]=queue[i];state.player.x=(x+.5)*step;state.player.y=(y+.5)*step;
     if(findNearestInteraction()?.data?.id===id){goal=queue[i];break;}
     for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const X=x+dx,Y=y+dy,k=X+','+Y;if(prev.has(k)||!canStandAt(map,(X+.5)*step,(Y+.5)*step,.25,state.player))continue;
      const probe={x:state.player.x,y:state.player.y};moveWithCollision(map,probe,dx*step,dy*step,.25);if(Math.hypot(probe.x-(X+.5)*step,probe.y-(Y+.5)*step)>.001)continue;prev.set(k,[x,y]);queue.push([X,Y]);}
    }
    Object.assign(state.player,initial);if(!goal)return {error:'unreachable '+id};const path=[];for(let a=goal;a;a=prev.get(a.join(',')))path.unshift(a);
    for(const [x,y] of path){const X=(x+.5)*step,Y=(y+.5)*step;moveWithCollision(map,state.player,X-state.player.x,Y-state.player.y,.25);if(Math.hypot(state.player.x-X,state.player.y-Y)>.001)return {error:'snag '+id};}
    return {id:findNearestInteraction()?.data?.id,steps:path.length};
   },id);
   assert.equal(result.error,undefined,JSON.stringify(result));assert.equal(result.id,id);return result;
  }
  mkdirSync('qa',{recursive:true});
  for(const [door,name] of [['docas_cabana_esq','cabana_oeste'],['docas_cabana_dir','cabana_leste'],['docas_galpao','galpao']]){
   await walkTo(door);await page.waitForTimeout(750);await page.keyboard.press('e');await page.waitForFunction(name=>import('/js/game/state.js').then(({state})=>state.world.currentMapId==='mare_cromatica_'+name&&!state.world.isLoading),name);
   await page.waitForFunction(()=>!document.getElementById('mapTransitionOverlay')?.classList.contains('active'));await page.waitForTimeout(650);await page.screenshot({path:'qa/docas-interior-lote3-'+name+'.png'});
   const report=await page.evaluate(async()=>{const {state}=await import('/js/game/state.js'),{getSprite}=await import('/js/engine/sprites.js');return {props:state.objects.filter(o=>o.docasProp).length,hero:state.objects.filter(o=>o.docasHero&&getSprite(o.docasAsset)).length,painted:state.objects.filter(o=>o.docasAsset&&getSprite(o.docasAsset)).length,exit:state.portals[0].id,inventory:JSON.stringify(state.progress.inventory),health:state.player.health,energy:state.player.energy};});
   assert(report.props>=5);assert.equal(report.hero,1);assert.equal(report.painted,name==='cabana_oeste'?7:name==='cabana_leste'?6:5);assert.equal(report.inventory,baseline.inventory);assert.equal(report.health,baseline.health);assert.equal(report.energy,baseline.energy);
   await walkTo(report.exit);await page.waitForTimeout(750);await page.keyboard.press('e');await page.waitForFunction(()=>import('/js/game/state.js').then(({state})=>state.world.currentMapId==='mare_cromatica_docas'&&!state.world.isLoading));await page.waitForTimeout(650);
  }
  assert.equal(await page.evaluate(()=>window.batchDraws.size),10,'all ten new pieces drawn by the live renderer');
  assert.equal(await page.evaluate(()=>window.batch3Draws.size),10,'all ten batch-3 elements drawn in the three live interiors');
  const effects=await page.evaluate(async()=>{
   const {PECAS_INTERIORES_LOTE2}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-interiores-lote2.js'),{desenharLuzMobiliaDocas}=await import('/js/engine/docas-interiores.js');
   const c=document.createElement('canvas');c.width=160;c.height=160;const ctx=c.getContext('2d');
   return PECAS_INTERIORES_LOTE2.map(visual=>{
    const sample=(t,reduced)=>{ctx.clearRect(0,0,160,160);desenharLuzMobiliaDocas(ctx,{x:2,y:3,docasVisual:visual},20,20,90,110,t,reduced);return c.toDataURL();};
    return {name:visual.name,lit:!!visual.light,moves:sample(0,false)!==sample(2,false),still:sample(0,true)===sample(20,true)};
   });
  });
  for(const fx of effects){assert.equal(fx.moves,fx.lit,fx.name+' only powered equipment animates');assert(fx.still,fx.name+' reduced mode stable');}
  await page.click('#cromaticaSound');assert.equal(await page.locator('#cromaticaSound').getAttribute('aria-pressed'),'false');await page.waitForFunction(()=>window.audioContexts[0].state==='suspended');
  await page.click('#cromaticaSound');assert.equal(await page.evaluate(()=>window.audioContexts.length),1,'sources/context reused');
  const preview=await browser.newPage();preview.on('pageerror',e=>errors.push(e.message));
  await preview.goto(origin+'/docs/previa-docas-interiores-lote2.html');await preview.waitForFunction(()=>window.ready);await preview.click('#pause');
  assert.equal(await preview.locator('#status').textContent(),'10 peças carregadas');
  const storage=await preview.evaluate(()=>JSON.stringify(localStorage));
  const moving=await preview.evaluate(()=>{window.samplePiece('radio-vigia',0);const a=document.querySelector('canvas').toDataURL();window.samplePiece('radio-vigia',2);return a!==document.querySelector('canvas').toDataURL();});assert(moving);
  await preview.check('#reduced');const still=await preview.evaluate(()=>{window.samplePiece('rack-crt',0);const a=document.querySelector('canvas').toDataURL();window.samplePiece('rack-crt',9);return a===document.querySelector('canvas').toDataURL();});assert(still);
  assert.equal(await preview.evaluate(()=>JSON.stringify(localStorage)),storage,'asset preview does not write saves/preferences');
  assert.deepEqual(errors,[]);
  console.log('Chromium: real keyboard E entry/exit for all three interiors, actual collision routes, 18 props/18 painted placements including three hero assets, untouched inventory/vitals, opt-in suspend/resume/reuse audio, no page errors OK.');
 }finally{await browser.close();}
}
