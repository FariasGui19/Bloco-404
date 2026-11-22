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
  const rear=await page.evaluate(async()=>{
   const {desenharCopasFundos}=await import('/js/engine/docas-foliage.js'),{getSprite}=await import('/js/engine/sprites.js');
   const img=getSprite('docas_oeste_pontual_fundos'),c=document.createElement('canvas');c.width=1568;c.height=880;const ctx=c.getContext('2d');
   const sample=(t,reduced)=>{ctx.clearRect(0,0,1568,880);desenharCopasFundos(ctx,img,[374,142,480,258],t,reduced);return ctx.getImageData(0,0,1568,880).data;};
   const a=sample(0,false),b=sample(2,false),r=sample(0,true),s=sample(10,true);let crown=0,below=0,still=0;
   for(let i=0;i<a.length;i+=4){const changed=[0,1,2,3].some(n=>a[i+n]!==b[i+n]);if(changed){if(Math.floor(i/4/1568)<239)crown++;else below++;}if([0,1,2,3].some(n=>r[i+n]!==s[i+n]))still++;}
   return {crown,below,still};
  });
  assert(rear.crown>1000,'embedded rear crowns visibly move');assert.equal(rear.below,0,'rear cabin and roots are rigid');assert.equal(rear.still,0,'reduced rear crowns stable');

  const read=()=>page.evaluate(()=>({x:window.navigationState.player.x,storage:JSON.stringify(localStorage)}));
  const before=await read();await page.keyboard.down('ArrowRight');await page.waitForTimeout(400);await page.keyboard.up('ArrowRight');const after=await read();
  assert(after.x>before.x,'keyboard uses real collision movement');assert.equal(after.storage,before.storage,'preview never writes save or preferences');
  assert.deepEqual(errors,[]);
  console.log('Navigation browser: real keyboard/overlay preview, animated west foliage, stable reduced motion, unchanged storage and no page errors OK.');
 } finally {await browser.close();}
}
