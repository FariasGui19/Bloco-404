// js/game/module-interactions.js
// =====================================================================
// MODULE INTERACTIONS
// =====================================================================

import { state } from './state.js';
import { openDialogue } from '../ui/dialogue.js';
import { saveGame } from './save.js';
import { recordAirportDiagnosis, recordCargoDiagnosis, installMetroFragment } from './metro-quest.js';
import { isGateOpen } from './gates.js';
import { hasAbility, showAbilityMessage, ARCHETYPE_ABILITIES } from './abilities.js';
import { recordQuestEvent } from './quests.js';

const DEFAULT_MODULE_DISTANCE = 1.65;

function distanceBetween(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function canDiagnose(item) {
  if (!item?.moduleSystem || isGateOpen(item)) return false;
  if (item.moduleSystem.requiresFlag && !state.progress.flags?.[item.moduleSystem.requiresFlag]) return false;
  const allowed = item.moduleSystem.allowedArchetypes;
  if (!allowed) return true; // Qualquer módulo pode ler se o mapa não especificar
  return allowed.includes(state.progress.archetype);
}

function getSystemDistance(item) {
  return item.moduleSystem?.distance ?? item.moduleSystem?.interactionDistance ?? DEFAULT_MODULE_DISTANCE;
}

function getNearestModuleSystem() {
  const player = state.player;
  let best = null;

  function consider(kind, item) {
    if (!canDiagnose(item)) return;
    const distance = distanceBetween(player.x, player.y, item.x, item.y);
    if (distance > getSystemDistance(item)) return;
    if (!best || distance < best.distance) {
      best = { kind, item, distance };
    }
  }

  for (const object of state.objects ?? []) consider('object', object);
  for (const actor of state.actors ?? []) consider('actor', actor);
  return best;
}

// ---------------------------------------------------------------------
// Prompt para HUD
// ---------------------------------------------------------------------
export function getModuleInteractionPrompt() {
  const archetype = state.progress.archetype;
  if (!archetype) return null;

  // Pega a habilidade secundária (R) do arquétipo
  const abilityId = ARCHETYPE_ABILITIES[archetype]?.[1];
  if (!abilityId || !hasAbility(abilityId)) return null;

  const target = getNearestModuleSystem();
  if (!target) return null;

  return target.item.moduleSystem?.label ?? 'DIAGNOSTICAR SISTEMA';
}

// ---------------------------------------------------------------------
// Diagnósticos Específicos (Mantidos para não quebrar o progresso)
// ---------------------------------------------------------------------
function diagnoseAirportTerminal(target) {
  const flags = state.progress.flags ??= {};
  const route = { lamina_dominio_anciao: ['FREQUÊNCIA ANCESTRAL IDENTIFICADA.', 'CÂMARA DE FREQUÊNCIA: LEIA O LACRE COM R E ROMPA COM Q.'], mare_astral: ['FLUXO ASTRAL IDENTIFICADO.', 'CÂMARA DE FLUXO: LEIA A CORRENTE COM R E ATRAVESSE COM Q.'], nucleo_dez_forma: ['ECO CINÉTICO IDENTIFICADO.', 'CÂMARA DE ECO: LEIA A MALHA COM R E ACELERE COM Q.'] }[state.progress.archetype];
  if (route) {
    recordAirportDiagnosis(state.progress);
    saveGame();
    openDialogue({ speaker: 'TERMINAL DE MANUTENÇÃO', dialogue: [route[0], 'FRAGMENTO DETECTADO NA CÂMARA ATRÁS DA PORTA DA CARGA.', route[1]] });
    return;
  }
  if (flags.airportTerminalDiagnosed) {
    openDialogue({
      speaker: 'TERMINAL DE MANUTENÇÃO',
      dialogue: [
        'LINK BIO-FORJA RESTABELECIDO.',
        'DIAGNÓSTICO ANTERIOR MANTIDO.',
        'FRAGMENTO DE SINCRONIZAÇÃO: NÃO LOCALIZADO.',
        'ÚLTIMO RASTRO: ÁREA DE CARGA DESATIVADA.',
      ],
    });
    return;
  }

  recordAirportDiagnosis(state.progress);
  saveGame();
  openDialogue({
    speaker: 'TERMINAL DE MANUTENÇÃO',
    dialogue: [
      'LINK BIO-FORJA ESTABELECIDO.',
      'FALHA PRINCIPAL IDENTIFICADA: CONDUTOR DE SINCRONIA AUSENTE.',
      'RASTRO DIMENSIONAL DETECTADO.',
      'LOCAL PROVÁVEL: ÁREA DE CARGA DESATIVADA.',
      'MISSÃO ATUALIZADA: LOCALIZAR FRAGMENTO DE SINCRONIZAÇÃO.',
    ],
  });
}

function diagnoseMetroSystem(target) {
  const flags = state.progress.flags ??= {};
  if (!flags.airportTerminalDiagnosed) {
    openDialogue({
      speaker: 'PAINEL DO METRÔ',
      dialogue: [
        'MÓDULO COMPATÍVEL: ACEITO.',
        'ERRO CRÍTICO: ROTA DIMENSIONAL SEM SINCRONIA.',
        'RECOMENDAÇÃO: ANALISAR TERMINAL DE MANUTENÇÃO NO AEROPORTO CENTRAL.',
      ],
    });
    return;
  }
  if (!flags.fragmentoSincronizacaoColetado) {
    openDialogue({
      speaker: 'PAINEL DO METRÔ',
      dialogue: [
        'MÓDULO COMPATÍVEL: ACEITO.',
        'DIAGNÓSTICO ATUALIZADO.',
        'FRAGMENTO DE SINCRONIZAÇÃO AINDA NÃO INSTALADO.',
        'A LINHA INTERDIMENSIONAL PERMANECE BLOQUEADA.',
        'LOCALIZE O FRAGMENTO ATRÁS DA PORTA DE CARGA DO AEROPORTO.',
      ],
    });
    return;
  }
  if (flags.metroCalibrado) {
    openDialogue({
      speaker: 'PAINEL DO METRÔ',
      dialogue: [
        'LINHA INTERDIMENSIONAL OPERACIONAL.',
        'PLATAFORMA DE EMBARQUE DISPONÍVEL.',
        'ROTA PRIMÁRIA DETECTADA: ARQUIPÉLAGO DAS ROTAS PERDIDAS.',
        'AVISO: DESTINO AINDA ESTÁ EM CALIBRAÇÃO.',
      ],
    });
    return;
  }

  openDialogue({
    speaker: 'PAINEL DO METRÔ',
    dialogue: [
      'FRAGMENTO DE SINCRONIZAÇÃO DETECTADO.',
      'COMPATIBILIDADE DO MÓDULO: APROVADA.',
      'A INSTALAÇÃO DO FRAGMENTO REATIVARÁ A LINHA INTERDIMENSIONAL.',
      'ATENÇÃO: A ENERGIA RESTANTE PODE ATRAIR ECOS INSTÁVEIS.',
    ],
    choices: [
      {
        text: 'INSTALAR FRAGMENTO DE SINCRONIZAÇÃO',
        onSelect: () => {
          installMetroFragment(state.progress);
          saveGame();
          openDialogue({
            speaker: 'PAINEL DO METRÔ',
            dialogue: [
              'FRAGMENTO INSTALADO.',
              'GRADE DE SEGURANÇA DESATIVADA.',
              'CATRACAS DIMENSIONAIS: ENERGIZADAS.',
              'PLATAFORMA INTERDIMENSIONAL: ACESSÍVEL.',
              'NOVA MISSÃO ATIVA: EMBARQUE DIMENSIONAL.',
              // A MENSAGEM DO RIVAL ENTRA AQUI:
              'ALERTA: ASSINATURA ANTERIOR DETECTADA.',
              'ARQUIVO 0 VALIDOU ESTA LINHA HÁ 00:00:03.',
              'RECOMENDAÇÃO: PROSSIGA COM CAUTELA.'
            ],
          });
        },
      },
      {
        text: 'MANTER FRAGMENTO NO INVENTÁRIO',
        onSelect: () => {
          openDialogue({
            speaker: 'PAINEL DO METRÔ',
            dialogue: ['INSTALAÇÃO CANCELADA.', 'A LINHA INTERDIMENSIONAL AGUARDARÁ SUA DECISÃO.'],
          });
        },
      },
    ],
    cancelable: true,
  });
}

function diagnoseDestinationPanel() {
  const quest = state.progress.activeQuest;
  openDialogue({
    speaker: 'PAINEL DE DESTINOS',
    dialogue: [
      'MODO BIO-FORJA DETECTADO.',
      'ROTAS DISPONÍVEIS: SAGUÃO, AEROPORTO, HALL DOS ELEVADORES, SETOR ANIME.',
      quest ? `MISSÃO ATIVA: ${quest.title}.` : 'NENHUMA MISSÃO CRÍTICA DETECTADA.',
      'DICA DE SISTEMA: EQUIPAMENTOS DIMENSIONAIS RESPONDEM MELHOR A OPERADORES CURIOSOS.',
    ],
  });
}

function diagnoseRobot(target) {
  const flags = state.progress.flags ??= {};
  if (!flags.robotSynced) {
    flags.robotSynced = true;
    saveGame();
    openDialogue({
      speaker: 'UNIDADE L-7',
      dialogue: [
        'LINK BIO-FORJA DETECTADO.',
        'PROTOCOLO DE LIMPEZA COMPARTILHADO.',
        'MAPA DE MANUTENÇÃO PARCIAL SINCRONIZADO.',
        'ANOMALIA REGISTRADA: RESÍDUOS DIMENSIONAIS PRÓXIMOS À ÁREA DE CARGA.',
        '*BIP SATISFEITO*',
      ],
    });
    return;
  }
  openDialogue({
    speaker: 'UNIDADE L-7',
    dialogue: [
      'SINCRONIA BIO-FORJA CONFIRMADA.',
      'SUPERFÍCIE DO SAGUÃO: 97% LIMPA.',
      'OS 3% RESTANTES CONTINUAM SENDO RESPONSABILIDADE SUA.',
    ],
  });
}

function diagnoseCargoSecurityPanel() {
  const flags = state.progress.flags ??= {};
  if (flags.cargoSecurityDiagnosed) {
    openDialogue({
      speaker: 'PAINEL DE SEGURANÇA',
      dialogue: [
        'LINK BIO-FORJA RESTABELECIDO.',
        'GRADE DE IMPULSO CINÉTICO: ATIVA.',
        'CAMINHADA NORMAL: BLOQUEADA.',
        'PROPULSOR DE IMPULSO: AUTORIZADO.',
        'FRAGMENTO DE SINCRONIZAÇÃO: ACESSÍVEL APÓS O CAMPO.',
      ],
    });
    return;
  }
  recordCargoDiagnosis(state.progress);
  saveGame();
  openDialogue({
    speaker: 'PAINEL DE SEGURANÇA',
    dialogue: [
      'LINK BIO-FORJA ESTABELECIDO.',
      'CAMPO DE CONTENÇÃO DIMENSIONAL IDENTIFICADO.',
      'FALHA: CARGA DE ECO PRESA EM LOOP DE SEGURANÇA.',
      'PROTOCOLO RECONFIGURADO.',
      'GRADE DE IMPULSO CINÉTICO ESTABILIZADA.',
      'CAMINHADA NORMAL: BLOQUEADA.',
      'PROPULSOR DE IMPULSO: AUTORIZADO.',
      'USE [Q] PARA ATRAVESSAR O CAMPO E ACESSAR O FRAGMENTO.',
    ],
  });
}

function diagnoseGeneric(target) {
  const system = target.item.moduleSystem;
  showDiagnosis({
    speaker: system.speaker ?? 'LINK DE DIAGNÓSTICO',
    dialogue: system.dialogue ?? [
      'SISTEMA DETECTADO.',
      'SEM PROTOCOLO ESPECIAL REGISTRADO.',
    ],
  });
}

// ---------------------------------------------------------------------
// Uso principal
// ---------------------------------------------------------------------
// Helper para tocar o diálogo e destravar o player ao fechar
function showDiagnosis(opts) {
  openDialogue({
    ...opts,
    onFinish: () => {
      state.player.ability.scanning = 0; // Destrava na hora!
      if (opts.onFinish) opts.onFinish(); // Mantém callbacks originais
    }
  });
}

export function hasSharedQuestSystem() {
  const id = getNearestModuleSystem()?.item.moduleSystem?.id;
  return id === 'airport_maintenance_terminal' || id === 'metro_navigation_core';
}

export function tryModuleInteraction() {
  const archetype = state.progress.archetype;
  if (!archetype) return false;

  const abilityId = ARCHETYPE_ABILITIES[archetype]?.[1];
  if (!abilityId || !hasAbility(abilityId)) return false;

  const target = getNearestModuleSystem();
  if (!target) {
    showAbilityMessage('NENHUM SISTEMA COMPATÍVEL');
    return false;
  }

  // Alguns sistemas persistem o diagnóstico antes de permitir sua reparação.
  const diagnosisFlag = target.item.moduleSystem?.diagnosisFlag;
  if (diagnosisFlag) {
    state.progress.flags ??= {};
    const firstDiag = !state.progress.flags[diagnosisFlag];
    state.progress.flags[diagnosisFlag] = true;
    if (firstDiag) {
      recordQuestEvent(state.progress, { type: 'diagnose', target: diagnosisFlag });
    }
    saveGame();
  }

  // Trava o player até o diálogo acabar.
  state.player.ability.scanning = 999; 

  const sharedId = target.item.moduleSystem?.id;
  if (sharedId === 'airport_maintenance_terminal') { diagnoseAirportTerminal(target); return true; }
  if (sharedId === 'metro_navigation_core') { diagnoseMetroSystem(target); return true; }
  if (archetype === 'motor_bio_forja') {
    const systemId = target.item.moduleSystem?.id;
    switch (systemId) {
      case 'airport_maintenance_terminal': diagnoseAirportTerminal(target); return true;
      case 'metro_navigation_core': diagnoseMetroSystem(target); return true;
      case 'destination_panel': diagnoseDestinationPanel(target); return true;
      case 'cleaning_unit_l7': diagnoseRobot(target); return true;
      case 'cargo_security_panel': diagnoseCargoSecurityPanel(target); return true;
    }
  }

  diagnoseGeneric(target);
  return true;
}