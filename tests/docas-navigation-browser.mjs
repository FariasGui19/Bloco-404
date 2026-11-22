import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Navigation browser: ignorado; defina BROWSER_EXECUTABLE.');
else {
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??''}});
 try {
  const page=await browser.newPage({viewport:{width:1568,height:1160}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000')+'/docs/previa-docas-navegacao.html');
  await page.waitForFunction(()=>window.ready);await page.click('#pause');
  const foliage=await page.evaluate(async()=>{
   const {desenharOestePontual}=await import('/js/engine/docas-oeste-pontual.js');
   const canvas=document.createElement('canvas');canvas.width=1568;canvas.height=880;const ctx=canvas.getContext('2d');
   const sample=(id,t,reduced)=>{ctx.clearRect(0,0,1568,880);desenharOestePontual(ctx,id,1,t,reduced);return canvas.toDataURL();};
   return ['palmeiras','arvore'].map(id=>({id,moves:sample(id,0,false)!==sample(id,4,false),stable:sample(id,0,true)===sample(id,4,true)}));
  });
  for(const f of foliage)assert(f.moves&&f.stable,f.id+' moves with visual time and freezes with reduced motion');
  const read=()=>page.evaluate(()=>({x:window.navigationState.player.x,storage:JSON.stringify(localStorage)}));
  const before=await read();await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');const after=await read();
  assert(after.x>before.x,'keyboard uses real collision movement');assert.equal(after.storage,before.storage,'preview never writes save or preferences');
  assert.deepEqual(errors,[]);
  console.log('Navigation browser: real keyboard/overlay preview, animated west foliage, stable reduced motion, unchanged storage and no page errors OK.');
 } finally {await browser.close();}
}
