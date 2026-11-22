import { canStandAt } from './collision.js';
import { damagePlayer } from './health.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function criarAmeacaCromatica(map) {
  const ponto = map?.id==='mare_cromatica_docas' ? {x:965*2.5/64,y:215*2.5/22,raio:10} : map?.meta?.docasInterior ? {x:6.5,y:4.5,raio:3} : map?.id==='mare_cromatica_superficie' ? {x:25.5,y:44.5,raio:6} : map?.id==='mare_cromatica_contencao' ? {x:15.5,y:3.5,raio:7} : null;
  return ponto ? { ponto, visto:false, visao:null } : null;
}
// Telegráfico e limitado: dois inimigos colocados no mapa, sem spawns
// infinitos. Retornar ao mapa reinicia o encontro; nunca dá XP de treino.
export function atualizarAmeacasCromaticas(map, runtime, targets, player, progress, dt, stand=canStandAt, hit=damagePlayer) {
  if(!map?.meta?.cromatica || !runtime || !player) return {perto:false};
  dt=clamp(Number.isFinite(dt)?dt:0,0,.1);
  if(runtime.visao) {runtime.visao.tempo-=dt;if(runtime.visao.tempo<=0)runtime.visao=null;}
  const anchor=runtime.ponto;
  const distance=Math.hypot(player.x-anchor.x,player.y-anchor.y);
  if(!runtime.visto && distance<anchor.raio && distance>2) {
    runtime.visto=true;runtime.visao={x:anchor.x,y:anchor.y,tempo:3.5,renderType:'cromaticaVisao'};
  }
  let perto=false;
  const lineClear = (e) => {
    const dx=player.x-e.x,dy=player.y-e.y, steps=Math.ceil(Math.hypot(dx,dy)/.2);
    for(let i=1;i<steps;i++) if(!stand(map,e.x+dx*i/steps,e.y+dy*i/steps,.08,e))return false;
    return true;
  };
  const freeStep=(e,x,y)=>stand(map,x,y,.22,e)&&(targets??[]).every(other=>other===e||!other.cromaticaEnemy||other.health<=0||Math.hypot(x-other.x,y-other.y)>=.44);
  for(const e of targets ?? []) {
    if(!e.cromaticaEnemy)continue;
    if(e.health<=0){
      if(progress?.mareCromatica?.desfecho==='total'){e.deathVisual=0;continue;}
      if(!e.deathInitialized){e.deathInitialized=true;e.deathVisual=.8;}
      else e.deathVisual=Math.max(0,(e.deathVisual??0)-dt);
      continue;
    }
    if(progress?.mareCromatica?.desfecho==='total') {e.health=0;continue;}
    e.cromaticaMovendo=false;
    e.alertVisual=Math.max(0,(e.alertVisual??0)-dt);
    e.attackVisual=Math.max(0,(e.attackVisual??0)-dt);
    e.clock=(e.clock??0)+dt;e.cooldown=Math.max(0,(e.cooldown??0)-dt);
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
    if(dist<6) {if(!e.alertSeen){e.alertSeen=true;e.alertVisual=.4;}perto=true;if(Math.abs(dx)>.05)e.cromaticaFaceDireita=map.meta.sideView?dx>0:dx-dy>0;}
    // A entrada da contenção é um respiro seguro e evita dano durante a transição.
    if(map.id==='mare_cromatica_contencao' && player.x<3.4) {e.windup=0;continue;}
    if(e.windup>0) {
      e.windup=Math.max(0,e.windup-dt);
      if(!e.windup) {if(dist<1.3 && lineClear(e)) hit(player,progress,8,'infectado_cromatico');e.cooldown=2.3;e.attackVisual=.25;}
      continue;
    }
    if(dist<1.1 && e.cooldown<=0 && lineClear(e)) {e.windup=.65;continue;}
    if(dist>6 || dist<.95 || dist<.001) continue;
    const speed=.78, vx=dx/dist*speed*dt,vy=dy/dist*speed*dt;
    const xAnterior=e.x,yAnterior=e.y;
    if(freeStep(e,e.x+vx,e.y)) e.x+=vx;
    if(freeStep(e,e.x,e.y+vy)) e.y+=vy;
    if(Math.hypot(e.x-xAnterior,e.y-yAnterior)<.00001){
      for(const angle of [Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2]){
        const sx=vx*Math.cos(angle)-vy*Math.sin(angle),sy=vx*Math.sin(angle)+vy*Math.cos(angle);
        let clear=true;for(let k=1;k<=3;k++)if(!freeStep(e,e.x+sx*k/3,e.y+sy*k/3)){clear=false;break;}
        if(clear){e.x+=sx;e.y+=sy;break;}
      }
    }
    e.cromaticaMovendo=Math.hypot(e.x-xAnterior,e.y-yAnterior)>.00001;
    e.flip=dx-dy>0;
  }
  return {perto};
}
