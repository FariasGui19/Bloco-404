import assert from'node:assert/strict';import{desenharTerrenoDocas as draw}from'../js/engine/docas-terreno-cache.js';
const old=globalThis.document;let builds=0,draws=0;globalThis.document={createElement(){return{width:0,height:0,getContext(){return{drawImage(){builds++}}}}}};
try{const img={width:4000,height:2200},ctx={drawImage(){draws++}};for(let i=0;i<60;i++)draw(ctx,img,0,0,1000,700,.4,1);assert.equal(builds,1);assert.equal(draws,60);
 for(let i=0;i<10;i++)draw(ctx,img,0,0,1000,700,.5+i*.01,1);assert(builds<=2,'zoom gesture does not rebuild every frame; capped resolution can be reused');
 draw(ctx,img,0,0,1000,700,1.2,1);assert(builds<=2,'no unnecessary upsample cache');
 console.log('Static terrain cache: one downsample for 60 stable frames, no rebuild churn during zoom, original path for magnification OK.');
}finally{globalThis.document=old;}
