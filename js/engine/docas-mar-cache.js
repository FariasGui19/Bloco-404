import {desenharMarPerimetral} from './docas-mar-perimetral.js';
import {getSprite} from './sprites.js';
// Only translucent distant sea FX are amortized. Actors, input, enemies,
// collisions, mission and main RAF retain their original update frequency.
const cache=new WeakMap();
export function desenharMarPerimetralCache(ctx,map,s,t,reduced,bounds,zoom=1){
 if(typeof document==='undefined')return desenharMarPerimetral(ctx,map,s,t,reduced,bounds);
 const bucket=reduced?0:Math.floor(t*12),source=getSprite('docas_fiel_mar');
 let record=cache.get(map);
 const margin=120,w=bounds.right-bounds.left+margin*2,h=bounds.bottom-bounds.top+margin*2;
 const q=Math.min(1,zoom*.75,1536/w,1536/h);
 const outside=!record||bounds.left<record.left||bounds.right>record.right||bounds.top<record.top||bounds.bottom>record.bottom;
 if(!record||outside||record.bucket!==bucket||record.reduced!==reduced||record.zoom!==zoom||record.source!==source){
  const canvas=record?.canvas??document.createElement('canvas');
  const left=bounds.left-margin,top=bounds.top-margin,width=Math.ceil(w*q),height=Math.ceil(h*q);
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const g=canvas.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,width,height);g.setTransform(q,0,0,q,-left*q,-top*q);
  desenharMarPerimetral(g,map,s,reduced?0:bucket/12,reduced,{left,right:left+width/q,top,bottom:top+height/q});
  record={canvas,left,top,right:left+width/q,bottom:top+height/q,bucket,reduced,zoom,source,q};cache.set(map,record);
 }
 ctx.drawImage(record.canvas,record.left,record.top,record.canvas.width/record.q,record.canvas.height/record.q);
}
