// Circuitos da oficina: ciclo legível, sem portas que prendem o operador.
// Só a regulação e a missão são persistentes; fase e imunidade são da visita.
import { CITADEL_WORKSHOP } from '../data/worlds/cidadela-404/cidadela.js';
import { getQuestState,startQuest,recordQuestEvent } from './quests.js';
const QUEST='cidadela_oficina_vigilia';
export function workshopPhase(time,offset=0) {
  const t=((time+offset)%5+5)%5;
  return t<3?'safe':t<4?'warning':'active';
}
export function workshopCount(progress) {
  return CITADEL_WORKSHOP.switches.filter(s=>progress.flags?.[s.flag]).length;
}
export function interactWorkshop(progress,target,time) {
  if(!progress.flags?.cidadela_estavel) return {changed:false,message:'OFICINA INACESSÍVEL ATÉ O REATOR ESTABILIZAR.'};
  const flags=progress.flags;
  if(target.kind==='workshop_switch') {
    const spec=CITADEL_WORKSHOP.switches.find(s=>s.id===target.id);
    if(!spec) return {changed:false,message:'CIRCUITO INDISPONÍVEL.'};
    if(flags[spec.flag]) return {changed:false,message:`${spec.label}: ${spec.log}`};
    if(workshopPhase(time,spec.offset)!=='safe') return {changed:false,message:'CIRCUITO ENERGIZADO • AGUARDE A JANELA SEGURA PARA REGULAR [E].'};
    if(getQuestState(progress,QUEST).status==='available') startQuest(progress,QUEST);
    flags[spec.flag]=true;
    recordQuestEvent(progress,{type:'cidadela_vigilia_controle',target:spec.id});
    const count=workshopCount(progress);
    return {changed:true,message:`${spec.label}: ${spec.log}`,followup:count===3?'NEXO: TRÊS CIRCUITOS REGULADOS. CONFIRME NO TERMINAL DA OFICINA.':`NEXO: CIRCUITO REGULADO ${count}/3. O EMISSOR DESTE SETOR SILENCIOU.`};
  }
  if(target.kind==='workshop_terminal') {
    const count=workshopCount(progress);
    if(count<3) return {changed:false,message:`OFICINA: ${count}/3 CIRCUITOS. AGUARDE JANELA SEGURA E USE [E].`};
    if(getQuestState(progress,QUEST).status==='completed') return {changed:false,message:'OFICINA: A LINHA DE RETORNO FOI CUIDADA POR MÃOS QUE NÃO DEIXARAM NOME.'};
    const [done]=recordQuestEvent(progress,{type:'cidadela_vigilia_relato',target:'terminal'});
    if(!done) return {changed:false,message:'OFICINA: REGISTRO INCOMPLETO. VERIFIQUE OS CIRCUITOS.'};
    return {changed:true,message:`OFICINA RESTAURADA • +${done.rewards?.xp ?? 0} XP • NÚCLEO DE VIGÍLIA ATIVO.`,followup:'NEXO: A OFICINA GUARDAVA UMA ROTA DE RETORNO. A SENTINELA PODE PROPOR UM ENSAIO.'};
  }
  return null;
}

// Depois da restauração, o robô oferece um ensaio inteiramente opcional.
// O circuito da visita é separado das flags e nunca emite eventos de XP.
export function workshopCircuitActive(progress,g,control) {
  return g.workshopTrial ? !g.workshopTrial.done.includes(control.id) : !progress.flags?.[control.flag];
}
export function toggleWorkshopTrial(progress,g) {
  if(!progress.flags?.cidadela_vigilia_concluida) return {message:'SENTINELA EM ESPERA • RESTAURE A OFICINA NO TERMINAL.'};
  if(g.workshopTrial) {g.workshopTrial=null;return {message:'ENSAIO ENCERRADO • A OFICINA CONTINUA RESTAURADA.'};}
  if(g.breach || g.training) return {message:'ENCERRE A FENDA OU A SIMULAÇÃO ANTES DO ENSAIO.'};
  g.workshopTrial={done:[]};
  return {message:'SENTINELA: ENSAIO OPCIONAL • REGULE OS TRÊS CIRCUITOS. [E] AQUI CANCELA. SEM XP REPETÍVEL.'};
}
export function interactWorkshopTrial(g,target,time) {
  const control=CITADEL_WORKSHOP.switches.find(s=>s.id===target?.id);
  if(!g.workshopTrial || !control) return null;
  if(g.workshopTrial.done.includes(control.id)) return {message:`ENSAIO: ${control.label} JÁ REGULADA.`};
  if(workshopPhase(time,control.offset)!=='safe') return {message:'ENSAIO: AGUARDE A JANELA SEGURA PARA REGULAR [E].'};
  g.workshopTrial.done.push(control.id);
  const count=g.workshopTrial.done.length;
  if(count===3) {g.workshopTrial=null;return {message:'ENSAIO CONCLUÍDO • CIRCUITOS EM SILÊNCIO. SEM XP REPETÍVEL.'};}
  return {message:`ENSAIO • CIRCUITO ${control.label} REGULADO ${count}/3.`};
}
