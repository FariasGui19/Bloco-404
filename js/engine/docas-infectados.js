import {APOIOS_INTERATIVOS_DOCAS} from '../data/worlds/arquipelago-rotas-perdidas/docas-interativos-apoios.js';
import {APOIOS_POSES_INFECTADO,APOIOS_PASSOS_INFECTADO} from '../data/worlds/arquipelago-rotas-perdidas/docas-infectados-apoios.js';
import {getSprite} from './sprites.js';
export function poseInfectadoDocas(e,reduced=false){
 const phase=e.health<=0&&e.deathVisual>0?'queda':e.hitTimer>0?'impacto':e.windup>0?'preparo':e.attackVisual>0?'golpe':!e.cromaticaMovendo&&e.cooldown>1.8?'recuperacao':!e.cromaticaMovendo&&e.alertVisual>0?'alerta':e.cromaticaMovendo?'passo':'repouso';
 const clock=reduced?0:e.clock??0;
 return {phase,frame:phase==='passo'?Math.floor(clock*6)%8:0,breath:reduced||phase!=='repouso'?0:Math.sin(clock*1.7)*.008};
}
// Shared by exterior side-view and isometric interiors: same combat state,
// no independent animation clock, foot remains at (x,y) even when breathing.
export function desenharInfectadoDocas(ctx,e,x,y,reduced=false,height=96){
 if(e.health<=0&&!(e.deathVisual>0))return;
 const pose=poseInfectadoDocas(e,reduced),paint=getSprite('docas_interativo_lote7_infectado_'+pose.phase)??getSprite('docas_interior_lote5_infectado_'+pose.phase),sheet=getSprite('cromatica_infectado');
 ctx.save();ctx.fillStyle='rgba(8,8,18,.5)';ctx.beginPath();ctx.ellipse(x,y,14,5,0,0,Math.PI*2);ctx.fill();
 if(e.windup>0){const progress=Math.max(0,Math.min(1,1-e.windup/.65));ctx.strokeStyle='#ffc4e2';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,20+progress*4,9+progress*2,0,0,Math.PI*2);ctx.stroke();}
 if(pose.phase==='queda')ctx.globalAlpha=Math.min(1,e.deathVisual/.35);
 ctx.translate(x,y);if(e.cromaticaFaceDireita??e.flip)ctx.scale(-1,1);ctx.imageSmoothingEnabled=false;
 if(paint){const drawH=pose.phase==='queda'?height*.48:height,w=drawH*paint.width/paint.height,[u,v]=APOIOS_INTERATIVOS_DOCAS['infectado-'+pose.phase]??APOIOS_POSES_INFECTADO['infectado-'+pose.phase];ctx.drawImage(paint,-u*w,-v*drawH,w,drawH);}
 else if(sheet){const fw=sheet.width/8,[u,v]=APOIOS_PASSOS_INFECTADO[pose.frame],w=height*.75;ctx.scale(1,1+pose.breath);ctx.drawImage(sheet,pose.frame*fw,0,fw,sheet.height,-u*w,-v*height,w,height);}
 else {ctx.fillStyle='#8e4d83';ctx.fillRect(-8,-34,16,34);}
 ctx.restore();
}
