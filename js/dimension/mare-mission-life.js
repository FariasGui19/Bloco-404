import {cell, canStand, move, waterAt} from './mare-mission-model.js';

import {details} from './mare-mission-details.js';
import {pods} from './mare-mission-combat.js';
export {details};
export function visible(a,b){
 const distance=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(distance/.12));
 for(let i=1;i<steps;i++)if(cell(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
 return true;
}
export function nearestSignal(m,objects){return objects.filter(s=>Math.hypot(s.x-m.x,s.y-m.y)<1.8&&visible(m,s)).sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];}
export function useDetail(m,site){
 if(!site||!nearestSignal(m,[site]))return 'O sinal está atrás de uma parede ou fora de alcance.';
 const flags=m.p.details;
 if((site.id==='radio'||site.id==='sino')&&m.decoy)return 'O sinal-isca ainda está ativo. Deixe o som terminar.';
 if(site.id==='radio'||site.id==='sino'){
   m.decoy={x:site.x,y:site.y,left:12};m.noise=0;
   flags[site.id]=true;return site.id==='radio'?'RÁDIO: “Não foi o mar que levou os passageiros.” Sinal-isca ativo por 12s.':'O sino cobre seus passos. Infectados investigarão o som por 12s.';
 }
 if(flags[site.id])return 'Registro preservado. Este ponto já foi utilizado.';
 flags[site.id]=true;
 if(site.id==='armario'){m.stamina=100;m.stress=Math.max(0,m.stress-35);return 'Reserva local absorvida: fôlego restaurado e tensão reduzida. Inventário global intacto.';}
 if(site.id==='gerador'){m.stress=Math.max(0,m.stress-15);return 'Gerador religado. Luzes de serviço restauradas; Nulo detectou o consumo.';}
 if(site.id==='valvula')return 'Resina drenada na passagem central. A tração foi recuperada.';
 if(site.id==='boia'){m.p.checkpoint='boia';return 'Baliza vinculada: seu eco retornará aqui em caso de colapso.';}
 if(site.id==='retrato')return 'A inscrição diz: “Perdoe quem abriu o portão.” O rosto desaparece quando você se aproxima.';
 return 'A rede guarda etiquetas de embarque do Núcleo X10. A evacuação começou antes do primeiro alarme.';
}
export function terrain(m){
 const cabin=[[5,5,7,6],[6,20,7,7]].some(([x,y,w,h])=>m.x>x+1&&m.x<x+w-1&&m.y>y+1&&m.y<y+h-1);
 if(waterAt(m.x,m.y))return 'agua';
 if(cabin||(m.x>22&&m.y>10&&m.y<22))return 'madeira';
 return !m.p.details.valvula&&m.x>13&&m.x<19&&m.y>8&&m.y<14?'resina':'areia';
}
// Folhas de animação: mundo 3D troca os frames; testes e fallback continuam
// usando enemyArt() para a pose canônica.
export const enemyFamily = (e) => e?.hunter ? 'afogado' : e?.guardian ? 'guardiao' : null;
export function enemyFrame(e, t = 0) {
  if (!enemyFamily(e)) return 0;
  if (e.phase === 'windup' || e.phase === 'strike' || e.phase === 'hurt') return 3;
  if (e.phase === 'stunned' || e.phase === 'dissolve') return 2;
  if (e.phase === 'hunt' || e.phase === 'search' || e.phase === 'rise') {
    return 1 + (Math.floor((Number(t) || 0) * 3.4) % 2);
  }
  return Math.floor((Number(t) || 0) * 1.4) % 2;
}
// Animation mapping shared by renderer and tests.
export function enemyArt(e){
  if(e.hunter) return e.phase==='hurt'||e.phase==='dissolve' ? 'afogado-dano' : 'afogado-mare';
  if(e.guardian) return e.phase==='hurt'||e.phase==='dissolve' ? 'guardiao-dano' : 'guardiao-mare';
  const hit = e.variant==='alto' ? 'infectado-golpe-alto' : 'infectado-golpe-baixo';
  return e.phase==='dissolve'?'infectado-dissolvido'
    :e.phase==='hurt'?'infectado-dano'
    :e.phase==='windup'||e.phase==='strike'?hit
    :e.phase==='stunned'?'infectado-atordoado'
    :e.phase==='rise'||e.phase==='recover'?'infectado-erguendo'
    :e.phase==='listen'?'infectado-escuta'
    :e.phase==='search'?'infectado-busca'
    :'infectado';
}
// Local damage only: the operator's stress is the fail-safe, enemies have HP.
export function hurtEnemy(e, damage=1){
  if(!e||e.dead||e.phase==='dissolve')return null;
  e.hp=Math.max(0,(e.hp??3)-Math.max(0,damage));
  e.waypoint=null;
  if(e.hp<=0){e.phase='dissolve';e.clock=1.15;return 'defeated';}
  e.phase='hurt';e.clock=.45;return 'hurt';
}

