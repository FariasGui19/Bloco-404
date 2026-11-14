// Leituras opcionais independentes da vitória; flag e questLog persistem,
// enquanto recarga do terminal e janela do radar pertencem apenas à visita.
import { CITADEL_ECHOES } from '../data/worlds/cidadela-404/cidadela.js';
import { getQuestState,startQuest,recordQuestEvent } from './quests.js';
const QUEST='cidadela_ecos_entre_tempos';
// Cada operador interpreta as mesmas evidências sem transformar suspeita em
// identidade confirmada. São leituras curtas, não substituem o registro relível.
const READINGS=Object.freeze({
  mare_astral:['MARÉ: A CORRENTE CARREGA O RETORNO ANTES DO PEDIDO.', 'MARÉ: A ONDA FOI ABRIGADA, MAS NÃO SABEMOS POR QUEM.', 'MARÉ: A RESPOSTA SOBREVIVEU À RETIRADA. ESCUTE O INTERVALO.'],
  nucleo_dez_forma:['NÚCLEO: A ROTA DE SAÍDA FOI CALCULADA ANTES DA EMISSÃO.', 'NÚCLEO: O CANAL FOI PROTEGIDO; A ASSINATURA CONTINUA AUSENTE.', 'NÚCLEO: O REATOR EMITIA APÓS A RETIRADA. NÃO É PROVA DE ORIGEM.'],
  lamina_dominio_anciao:['DOMÍNIO: A LINHA DE RETORNO FOI TESTADA ANTES DO PEDIDO.', 'DOMÍNIO: DEFENDERAM UMA LINHA, NÃO UM ROSTO.', 'DOMÍNIO: ALGUÉM MANTEVE A POSIÇÃO OU DEIXOU UMA ROTINA ATIVA.'],
  motor_bio_forja:['BIO-FORJA: A LINHA FOI PRESERVADA ANTES DA EMERGÊNCIA.', 'BIO-FORJA: O CANAL NÃO TEM ASSINATURA VITAL CONFIÁVEL.', 'BIO-FORJA: HÁ SINAL APÓS A RETIRADA, MAS NÃO SABEMOS SE HÁ VIDA.'],
});
export function memoryEchoCount(progress) {
  return CITADEL_ECHOES.filter(e=>progress.flags?.[e.flag]).length;
}
export function interactMemoryEcho(progress,echo,radarActive) {
  const known=CITADEL_ECHOES.find(e=>e.id===echo?.id);
  if(!known) return {changed:false,message:'SINAL INDISPONÍVEL.'};
  const flags=progress.flags ??= {};
  if(flags[known.flag]) return {changed:false,message:`ECO ${known.label}: ${known.log}`};
  if(!radarActive) return {changed:false,message:'ECO INSTÁVEL • USE [R] PERTO DELE, DEPOIS [E] ENQUANTO O RADAR ESTIVER ATIVO.'};
  if(getQuestState(progress,QUEST).status==='available') startQuest(progress,QUEST);
  flags[known.flag]=true;
  const completed=recordQuestEvent(progress,{type:'cidadela_eco_memoria',target:known.id});
  const index=CITADEL_ECHOES.findIndex(e=>e.id===known.id);
  return {changed:true,message:`ECO ${known.label}: ${known.log}`,reading:(READINGS[progress.archetype] ?? READINGS.motor_bio_forja)[index],followup:completed.length?`NEXO: TRÊS ECOS EM FASE • +${completed[0].rewards?.xp ?? 0} XP. TERMINAL DE ESCUTA ATIVO NA ENTRADA.`:null};
}
export function useEchoTerminal(progress,g,p) {
  const count=memoryEchoCount(progress);
  if(count<3) return {message:`TERMINAL DE ESCUTA • ECOS ${count}/3. USE [R] E [E] NOS ECOS.`};
  if(g.echoTerminalCooldown>0) return {message:`TERMINAL RECARREGANDO • ${Math.ceil(g.echoTerminalCooldown)}s.`};
  const energy=p.energy ?? 0, max=p.maxEnergy ?? 100;
  const restored=Math.max(0,Math.min(25,max-energy));
  const reduced=Math.min(35,g.echo);
  if(!restored && !reduced) return {message:'TERMINAL PRONTO • ENERGIA CHEIA E ECO EM SILÊNCIO.'};
  p.energy=energy+restored;g.echo=Math.max(0,g.echo-reduced);g.echoTerminalCooldown=45;
  return {message:`ESCUTA ESTÁVEL • +${Math.round(restored)} ENERGIA • -${Math.round(reduced)} ECO. RECARGA 45s.`};
}
