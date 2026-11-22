// Combates opcionais pós-vitória. Apenas fendas seladas e cofres abertos são
// persistentes; tentativas, ondas e projéteis pertencem à visita atual.
import { CITADEL_BREACHES } from '../data/worlds/cidadela-404/cidadela.js';
import { startQuest, recordQuestEvent, getQuestState } from './quests.js';
import { grantArchetypeXp } from './rpg.js';
export const BREACH_QUEST='cidadela_fendas_residuais';
export const sealedFlag = id=>`cidadela_fenda_${id}_selada`;
export const cacheFlag = id=>`cidadela_cofre_${id}_aberto`;
export function breachSummary(progress) {
  const flags=progress.flags ?? {};
  return {sealed:CITADEL_BREACHES.filter(b=>flags[sealedFlag(b.id)]).length,
    caches:CITADEL_BREACHES.filter(b=>flags[cacheFlag(b.id)]).length,
    quest:getQuestState(progress,BREACH_QUEST)};
}
export function beginBreach(g,progress,breach) {
  if(progress.flags[sealedFlag(breach.id)]) return {message:`FENDA ${breach.label}: SELADA. O COFRE PODE SER ABERTO.`};
  if(g.training) return {message:'ENCERRE A SIMULAÇÃO NA ARENA ANTES DE INICIAR UMA FENDA.'};
  if(g.breach) {
    if(g.breach.id!==breach.id) return {message:'OUTRA FENDA ESTÁ ATIVA. RETORNE A ELA PARA CANCELAR.'};
    cancelBreach(g);return {message:'FENDA INTERROMPIDA. NENHUMA RECOMPENSA FOI PERDIDA.'};
  }
  const started=getQuestState(progress,BREACH_QUEST).status==='available';
  if(started) startQuest(progress,BREACH_QUEST);
  g.breach={id:breach.id,wave:1,pulse:4,windup:0,prep:2};
  return {changed:started,message:`FENDA ${breach.label}: ONDA 1/2. [E] NA FENDA CANCELA.`};
}
function spawnBreachWave(g,breach,wave,p,canSpawn) {
  const types=wave===1?['imp','orb']:['echo','imp','orb'];
  // Evita nascer sobre o operador ou dentro de uma parede; se o operador
  // ocupar um ponto, há reservas na mesma sala. A onda aguarda se necessário.
  const candidates=[...breach.spawns,...[[-2,-2],[-2,0],[-2,2],[0,-2],[0,2],[2,-2],[2,0],[2,2]].map(([x,y])=>[breach.x+x,breach.y+y])];
  const chosen=[];
  for(const [x,y] of candidates) {
    if(x<=breach.bounds[0] || x>=breach.bounds[1] || Math.hypot(x-p.x,y-p.y)<1.4 || !canSpawn(x,y) || chosen.some(([a,b])=>Math.hypot(a-x,b-y)<.75)) continue;
    chosen.push([x,y]);if(chosen.length===types.length) break;
  }
  if(chosen.length<types.length) return false;
  types.forEach((type,i)=>{
    const [x,y]=chosen[i];
    g.enemies.push({type,x,y,hp:type==='orb'?75:type==='echo'?42:55,cooldown:2+i*.45,slow:0,breach:breach.id});
  });
  return true;
}
export function cancelBreach(g) {
  if(!g.breach) return;
  const id=g.breach.id;
  g.enemies=g.enemies.filter(e=>e.breach!==id);g.shots=g.shots.filter(s=>s.breach!==id);
  g.breach=null;
}
// Chamada depois de atualizar os inimigos. O pulso é projetado pelo chamador
// usando a mesma física e bloqueio por paredes dos demais projéteis.
export function updateBreach(g,progress,dt,p,canSpawn,canPulse,shoot) {
  if(!g.breach) return null;
  const b=g.breach, spec=CITADEL_BREACHES.find(o=>o.id===b.id);
  if(!spec) {cancelBreach(g);return null;}
  if(b.prep>0) {
    b.prep=Math.max(0,b.prep-dt);
    if(b.prep===0 && !spawnBreachWave(g,spec,b.wave,p,canSpawn)) b.prep=.5;
    return null;
  }
  if(!g.enemies.some(e=>e.breach===b.id && e.hp>0)) {
    if(b.wave===1) { b.wave=2;b.pulse=4;b.windup=0;b.prep=2;return {message:'FENDA: ONDA 2/2 • O PREDADOR RESPONDE AO SINAL.'}; }
    progress.flags[sealedFlag(b.id)]=true;
    recordQuestEvent(progress,{type:'cidadela_fenda',target:b.id});
    g.shots=g.shots.filter(s=>s.breach!==b.id);g.breach=null;
    return {changed:true,message:`FENDA ${spec.label} SELADA. ABRA O COFRE PRÓXIMO.`};
  }
  if(!canPulse(spec)) {b.windup=0;b.pulse=Math.max(b.pulse,1.5);return null;}
  if(b.windup>0) {
    b.windup=Math.max(0,b.windup-dt);
    if(b.windup===0) {shoot(spec);b.pulse=5;}
  } else {
    b.pulse=Math.max(0,b.pulse-dt);
    if(b.pulse===0) {b.windup=1;return {message:'FENDA: PULSO EM PREPARAÇÃO • DESVIE OU BUSQUE COBERTURA.'};}
  }
  return null;
}
export function openBreachCache(progress,breach) {
  const flags=progress.flags;
  if(!flags[sealedFlag(breach.id)]) return {message:'COFRE BLOQUEADO • SELE A FENDA DESTE SETOR.'};
  if(flags[cacheFlag(breach.id)]) return {message:`COFRE ${breach.label}: REGISTRO JÁ RECUPERADO.`};
  flags[cacheFlag(breach.id)]=true;
  const reward=grantArchetypeXp(progress,20);
  const completed=recordQuestEvent(progress,{type:'cidadela_cofre',target:breach.id});
  return {changed:true,message:`COFRE ${breach.label}: +${reward.gained} XP${completed.length?' • FENDAS RESIDUAIS CONCLUÍDA':''}.`};
}