// One shared, bounded flow field for both pursuers; never a path search per frame/enemy.
export function createPursuit(){
 const field=new Int16Array(1024),queue=new Int16Array(1024);
 let timer=0,targetKey=-1,track=null,ping=12;
 function rebuild(target){field.fill(-1);const tx=Math.floor(target.x),ty=Math.floor(target.y),start=ty*32+tx;if(start<0||start>=1024)return;
 let head=0,tail=1;queue[0]=start;field[start]=0;
 while(head<tail){const index=queue[head++],x=index%32,y=Math.floor(index/32);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=y+dy,k=b*32+a;if(a<1||b<1||a>=31||b>=31||field[k]!==-1||!canStand(a+.5,b+.5))continue;field[k]=field[index]+1;queue[tail++]=k;}}
 }
 const clear=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.1));for(let j=1;j<=n;j++)if(!canStand(a.x+(b.x-a.x)*j/n,a.y+(b.y-a.y)*j/n))return false;return true;};
 return {field,update(m,enemies,dt,archetype){
   if(m.decoy){m.decoy.left-=dt;if(m.decoy.left<=0)m.decoy=null;}
   // Perception is shared and deliberately fallible: sight + footstep noise + a
   // periodic Nulo "ping" that hints at the player's pattern. Without any of
   // these, the pair patrols and searches instead of omnisciently homing.
   const range=((m.crouched?9:16)+(m.p?.containment?.lanterna?4:0))*(m.lampOn===false?0.6:1);
   let sighted=false,heard=false;
   for(const e of enemies){
     const dist=Math.hypot(m.x-e.x,m.y-e.y);
     if(dist<range&&visible(e,m))sighted=true;
     if(m.noise>0&&dist<(m.noise>.8?7:m.noise>.3?3.5:.9))heard=true;
   }
   if(!m.decoy&&(sighted||heard))track={x:m.x,y:m.y,age:0};
   else if(track){track.age+=dt;if(track.age>13)track=null;}
   ping-=dt;
   if(ping<=0){ping=12;if(!m.decoy)track={x:m.x,y:m.y,age:0};}
   const target=m.decoy??track;
   if(target){timer-=dt;if(timer<=0){rebuild(target);timer=.5;targetKey=Math.floor(target.y)*32+Math.floor(target.x);}}
   for(let i=0;i<enemies.length;i++){
     const e=enemies[i];e.phase??='hunt';e.clock??=0;e.clock=Math.max(0,e.clock-dt);
     if(e.dead){
       if(e.clock<=0){const pod=e.pod??(e.pod=pods[i%pods.length]??{x:16.5,y:28});e.x=pod.x;e.y=pod.y;e.anchor={x:pod.x,y:pod.y};e.dead=false;e.hp=3;e.phase='rise';e.clock=.9;e.waypoint=null;}
       continue;
     }
     if(e.phase==='dissolve'){if(e.clock<=0){e.dead=true;e.clock=30;}continue;}
     if(e.phase==='hurt'){if(e.clock<=0){e.phase='stunned';e.clock=.35;}continue;}
     if(m.ward>0){e.phase='stunned';e.clock=.32;e.waypoint=null;continue;}
     if(e.phase==='stunned'){if(e.clock<=0){e.phase='rise';e.clock=.8;}continue;}
     if(e.phase==='rise'){if(e.clock<=0)e.phase='hunt';continue;}
     const dist=Math.hypot(m.x-e.x,m.y-e.y),sight=dist<range&&visible(e,m);
     if(e.phase==='windup'){if(e.clock<=0){e.phase='strike';e.clock=.22;if(dist<1.55&&visible(e,m))m.stress+=e.hunter?(e.variant==='alto'?18:11):(e.variant==='alto'?26:16);}continue;}
     if(e.phase==='strike'){if(e.clock<=0){e.phase='recover';e.clock=1.15;}continue;}
     if(e.phase==='recover'){if(e.clock<=0)e.phase='hunt';continue;}
     if(e.phase==='listen'){if(e.clock<=0){e.phase='hunt';if(track&&track.age>1.2)track=null;}continue;}
     if(dist<1.25&&sight&&!m.decoy){
       e.variant=dist<.75?'baixo':'alto';e.phase='windup';e.clock=(e.hunter?.36: e.variant==='baixo'?.55:.85);continue;
     }
     const adaptation=archetype==='mare_astral'?.1:archetype==='motor_bio_forja'?.06:0;
     if(!target){
       // Idle patrol around the spawn anchor; no wall-free omniscience.
       e.anchor??={x:e.x,y:e.y};
       const swing=(Number(m.p?.elapsed)||0)*.22+e.anchor.x;
       e.phase='hunt';
       const wx=e.anchor.x+Math.cos(swing)*.9,wy=e.anchor.y+Math.sin(swing*.8)*.7;
       const dx=wx-e.x,dy=wy-e.y,d=Math.hypot(dx,dy)||1;
       if(d>.05)move(e,dx/d*.3*dt,dy/d*.3*dt);
       continue;
     }
     const distTarget=Math.hypot(target.x-e.x,target.y-e.y);
     if(!sighted&&!m.decoy&&distTarget<.9){e.phase='listen';e.clock=1.7;e.waypoint=null;continue;}
     e.phase='search';
     let dest=target;const ex=Math.floor(e.x),ey=Math.floor(e.y),index=ey*32+ex;
     if(!clear(e,target)){
       if(!e.waypoint||Math.hypot(e.x-e.waypoint.x,e.y-e.waypoint.y)<.22||!clear(e,e.waypoint)){
         let best=field[index];e.waypoint={x:ex+.5,y:ey+.5};
         for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=ex+dx,y=ey+dy,v=field[y*32+x],next={x:x+.5,y:y+.5};if(v>=0&&(best<0||v<best)&&clear(e,next)){best=v;e.waypoint=next;}}
       }
       dest=e.waypoint;
     }else e.waypoint=null;
     const dx=dest.x-e.x,dy=dest.y-e.y,d=Math.hypot(dx,dy)||1;
     const speed=(sighted?(m.idle>12?.8:.62):.46)+adaptation+m.noise*.12+(e.hunter?.18:0);
     if(d>.03)move(e,dx/d*speed*dt,dy/d*speed*dt);
   }
   // Loose pursuit spacing: two bodies never occupy the same silhouette.
   for(let i=0;i<enemies.length;i++)for(let j=i+1;j<enemies.length;j++){const a=enemies[i],b=enemies[j];if(a.phase==='stunned'||b.phase==='stunned')continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>0&&d<.55){const push=(.55-d)/2;move(a,-dx/d*push,-dy/d*push);move(b,dx/d*push,dy/d*push);}}
 },get targetKey(){return targetKey;},get track(){return track;}};
}
