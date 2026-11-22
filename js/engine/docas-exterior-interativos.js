import {INTERATIVOS_EXTERIORES_DOCAS as pieces} from '../data/worlds/arquipelago-rotas-perdidas/docas-exterior-lote8.js';
import {APOIOS_EXTERIORES_DOCAS as supports} from '../data/worlds/arquipelago-rotas-perdidas/docas-exterior-apoios.js';
import {getSprite} from './sprites.js';
import {CONFIG} from '../config.js';
import {SIDE_DEPTH_STEP} from './camera.js';
import {desenharRasterDocas} from './docas-raster.js';
export function itensInterativosExterior(state,bounds){
 return (state.objects??[]).filter(o=>pieces[o.id]&&o.x*CONFIG.TILE_W+90>=bounds.left&&o.x*CONFIG.TILE_W-90<=bounds.right&&o.y*SIDE_DEPTH_STEP+20>=bounds.top&&o.y*SIDE_DEPTH_STEP-120<=bounds.bottom).map(o=>({interativoExterior:o,y:o.y*SIDE_DEPTH_STEP}));
}
export function estadoInterativoExterior(o,state){
 const v=pieces[o.id],d=state.progress?.mareCromatica??{},flags=state.progress?.flags??{};
 if(!v)return false;
 if(v.kind==='fragmento')return (d.fragmentos??[]).includes('estacao');
 if(v.kind==='selo')return !!d.estacaoAberta;
 if(v.kind==='painel')return (d.paineis??[]).includes(o.id.replace('cromatica_painel_',''));
 if(v.kind==='ancora')return !!d.ancoraEstavel;
 if(v.kind==='ressonancia')return !!flags[o.id+'_ativado'];
 return false;
}
export function desenharInterativoExterior(ctx,o,state,t,reduced){
 const v=pieces[o.id],img=v&&getSprite(v.sprite);if(!img)return;
 const x=o.x*CONFIG.TILE_W,y=o.y*SIDE_DEPTH_STEP,[u,bottom]=supports[v.name],w=v.width*1.55,h=w*img.height/img.width,done=estadoInterativoExterior(o,state);
 ctx.save();ctx.fillStyle='rgba(3,8,14,.28)';ctx.beginPath();ctx.ellipse(x,y,w*.28,2.5,0,0,Math.PI*2);ctx.fill();
 desenharRasterDocas(ctx,img,0,0,img.width,img.height,x-u*w,y-bottom*h,w,h);
 // Status only on powered devices; books and notices never glow.
 if(v.kind!=='registro'){
  const a=done?.2:reduced?.36:.36+.07*Math.sin(t*1.4+o.x);
  ctx.fillStyle=`rgba(${done?'151,184,159':'131,225,209'},${a})`;ctx.beginPath();ctx.ellipse(x+(1-u)*w*.16,y-h*.43,1.7,1.1,0,0,Math.PI*2);ctx.fill();
 }
 const near=state.player&&Math.hypot(o.x-state.player.x,o.y-state.player.y)<1.8;
 if(near){ctx.strokeStyle='rgba(196,222,196,.45)';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(x,y+1,w*.35,4,0,0,Math.PI*2);ctx.stroke();}
 // O portal de eco não tem prompt de HUD na vista lateral; rotula no mundo.
 if(v.kind==='portal'&&state.player&&Math.hypot(o.x-state.player.x,o.y-state.player.y)<2.6){ctx.font='600 12px monospace';ctx.textAlign='center';ctx.fillStyle='rgba(3,12,16,.75)';ctx.fillRect(x-62,y-h-19,124,15);ctx.fillStyle='#bff5e1';ctx.fillText(state.progress?.flags?.cromatica_ancora_estavel?'[E] PORTAL DE ECO':'PORTAL DE ECO • SELADO',x,y-h-7);}
 ctx.restore();
}
