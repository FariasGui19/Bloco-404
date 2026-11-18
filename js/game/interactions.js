import { healPlayer } from './health.js';
import { iniciarTravessiaNeblina } from '../ui/travessia-neblina.js';
// js/game/interactions.js
// =====================================================================
// INTERACTIONS
//
// Detecta portais, NPCs, objetos e coletáveis interativos.
// =====================================================================

import { state } from './state.js';
import { usePortal, isPortalLocked } from './portals.js';
import { openDialogue, isDialogueOpen } from '../ui/dialogue.js';
import { startActorTalking, stopActorTalking } from './actors.js';
import { openElevatorMenu } from '../ui/elevator-menu.js';
import { saveGame } from './save.js';
import { startNexoOnboarding } from './onboarding.js';
import { getNearestCollectible, getCollectiblePrompt, collectItem } from './collectibles.js';
import { checkGate, getGateFailureMessage, getGateSuccessMessage, isGateOpen, openGate } from './gates.js';
import { recordQuestEvent, startQuest } from './quests.js';
import { iniciarMareCromatica, lerMareCromatica, registrarMareCromatica, recompilarMareCromatica, abrirEstacaoCromatica, estabilizarAncoraCromatica } from './mare-cromatica.js';
import { grantArchetypeXp, getArchetypeLevel } from './rpg.js';
import { lerArvore, DEGRAUS } from './nado-arvore.js';
import { recordFrequencyAnchor, countFrequencyAnchors, prepareFrequencyCrossing } from './frequencia-quest.js';
import { playCutscene, THRESHOLD_SCENES, CITADEL_MARE_EPILOGUE_SCENES } from '../ui/cutscene.js';
import { sintonizarClima, nomeDoClima, mareDoClima } from './clima.js';
import { ARCHETYPES } from '../data/onboarding.js';
import { getArchetypeAbilities } from './abilities.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';
import { applyUnlocks } from './unlocks.js';
import { ensureArchetypeProgress } from './progression.js';
import { getEnseadaCompassReport } from './bussola-enseada.js';

const DEFAULT_INTERACTION_DISTANCE = 1.35;

// =====================================================================
// HELPERS
// =====================================================================

