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
import { recordQuestEvent } from './quests.js';
import { grantArchetypeXp } from './rpg.js';

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
    if (isGateOpen(object)) continue;
    consider('object', object, 4);
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

  // NOVO: Se o objeto tem um gate e você não passa, o prompt muda
  if (kind === 'object' && data.gate && !checkGate(data.gate)) {
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
    const mensagens = portal.gate ? getGateFailureMessage(portal.gate) : (portal.mensagemBloqueado ?? ['ACESSO BLOQUEADO.']);

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

function interactWithObject(object) {
  const interaction = object.interacao;
  if (!interaction) return;

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

  if (object.gate) {
    if (!checkGate(object.gate)) {
      openDialogue({
        speaker: object.nome ?? 'OBSTÁCULO',
        dialogue: getGateFailureMessage(object.gate),
      });
      return;
    }
    if (object.gate.requiredAction) {
      openDialogue({
        speaker: object.nome ?? 'OBSTÁCULO',
        dialogue: [object.gate.actionMessage ?? 'APONTE PARA O OBSTÁCULO E USE [Q] PARA ROMPÊ-LO.'],
      });
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

export async function checkInteractions(pressedE) {
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
  if (nearest.kind === 'object') { interactWithObject(nearest.data); }
} 