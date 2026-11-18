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
  for(const e of targets ?? []) {
    if(!e.cromaticaEnemy || e.health<=0) continue;
    if(progress?.mareCromatica?.desfecho==='total') {e.health=0;continue;}
    e.clock=(e.clock??0)+dt;e.cooldown=Math.max(0,(e.cooldown??0)-dt);
    const dx=player.x-e.x,dy=player.y-e.y,dist=Math.hypot(dx,dy);
    if(dist<6) perto=true;
    // A entrada da contenção é um respiro seguro e evita dano durante a transição.
    if(map.id==='mare_cromatica_contencao' && player.x<3.4) {e.windup=0;continue;}
    if(e.windup>0) {
      e.windup=Math.max(0,e.windup-dt);
      if(!e.windup) {if(dist<1.3 && lineClear(e)) hit(player,progress,8,'infectado_cromatico');e.cooldown=2.3;}
      continue;
    }
    if(dist<1.1 && e.cooldown<=0 && lineClear(e)) {e.windup=.65;continue;}
    if(dist>6 || dist<.95 || dist<.001) continue;
    const speed=.78, vx=dx/dist*speed*dt,vy=dy/dist*speed*dt;
    if(stand(map,e.x+vx,e.y,.22,e)) e.x+=vx;
    if(stand(map,e.x,e.y+vy,.22,e)) e.y+=vy;
    e.flip=dx-dy>0;
  }
  return {perto};
}