function distanceBetween(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function getInteractionDistance(item) {
  return item.interacao?.distancia ?? item.interactionDistance ?? DEFAULT_INTERACTION_DISTANCE;
}

function canInteractWith(item, player) {
  const maxDistance = getInteractionDistance(item);
  return distanceBetween(player.x, player.y, item.x, item.y) <= maxDistance;
}

function getPortalRuntimePosition(portal) {
  return {
    ...portal,
    x: portal.x + 0.5,
    y: portal.y + 0.5,
  };
}

// =====================================================================
// PORTAL BLOQUEADO POR PROGRESSO OU GATE
// =====================================================================

function isPortalBlockedByRequirement(portal) {
  if (portal.bloqueado) return true;
  if (portal.requiresArchetype && state.progress.archetype !== portal.requiresArchetype) return true;

  // Compatibilidade com o sistema antigo
  if (portal.requiresFlag && state.progress.flags?.[portal.requiresFlag] !== true) return true;

  // NOVO: Checa o Gate
  if (portal.gate && !checkGate(portal.gate)) return true;

  return false;
}

// =====================================================================
// ENCONTRAR INTERAÇÃO MAIS PRÓXIMA
// =====================================================================

export function findNearestInteraction() {
  const player = state.player;   // PRECISA vir antes de qualquer consider()
  let best = null;

  function consider(kind, data, priority) {
    if (!data) return;
    if (!canInteractWith(data, player)) return;
    const distance = distanceBetween(player.x, player.y, data.x, data.y);
    const candidate = { kind, data, priority, distance };

    if (!best
      || candidate.priority < best.priority
      || (candidate.priority === best.priority && candidate.distance < best.distance)) {
      best = candidate;
    }
  }

  for (const rawPortal of state.portals ?? []) {
    // Passagens abertas são atravessadas nadando; fechadas ainda explicam o requisito.
    if (rawPortal.automaticoNado && !isPortalBlockedByRequirement(rawPortal)) continue;
    consider('portal', getPortalRuntimePosition(rawPortal), 1);
  }

  const nearestCollectible = getNearestCollectible();
  if (nearestCollectible) consider('collectible', nearestCollectible.item, 2);

  for (const actor of state.actors ?? []) {
    if (!actor.interacao && !actor.dialogue && !actor.fala) continue;
    consider('actor', actor, 3);
  }

  for (const object of state.objects ?? []) {
    if (!object.interacao) continue;
    if (object.invisivel) continue;
    if (object.hideWhenFlag && state.progress.flags?.[object.hideWhenFlag]) continue;
    if (object.showWhenFlag && !state.progress.flags?.[object.showWhenFlag]) continue;
    if (object.interacao.somenteSubmerso && (!player.nado?.ativo || !player.nado.submerso || player.nado.profundidade <= 1.25)) continue;
    if (isGateOpen(object)) continue;
    consider('object', object, 4);
  }

  for (const animal of state.fauna ?? []) {
    if (!animal.interacao) continue;
    consider('fauna', animal, 4);
  }

  return best;
}

// =====================================================================
// PROMPT DO HUD
// =====================================================================

export function getInteractionPrompt(interaction) {
  if (!interaction) return '';
  const { kind, data } = interaction;

  if (kind === 'portal') {
    if (isPortalBlockedByRequirement(data)) {
      return data.lockedLabel ?? data.label ?? 'ACESSO BLOQUEADO';
    }
    if (data.labelConcluido && state.progress.flags?.[data.missaoFlag ?? 'gate_bio_valvula_estufa']) {
      return data.labelConcluido;
    }
    return data.label ?? 'USAR PORTAL';
  }

  if (kind === 'collectible') return getCollectiblePrompt(data);

  if (kind === 'actor' && data.id === 'recepcionista') {
    if (state.progress.onboardingCompleted) return 'CONSULTAR NEXO-04';
    if (state.progress.onboardingStarted) return 'RETOMAR AVALIAÇÃO';
    return 'FALAR COM NEXO-04';
  }

  // NOVO: Se o objeto tem um gate e você não passa, o prompt muda.
  // O contrapeso tem máquina de estados própria (pré-requisito/nível/scan/
  // forma) logo abaixo; não deixa o texto genérico de scan escondê-la.
  if (kind === 'object' && data.gate && data.id !== 'contrapeso_viaduto' && !checkGate(data.gate)) {
    if (data.gate.prerequisiteFlag && !state.progress.flags?.[data.gate.prerequisiteFlag]) {
      return data.gate.promptPrerequisito ?? 'REPARO ANTERIOR PENDENTE';
    }
    if (data.gate.requiresFlag && !state.progress.flags?.[data.gate.requiresFlag] &&
        state.progress.archetype === data.gate.diagnosisArchetype) {
      return 'EXAMINAR • R: DIAGNOSTICAR';
    }
    if (data.gate.requiresFlag && state.progress.flags?.[data.gate.requiresFlag]) {
      return 'PRONTO PARA AGIR • Q';
    }
    return data.gate.promptFalha ?? 'BLOQUEADO';
  }

  if (kind === 'object' && data.id === 'maquina_bio') {
    if (state.progress.flags?.oficina_bio_sincronizada) {
      return 'BANCO DE RECONSTRUÇÃO • ATIVO';
    }
    if (state.progress.flags?.collected_fragmento_eco_bio) {
      return 'SINCRONIZAR FRAGMENTO NA FORJA';
    }
  }

  if (kind === 'object' && data.id === 'pedestal_lamina') {
    if (state.progress.flags?.santuario_dominio_consagrado) {
      return 'ALTAR DA LÂMINA • CONSAGRADO';
    }
    if (state.progress.flags?.collected_fragmento_eco_dominio) {
      return 'CONSAGRAR FRAGMENTO NO ALTAR';
    }
  }

  if (kind === 'object' && data.id === 'gerador_corrente') {
    if (state.progress.flags?.darsena_mare_sincronizada) {
      return 'NÚCLEO HIDRODIMENSIONAL • SINTONIZADO';
    }
    if (state.progress.flags?.collected_fragmento_eco_mare) {
      return 'SINTONIZAR FRAGMENTO NO NÚCLEO';
    }
  }

  if (kind === 'object' && data.id === 'mirante_aquario_mare') {
    return state.progress.flags?.observatorio_aquario_mare
      ? 'RETOMAR FOCO DA DÁRSENA'
      : 'OBSERVATÓRIO PANORÂMICO DO AQUÁRIO';
  }

  if (kind === 'object' && data.id === 'comporta_aquario_mare') {
    const fl = state.progress.flags ?? {};
    const nadoPronto = !!fl.aprendeu_a_nadar || lerArvore(state.progress).nivel >= 4;
    if (fl.darsena_mare_sincronizada && fl.visitou_praia_inicial && nadoPronto) {
      return 'ABRIR COMPORTA DO CONDUTO OCEÂNICO';
    }
    return 'COMPORTA DO AQUÁRIO • REQUISITOS DE MARÉ';
  }

  if (kind === 'object' && data.id === 'nucleo_adaptacao') {
    if (state.progress.flags?.base_vetores_sincronizada) return 'EIXO DE ADAPTAÇÃO • SINCRONIZADO';
    if (state.progress.flags?.collected_fragmento_eco_nucleo) return 'SINCRONIZAR FRAGMENTO NO EIXO';
  }
  if (kind === 'object' && data.id === 'mirante_vetores_nucleo') {
    return state.progress.flags?.observatorio_vetores_nucleo ? 'RETOMAR FOCO TÁTICO DA BASE' : 'LENTE PANORÂMICA DOS ANÉIS';
  }
  if (kind === 'object' && data.id === 'regulador_inercia_nucleo' && state.progress.flags?.regulador_inercia_nucleo_calibrado) {
    return 'REGULADOR DE INÉRCIA • CALIBRADO';
  }
  if (kind === 'object' && data.id === 'terminal_carga_viaduto' && state.progress.flags?.terminal_carga_viaduto_registrado) {
    return 'PASSAGEM PELO VIADUTO • REGISTRADA';
  }
  if (kind === 'object' && data.id === 'bomba_inducao_viaduto' && state.progress.flags?.bomba_viaduto_estabilizada) {
    return 'BOMBA DE INDUÇÃO • ESTÁVEL';
  }
  if (kind === 'object' && data.id === 'contrapeso_viaduto' && data.gate) {
    if (isGateOpen(data)) return 'CONTRAPESO PARTIDO • ROTA LIBERADA';
    const flags = state.progress.flags ?? {};
    if (!flags[data.gate.prerequisiteFlag]) return data.gate.promptPrerequisito;
    const nivel = getArchetypeLevel(state.progress);
    if (nivel < (data.gate.requiredLevel ?? 4)) return data.gate.promptFalha ?? 'CONTRAPESO EXIGE QUEBRA SISTEMAS • NÍVEL 4';
    if (!flags[data.gate.requiresFlag]) return 'LER PONTO DE CARGA [R] • DEPOIS PARTIR COM [Q]';
    return state.player.nucleoForm === 'forma_bruta' ? 'PARTIR CONTRAPESO • Q' : 'ASSUMIR QUEBRA SISTEMAS [T] • Q: PESO';
  }

  return data.interacao?.label ?? data.label ?? 'INTERAGIR';
}

// =====================================================================
// EXECUTAR INTERAÇÕES
// =====================================================================

async function interactWithPortal(portal) {
  if (isPortalLocked()) return;

  if (portal.menu === 'elevador') {
    openElevatorMenu();
    return;
  }

  if (isPortalBlockedByRequirement(portal)) {
    // NOVO: Se falhou por causa do Gate, usa a mensagem do Gate
    const mensagens = portal.requiresArchetype && state.progress.archetype !== portal.requiresArchetype
      ? ['ESTA TRAVESSIA EXIGE MARÉ ASTRAL E NADO LIVRE. OUTROS CAMINHOS SERÃO ABERTOS NO FUTURO.']
      : portal.gate ? getGateFailureMessage(portal.gate) : (portal.mensagemBloqueado ?? ['ACESSO BLOQUEADO.']);

    openDialogue({
      speaker: 'SISTEMA DE ACESSO',
      dialogue: mensagens,
    });
    return;
  }

  await usePortal(portal);
}

function interactWithActor(actor) {
  state.interaction.talkingTo = actor;

  if (actor.id === 'recepcionista') {
    state.progress.talkedToNexo = true;
    saveGame();
    startActorTalking(actor);
    startNexoOnboarding(actor);
    return;
  }

  const dialogue = actor.interacao?.dialogue ?? actor.dialogue ?? (actor.fala ? [actor.fala] : ['...']);
  startActorTalking(actor);
  openDialogue({
    speaker: actor.interacao?.speaker ?? actor.nome ?? 'NPC',
    dialogue,
    onFinish: () => stopActorTalking(actor),
  });
}

function interactWithFauna(animal) {
  const interacao = animal.interacao;
  if (!interacao) return;
  const arch = state.progress?.archetype;
  const extra = interacao.porArquetipo?.[arch];
  openDialogue({
    speaker: interacao.speaker ?? animal.nome ?? 'FAUNA DA ENSEADA',
    dialogue: extra ? [...interacao.dialogue, extra] : interacao.dialogue,
  });
}

function sintonizarArquetipoEnseada(archetypeId) {
  const arq = ARCHETYPES[archetypeId];
  if (!arq || !state.progress) return false;
  state.progress.archetype = archetypeId;
  state.progress.abilities = getArchetypeAbilities(archetypeId);
  ensureArchetypeProgress(state.progress);
  applyUnlocks(state.progress, ARCHETYPE_KITS[archetypeId]);
  if (state.player) {
    state.player.equippedSuit = null;
    state.player.nucleoForm = null;
  }
  state.progress.flags ??= {};
  state.progress.flags.enseada_espelho_sintonizado = true;
  recordQuestEvent(state.progress, { type: 'enseada_espelho_arquetipo', target: 'espelho' });
  saveGame();
  return true;
}

// Mesmo progresso, XP e bônus da interação isométrica original. A cena FPV
// chama isto uma vez ao concluir a entrada; cancelar a transição não premia.
export function registrarVisitaImersiva(object) {
  if (!object || !['piscina_mare_viva_enseada', 'gruta_concha_enseada'].includes(object.id)) return null;
  const flags = state.progress.flags ??= {}, player = state.player;
  const pool = object.id === 'piscina_mare_viva_enseada';
  const key = pool ? 'enseada_piscina_visitada' : 'enseada_gruta_visitada';
  const primeira = !flags[key]; flags[key] = true;
  const arch = state.progress?.archetype;
  if (player && pool) {
    const maxEn = player.maxEnergy ?? 100;
    player.energy = Math.min(maxEn, (player.energy ?? maxEn) + (arch === 'mare_astral' ? maxEn : Math.round(maxEn * .4)));
    if (player.nado) player.nado.folego = player.nado.folegoMax ?? 100;
  } else if (player) {
    const maxHp = player.maxHealth ?? 100;
    player.health = Math.min(maxHp, (player.health ?? maxHp) + Math.round(maxHp * .3));
  }
  if (primeira && arch) grantArchetypeXp(state.progress, pool ? 12 : 15);
  saveGame();
  return { primeira, arch };
}

function interactWithObject(object) {
  const interaction = object.interacao;
  if (!interaction) return;

  const diariosDocas={
    docas_marca_navegantes:['MARCA DOS NAVEGANTES','TRÊS TRAÇOS NA PEDRA APONTAM PARA A COSTA, O ACAMPAMENTO E A ESTAÇÃO.','OS VIGIAS DIZIAM QUE A MEMÓRIA DAS DUAS FITAS E OS TRÊS FRAGMENTOS DEVEM VOLTAR JUNTOS AO NÚCLEO.'],
    docas_diario_pier:['DIÁRIO DO PÍER','A NÉVOA VEIO ANTES DA FALHA. DEIXAMOS UMA LUZ NO PÍER PARA QUEM CONSEGUISSE VOLTAR.','AS CRIATURAS SE APROXIMAM DA LUZ: APAGUE O FAROL SE PRECISAR PASSAR EM SILÊNCIO.'],
    docas_diario_trilha:['AVISO DOS VIGIAS','A CHAVE FICOU NA CABANA OESTE; O FUSÍVEL, NA CABANA LESTE. NÃO LEVE OS DOIS PELO MAR.','RECOMPILE OS FRAGMENTOS NO GALPÃO ANTES DE TENTAR O SELO NA SUBIDA.'],
  }[object.id];
  if(diariosDocas){
    const flags=state.progress.flags??={},key=object.id+'_lido';
    if(!flags[key]){flags[key]=true;saveGame();}
    openDialogue({speaker:diariosDocas[0],dialogue:diariosDocas.slice(1)});return;
  }
  if (object.id === 'docas_barco') {
    openDialogue({speaker:'BARCO DE EXPEDIÇÃO',dialogue:['PÍER SUL • PONTO DE APOIO E RETORNO À ENSEADA.'],choices:[
      {text:'DESCANSAR E SALVAR',onSelect:()=>{healPlayer(state.player,state.progress,35);state.player.energy=Math.min(state.player.maxEnergy??100,(state.player.energy??0)+35);state.world.currentSpawnId='inicio';saveGame();openDialogue({speaker:'BARCO',dialogue:['VIDA E ENERGIA PARCIALMENTE RECUPERADAS. REGISTRO DE EMERGÊNCIA SALVO NO PÍER.']});}},
      {text:'RETORNAR À ENSEADA',onSelect:()=>{void usePortal({id:'docas_retorno',label:'ENSEADA DOS ECOS',destino:{mapId:'ilha_enseada_ecos',spawnId:'vindo_das_docas'}});}},
      {text:'CONTINUAR A INCURSÃO',onSelect:()=>{}}
    ]});return;
  }
  if (object.id === 'docas_chave' || object.id === 'docas_fusivel') {
    const flags=state.progress.flags ??= {},key=object.id,first=!flags[key];flags[key]=true;if(first)saveGame();
    openDialogue({speaker:'SUPRIMENTOS // DOCAS',dialogue:[first?(key==='docas_chave'?'CHAVE DA TRILHA RECOLHIDA.':'FUSÍVEL DO NÚCLEO RECOLHIDO.'):'ESTE ITEM JÁ ESTÁ NO INVENTÁRIO DE MISSÃO.', 'A CHAVE E O FUSÍVEL LIBERAM O SELO DE ACESSO AO NÚCLEO.']});return;
  }
  if (object.id === 'docas_torre') {
    openDialogue({speaker:'TORRE DE VIGIA',dialogue:['A ESCADA DE MADEIRA CEDEU DURANTE A ÚLTIMA TEMPESTADE.', 'A NÉVOA ESCONDE A PLATAFORMA DE VIGIA; POR ENQUANTO NÃO É SEGURO SUBIR.']});return;
  }
  const docasEspecial={docas_resina:['mare_astral','A RESINA RESPONDE AO MARÉ. A TRILHA PARA O NÚCLEO FICA REGISTRADA.'],docas_eletrico:['nucleo_dez_forma','O NÚCLEO X10 ISOLOU A LINHA ELÉTRICA DO GALPÃO.'],docas_selo:['lamina_dominio_anciao','O DOMÍNIO PURIFICA UM FOCO DE NÉVOA JUNTO À TRILHA.'],docas_biomassa:['motor_bio_forja','A BIO-FORJA RECUPERA ENERGIA DA BIOMASSA CRISTALIZADA.']}[object.id];
  if(docasEspecial){
    if(state.progress.archetype!==docasEspecial[0]){openDialogue({speaker:'RESSONÂNCIA INCOMPATÍVEL',dialogue:['ESTE PONTO RESPONDE A OUTRO ARQUÉTIPO.']});return;}
    const flags=state.progress.flags ??= {},key=object.id+'_ativado',first=!flags[key];flags[key]=true;
    if(first){state.player.energy=Math.min(state.player.maxEnergy??100,(state.player.energy??0)+20);saveGame();}
    openDialogue({speaker:'RESSONÂNCIA // DOCAS',dialogue:[docasEspecial[1],first?'RESSONÂNCIA REGISTRADA • ENERGIA +20.':'RESSONÂNCIA JÁ REGISTRADA.']});return;
  }
  if (object.id === 'cromatica_alerta') {
    const data=lerMareCromatica(state.progress);
    openDialogue({speaker:'METRÔ // ALERTA CRÍTICO',dialogue:[
      'A ÂNCORA DO HUB FOI ARRASTADA PARA ALÉM DAS CORRENTES. O AEROPORTO CENTRAL ESTÁ EM RISCO.',
      'NULO INTERCEPTA O SINAL. BUSQUE A ORIGEM DO SOCORRO NO PÍER SUL DA ENSEADA DOS ECOS.',
      data.desfecho==='colapso' ? 'O REGISTRO DA FALHA PERMANECE. A NOVA ROTA DE REDENÇÃO PARTE DA ENSEADA.' : 'A ROTA DIRETA FOI INTERROMPIDA. PROSSIGA PELO MAR.'
    ]});return;
  }
  if (object.id?.startsWith('cromatica_')) {
    const d=lerMareCromatica(state.progress), id=object.id;
    if(id.startsWith('cromatica_fragmento_')) {
      const part=id.slice('cromatica_fragmento_'.length), fresh=registrarMareCromatica(state.progress,'fragmentos',part);
      if(fresh) saveGame();
      openDialogue({speaker:'FRAGMENTO MNEMÔNICO',dialogue:[fresh?'UM FRAGMENTO DE FÍSICA LOCAL RESPONDE AO TRAJE.':'ESTE FRAGMENTO JÁ FOI REGISTRADO.', 'LEVE OS FRAGMENTOS AO TERMINAL SEGURO PARA RECOMPILAR.']});return;
    }
    if(id.startsWith('cromatica_fita_')) {
      const part=id.slice('cromatica_fita_'.length);
      if(state.world.currentMapId==='mare_cromatica_galpao' && !d.fitas.includes(part)){openDialogue({speaker:'GRAVADOR // CRT',dialogue:['ESTE GRAVADOR ESTÁ VAZIO. PROCURE A FITA NA CABANA.']});return;}
      const fresh=registrarMareCromatica(state.progress,'fitas',part);if(fresh) saveGame();
      const record=part==='casa'?'FITA 01: A ÁGUA MUDOU DE COR ANTES DE A CHUVA CHEGAR. NÃO OLHEM PARA O REFLEXO.':'FITA 02: NULO USOU O SINAL DE RESGATE. MANTENHAM A ÂNCORA DE RETORNO VIVA.';
      openDialogue({speaker:'GRAVADOR // ESTÁTICA',dialogue:[record,'NEXO-04: O REGISTRO PODE AJUDAR A PURIFICAR A INCURSÃO.']});return;
    }
    if(id==='cromatica_terminal') {
      const changed=recompilarMareCromatica(state.progress),now=lerMareCromatica(state.progress);if(changed){recordQuestEvent(state.progress,{type:'cromatica',target:'recompilar'});saveGame();}
      openDialogue({speaker:'TERMINAL SEGURO',dialogue:[`SINCRONIZAÇÃO LOCAL ${now.sincronizacao}/4 • FRAGMENTOS ${now.fragmentos.length}/3.`,changed?'RECOMPILAÇÃO CONCLUÍDA. O MÓDULO RECUPEROU PARTE DA SUA RESPOSTA.':'TRAGA NOVOS FRAGMENTOS PARA RECOMPILAR.','SUAS HABILIDADES E SEU NÍVEL GLOBAL NÃO FORAM APAGADOS.']});return;
    }
    if(id==='cromatica_selo') {
      if(state.world.currentMapId==='mare_cromatica_docas' && !d.estacaoAberta && (!state.progress.flags?.docas_chave || !state.progress.flags?.docas_fusivel)) {
        openDialogue({speaker:'SELO DO NÚCLEO',dialogue:['A TRILHA EXIGE A CHAVE E O FUSÍVEL DAS DUAS CABANAS.','RECOMPILE O TRAJE NO GALPÃO CRT ANTES DE ABRIR O SELO.']});return;
      }
      const opened=abrirEstacaoCromatica(state.progress);if(opened){recordQuestEvent(state.progress,{type:'cromatica',target:'selo'});saveGame();}
      openDialogue({speaker:'SELO // 66.6',dialogue:[opened||d.estacaoAberta?'A TRAVA DA ESTAÇÃO SE ABRE. A DESCIDA À CONTENÇÃO ESTÁ LIBERADA.':'O SELO REJEITA O TRAJE. COLETE UM FRAGMENTO E RECOMPILE NO TERMINAL DO ACAMPAMENTO.', 'NULO: SUA RESSONÂNCIA É UM ERRO DE SINTAXE.']});return;
    }
    if(id.startsWith('cromatica_painel_')) {
      const part=id.slice('cromatica_painel_'.length),fresh=registrarMareCromatica(state.progress,'paineis',part);if(fresh)saveGame();
      openDialogue({speaker:'PAINEL DE CONTENÇÃO',dialogue:[fresh?`CIRCUITO ${part.toUpperCase()} ALINHADO.`:'ESTE CIRCUITO JÁ ESTÁ ALINHADO.',`PAINÉIS ${lerMareCromatica(state.progress).paineis.length}/3 • CUIDADO COM A RESINA NO CHÃO.`]});return;
    }
    if(id==='cromatica_ancora') {
      const threats=(state.trainingTargets??[]).filter(t=>t.cromaticaEnemy && t.health>0).length;
      if (!d.ancoraEstavel && threats > 0) {
        openDialogue({speaker:'NEXO-04 // CONTENÇÃO',dialogue:[`A ÂNCORA ATRAIU ${threats} INFECTADO(S). DISPERSE AS AMEAÇAS ANTES DE INICIAR A ESTABILIZAÇÃO.`, 'CLIQUE NA DIREÇÃO DO INIMIGO PARA ATACAR; O ANEL CLARO AVISA ANTES DELE GOLPEAR.']});return;
      }
      const result=estabilizarAncoraCromatica(state.progress);if(result){recordQuestEvent(state.progress,{type:'cromatica',target:'ancora'});saveGame();}
      openDialogue({speaker:'NÚCLEO DE ÂNCORA',dialogue:result ? [result==='total'?'A ÂNCORA FOI PURIFICADA. AS DUAS FITAS E A RECOMPILAÇÃO COMPLETA PERMITIRAM ISOLAR A PRAGA.':'ÂNCORA SALVA, MAS A CONTENÇÃO PERMANECE FRATURADA. A INFECÇÃO AINDA RESISTE NAS ZONAS BAIXAS.','A SOBRECARGA ABRIU UMA FENDA ATRÁS DA CÂMARA. O HUB ESTÁ SEGURO.'] : [d.ancoraEstavel?'A ÂNCORA PERMANECE ESTÁVEL.':'A ÂNCORA AINDA OSCILA. ALINHE OS TRÊS PAINÉIS ANTES DE TENTAR.']});return;
    }
    if(id==='cromatica_limiar_final') {openDialogue({speaker:'NEXO-04 // FENDA',dialogue:['VOCÊ ATRAVESSOU O RASGO. ALÉM DESTE LIMIAR, A NOVA REALIDADE AINDA NÃO FOI CARTOGRAFADA.','A LINHA DE RETORNO PERMANECE ABERTA.']});return;}
  }
  if (object.id?.startsWith('ancora_666_')) {
    const id = object.id.slice('ancora_666_'.length);
    const logs = {
      origem: ['ÂNCORA DE ORIGEM: UM REATOR DE DADOS BLINDADO PULSA EM CALOR INDUSTRIAL BAIXO.',
        'NEXO-04: É A FORJA PRIMÁRIA DA FENDA. ELA CONSOME A ESTABILIDADE DO ESPAÇO AO REDOR PARA SE MANTER VIVA.'],
      retorno: ['ÂNCORA DE RETORNO: UM GIROSCÓPIO TRAVADO NAS COORDENADAS DO PONTO 0.',
        'NEXO-04: O CABO DE ANCORAGEM ESTÁ FIRME. É PARA ESTE EIXO QUE O METRÔ PUXARÁ SEUS DADOS SE ALGO DER ERRADO.'],
      memoria: ['ÂNCORA DE MEMÓRIA: A ESTÁTICA REPRODUZ SEUS PASSOS COM TRÊS SEGUNDOS DE ATRASO.',
        'NEXO-04: A RESPOSTA CHEGOU ANTES DA PERGUNTA. ALGUÉM SABIA QUE VOCÊ ESTARIA AQUI. MAS UMA COINCIDÊNCIA NÃO É UMA IDENTIDADE.'],
    };
    if (!state.progress.flags?.frequencia666Registrada) {
      openDialogue({ speaker: 'NEXO-04', dialogue: ['O RECEPTOR AINDA NÃO TEM UMA ASSINATURA. INVESTIGUE O TERMINAL DA ENSEADA COM [R].'] }); return;
    }
    const first = recordFrequencyAnchor(state.progress, id);
    if (first) saveGame();
    const n = countFrequencyAnchors(state.progress);
    openDialogue({ speaker: 'ESTAÇÃO 66.6', dialogue: [...(logs[id] ?? ['SEM REGISTRO.']),
      n === 3 ? 'TRÊS ÂNCORAS SINCRONIZADAS. USE [R] NO CONSOLE CENTRAL.' : `ÂNCORAS SINCRONIZADAS: ${n}/3. EXAMINE AS OUTRAS COM [E].`] });
    return;
  }
  if (object.id === 'console_limiar_666') {
    const n = countFrequencyAnchors(state.progress);
    const flags = state.progress.flags ?? {};
    const ready = flags.freq666_limiar_estavel;
    const relics = ['selo_codigo_queimado', 'nucleo_vigilante_forjado'].filter(id => state.progress.inventory?.includes(id)).length;
    const mats = state.progress.citadelMaterials ?? { sucata_codigo: 0, nucleo_estatica: 0 };
    const statusLine = flags.cidadela_100_porcento
      ? `CIDADELA 404 • 100% ESTABILIZADA • RELÍQUIAS ${relics}/2 • RONDAS ${flags.cidadela_rondas_concluidas ?? 0} • ROTA PARA A PRÓXIMA DIMENSÃO LIBERADA.`
      : flags.cidadela_estavel
      ? `CIDADELA 404 ESTÁVEL • RELÍQUIAS ${relics}/2 • RONDAS ${flags.cidadela_rondas_concluidas ?? 0} • SUCATA ${mats.sucata_codigo ?? 0} • NÚCLEOS ${mats.nucleo_estatica ?? 0}. RONDA SETORIAL, FENDAS E OFICINA DISPONÍVEIS.`
      : ready ? 'JANELA ESTÁVEL. O ANEL AGUARDA VOCÊ.' : n === 3 ? 'AS TRÊS ÂNCORAS RESPONDERAM. USE [R] PARA ESTABILIZAR O LIMIAR.' : 'EXAMINE AS ÂNCORAS COM [E], DEPOIS USE [R] AQUI PARA SINCRONIZAR O LIMIAR.';
    openDialogue({ speaker: 'CONSOLE CENTRAL', dialogue: [
      `ÂNCORAS SINCRONIZADAS: ${n}/3. ORIGEM, RETORNO E MEMÓRIA.`,
      statusLine,
    ] }); return;
  }
  if (object.id === 'selo_convergencia_666') {
    const flags = state.progress.flags ??= {};
    const relics = ['selo_codigo_queimado', 'nucleo_vigilante_forjado', 'insignia_vigilia_404'].filter(id => state.progress.inventory?.includes(id)).length;
    const rondas = flags.cidadela_rondas_concluidas ?? 0;
    if (state.player) {
      state.player.health = state.player.maxHealth ?? state.player.health;
      state.player.energy = state.player.maxEnergy ?? state.player.energy;
    }
    const archNote = {
      mare_astral: 'MARÉ ASTRAL: A CORRENTE DE 66.6 MHz SE ACALMOU COMO ÁGUA DE ENSEADA. O MÓDULO RESPONDE EM PLENA SINTONIA.',
      nucleo_dez_forma: 'NÚCLEO X10: OS VETORES DA CIDADELA FORAM COMPRIMIDOS E ARQUIVADOS SEM PERDA DE SINAL.',
      lamina_dominio_anciao: 'DOMÍNIO ANCIÃO: O JURAMENTO DA VIGÍLIA FOI HONRADO; A LÂMINA GUARDA O LIMIAR.',
      motor_bio_forja: 'BIO-FORJA: O REATOR E O CHASSI DO VIGILANTE PULSAM NO MESMO COMPASSO ESTÁVEL.',
    }[state.progress.archetype] ?? 'MÓDULO SINCRONIZADO COM O SELO DA ESTAÇÃO 66.6.';
    const summaryLine = flags.cidadela_100_porcento
      ? `CONVERGÊNCIA 100% SELADA • RELÍQUIAS ${relics}/3 • RONDAS ${rondas} • PROTOCOLO DA VIGÍLIA CONCLUÍDO.`
      : flags.cidadela_protocolo_concluido
      ? `PROTOCOLO DA VIGÍLIA CONCLUÍDO • RELÍQUIAS ${relics}/3 • RONDAS ${rondas}. CIDADELA PRONTA PARA O FECHAMENTO 100%.`
      : `REATOR DA CIDADELA ESTÁVEL • RELÍQUIAS ${relics}/3 • RONDAS ${rondas}. COMPLETE A VIGÍLIA E AS FENDAS PARA SELAR 100%.`;
    openDialogue({
      speaker: 'SELO DE CONVERGÊNCIA // 66.6',
      dialogue: [
        summaryLine,
        archNote,
        'VIDA E ENERGIA DO MÓDULO RESTAURADAS NO LIMIAR.',
      ],
      choicesAfterDialogue: true,
      choices: [
        {
          text: 'PROJETAR VISÃO DE DESFECHO',
          onSelect: () => {
            void (async () => {
              flags.estacao666_epilogo_visto = true;
              saveGame();
              await playCutscene(CITADEL_MARE_EPILOGUE_SCENES);
            })();
          },
        },
        { text: 'MANTER SINTONIA', onSelect: () => {} },
      ],
    });
    return;
  }
  if (object.id === 'anel_limiar_666') {
    if (!state.progress.flags?.freq666_limiar_estavel) {
      openDialogue({ speaker: 'NEXO-04', dialogue: ['O ANEL ESTÁ FRIO. HÁ ALGO DO OUTRO LADO, MAS AINDA NÃO TEMOS UMA JANELA SEGURA.', 'SINCRONIZE AS TRÊS ÂNCORAS E DIAGNOSTIQUE O CONSOLE CENTRAL COM [R].'] }); return;
    }
    const already = !!state.progress.flags.freq666_limiar_preparado;
    openDialogue({ speaker: 'NEXO-04', dialogue: [
      state.progress.flags?.cidadela_estavel ? 'O REATOR DA CIDADELA ESTÁ ESTÁVEL. RONDA SETORIAL, BANCADA DE SÍNTESE E OFICINA CONTINUAM ACESSÍVEIS.' : 'A JANELA ESTÁ ESTÁVEL. A CIDADELA USA OUTRA PERSPECTIVA E OUTRAS REGRAS.',
      'WASD MOVE; SETAS OU MOUSE MIRAM. ESPAÇO/CLIQUE ATIRA, V GOLPE CINÉTICO, E USA BANCADA/TERMINAIS. Q MÓDULO, R RADAR, T RECARREGA, F ULTIMATE.',
    ], choicesAfterDialogue: true, choices: [
      { text: 'ATRAVESSAR PARA A CIDADELA', onSelect: () => {
        void (async () => {
          if (!already) {
            if (prepareFrequencyCrossing(state.progress)) saveGame();
            await playCutscene(THRESHOLD_SCENES);
          }
          await usePortal({ id: 'travessia_666', label: 'CIDADELA DO CÓDIGO QUEIMADO', destino: { mapId: 'cidadela_404', spawnId: 'inicio' } });
        })();
      } },
      { text: 'AINDA NÃO', onSelect: () => {} },
    ] }); return;
  }

  if (object.id === 'terminal_rota_metro' && state.progress.flags?.metroCalibrado) {
    openDialogue({ speaker: 'TERMINAL DE EMBARQUE', dialogue: [
      'LINHA PRIMÁRIA OPERACIONAL. DESTINO: PRAIA INICIAL.',
      'NA PRAIA, SIGA A TRILHA PARA A ENSEADA DOS ECOS. O RECEPTOR DE MANUTENÇÃO DETECTOU UM SINAL IRREGULAR.',
      'EMBARQUE PELO TREM NA PLATAFORMA PRINCIPAL.',
    ] });
    return;
  }

  if (object.id === 'maquina_bio') {
    const flags = state.progress.flags ??= {};
    if (flags.oficina_bio_sincronizada) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      openDialogue({
        speaker: 'BANCO DE RECONSTRUÇÃO',
        dialogue: [
          'CUBA DE SÍNTESE ESTABILIZADA EM RESSONÂNCIA MÁXIMA.',
          'MÓDULOS CALIBRADOS: PROPULSOR ATIVO • LÂMINA, ESCUDO E ASA EM EXPANSÃO.',
          'TRAJE REVITALIZADO. SIGA PELA ECLUSA DOCA A1 RUMO AO TERMINAL DO AEROPORTO.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_bio) {
      openDialogue({
        speaker: 'BANCO DE RECONSTRUÇÃO',
        dialogue: [
          'FRAGMENTO DE ECO DETECTADO — A CUBA DE SÍNTESE PODE GRAVAR SUA RESSONÂNCIA NO PROPULSOR.',
        ],
        choices: [
          {
            text: 'SINCRONIZAR FRAGMENTO NO BANCO DE RECONSTRUÇÃO',
            onSelect: () => {
              flags.oficina_bio_sincronizada = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
              }
              recordQuestEvent(state.progress, { type: 'sync_forge', target: 'maquina_bio' });
              saveGame();
              openDialogue({
                speaker: 'BANCO DE RECONSTRUÇÃO',
                dialogue: [
                  'SINCRONIA BIO-FORJA CONCLUÍDA.',
                  'TODA A REDE DA OFICINA ENTROU EM REGIME ESTÁVEL.',
                  'SELO DE IMPULSO REGISTRADO NO CÓDEX [J].',
                  'PRÓXIMO PASSO: RETORNE PELA DOCA A1 E DIAGNOSTIQUE O TERMINAL DO AEROPORTO.',
                ],
              });
            },
          },
          {
            text: 'MANTER EM AGUARDO',
            onSelect: () => {
              openDialogue({
                speaker: 'BANCO DE RECONSTRUÇÃO',
                dialogue: ['CUBA EM ESPERA. VOCÊ PODE SINCRONIZAR A QUALQUER MOMENTO.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'pedestal_lamina') {
    const flags = state.progress.flags ??= {};
    if (flags.santuario_dominio_consagrado) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      openDialogue({
        speaker: 'ALTAR DA LÂMINA ANCESTRAL',
        dialogue: [
          'A LÂMINA RESSOA EM UNÍSSONO COM O ANEL DE RUPTURA.',
          'FERRAMENTAS DE DOMÍNIO: ESPADA • ESCUDO • POSTURA • INVESTIDA.',
          'TRAJE E LÂMINA REVIGORADOS. RETORNE PELA DOCA B2 AO AEROPORTO.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_dominio) {
      openDialogue({
        speaker: 'ALTAR DA LÂMINA ANCESTRAL',
        dialogue: [
          'O FRAGMENTO DE ECO VIBRA DIANTE DA BIGORNA DE OBSIDIANA — PRONTO PARA SELAR O JURAMENTO DA COROA ANTIGA.',
        ],
        choices: [
          {
            text: 'CONSAGRAR FRAGMENTO NO ALTAR DA LÂMINA',
            onSelect: () => {
              flags.santuario_dominio_consagrado = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
                state.player.ultimate ??= {};
                state.player.ultimate.shake = { timeLeft: 0.35, duration: 0.35, power: 8 };
              }
              recordQuestEvent(state.progress, { type: 'consecrate_blade', target: 'pedestal_lamina' });
              saveGame();
              openDialogue({
                speaker: 'ALTAR DA LÂMINA ANCESTRAL',
                dialogue: [
                  'JURAMENTO SELADO — O ANEL DE RUPTURA ACENDEU EM OURO SOLAR.',
                  'INSÍGNIA DO ANEL ANCIÃO REGISTRADA NO CÓDEX [J].',
                  'ARMA, POSTURA E COROA: LEVE SUA LÂMINA DE VOLTA PELA DOCA B2.',
                ],
              });
            },
          },
          {
            text: 'GUARDAR PARA DEPOIS',
            onSelect: () => {
              openDialogue({
                speaker: 'ALTAR DA LÂMINA ANCESTRAL',
                dialogue: ['A LÂMINA AGUARDA EM SILÊNCIO SOBRE A BIGORNA PARTIDA.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'gerador_corrente') {
    const flags = state.progress.flags ??= {};
    if (flags.darsena_mare_sincronizada) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      const nadoPronto = !!flags.aprendeu_a_nadar || lerArvore(state.progress).nivel >= 4;
      openDialogue({
        speaker: 'NÚCLEO HIDRODIMENSIONAL',
        dialogue: [
          'CORRENTES DA DÁRSENA EM RESSONÂNCIA LAMINAR.',
          'TRAJE HIDRODIMENSIONAL E RESERVAS RESTAURADOS.',
          nadoPronto && flags.visitou_praia_inicial
            ? 'SINAL OCEÂNICO VERDE: A COMPORTA A LESTE PODE ABRIR A ROTA DE NADO LIVRE ATÉ A ENSEADA DOS ECOS.'
            : 'ROTA SUBMERSA DETECTADA A LESTE: VÁ À PRAIA INICIAL PELO TREM, CONCLUA "APRENDER A NADAR" E RETORNE PARA DESTRAVAR O CONDUTO DA ENSEADA.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_mare) {
      openDialogue({
        speaker: 'NÚCLEO HIDRODIMENSIONAL',
        dialogue: [
          'A PÉROLA DE MARÉ ENTRA EM FASE COM A ESFERA DE VÓRTICE — PRONTA PARA ESTABILIZAR A DÁRSENA E SONDAR O CONDUTO OCEÂNICO.',
        ],
        choices: [
          {
            text: 'SINTONIZAR FRAGMENTO NO NÚCLEO HIDRODIMENSIONAL',
            onSelect: () => {
              flags.darsena_mare_sincronizada = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
                state.player.ability ??= { cooldowns: {} };
                state.player.ability.tideFlash = { x: object.x, y: object.y, timeLeft: 0.75, duration: 0.75 };
              }
              recordQuestEvent(state.progress, { type: 'sync_tide', target: 'gerador_corrente' });
              saveGame();
              openDialogue({
                speaker: 'NÚCLEO HIDRODIMENSIONAL',
                dialogue: [
                  'CALIBRAGEM CONCLUÍDA — OS CANAIS SUBMERSOS E O GRANDE AQUÁRIO ENTRARAM EM FASE.',
                  'AMULETO DA CORRENTE ABISSAL REGISTRADO NO CÓDEX [J].',
                  'APÓS VISITAR A PRAIA INICIAL E DOMINAR O NADO LIVRE, RETORNE À COMPORTA LESTE PARA NADAR DIRETAMENTE ATÉ A ENSEADA DOS ECOS.',
                ],
              });
            },
          },
          {
            text: 'MANTER EM AGUARDO',
            onSelect: () => {
              openDialogue({
                speaker: 'NÚCLEO HIDRODIMENSIONAL',
                dialogue: ['A ESFERA DE ÁGUA SEGUE GIRANDO EM COMPASSO CALMO.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'valvula_pressao_mare') {
    const flags = state.progress.flags ??= {};
    if (flags.valvula_pressao_mare_equalizada) {
      openDialogue({
        speaker: 'VÁLVULA DE EQUALIZAÇÃO ABISSAL',
        dialogue: [
          'MANÔMETRO ESTÁVEL EM 4.2 ATM — OS CANAIS DE GRADE SOB A DÁRSENA FLUEM EM CORRENTE CONTÍNUA.',
        ],
      });
      return;
    }
    flags.valvula_pressao_mare_equalizada = true;
    object.sprite = 'mare_sala_valvula_ativa';
    if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    saveGame();
    openDialogue({
      speaker: 'VÁLVULA DE EQUALIZAÇÃO ABISSAL',
      dialogue: [
        'VOLANTE DE BRONZE GIRADO — A ÁGUA BIOLUMINESCENTE CORRE COM BRILHO PLENO SOB AS GRELHAS.',
        'EXPERIÊNCIA DE CAMPO REGISTRADA (+25 XP).',
      ],
    });
    return;
  }

  if (object.id === 'mirante_aquario_mare') {
    const flags = state.progress.flags ??= {};
    flags.observatorio_aquario_mare = !flags.observatorio_aquario_mare;
    saveGame();
    openDialogue({
      speaker: 'MIRANTE DO AQUÁRIO ABISSAL',
      dialogue: flags.observatorio_aquario_mare
        ? [
            'LENTE PANORÂMICA ATIVADA — A CÂMERA ABRE O QUADRO ENTRE OS JANELÕES DE ÁGUAS-VIVAS E O GRANDE AQUÁRIO OCEÂNICO A LESTE.',
            'CAMINHE PARA O SUL OU INTERAJA NOVAMENTE PARA RETOMAR O ENQUADRAMENTO PRÓXIMO.',
          ]
        : [
            'ENQUADRAMENTO TÁTICO RESTAURADO NA DÁRSENA.',
          ],
    });
    return;
  }

  if (object.id === 'comporta_aquario_mare') {
    const flags = state.progress.flags ??= {};
    const arvore = lerArvore(state.progress);
    const nadoPronto = !!flags.aprendeu_a_nadar || arvore.nivel >= 4;
    if (!flags.darsena_mare_sincronizada) {
      openDialogue({
        speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
        dialogue: [
          'ECLUSA HIDRÁULICA SELADA ENTRE A DÁRSENA E O GRANDE AQUÁRIO LIGADO AO MAR ABERTO.',
          'ETAPA 1 PENDENTE: ATRAVESSE O FLUXO CONTIDO [R -> Q], RECOLHA O FRAGMENTO DE ECO E SINTONIZE-O NO NÚCLEO HIDRODIMENSIONAL.',
        ],
      });
      return;
    }
    if (!flags.visitou_praia_inicial || !nadoPronto) {
      const grauAtual = DEGRAUS[arvore.nivel]?.titulo ?? 'MEDO D’ÁGUA';
      openDialogue({
        speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
        dialogue: [
          'ALÉM DESTA ECLUSA CORRE ÁGUA OCEÂNICA FUNDA COM LIGAÇÃO DIRETA À ENSEADA DOS ECOS.',
          !flags.visitou_praia_inicial
            ? 'REQUISITO DE TRAVESSIA: EMBARQUE NO TREM DIMENSIONAL RUMO À PRAIA INICIAL E TREINE O NADO EM MAR ABERTO.'
            : `NÍVEL DE NADO ATUAL: ${grauAtual.toUpperCase()} (${arvore.nivel}/4). CONCLUA O TREINO "APRENDER A NADAR" NA PRAIA INICIAL PARA LIBERAR A ROTA DE NADO LIVRE.`,
        ],
      });
      return;
    }
    openDialogue({
      speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
      dialogue: [
        'TODOS OS SELOS VERDES: DÁRSENA SINTONIZADA + TREINO DE NADO CONCLUÍDO NA PRAIA INICIAL. DESEJA INUNDAR A RAMPA E ABRIR A ROTA DE NADO LIVRE ATÉ A ENSEADA DOS ECOS?',
      ],
      choices: [
        {
          text: 'ABRIR COMPORTA E LIBERAR O AQUÁRIO OCEÂNICO',
          onSelect: () => {
            openGate(object);
            flags.rota_livre_enseada_aberta = true;
            if (state.progress.archetype) grantArchetypeXp(state.progress, 40);
            if (state.player) {
              state.player.ability ??= { cooldowns: {} };
              state.player.ability.tideFlash = { x: object.x, y: object.y, timeLeft: 0.85, duration: 0.85 };
            }
            saveGame();
            openDialogue({
              speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
              dialogue: [
                'COMPORTA RECOLHIDA — A RAMPA LESTE AGORA DESÁGUA NO GRANDE AQUÁRIO OCEÂNICO!',
                'NADE LIVREMENTE ATÉ O ARCO ABISSAL (OU MERGULHE COM ESPAÇO / [Z] PARA ENTRAR EM PERSPECTIVA 3D SUBMERSA) E ALCANCE A ENSEADA DOS ECOS.',
              ],
            });
          },
        },
        {
          text: 'MANTER COMPORTA FECHADA POR AGORA',
          onSelect: () => {
            openDialogue({
              speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
              dialogue: ['PRESSÃO MANTIDA EM ESPERA.'],
            });
          },
        },
      ],
      cancelable: true,
    });
    return;
  }

  if (object.id === 'nucleo_adaptacao') {
    const flags = state.progress.flags ??= {};
    const restaurar = () => {
      state.player.health = state.player.maxHealth ?? state.player.health;
      state.player.energy = state.player.maxEnergy ?? state.player.energy;
    };
    if (flags.base_vetores_sincronizada) {
      restaurar();
      openDialogue({
        speaker: 'EIXO DE ADAPTAÇÃO',
        dialogue: [
          'BASE DOS VETORES EM RESSONÂNCIA ESTÁVEL. RESERVAS DO OPERADOR RESTAURADAS.',
          flags.rota_viaduto_vetores_aberta
            ? 'VIADUTO LIBERADO: A ECLUSA LESTE CONDUZ À ESTAÇÃO QUE RESPIRA. A PERSPECTIVA MUDA NA TRAVESSIA; SUA FORMA CONTINUA SENDO A FERRAMENTA.'
            : 'PROTOCOLO AVANÇADO: NO NÍVEL 4, ASSUMA A QUEBRA SISTEMAS [T], LEIA O CONTRAPESO AO SUL COM [R] E PARTA-O COM [Q] PARA ABRIR O VIADUTO DOS VETORES.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_nucleo) {
      openDialogue({
        speaker: 'EIXO DE ADAPTAÇÃO',
        dialogue: ['O FRAGMENTO ENTRA NO CAMPO DOS ANÉIS. SINCRONIZAR A ASSINATURA VAI ESTABILIZAR A BASE E RESTAURAR SUAS RESERVAS. CONFIRMAR?'],
        choices: [
          {
            text: 'SINCRONIZAR FRAGMENTO NO EIXO DE ADAPTAÇÃO',
            onSelect: () => {
              flags.base_vetores_sincronizada = true;
              restaurar();
              state.player.ability ??= { cooldowns: {} };
              state.player.ability.tideFlash = { x: object.x, y: object.y, timeLeft: 0.85, duration: 0.85 };
              recordQuestEvent(state.progress, { type: 'sync_vectors', target: 'nucleo_adaptacao' });
              saveGame();
              openDialogue({
                speaker: 'EIXO DE ADAPTAÇÃO',
                dialogue: [
                  'SINCRONIA DOS VETORES CONCLUÍDA — OS ANÉIS GRAVARAM SUA ASSINATURA ADAPTATIVA.',
                  'SELO DE VETOR ADAPTATIVO REGISTRADO NO CÓDEX [J].',
                  'A BASE ESTÁ VIVA. O CONTRAPESO AO SUL AINDA GUARDA A LIGAÇÃO EXTERNA: QUEBRA SISTEMAS (NÍVEL 4) + LEITURA [R] + IMPACTO [Q].',
                ],
              });
            },
          },
          {
            text: 'MANTER EM AGUARDO',
            onSelect: () => openDialogue({ speaker: 'EIXO DE ADAPTAÇÃO', dialogue: ['OS ANÉIS SEGUEM GIRANDO EM COMPASSO CALMO. A SINCRONIA PODE SER FEITA A QUALQUER MOMENTO.'] }),
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'mirante_vetores_nucleo') {
    const flags = state.progress.flags ??= {};
    flags.observatorio_vetores_nucleo = !flags.observatorio_vetores_nucleo;
    saveGame();
    openDialogue({
      speaker: 'MIRANTE DOS ANÉIS',
      dialogue: flags.observatorio_vetores_nucleo
        ? ['LENTE PANORÂMICA ATIVADA — A CÂMERA ABRE O QUADRO SOBRE O EIXO DE ADAPTAÇÃO E A MALHA CINÉTICA.', 'Caminhe para o sul ou interaja novamente para retomar o enquadramento tático.']
        : ['ENQUADRAMENTO TÁTICO RESTAURADO NA BASE DOS VETORES.'],
    });
    return;
  }

  if (object.id === 'regulador_inercia_nucleo') {
    const flags = state.progress.flags ??= {};
    if (flags.regulador_inercia_nucleo_calibrado) {
      openDialogue({ speaker: 'REGULADOR DE INÉRCIA', dialogue: ['VOLANTE EM RESSONÂNCIA — A MALHA CINÉTICA RECEBE CARGA CONTÍNUA SEM OSCILAÇÃO.'] });
      return;
    }
    flags.regulador_inercia_nucleo_calibrado = true;
    if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    saveGame();
    openDialogue({
      speaker: 'REGULADOR DE INÉRCIA',
      dialogue: ['VOLANTE DE LATÃO GIRADO — O PONTEIRO VERDE ESTABILIZA E A MALHA PASSA A RESPIRAR EM CARGA CONTÍNUA.', 'EXPERIÊNCIA DE CAMPO REGISTRADA (+25 XP).'],
    });
    return;
  }

  if (object.id === 'bomba_inducao_viaduto') {
    const flags = state.progress.flags ??= {};
    if (flags.bomba_viaduto_estabilizada) {
      openDialogue({ speaker: 'BOMBA DE INDUÇÃO', dialogue: ['PRESSÃO EQUALIZADA. A FITA DE INDUÇÃO DO VIADUTO RECEBE CARGA CONTÍNUA — O POD DE MANUTENÇÃO SEGUE SEU CICLO SEM OSCILAÇÃO.'] });
      return;
    }
    flags.bomba_viaduto_estabilizada = true;
    if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    saveGame();
    openDialogue({
      speaker: 'BOMBA DE INDUÇÃO',
      dialogue: [
        'VÁLVULA DE RETORNO AJUSTADA — O COBRE AQUECE, O MANÔMETRO ESTABILIZA E A TRELIÇA RESPONDE EM CARGA CONTÍNUA.',
        'MANUTENÇÃO REGISTRADA (+25 XP). O REGISTRO DE VETOR EXTERNO ESTÁ LOGO À FRENTE, NO MEIO DA PASSARELA.',
      ],
    });
    return;
  }

  if (object.id === 'terminal_carga_viaduto') {
    const flags = state.progress.flags ??= {};
    if (flags.terminal_carga_viaduto_registrado) {
      openDialogue({ speaker: 'TERMINAL DE CARGA', dialogue: ['PASSAGEM REGISTRADA. O VIADUTO SEGUE ÍNTEGRO ENTRE A BASE DOS VETORES E A ESTAÇÃO QUE RESPIRA.'] });
      return;
    }
    flags.terminal_carga_viaduto_registrado = true;
    if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    saveGame();
    openDialogue({
      speaker: 'TERMINAL DE CARGA',
      dialogue: ['PRIMEIRA TRAVESSIA EXTERNA CONFIRMADA. O CONTRAPESO LIBEROU UMA ROTA FÍSICA DE MANUTENÇÃO, NÃO UM ATALHO DIMENSIONAL.', 'EXPERIÊNCIA DE CAMPO REGISTRADA (+25 XP).'],
    });
    return;
  }

  if (object.id === 'espelho_arquetipos_enseada') {
    const atualId = state.progress?.archetype;
    const atualNome = ARCHETYPES[atualId]?.nome ?? 'NENHUM MÓDULO';
    const descricoes = {
      mare_astral: 'MARÉ ASTRAL ATIVO: +10% DE AGILIDADE NA ORLA MOLHADA E NO MAR, ACESSO AO CONDUTO DA DÁRSENA E SINTONIA COM OSTRAS E TARTARUGAS.',
      nucleo_dez_forma: 'NÚCLEO 10X ATIVO: +8% DE VELOCIDADE NA AREIA SECA, MAPEAMENTO TÁTICO DO NINHO E LEITURA DE VETORES NO CARRILHÃO.',
      lamina_dominio_anciao: 'DOMÍNIO ANCIÃO ATIVO: POSTURA DE VIGÍLIA NO NINHO DAS TARTARUGAS E RESILIÊNCIA DE FREQUÊNCIA CONTRA OS ECOS INSTÁVEIS.',
      motor_bio_forja: 'MOTOR BIO-FORJA ATIVO: +4% DE RITMO DE MARCHA, REFORÇO ESTRUTURAL DO NINHO E LEITURA MECÂNICA NO RELÓGIO DE MARÉ.',
    };
    const opcoes = Object.values(ARCHETYPES).map(arq => ({
      text: `${arq.id === atualId ? '[ATIVO] ' : ''}${arq.nome}`,
      onSelect: () => {
        sintonizarArquetipoEnseada(arq.id);
        openDialogue({
          speaker: 'ESPELHO DE RESSONÂNCIA',
          dialogue: [
            `RESSONÂNCIA AJUSTADA PARA ${arq.nome}.`,
            descricoes[arq.id] ?? arq.descricao,
          ],
        });
      },
    }));
    openDialogue({
      speaker: 'ESPELHO DE RESSONÂNCIA',
      dialogue: [
        `MÓDULO EM SINTONIA: ${atualNome}.`,
        'ESTE ANEL DE BASALTO REFLETE OS QUATRO CAMINHOS DA EXPEDIÇÃO. SINTONIZE UM ARQUÉTIPO PARA EXPERIMENTAR SEUS EFEITOS NA ENSEADA:',
      ],
      choices: opcoes,
      cancelable: true,
    });
    return;
  }

  if (object.id === 'relogio_mare_enseada') {
    const flags = state.progress.flags ??= {};
    const climaAtual = nomeDoClima(state.clima);
    const mare = mareDoClima(state.clima);
    const arch = state.progress?.archetype;
    const notaArch = arch === 'mare_astral'
      ? 'MARÉ ASTRAL: VOCÊ SENTE A PULSAÇÃO DA CORRENTE ANTES MESMO DAS ONDAS CHEGAREM.'
      : arch === 'motor_bio_forja'
      ? 'BIO-FORJA: O GNÔMON DE BRONZE OPERA POR EXPANSÃO TÉRMICA SALINA.'
      : 'AS FASES LUNARES ALINHAM O TEMPO E A ALTURA DA MARÉ NA ENSEADA.';
    const aplicarClima = (alvoId, rotulo) => {
      if (state.clima) sintonizarClima(state.clima, alvoId);
      flags.enseada_clima_sintonizado = true;
      recordQuestEvent(state.progress, { type: 'enseada_clima_lido', target: 'clima' });
      saveGame();
      openDialogue({
        speaker: 'RELÓGIO DE MARÉ SOLAR',
        dialogue: [
          `MARÉ E ATMOSFERA SINTONIZADAS PARA: ${rotulo}.`,
          'OBSERVE A LUMINOSIDADE, O VENTO NO CARRILHÃO, AS ONDAS E AS LANTERNAS FLUTUANTES NA BAÍA.',
        ],
      });
    };
    openDialogue({
      speaker: 'RELÓGIO DE MARÉ SOLAR',
      dialogue: [
        `ESTADO ATUAL: ${climaAtual} • MARÉ ${(mare.altura * 100).toFixed(0)}%.`,
        notaArch,
      ],
      choices: [
        { text: 'CÉU LIMPO (MARÉ CALMA)', onSelect: () => aplicarClima('limpo', 'CÉU LIMPO') },
        { text: 'BRISA DE LESTE (ONDA LEVE)', onSelect: () => aplicarClima('brisa', 'BRISA DE LESTE') },
        { text: 'GAROA COSTEIRA (NÉVOA & CHUVA)', onSelect: () => aplicarClima('garoa', 'GAROA COSTEIRA') },
        { text: 'RESSACA (MAR FORTE & VENTO)', onSelect: () => aplicarClima('ressaca', 'RESSACA') },
      ],
      cancelable: true,
    });
    return;
  }

  if (object.id === 'fonte_termal_enseada') {
    const flags = state.progress.flags ??= {};
    if (state.player) {
      state.player.health = state.player.maxHealth ?? state.player.health ?? 100;
      state.player.energy = state.player.maxEnergy ?? state.player.energy ?? 100;
    }
    if (state.progress.energiaMax != null) state.progress.energia = state.progress.energiaMax;
    const primeira = !flags.enseada_fonte_termal_visitada;
    flags.enseada_fonte_termal_visitada = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    recordQuestEvent(state.progress, { type: 'enseada_fonte_termal', target: 'fonte' });
    saveGame();
    const falaArch = {
      mare_astral: 'A ÁGUA MINERAL QUENTE REALINHA SEU FÔLEGO E A PRESSÃO DO MÓDULO.',
      motor_bio_forja: 'O VAPOR SALINO DISSOLVE OS RESÍDUOS DE FERRO E ESTABILIZA A BATERIA DO TRAJE.',
      lamina_dominio_anciao: 'O CALOR DA ROCHA RELAXA A POSTURA E RETEMPERA A FREQUÊNCIA DA LÂMINA.',
      nucleo_dez_forma: 'A OSCILAÇÃO DE ENERGIA SE ACALMA; TODAS AS FORMAS ESTÃO PRONTAS PARA ADAPTACÃO.',
    }[state.progress?.archetype] ?? 'AS ÁGUAS TERMAIS RESTAURAM COMPLETAMENTE SUA ENERGIA E VITALIDADE.';
    openDialogue({
      speaker: 'FONTE TERMAL DA ENSEADA',
      dialogue: [
        'VAPOR MORNO E CHEIRO DE ALGAS E BASALTO SUBINDO DA LAGOA.',
        falaArch,
        primeira ? 'VIDA E ENERGIA RESTAURADAS (+15 XP).' : 'VIDA E ENERGIA TOTALMENTE RESTAURADAS.',
      ],
    });
    return;
  }

  if (object.id === 'ninho_tartarugas_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_ninho_inspecionado;
    flags.enseada_ninho_inspecionado = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    recordQuestEvent(state.progress, { type: 'enseada_vida_costeira', target: 'costa' });
    saveGame();
    const falaArch = {
      mare_astral: 'MARÉ ASTRAL: VOCÊ OUVE AS BATIDAS CALMAS DENTRO DOS OVOS — ELAS ESPERAM A PRÓXIMA MARÉ ALTA PARA CORRER AO MAR.',
      motor_bio_forja: 'BIO-FORJA: VOCÊ REAPERTA OS NÓS DE CORDA NA CERCA DE BAMBU PARA PROTEGER A NINHADA DA RESSACA.',
      lamina_dominio_anciao: 'DOMÍNIO ANCIÃO: SUA VIGÍLIA GARANTE QUE NENHUM ECO INSTÁVEL SE APROXIME DESTA ÁREA DE DESOVA.',
      nucleo_dez_forma: 'NÚCLEO 10X: OS SENSORES TRAÇAM UM CORREDOR LIVRE ENTRE O NINHO E A MARGEM LESTE PARA OS FILHOTES.',
    }[state.progress?.archetype] ?? 'CINCO OVOS AQUECIDOS PELA AREIA. A CERCA DE BAMBU MANTÉM O NINHO SEGURO.';
    openDialogue({
      speaker: 'NINHO DE TARTARUGAS',
      dialogue: [
        falaArch,
        primeira ? 'OBSERVAÇÃO COSTEIRA REGISTRADA (+15 XP).' : 'A NINHADA PERMANECE PROTEGIDA.',
      ],
    });
    return;
  }

  if (object.id === 'banco_ostras_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_perola_colhida;
    if (primeira) {
      flags.enseada_perola_colhida = true;
      state.progress.inventory ??= [];
      if (!state.progress.inventory.includes('perola_luminescente_enseada')) {
        state.progress.inventory.push('perola_luminescente_enseada');
      }
      if (state.progress.archetype) grantArchetypeXp(state.progress, 20);
    }
    recordQuestEvent(state.progress, { type: 'enseada_vida_costeira', target: 'costa' });
    saveGame();
    const archNota = state.progress?.archetype === 'mare_astral'
      ? 'MARÉ ASTRAL: A PÉROLA VIBRA EM FASE COM O CONDUTO ABISSAL LOGO AO NORTE.'
      : 'A OSTRA ABRE DE LEVE AO SENTIR A CORRENTEZA LIMPA DA BAÍA.';
    openDialogue({
      speaker: 'BANCO DE OSTRAS PÉROLA',
      dialogue: [
        primeira
          ? 'ENTRE AS CONCHAS DE PEDRA, UMA OSTRA REVELA UMA PÉROLA LUMINESCENTE INTACTA.'
          : 'O BANCO DE OSTRAS BRILHA SUAVEMENTE SOB A MARÉ DA ENSEADA.',
        archNota,
        primeira ? 'ITEM OBTIDO: PÉROLA LUMINESCENTE DA ENSEADA (+20 XP).' : 'REGISTRADO NO CÓDEX [J].',
      ],
    });
    return;
  }

  if (object.id === 'carrilhao_vento_enseada') {
    const flags = state.progress.flags ??= {};
    flags.enseada_carrilhao_ouvido = true;
    const climaAtual = nomeDoClima(state.clima);
    const vento = state.clima?.vento ?? 0.35;
    recordQuestEvent(state.progress, { type: 'enseada_clima_lido', target: 'clima' });
    saveGame();
    const ritmo = vento > 0.7 ? 'TOCANDO COM FORÇA NA VENTANIA' : vento > 0.4 ? 'TILINTANDO NUM COMPASSO CONSTANTE' : 'BALANÇANDO DEVAGAR NA BRISA';
    const notaArch = {
      mare_astral: 'OS SINOS DE BRONZE RESPONDEM À PRESSÃO DO AR ANTES DA VIRADA DA MARÉ.',
      nucleo_dez_forma: 'A FREQUÊNCIA DAS CONCHAS FORMA UMA ESCALA DE QUATRO VETORES ACÚSTICOS.',
      lamina_dominio_anciao: 'UM SOM LIMPO E METÁLICO — QUASE COMO O TOQUE DE UMA LÂMINA ANTIGA.',
      motor_bio_forja: 'CONCHAS FURADAS, CORDA AZUL E BAMBU CURADO: ENGENHARIA COSTEIRA SIMPLES E DURÁVEL.',
    }[state.progress?.archetype] ?? 'CONCHAS E SINOS MARCAM A CHEGADA DE QUEM CRUZA A TRILHA DA PRAIA.';
    openDialogue({
      speaker: 'CARRILHÃO DE VENTO',
      dialogue: [
        `TEMPO ATUAL: ${climaAtual} — O CARRILHÃO ESTÁ ${ritmo}.`,
        notaArch,
      ],
    });
    return;
  }

  if (object.id === 'embarcadouro_mare_astral') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_embarcadouro_lido;
    flags.enseada_embarcadouro_lido = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    saveGame();
    const arch = state.progress?.archetype;
    const msg = arch === 'mare_astral'
      ? (flags.rota_livre_enseada_aberta
          ? 'AS RUNAS DO CAIS PULSAM EM AZUL VIVO: O CONDUTO PARA A DÁRSENA DA MARÉ ASTRAL ESTÁ ABERTO LOGO À FRENTE.'
          : 'AS RUNAS DO CAIS RECONHECEM SEU MÓDULO MARÉ ASTRAL. QUANDO A COMPORTA NA DÁRSENA ABRIR, ESTE CAIS LIGARÁ OS DOIS LADOS.')
      : 'CAIS DE PEDRA COM RUNAS HIDRODIMENSIONAIS. OPERADORES COM MARÉ ASTRAL PODEM USAR O CONDUTO ABISSAL AO LESTE.';
    openDialogue({
      speaker: 'EMBARCADOURO DA MARÉ',
      dialogue: [
        msg,
        primeira ? 'ROTA COSTEIRA MAPEADA (+15 XP).' : 'O BRONZE E AS RUNAS MARCAM A MARÉ DA BAÍA.',
      ],
    });
    return;
  }

  if (object.id === 'banco_conchas_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_conchas_examinadas;
    flags.enseada_conchas_examinadas = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    saveGame();
    openDialogue({
      speaker: 'BANCO DE CONCHAS & ESTRELAS',
      dialogue: [
        'BÚZIOS ROSADOS, VIDROS POLIDOS PELO MAR E ESTRELAS-DO-MAR REPOUSAM NA AREIA ÚMIDA.',
        primeira ? 'DESCOBERTA DA ORLA REGISTRADA (+15 XP).' : 'A MARÉ SEMPRE DEVOLVE NOVOS FRAGMENTOS A ESTE TRECHO DA PRAIA.',
      ],
    });
    return;
  }

  if (object.id === 'poleiro_aves_enseada') {
    const flags = state.progress.flags ??= {};
    flags.enseada_poleiro_observado = true;
    saveGame();
    openDialogue({
      speaker: 'POLEIRO DAS AVES',
      dialogue: [
        'PENAS LUMINOSAS E UM NINHO ALTO VIGIAM O SUL DA ENSEADA.',
        'DAQUI SE AVISTAM OS TRÊS RASTROS DA ILHA, A FONTE TERMAL A OESTE E AS ÁGUAS CLARAS DA BAÍA LESTE.',
      ],
    });
    return;
  }

  if (object.id === 'bancada_campo_enseada') {
    const flags = state.progress.flags ??= {};
    const arch = state.progress?.archetype ?? 'motor_bio_forja';
    const buffs = {
      mare_astral: { id: 'pulso_salino', nome: 'PULSO SALINO', desc: '+10% EXTRA DE AGILIDADE NA ORLA E NA ÁGUA + ENERGIA RESTAURADA.' },
      nucleo_dez_forma: { id: 'vetor_leve', nome: 'VETOR LEVE', desc: '+10% EXTRA DE VELOCIDADE EM AREIA SECA + ENERGIA RESTAURADA.' },
      lamina_dominio_anciao: { id: 'fio_ancestral', nome: 'FIO ANCESTRAL', desc: '+35% DE DANO NOS GOLPES NA ENSEADA E PROTEÇÃO CONTRA ECOS INSTÁVEIS.' },
      motor_bio_forja: { id: 'escudo_bio', nome: 'ESCUDO BIO-FORJA', desc: '50% MENOS DANO DE ECOS INSTÁVEIS NA ENSEADA + ENERGIA RESTAURADA.' },
    };
    const buff = buffs[arch] ?? buffs.motor_bio_forja;
    if (state.player) {
      state.player.enseadaBuff = buff.id;
      state.player.energy = state.player.maxEnergy ?? state.player.energy ?? 100;
    }
    if (state.progress.energiaMax != null) state.progress.energia = state.progress.energiaMax;
    const primeira = !flags.enseada_bancada_calibrada;
    flags.enseada_bancada_calibrada = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 20);
    recordQuestEvent(state.progress, { type: 'enseada_bancada_calibrada', target: 'bancada' });
    saveGame();
    openDialogue({
      speaker: 'BANCADA DE CAMPO',
      dialogue: [
        `CRISTAIS DE RESSONÂNCIA ALINHADOS PARA ${ARCHETYPES[arch]?.nome ?? 'SEU MÓDULO'}: ${buff.nome}.`,
        buff.desc,
        primeira ? 'CALIBRAÇÃO DE CAMPO REGISTRADA (+20 XP).' : 'SINTONIA DE CAMPO REATIVADA.',
      ],
    });
    return;
  }

  if (object.id === 'torre_antena_enseada') {
    const flags = state.progress.flags ??= {};
    const climaAtual = nomeDoClima(state.clima);
    const primeira = !flags.enseada_torre_lida;
    flags.enseada_torre_lida = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    recordQuestEvent(state.progress, { type: 'enseada_torre_lida', target: 'torre' });
    saveGame();
    const sinal = flags.frequencia666Registrada
      ? 'A ANTENA CONFIRMA: O SINAL DE 66.6 MHz ESTÁ ANCORADO ENTRE A ESTAÇÃO E A BAÍA LESTE.'
      : 'INTERFERÊNCIA DE SAL DETECTADA. USE [R] NO TERMINAL DE MANUTENÇÃO ABAIXO PARA ISOLAR A FREQUÊNCIA 66.6.';
    const notaClima = (state.clima?.atual === 'chuva' || state.clima?.atual === 'ressaca')
      ? `TEMPO (${climaAtual}): DESCARGAS ATMOSFÉRICAS CARREGAM O ECO DE TREINO AO SUL — DERROTÁ-LO RENDE BÔNUS DE TEMPESTADE.`
      : `TEMPO (${climaAtual}): RECEPÇÃO LIMPA PELO ARQUIPÉLAGO.`;
    openDialogue({
      speaker: 'TORRE-ANTENA DE ESCUTA',
      dialogue: [sinal, notaClima],
    });
    return;
  }

  if (object.id === 'barco_expedicao_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_barco_inspecionado;
    flags.enseada_barco_inspecionado = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    recordQuestEvent(state.progress, { type: 'enseada_navegacao_lida', target: 'baia' });
    saveGame();
    const archNota = {
      mare_astral: 'MARÉ ASTRAL: O CASCO ESTÁ EM EQUILÍBRIO PERFEITO COM A CORRENTE DE LESTE.',
      motor_bio_forja: 'BIO-FORJA: CALAFETAÇÃO E CORDAMES DE BRONZE EM ÓTIMO ESTADO PARA TRAVESSIA.',
      lamina_dominio_anciao: 'DOMÍNIO ANCIÃO: PROA REFORÇADA CONTRA REBENTAÇÃO DE RECIFE.',
      nucleo_dez_forma: 'NÚCLEO 10X: VELA ENROLADA PRONTA PARA VENTOS DE TRAVÉS.',
    }[state.progress?.archetype] ?? 'VELEIRO LEVE DA EXPEDIÇÃO ANCORADO NA BAÍA.';
    const choices = [
      {
        text: 'NAVEGAR: CAMINHO DAS CORRENTES',
        onSelect: () => {
          void usePortal({
            id: 'barco_para_correntes',
            label: 'CAMINHO DAS CORRENTES',
            destino: { mapId: 'mar_caminho_das_correntes', spawnId: 'vindo_da_enseada' },
            transition: 'fade',
          });
        },
      },
    ];
    if (flags.docas_sinal_interceptado) choices.unshift({
      text: 'ZARPAR: DOCAS DA NEBLINA',
      onSelect: () => { if (!state.progress.archetype) openDialogue({speaker:'NEXO-04',dialogue:['CALIBRE UM MÓDULO DE ECO ANTES DE ZARPAR.']}); else iniciarTravessiaNeblina(state); },
    });
    if (flags.conduto_enseada_mare) {
      choices.push({
        text: 'NAVEGAR: ROTA DA MARÉ ASTRAL',
        onSelect: () => {
          void usePortal({
            id: 'barco_para_mare',
            label: 'ROTA DA MARÉ ASTRAL',
            destino: { mapId: 'mar_rota_mare_astral', spawnId: 'vindo_da_enseada' },
            transition: 'fade',
          });
        },
      });
    }
    choices.push({ text: 'PERMANECER NA ENSEADA', onSelect: () => {} });
    openDialogue({
      speaker: 'BARCO DE EXPEDIÇÃO',
      dialogue: [
        archNota,
        flags.conduto_enseada_mare
          ? 'COM O CONDUTO ABERTO, ESTE BARCO ALCANÇA O CAMINHO DAS CORRENTES E A ROTA DA MARÉ ASTRAL.'
          : 'ESTE BARCO COBRE A ROTA ATÉ O CAMINHO DAS CORRENTES. DESEJA ZARPAR AGORA?',
      ],
      choices,
      cancelable: true,
    });
    return;
  }

  if (object.id === 'farolete_baia_enseada') {
    const flags = state.progress.flags ??= {};
    flags.enseada_farolete_lido = true;
    recordQuestEvent(state.progress, { type: 'enseada_navegacao_lida', target: 'baia' });
    saveGame();
    const climaAtual = nomeDoClima(state.clima);
    const temBussola = Array.isArray(state.progress.inventory) && state.progress.inventory.includes('bussola_mar_ecos');
    const linhas = [
      `FEIXE TURQUESA ACESO SOB ${climaAtual}. A LUZ DO FAROLETE DISSIPA ATÉ 55% DA NEBLINA NA BAÍA NORTE.`,
      'AO SUL FICA O PORTAL DO CAMINHO DAS CORRENTES; LOGO ABAIXO DO CAIS, O CONDUTO ABISSAL DA DÁRSENA.',
    ];
    if (temBussola) {
      linhas.push(`BÚSSOLA DE MARÉ: ${getEnseadaCompassReport(state.progress).summary.toUpperCase()}`);
    }
    openDialogue({
      speaker: 'FAROLETE DA BAÍA',
      dialogue: linhas,
    });
    return;
  }

  if (object.id === 'acampamento_vigilia_enseada') {
    const flags = state.progress.flags ??= {};
    if (state.player) {
      const maxHp = state.player.maxHealth ?? 100;
      const maxEn = state.player.maxEnergy ?? 100;
      state.player.health = Math.min(maxHp, (state.player.health ?? maxHp) + Math.round(maxHp * 0.35));
      state.player.energy = Math.min(maxEn, (state.player.energy ?? maxEn) + Math.round(maxEn * 0.4));
    }
    const primeira = !flags.enseada_acampamento_visitado;
    flags.enseada_acampamento_visitado = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    recordQuestEvent(state.progress, { type: 'enseada_vigilia_lida', target: 'vigilia' });
    saveGame();
    openDialogue({
      speaker: 'ACAMPAMENTO DE VIGÍLIA',
      dialogue: [
        'BRASAS MORNAS E UM DIÁRIO DE CAMPO: "OS TRÊS RASTROS LEVAM A UMA PEQUENA LUZ ENTRE AS RUÍNAS E A MATA."',
        primeira ? 'DESCANSO NA FOGUEIRA (+35% VIDA E +40% ENERGIA, +15 XP).' : 'ENERGIA E FÔLEGO RECUPERADOS JUNTO À FOGUEIRA.',
      ],
    });
    return;
  }

  if (object.id === 'santuario_lumeo_enseada') {
    const flags = state.progress.flags ??= {};
    const temLumeo = !!flags.collected_lumeo_vinculo;
    const primeira = !flags.enseada_santuario_lumeo_lido;
    flags.enseada_santuario_lumeo_lido = true;
    if (primeira && temLumeo && state.progress.archetype) grantArchetypeXp(state.progress, 20);
    recordQuestEvent(state.progress, { type: 'enseada_vigilia_lida', target: 'vigilia' });
    saveGame();
    openDialogue({
      speaker: 'SANTUÁRIO DE LÚMEO',
      dialogue: temLumeo
        ? [
            'LÚMEO RESSOA COM O CRISTAL AZUL DO ALTAR, ILUMINANDO TODO O BOSQUE LESTE.',
            primeira ? 'VÍNCULO HARMONIZADO NO SANTUÁRIO (+20 XP).' : 'A LUZ DO COMPANHEIRO CONTINUA ESTÁVEL JUNTO À SUA.',
          ]
        : [
            'UM ALTAR DE PEDRA E MUSGO QUE GUARDA A MEMÓRIA DE UM PEQUENO ECO.',
            'INVESTIGUE OS TRÊS RASTROS DA ENSEADA PARA DESPERTAR O SINAL DE LÚMEO.',
          ],
    });
    return;
  }

  if (object.id === 'totem_eco_enseada') {
    const climaAtual = nomeDoClima(state.clima);
    const tempestade = state.clima?.atual === 'chuva' || state.clima?.atual === 'ressaca';
    openDialogue({
      speaker: 'MONÓLITO DE ECO',
      dialogue: [
        tempestade
          ? `O TEMPO (${climaAtual}) INTENSIFICA O ECO DE TREINO AO LADO! DISPERSÁ-LO AGORA CONCEDE BÔNUS DE TEMPESTADE.`
          : `TEMPO ATUAL (${climaAtual}). SINTONIZE CHUVA OU RESSACA NO RELÓGIO DE MARÉ PARA DESAFIAR O ECO CARREGADO.`,
        'DICA TÁTICA: O ARQUÉTIPO DOMÍNIO ANCIÃO E O ESCUDO DA BANCADA REDUZEM O DANO DAS ZONAS DE ECO INSTÁVEL.',
      ],
    });
    return;
  }

  // ---- ENSEADA DOS ECOS 2.0 — Lote #6 ----
  if (object.id === 'piscina_mare_viva_enseada') {
    const { primeira, arch } = registrarVisitaImersiva(object);
    openDialogue({
      speaker: 'PISCINA DE MARÉ VIVA',
      dialogue: [
        arch === 'mare_astral'
          ? 'ANÊMONAS E ESTRELAS RESPONDEM À MARÉ ASTRAL, RESTAURANDO TODA A SUA ENERGIA E FÔLEGO.'
          : 'ÁGUA CRISTALINA E CORAIS RASOS REFRESCAM SEUS SISTEMAS (+40% ENERGIA E FÔLEGO).',
        primeira ? 'MICRO-ECO DA POÇA REGISTRADO (+12 XP).' : 'A POÇA CONTINUA PULSANDO COM A MARÉ.',
      ],
    });
    return;
  }

  if (object.id === 'cais_madeira_pesca_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_cais_pesca_lido;
    flags.enseada_cais_pesca_lido = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 10);
    saveGame();
    const mare = mareDoClima(state.clima);
    const mareLabel = mare.altura >= 0.65 ? 'ALTA' : mare.altura >= 0.35 ? 'MÉDIA' : 'BAIXA';
    openDialogue({
      speaker: 'CAIS DA ENSEADA',
      dialogue: [
        `MARÉ ATUAL: ${mareLabel} (${Math.round(mare.altura * 100)}%). CARDUMES COSTUMAM PASSAR LOGO ABAIXO DAS ESTACAS DE MADEIRA.`,
        state.progress?.archetype === 'mare_astral'
          ? 'MARÉ ASTRAL RECONHECE AS CORRENTES DA BAÍA: O CONDUTO LESTE ESTÁ ALINHADO COM A DÁRSENA.'
          : 'DAQUI VOCÊ AVISTA O EMBARCADOURO, O FAROLETE E O BARCO DE EXPEDIÇÃO.',
      ],
    });
    return;
  }

  if (object.id === 'coral_luminescente_enseada') {
    const flags = state.progress.flags ??= {};
    state.progress.inventory ??= [];
    const primeira = !flags.enseada_coral_colhido;
    flags.enseada_coral_colhido = true;
    if (!state.progress.inventory.includes('amostra_coral_enseada')) {
      state.progress.inventory.push('amostra_coral_enseada');
    }
    if (state.player) {
      const maxEn = state.player.maxEnergy ?? 100;
      state.player.energy = Math.min(maxEn, (state.player.energy ?? maxEn) + 25);
    }
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    saveGame();
    openDialogue({
      speaker: 'RECIFE LUMINESCENTE',
      dialogue: [
        primeira
          ? 'VOCÊ RECOLHEU UM FRAGMENTO DE CORAL BIOLUMINESCENTE (+15 XP, +25 ENERGIA).'
          : 'A LUZ AZUL DO RECIFE RECARREGA +25 DE ENERGIA AO TOQUE.',
        state.progress?.archetype === 'motor_bio_forja'
          ? 'BIO-FORJA REGISTRA A SIMBIOSE DO RECIFE COM EXTREMA CLAREZA.'
          : 'O FRAGMENTO ESTÁ GUARDADO NO INVENTÁRIO DO CÓDEX [J].',
      ],
    });
    return;
  }

  if (object.id === 'estela_navegadores_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_estela_decifrada;
    flags.enseada_estela_decifrada = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 20);
    recordQuestEvent(state.progress, { type: 'interact_enseada', target: 'estela_navegadores_enseada' });
    saveGame();
    const archTexto = {
      mare_astral: 'AS RUNAS ESTELARES SE ALINHAM COM A MARÉ ASTRAL, APONTANDO O TRIÂNGULO PRAIA–ENSEADA–CORRENTES.',
      lamina_dominio_anciao: 'A GRAVAÇÃO DA ESTELA TRAZ TRAÇOS DA ERA DO DOMÍNIO ANCIÃO ANTES DA RUPTURA.',
      motor_bio_forja: 'CRACAS E ALGAS PRESERVARAM OS ENTALHES SEM CORROER O NÚCLEO DA PEDRA.',
      nucleo_dez_forma: 'AS CONSTELAÇÕES MUDAM DE ÂNGULO CONFORME VOCÊ ALTERA SUA FORMA NO NÚCLEO.',
    }[state.progress?.archetype] ?? 'UM MAPA DE NAVEGAÇÃO ANTIGO LIGA A ENSEADA À ESTAÇÃO 66.6 E ÀS CORRENTES.';
    openDialogue({
      speaker: 'ESTELA DOS NAVEGADORES',
      dialogue: [
        archTexto,
        primeira ? 'INSCRIÇÃO REGISTRADA NO CÓDEX (+20 XP).' : 'AS RUNAS CONTINUAM BRILHANDO EM TURQUESA.',
      ],
    });
    return;
  }

  if (object.id === 'algas_douradas_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_algas_colhidas;
    flags.enseada_algas_colhidas = true;
    const arch = state.progress?.archetype;
    if (state.player) {
      const maxHp = state.player.maxHealth ?? 100;
      const pct = arch === 'motor_bio_forja' ? 0.4 : 0.25;
      state.player.health = Math.min(maxHp, (state.player.health ?? maxHp) + Math.round(maxHp * pct));
    }
    if (primeira && arch) grantArchetypeXp(state.progress, 12);
    saveGame();
    openDialogue({
      speaker: 'BANCO DE ALGAS DOURADAS',
      dialogue: [
        arch === 'motor_bio_forja'
          ? 'BIO-FORJA EXTRAI NUTRIENTES MARINHOS CONCENTRADOS (+40% VIDA).'
          : 'ESSÊNCIA SUAVE DAS ALGAS DOURADAS RESTAURA +25% DE VIDA.',
        primeira ? 'PROPRIEDADE COSTEIRA REGISTRADA (+12 XP).' : 'AS FOLHAS DOURADAS ONDULAM NA MARÉ.',
      ],
    });
    return;
  }

  if (object.id === 'captador_ecos_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_captador_sintonizado;
    flags.enseada_captador_sintonizado = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 20);
    recordQuestEvent(state.progress, { type: 'interact_enseada', target: 'captador_ecos_enseada' });
    saveGame();
    const report = getEnseadaCompassReport(state.progress);
    openDialogue({
      speaker: 'CAPTADOR DE ECOS',
      dialogue: [
        'OS CRISTAIS DE QUARTZO E FIOS DE COBRE AMPLIFICAM A RESSONÂNCIA DE TODA A COSTA.',
        `VARREDURA DA ILHA (${report.done}/${report.total}): ${report.summary.toUpperCase()}`,
      ],
    });
    return;
  }

  if (object.id === 'gruta_concha_enseada') {
    const { primeira } = registrarVisitaImersiva(object);
    const tempestade = state.clima?.atual === 'chuva' || state.clima?.atual === 'ressaca';
    openDialogue({
      speaker: 'FENDA DA MARÉ',
      dialogue: [
        tempestade
          ? 'ABRIGO PERFEITO CONTRA A TEMPESTADE! AS PAREDES DE PEDRA ISOLAM O VENTO E RECUPERAM +30% DE VIDA.'
          : 'O INTERIOR FRESCO DA GRUTA GUARDA REFLEXOS DA LAGOA E RESTAURA +30% DE VIDA.',
        primeira ? 'ABRIGO DA ENSEADA MAPEADO (+15 XP).' : 'UM PONTO SEGURO PARA PAUSAR EM MEIO À EXPLORAÇÃO.',
      ],
    });
    return;
  }

  if (object.id === 'jardim_pedras_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_pedras_meditado;
    flags.enseada_pedras_meditado = true;
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 12);
    const atual = state.player?.enseadaBuff;
    const aplicarFoco = () => {
      if (state.player) state.player.enseadaBuff = 'foco_equilibrio';
    };
    if (!atual || atual === 'foco_equilibrio') {
      aplicarFoco();
      saveGame();
      openDialogue({
        speaker: 'PEDRAS DO EQUILÍBRIO',
        dialogue: [
          'VOCÊ ALINHA A RESPIRAÇÃO COM A BRISA COSTEIRA. BUFF ATIVO: FOCO DE EQUILÍBRIO (+2 ENERGIA/s NA ENSEADA).',
          primeira ? 'SERENIDADE REGISTRADA (+12 XP).' : 'O EQUILÍBRIO PERMANECE ESTÁVEL.',
        ],
      });
      return;
    }
    saveGame();
    openDialogue({
      speaker: 'PEDRAS DO EQUILÍBRIO',
      dialogue: [
        `VOCÊ JÁ POSSUI UM BUFF DA BANCADA ATIVO (${atual.toUpperCase()}). DESEJA TROCAR PARA FOCO DE EQUILÍBRIO (+2 EN/s)?`,
      ],
      choices: [
        { text: 'ATIVAR FOCO DE EQUILÍBRIO (+2 EN/s)', onSelect: () => { aplicarFoco(); saveGame(); } },
        { text: 'MANTER BUFF DA BANCADA', onSelect: () => {} },
      ],
      cancelable: true,
    });
    return;
  }

  if (object.id === 'bau_deriva_enseada') {
    const flags = state.progress.flags ??= {};
    state.progress.inventory ??= [];
    const primeira = !flags.enseada_bau_aberto;
    flags.enseada_bau_aberto = true;
    if (primeira) {
      if (!state.progress.inventory.includes('perola_luminescente_enseada')) {
        state.progress.inventory.push('perola_luminescente_enseada');
      }
      if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    }
    recordQuestEvent(state.progress, { type: 'interact_enseada', target: 'bau_deriva_enseada' });
    saveGame();
    openDialogue({
      speaker: 'ARCAZ À DERIVA',
      dialogue: primeira
        ? [
            'DENTRO DO ARCAZ ENCRUSTADO DE CRACAS HÁ UM DIÁRIO DE BORDO SELADO E UMA PÉROLA LUMINESCENTE.',
            'ESPÓLIO DA BAÍA COLETADO (+25 XP).',
          ]
        : ['O ARCAZ JÁ FOI EXPLORADO. RESTAM APENAS AS FERRAGENS ANTIGAS SALGADAS PELO MAR.'],
    });
    return;
  }

  if (object.id === 'maleta_expedicao_enseada') {
    const flags = state.progress.flags ??= {};
    const primeira = !flags.enseada_maleta_aberta;
    flags.enseada_maleta_aberta = true;
    if (state.player) {
      const maxHp = state.player.maxHealth ?? 100;
      const maxEn = state.player.maxEnergy ?? 100;
      state.player.health = Math.min(maxHp, (state.player.health ?? maxHp) + Math.round(maxHp * 0.3));
      state.player.energy = Math.min(maxEn, (state.player.energy ?? maxEn) + Math.round(maxEn * 0.5));
    }
    if (primeira && state.progress.archetype) grantArchetypeXp(state.progress, 15);
    saveGame();
    openDialogue({
      speaker: 'MALETA DA EXPEDIÇÃO',
      dialogue: [
        'CÉLULAS DE EMERGÊNCIA DA ESTAÇÃO 66.6 INTACTAS: +30% VIDA E +50% ENERGIA REABASTECIDAS.',
        primeira ? 'SUPRIMENTOS TÁTICOS REGISTRADOS (+15 XP).' : 'A MALETA SEGUE PRONTA PARA RECARGA EM CAMPO.',
      ],
    });
    return;
  }

  if (object.gate) {
    if (!checkGate(object.gate)) {
      openDialogue({
        speaker: object.nome ?? 'OBSTÁCULO',
        dialogue: getGateFailureMessage(object.gate),
      });
      return;
    }
    if (object.gate.requiredAction) {
      const mensagens = [];
      if (object.gate.breaksWith === 'peso' && getArchetypeLevel(state.progress) < (object.gate.requiredLevel ?? 4)) {
        mensagens.push(object.gate.promptFalha ?? 'ESTRUTURA EXIGE MAIS MASSA DO QUE SEU NÍVEL ATUAL FORNECE.');
      }
      mensagens.push(object.gate.actionMessage ?? 'APONTE PARA O OBSTÁCULO E USE [Q] PARA ROMPÊ-LO.');
      openDialogue({ speaker: object.nome ?? 'OBSTÁCULO', dialogue: mensagens });
      return;
    }
    openGate(object);
    if (object.gate.xpReward) grantArchetypeXp(state.progress, object.gate.xpReward);
    recordQuestEvent(state.progress, { type: 'repair_gate', target: object.id });
    saveGame();
    openDialogue({
      speaker: object.nome ?? 'SISTEMA',
      dialogue: getGateSuccessMessage(object.gate),
    });
    return;
  }

  openDialogue({
    speaker: interaction.speaker ?? object.nome ?? 'SISTEMA',
    dialogue: interaction.dialogue ?? interaction.mensagem ?? ['...'],
  });
}

// =====================================================================
// UPDATE PRINCIPAL
// =====================================================================

export async function checkInteractions(pressedE, { onObject } = {}) {
  if (isDialogueOpen()) {
    state.interaction.active = null;
    state.onElevator = false;
    return;
  }

  const nearest = findNearestInteraction();
  state.interaction.active = nearest;
  state.onElevator = nearest?.kind === 'portal';

  if (!nearest || !pressedE) return;

  if (nearest.kind === 'portal') { await interactWithPortal(nearest.data); return; }
  if (nearest.kind === 'collectible') { collectItem(nearest.data); return; }
  if (nearest.kind === 'actor') { interactWithActor(nearest.data); return; }
  if (nearest.kind === 'fauna') { interactWithFauna(nearest.data); return; }
  if (nearest.kind === 'object') {
    if (onObject?.(nearest.data, () => interactWithObject(nearest.data))) return;
    interactWithObject(nearest.data);
  }
} 