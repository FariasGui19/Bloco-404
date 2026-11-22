import assert from'node:assert/strict';import{desenharMarPerimetralCache as draw}from'../js/engine/docas-mar-cache.js';
let builds=0,composites=0,depth=0;const grad={addColorStop(){}};
const g=new Proxy({save(){depth++},restore(){depth--},clearRect(){builds++},createRadialGradient(){return grad}},{get:(o,k)=>k in o?o[k]:()=>{}});
const old=globalThis.document;globalThis.document={createElement(){return{width:0,height:0,getContext(){return g}}}};
try{const map={geometriaDocas:{polys:[],bloqueios:[]}},ctx={drawImage(c){assert(c.width<=1536&&c.height<=1536);composites++}},bounds={left:0,right:1000,top:0,bottom:700};
 draw(ctx,map,2.5,0,false,bounds,.8);assert.equal(builds,1);
 draw(ctx,map,2.5,.02,false,bounds,.8);assert.equal(builds,1);
 draw(ctx,map,2.5,.1,false,bounds,.8);assert.equal(builds,2);
 draw(ctx,map,2.5,.1,false,{...bounds,left:10,right:1010},.8);assert.equal(builds,2,'padding absorbs camera movement without drifting world FX');
 draw(ctx,map,2.5,1,true,bounds,.8);assert.equal(builds,3);draw(ctx,map,2.5,100,true,bounds,.8);assert.equal(builds,3);
 draw(ctx,map,2.5,100,true,{left:9000,right:10000,top:0,bottom:700},.8);assert.equal(builds,4,'camera leaving cache rebuilds');
 assert.equal(composites,7);assert.equal(depth,0);console.log('Sea cache: 12Hz-only FX, bounded 1536² surface, camera padding, reduced-motion reuse and balanced canvas state OK.');
}finally{globalThis.document=old;}
