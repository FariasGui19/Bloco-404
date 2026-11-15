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
  const archLore = {
    mare_astral: 'A corrente da Maré Astral lê os ecos sem distorcer a linha.',
    nucleo_dez_forma: 'Os vetores do Núcleo X10 estabilizam o intervalo de 3s.',
    lamina_dominio_anciao: 'O selo do Domínio Ancião reconhece a guarda do Vigilante.',
    motor_bio_forja: 'A blindagem Bio-Forja ressoa com as comportas da Oficina.',
  }[progress?.archetype] ?? '';
  let out = null;
  if(target.kind==='probe') {
    if(rede.status==='available') {
      startQuest(progress,CITADEL_REDE);
      out = {changed:true,message:'NEXO: RESTAURE TRÊS RELÉS. USE O RADAR [R] E O DIÁRIO [J].'};
    } else if(rede.status==='active' && reles===3) {
      const [done]=recordQuestEvent(progress,{type:'cidadela_relato',target:'rede'});
      out = {changed:true,missionDone:true,message:`REDE RESTAURADA • +${done?.rewards?.xp ?? 0} XP. EXAMINE O TRANSMISSOR. ${archLore}`};
    } else if(rede.status==='active') out = {message:`NEXO: RELÉS RESTAURADOS ${reles}/3. A LINHA DE RETORNO ESTÁ SEGURA.`};
    else {
      const archTip = {
        mare_astral: 'MARÉ ASTRAL ESTÁ EM HARMONIA COM A CIDADELA.',
        nucleo_dez_forma: 'VETORES DO NÚCLEO X10 SEM DESVIO TEMPORAL.',
        lamina_dominio_anciao: 'SELO DO DOMÍNIO ANCIÃO EM SINCRONIA COM O REATOR.',
        motor_bio_forja: 'CHASSI BIO-FORJA INTEGRADO À OFICINA DA VIGÍLIA.',
      }[progress?.archetype] ?? 'SISTEMA ESTABILIZADO.';
      out = {message:progress?.flags?.cidadela_100_porcento
        ? `NEXO: CIDADELA 404 100% ESTABILIZADA. ATÉ OS ECOS DO SETOR E1M1 SILENCIARAM. ${archTip}`
        : `NEXO: A REDE RESPIRA. O TRANSMISSOR PODE REUNIR AS VOZES. ${archTip}`};
    }
  }
  else if(target.kind==='relay') {
    if(rede.status==='available') out = {message:'RELÉ INATIVO. A SONDA NA ARENA PODE ORIENTAR O REPARO.'};
    else {
      const i=ids.indexOf(target.id);
      if(i<0 || rede.objectives[i].done) out = {message:`RELÉ ${target.label}: SINCRONIZADO.`};
      else {
        recordQuestEvent(progress,{type:'cidadela_rele',target:target.id});
        out = {changed:true,kind:'relay',message:`RELÉ ${target.label}: RESTAURADO. ${reles+1}/3 • DIÁRIO [J].`};
      }
    }
  }
  else if(target.kind==='transmitter') {
    if(rede.status!=='completed') out = {message:'TRANSMISSOR: AGUARDE A REDE DE ESCUTA FICAR ESTÁVEL.'};
    else if(vozes.status==='available') {
      startQuest(progress,CITADEL_VOZES);
      out = {changed:true,message:'NEXO: RECOLHA TRÊS CAIXAS DE REGISTRO E VOLTE AQUI.'};
    }
    else if(vozes.status==='active' && registros===3) {
      const [done]=recordQuestEvent(progress,{type:'cidadela_relato',target:'vozes'});
      out = {changed:true,missionDone:true,message:`TRANSMISSÃO COMPLETA • +${done?.rewards?.xp ?? 0} XP. IDENTIDADE AINDA INCERTA. ${archLore}`};
    }
    else if(vozes.status==='active') out = {message:`TRANSMISSOR: CAIXAS RECUPERADAS ${registros}/3. VEJA O RADAR [R].`};
    else out = {message:progress?.flags?.cidadela_segredo_e1m1
      ? 'TRANSMISSOR: A MENSAGEM FOI ENVIADA. O SINAL DE E1M1 FICOU APENAS NA MEMÓRIA DA ESTAÇÃO.'
      : 'TRANSMISSOR: A MENSAGEM FOI ENVIADA. A RESPOSTA AINDA NÃO TEM NOME.'};
  }
  else if(target.kind==='recording') {
    if(vozes.status==='available') out = {message:'CAIXA EM SILÊNCIO. O TRANSMISSOR DA ARENA PODE DECODIFICÁ-LA.'};
    else {
      const i=ids.indexOf(target.id);
      if(i<0) out = {message:'REGISTRO INDISPONÍVEL.'};
      else {
        const fresh=!vozes.objectives[i].done;
        if(fresh) recordQuestEvent(progress,{type:'cidadela_registro',target:target.id});
        out = {changed:fresh,kind:'recording',message:`${target.label}: ${target.log}`};
      }
    }
  }
  if(out && isCitadelComplete(progress) && !progress.flags?.cidadela_100_porcento) {
    progress.flags ??= {};
    progress.flags.cidadela_100_porcento = true;
    out.changed = true;
  }
  return out;
}
