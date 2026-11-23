import {CONFIG} from '../config.js';
import {getSprite} from './sprites.js';
import {tempoVisualDocas} from './docas-animation.js';
import {APOIOS_INTERATIVOS_DOCAS} from '../data/worlds/arquipelago-rotas-perdidas/docas-interativos-apoios.js';
const rasters=new WeakMap();
export function estadoInterativoDocas(o,state){
 const d=state.progress?.mareCromatica??{},flags=state.progress?.flags??{},visual=o.docasInterativo;
 if(!visual)return {done:false,near:false};
 const done=visual.kind==='suprimento'?!!flags[o.id]:visual.kind==='fragmento'?(d.fragmentos??[]).includes(o.id.replace('cromatica_fragmento_','')):visual.kind==='fita'?(d.fitas??[]).includes(o.id.replace('cromatica_fita_','')):d.sincronizacao>=4;
 const empty=visual.kind==='fita'&&state.world?.currentMapId==='mare_cromatica_galpao'&&!done;
 const near=!!state.player&&Math.hypot(state.player.x-o.x,state.player.y-o.y)<2;
 return {done,near,empty};
}
function raster(img,w){
 if(typeof document==='undefined')return img;
 let r=rasters.get(img);if(!r||r.width!==Math.ceil(w*2)){
  const c=document.createElement('canvas');c.width=Math.ceil(w*2);c.height=Math.max(1,Math.round(c.width*img.height/img.width));c.getContext('2d').drawImage(img,0,0,c.width,c.height);r={width:c.width,canvas:c};rasters.set(img,r);
 }return r.canvas;
}
export function desenharInterativoDocas(ctx,o,state){
 const v=o.docasInterativo;if(!v)return false;
 const img=getSprite(v.sprite);if(!img)return false;
 const {t,reduced}=tempoVisualDocas(state),status=estadoInterativoDocas(o,state),[u,bottom]=APOIOS_INTERATIVOS_DOCAS[v.name];
 const x=(o.x-o.y)*CONFIG.TILE_W/2,y=(o.x+o.y)*CONFIG.TILE_H/2,w=v.width,h=w*img.height/img.width,left=x-u*w,top=y-bottom*h;
 ctx.save();ctx.fillStyle='rgba(3,10,12,.3)';ctx.beginPath();ctx.ellipse(x,y+.5,w*.28,2.2,0,0,Math.PI*2);ctx.fill();ctx.drawImage(raster(img,w),left,top,w,h);
 const live=!status.done&&!status.empty,alpha=live?(reduced?.35:.35+.08*Math.sin(t*1.6+o.x)):.13;
 ctx.fillStyle=`rgba(${status.done?'142,180,156':status.empty?'117,132,133':'151,223,203'},${alpha})`;
 // A restrained status light, not a floating icon. No per-frame gradients.
 ctx.beginPath();ctx.ellipse(left+w*.68,top+h*.51,1.6,.9,0,0,Math.PI*2);ctx.fill();
 if(v.kind==='terminal'||v.kind==='fita'){
  ctx.save();ctx.beginPath();ctx.rect(left+w*.19,top+h*.25,w*.38,h*.22);ctx.clip();ctx.fillStyle=`rgba(150,230,199,${live?.14:.05})`;const f=reduced||!live?.5:(t*.23)%1;ctx.fillRect(left,top+h*(.25+f*.22),w,.65);ctx.restore();
 }
 if(status.near){ctx.strokeStyle=status.done?'rgba(154,190,161,.3)':'rgba(188,224,199,.55)';ctx.lineWidth=.7;ctx.beginPath();ctx.ellipse(x,y+1,w*.36,3.6,0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();return true;
}
