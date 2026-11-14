import { getQuestState,startQuest,recordQuestEvent } from './quests.js';
import { CITADEL_NULL_MONITORS } from '../data/worlds/cidadela-404/cidadela.js';

const QUEST='cidadela_transmissoes_crt';
const RESPONSE=Object.freeze({
  mare_astral:'MARÉ: O PULSO LEMBRA A RESPOSTA DA ENSEADA. NÃO SABEMOS QUEM ENVIOU.',
  nucleo_dez_forma:'NÚCLEO: O GESTO SE REPETE COM UM ATRASO. A ORIGEM NÃO FOI LOCALIZADA.',
  lamina_dominio_anciao:'DOMÍNIO: NÃO HÁ ATAQUE. A FIGURA OBSERVA SEM ATRAVESSAR A TELA.',
  motor_bio_forja:'BIO-FORJA: NÃO HÁ LEITURA VITAL CONFIÁVEL. NÃO CHAME ISSO DE PROVA.',
});
// Fragmentos opcionais do sinal, sem atribuir a transmissão a uma pessoa.
// A leitura é acrescentada ao rádio existente e não cria recompensa ou flag.
const SIGNAL_FRAGMENTS=Object.freeze({
  entrada:'SINAL SEM ORIGEM: A LINHA DE RETORNO PERMANECE.',
  galeria:'SINAL SEM ORIGEM: A RESPOSTA CHEGOU ANTES DO PEDIDO.',
  forja:'SINAL SEM ORIGEM: NÃO DESLIGUE O REATOR.',
});
// Leituras complementares dos arquivos: observações, não provas de autoria.
const ARCHIVE_CONTEXT=Object.freeze({
  origem:'NEXO: A ORDEM DO PEDIDO E DA RESPOSTA NÃO É COMUM. A CAUSA SEGUE INCERTA.',
  retorno:'NEXO: IMPULSOS E RADAR ELEVAM A RESSONÂNCIA. A ROTA DE VOLTA SEGUE ABERTA.',
  memoria:'NEXO: A FIGURA FOI REGISTRADA, MAS O SINAL NÃO IDENTIFICA QUEM O ENVIOU.',
});
export function archiveContext(id) { return ARCHIVE_CONTEXT[id] ?? ''; }
export function crtSignalFragment(id) { return SIGNAL_FRAGMENTS[id] ?? ''; }
export function crtCount(progress) {return CITADEL_NULL_MONITORS.filter(m=>progress.flags?.[m.flag]).length;}
export function inspectCitadelMonitor(progress,monitor) {
  const flags=progress.flags ??= {};
  const fresh=!flags[monitor.flag];
  if(fresh) {
    if(getQuestState(progress,QUEST).status==='available') startQuest(progress,QUEST);
    flags[monitor.flag]=true;
    const completed=recordQuestEvent(progress,{type:'cidadela_crt',target:monitor.id});
    return {changed:true,message:`CRT ${monitor.label}: ${monitor.log}`,
      followup:completed.length?`NEXO: TRÊS SINAIS REGISTRADOS • +${completed[0].rewards?.xp ?? 0} XP. IDENTIDADE INDEFINIDA.`:(RESPONSE[progress.archetype] ?? RESPONSE.motor_bio_forja)};
  }
  return {changed:false,message:`CRT ${monitor.label}: ${monitor.log}`,followup:RESPONSE[progress.archetype] ?? RESPONSE.motor_bio_forja};
}
// Leituras na travessia surgem após a confirmação de cada registro, sem
// interromper o combate nem ocupar o canal do objetivo imediato.
export const ARCHETYPE_READINGS=Object.freeze({
  mare_astral: ['MARÉ: A CORRENTE CHEGA ANTES DO PEDIDO. A ÂNCORA DE ORIGEM AINDA RESPONDE.', 'MARÉ: UM ECO CONTRA A CORRENTE. MANTENHA A ÂNCORA DE RETORNO.', 'MARÉ: A MEMÓRIA NÃO DIZ QUEM PEDIU SOCORRO. O REATOR ESTÁ PRÓXIMO.'],
  nucleo_dez_forma: ['NÚCLEO: O VETOR DE RESPOSTA ANTECEDE A ORIGEM. NÃO É UMA ROTA COMUM.', 'NÚCLEO: O RETORNO SEGUE VÁLIDO. O ECHOVORE APRENDE COM O RADAR.', 'NÚCLEO: O REGISTRO NÃO IDENTIFICA O EMISSOR. PROCURE O REATOR.'],
  lamina_dominio_anciao: ['DOMÍNIO: A ORIGEM AINDA SUSTENTA A LINHA. MANTENHA A POSTURA.', 'DOMÍNIO: HÁ PRESSÃO SOBRE O RETORNO. O ECHOVORE REAGE À RUPTURA.', 'DOMÍNIO: A MEMÓRIA NÃO É TESTEMUNHO DE IDENTIDADE. SIGA AO REATOR.'],
  motor_bio_forja: ['BIO-FORJA: O SINAL DE ORIGEM RESISTE. A BLINDAGEM RESPONDE AO AMBIENTE.', 'BIO-FORJA: O RETORNO ESTÁ INTEIRO. O ECHOVORE PODE ROMPER O ESCUDO.', 'BIO-FORJA: MEMÓRIA SEM ASSINATURA BIOLÓGICA. O REATOR EXIGE ATENÇÃO.'],
});
