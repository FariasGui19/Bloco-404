import assert from 'node:assert/strict';
if(!process.env.BROWSER_EXECUTABLE)console.log('Acabamento browser: ignorado; defina BROWSER_EXECUTABLE.');
else{
 const {chromium}=await import(process.env.PLAYWRIGHT_MODULE??'playwright-core');
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox'],env:{...process.env,LD_LIBRARY_PATH:process.env.BROWSER_LIBRARY_PATH??''}});
 try{
  const page=await browser.newPage({viewport:{width:1568,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`${process.env.PREVIEW_ORIGIN??'http://127.0.0.1:8000'}/docs/previa-docas-acabamento.html`);await page.waitForFunction(()=>window.ready);await page.click('#pause');
  const result=await page.evaluate(async()=>{
   const {desenharMarPerimetral,desenharBrumaCosteira,BANCOS_BRUMA}=await import('/js/engine/docas-mar-perimetral.js');
   const {desenharMargensFechamento}=await import('/js/engine/docas-fechamento.js');
   const {repararSoloDireito}=await import('/js/engine/docas-encaixe.js');
   const {docas}=await import('/js/data/worlds/arquipelago-rotas-perdidas/docas-neblina.js');
   const c=document.createElement('canvas');c.width=1800;c.height=1200;const g=c.getContext('2d');
   const clear=()=>{g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);};
   const sea={};for(const [id,left,top] of [['north',-100,-300],['west',-400,200],['east',1450,300],['south',800,950]]){
    clear();g.translate(-left,-top);desenharMarPerimetral(g,docas,1,3,false,{left,right:left+300,top,bottom:top+200});
    const a=g.getImageData(0,0,300,200).data;let purple=0;for(let i=0;i<a.length;i+=4)if(a[i+3]>12&&a[i]>a[i+1]*1.3&&a[i+2]>a[i+1]*1.3)purple++;
    sea[id]=purple;
   }
   clear();desenharBrumaCosteira(g,1,0,true);const reduced=c.toDataURL();clear();desenharBrumaCosteira(g,1,9,true);const stable=reduced===c.toDataURL();
   clear();desenharBrumaCosteira(g,1,0,false);const normal=c.toDataURL();clear();desenharBrumaCosteira(g,1,9,false);const moves=normal!==c.toDataURL();
   const fogProtected=g.getImageData(1200,70,100,100).data.every(v=>v===0);
   const urls=[],orig=g.drawImage;g.drawImage=function(img,...args){urls.push(img.src);return orig.call(this,img,...args);};
   clear();desenharMargensFechamento(g,1);repararSoloDireito(g,1);
   const texture=g.getImageData(900,550,50,50).data,colors=new Set();for(let i=0;i<texture.length;i+=4)colors.add(`${texture[i]},${texture[i+1]},${texture[i+2]}`);
   return {sea,stable,moves,fogProtected,banks:BANCOS_BRUMA.length,urls,colors:colors.size};
  });
  for(const [side,n] of Object.entries(result.sea))assert(n>100,`${side}: magenta visible in isolated sea (${n})`);
  assert(result.stable&&result.moves,'mist animates but reduced motion is stable');assert(result.fogProtected,'new fog does not repaint upper cyan portal');assert.equal(result.banks,8);
  assert.equal(result.urls.filter(s=>s.endsWith('/docas-acabamento/promontorio.png')).length,2,'both rock supports rendered');assert(result.colors>50,'repair is detailed texture, not a flat fill');assert.deepEqual(errors,[]);
  console.log('Chromium acabamento: magenta isolated on four sides, eight fog banks, protected top, reduced motion, textured soil and two rock supports OK.');
 }finally{await browser.close();}
}
