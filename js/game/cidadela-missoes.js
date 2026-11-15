// Missões adicionais usam o mesmo questLog do Códex; não substituem a
// missão principal nem dependem do arquétipo selecionado.
import { getQuestState, startQuest, recordQuestEvent } from './quests.js';
import { breachSummary } from './cidadela-fendas.js';

export const CITADEL_REDE = 'cidadela_rede_escuta';
export const CITADEL_VOZES = 'cidadela_vozes_estatica';
const ids=['entrada','galeria','forja'];
export function isCitadelComplete(progress) {
  const f = progress?.flags ?? {};
  return Boolean(
    f.cidadela_estavel
    && f.cidadela_arquivo_origem && f.cidadela_arquivo_retorno && f.cidadela_arquivo_memoria
    && f.cidadela_crt_entrada && f.cidadela_crt_galeria && f.cidadela_crt_forja
    && f.cidadela_eco_entrada && f.cidadela_eco_galeria && f.cidadela_eco_forja
    && f.cidadela_forja_concluida
    && f.cidadela_rede_concluida
    && f.cidadela_vozes_concluida
    && f.cidadela_fendas_concluidas
    && f.cidadela_vigilia_concluida
    && (f.cidadela_rondas_concluidas ?? 0) >= 1
  );
}
export function citadelMissions(progress) {
  const rede=getQuestState(progress,CITADEL_REDE), vozes=getQuestState(progress,CITADEL_VOZES);
  const count=q=>q.objectives.slice(0,3).filter(o=>o.done).length;
  return {rede,vozes,reles:count(rede),registros:count(vozes)};
}
export function missionObjective(progress) {
  const {rede,vozes,reles,registros}=citadelMissions(progress);
  if(rede.status==='available') return 'LOCALIZE A SONDA NA ARENA';
  if(rede.status==='active') return reles<3?`RESTABELEÇA OS RELÉS ${reles}/3`:'VOLTE À SONDA';
  if(vozes.status==='available') return 'EXAMINE O TRANSMISSOR';
  if(vozes.status==='active') return registros<3?`OUÇA AS CAIXAS ${registros}/3`:'VOLTE AO TRANSMISSOR';
  const fendas=breachSummary(progress);
  return fendas.caches<3 ? `FENDAS ${fendas.sealed}/3 • COFRES ${fendas.caches}/3 • RADAR [R]` : 'REDE VIVA • EXPLORE A CIDADELA';
}
// Devolve feedback ao chamador, que salva somente quando mudou o questLog.
export function interactCitadelMission(progress,target) {
  const {rede,vozes,reles,registros}=citadelMissions(progress);
  if(target.kind==='probe') {
    if(rede.status==='available') {
      startQuest(progress,CITADEL_REDE);
      return {changed:true,message:'NEXO: RESTAURE TRÊS RELÉS. USE O RADAR [R] E O DIÁRIO [J].'};
    }
    if(rede.status==='active' && reles===3) {
      const [done]=recordQuestEvent(progress,{type:'cidadela_relato',target:'rede'});
      return {changed:true,message:`REDE RESTAURADA • +${done?.rewards?.xp ?? 0} XP. EXAMINE O TRANSMISSOR.`};
    }
    if(rede.status==='active') return {message:`NEXO: RELÉS RESTAURADOS ${reles}/3. A LINHA DE RETORNO ESTÁ SEGURA.`};
    const archTip = {
      mare_astral: 'MARÉ ASTRAL ESTÁ EM HARMONIA COM A CIDADELA.',
      nucleo_dez_forma: 'VETORES DO NÚCLEO X10 SEM DESVIO TEMPORAL.',
      lamina_dominio_anciao: 'SELO DO DOMÍNIO ANCIÃO EM SINCRONIA COM O REATOR.',
      motor_bio_forja: 'CHASSI BIO-FORJA INTEGRADO À OFICINA DA VIGÍLIA.',
    }[progress?.archetype] ?? 'SISTEMA ESTABILIZADO.';
    return {message:progress?.flags?.cidadela_100_porcento
      ? `NEXO: CIDADELA 404 100% ESTABILIZADA. ATÉ OS ECOS DO SETOR E1M1 SILENCIARAM. ${archTip}`
      : `NEXO: A REDE RESPIRA. O TRANSMISSOR PODE REUNIR AS VOZES. ${archTip}`};
  }
  if(target.kind==='relay') {
    if(rede.status==='available') return {message:'RELÉ INATIVO. A SONDA NA ARENA PODE ORIENTAR O REPARO.'};
    const i=ids.indexOf(target.id);
    if(i<0 || rede.objectives[i].done) return {message:`RELÉ ${target.label}: SINCRONIZADO.`};
    recordQuestEvent(progress,{type:'cidadela_rele',target:target.id});
    return {changed:true,message:`RELÉ ${target.label}: RESTAURADO. ${reles+1}/3 • DIÁRIO [J].`};
  }
  if(target.kind==='transmitter') {
    if(rede.status!=='completed') return {message:'TRANSMISSOR: AGUARDE A REDE DE ESCUTA FICAR ESTÁVEL.'};
    if(vozes.status==='available') {
      startQuest(progress,CITADEL_VOZES);
      return {changed:true,message:'NEXO: RECOLHA TRÊS CAIXAS DE REGISTRO E VOLTE AQUI.'};
    }
    if(vozes.status==='active' && registros===3) {
      const [done]=recordQuestEvent(progress,{type:'cidadela_relato',target:'vozes'});
      return {changed:true,message:`TRANSMISSÃO COMPLETA • +${done?.rewards?.xp ?? 0} XP. IDENTIDADE AINDA INCERTA.`};
    }
    if(vozes.status==='active') return {message:`TRANSMISSOR: CAIXAS RECUPERADAS ${registros}/3. VEJA O RADAR [R].`};
    return {message:progress?.flags?.cidadela_segredo_e1m1
      ? 'TRANSMISSOR: A MENSAGEM FOI ENVIADA. O SINAL DE E1M1 FICOU APENAS NA MEMÓRIA DA ESTAÇÃO.'
      : 'TRANSMISSOR: A MENSAGEM FOI ENVIADA. A RESPOSTA AINDA NÃO TEM NOME.'};
  }
  if(target.kind==='recording') {
    if(vozes.status==='available') return {message:'CAIXA EM SILÊNCIO. O TRANSMISSOR DA ARENA PODE DECODIFICÁ-LA.'};
    const i=ids.indexOf(target.id);
    if(i<0) return {message:'REGISTRO INDISPONÍVEL.'};
    const fresh=!vozes.objectives[i].done;
    if(fresh) recordQuestEvent(progress,{type:'cidadela_registro',target:target.id});
    return {changed:fresh,message:`${target.label}: ${target.log}`};
  }
  return null;
}
