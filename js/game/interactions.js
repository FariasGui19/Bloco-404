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
    if (data.gate.requiresFlag && !state.progress.flags?.[data.gate.requiresFlag] &&
        state.progress.archetype === data.gate.diagnosisArchetype) {
      return 'EXAMINAR • DIAGNÓSTICO: R';
    }
    return data.gate.promptFalha ?? 'BLOQUEADO';
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