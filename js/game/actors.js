// =====================================================================
//  ACTORS
//
//  Sistema leve de comportamento para NPCs, animais e personagens.
//
//  Primeira implementação:
//  - tipo "receptionist";
//  - patrulha curta;
//  - olhar para o player;
//  - pose de conversa;
//  - retorno ao trabalho.
//
//  Futuramente:
//  - patrol;
//  - wander;
//  - flee;
//  - sleep;
//  - seek_shelter;
//  - rotina por horário;
//  - reação ao clima.
// =====================================================================

import { state } from './state.js';
import { getCurrentMap } from './map-manager.js';
import { canStand } from './world.js';
import { isDialogueOpen } from '../ui/dialogue.js';

// ---------------------------------------------------------------------
//  Criação de runtime para comportamento
// ---------------------------------------------------------------------

export function createActorRuntime(actor) {
  const behavior = actor.behavior
    ? {
        ...actor.behavior,

        // Estado vivo, não vem diretamente do mapa.
        state: actor.behavior.state ?? 'idle',

        // Direção principal para a qual o NPC volta.
        defaultFacing:
          actor.behavior.defaultFacing ??
          actor.facing ??
          'down',

        // Índice atual da rota de patrulha.
        patrolIndex: 0,

        // Tempo parado antes de caminhar de novo.
        waitTimer: actor.behavior.startWait ?? 1.2,

        // Tempo olhando para o player depois dele se afastar.
        returnTimer: 0,
      }
    : null;

  return {
    ...actor,
    behavior,
  };
}

// ---------------------------------------------------------------------
//  Helpers de direção
// ---------------------------------------------------------------------

function faceToward(actor, targetX, targetY) {
  const dx = targetX - actor.x;
  const dy = targetY - actor.y;

  if (dx === 0 && dy === 0) return;

  // Converte o movimento do mundo para orientação na tela.
  const screenDx = dx - dy;
  const screenDy = dx + dy;

  if (Math.abs(screenDx) > Math.abs(screenDy)) {
    actor.facing = screenDx > 0 ? 'right' : 'left';
  } else {
    actor.facing = screenDy > 0 ? 'down' : 'up';
  }
}

function moveActorToward(actor, targetX, targetY, speed, dt) {
  const map = getCurrentMap();

  if (!map) return true;

  const dx = targetX - actor.x;
  const dy = targetY - actor.y;

  const distance = Math.hypot(dx, dy);

  if (distance < 0.04) {
    actor.x = targetX;
    actor.y = targetY;
    return true;
  }

  const step = Math.min(distance, speed * dt);
  const moveX = (dx / distance) * step;
  const moveY = (dy / distance) * step;

  // NPC usa uma hitbox menor que a do player.
  const radius = actor.behavior?.radius ?? 0.20;

  let moved = false;

  if (canStand(map, actor.x + moveX, actor.y, radius)) {
    actor.x += moveX;
    moved = true;
  }

  if (canStand(map, actor.x, actor.y + moveY, radius)) {
    actor.y += moveY;
    moved = true;
  }

  if (moved) {
    faceToward(actor, actor.x + moveX, actor.y + moveY);
  }

  return distance < 0.08;
}

// ---------------------------------------------------------------------
//  NEXO / RECEPCIONISTA
// ---------------------------------------------------------------------

function updateReceptionist(actor, dt) {
  const behavior = actor.behavior;
  const player = state.player;

  if (!behavior) return;

  // Enquanto conversa, fica parado usando pose talk.
  if (behavior.state === 'talking') {
    actor.pose = 'talk';
    return;
  }

  // Distância até o player.
  const playerDistance = Math.hypot(
    player.x - actor.x,
    player.y - actor.y
  );

  const lookDistance = behavior.lookDistance ?? 3.2;

  // ---------------------------------------------------------------
  // Player próximo: NEXO para e olha para ele.
  // ---------------------------------------------------------------
  if (playerDistance <= lookDistance) {
    behavior.state = 'watching';
    behavior.returnTimer = behavior.returnDelay ?? 2.5;

    actor.pose = 'idle';
    faceToward(actor, player.x, player.y);
    return;
  }

  // ---------------------------------------------------------------
  // Player acabou de sair: espera alguns segundos olhando na direção
  // em que viu o player antes de voltar à rotina.
  // ---------------------------------------------------------------
  if (behavior.state === 'watching') {
    behavior.returnTimer -= dt;

    if (behavior.returnTimer > 0) {
      actor.pose = 'idle';
      return;
    }

    behavior.state = 'idle';
    actor.facing = behavior.defaultFacing;
  }

  // ---------------------------------------------------------------
  // Sem patrulha: fica parado.
  // ---------------------------------------------------------------
  const route = behavior.route ?? [];

  if (!behavior.patrol || route.length < 2) {
    actor.pose = 'idle';
    actor.facing = behavior.defaultFacing;
    return;
  }

  // ---------------------------------------------------------------
  // Patrulha curta.
  // ---------------------------------------------------------------
  if (behavior.state === 'idle') {
    behavior.waitTimer -= dt;

    if (behavior.waitTimer > 0) {
      actor.pose = 'idle';
      return;
    }

    behavior.state = 'patrol';
  }

  if (behavior.state === 'patrol') {
    const target = route[behavior.patrolIndex];

    if (!target) {
      behavior.patrolIndex = 0;
      behavior.state = 'idle';
      return;
    }

    const reached = moveActorToward(
      actor,
      target.x,
      target.y,
      behavior.speed ?? 0.55,
      dt
    );

    // Ainda não temos walk animation para NEXO.
    // Mantém idle enquanto ele desliza suavemente.
    actor.pose = 'idle';

    if (reached) {
      behavior.patrolIndex =
        (behavior.patrolIndex + 1) % route.length;

      behavior.state = 'idle';

      behavior.waitTimer =
        behavior.waitDuration ?? 2.2;
    }
  }
}

// ---------------------------------------------------------------------
//  Update geral de atores
// ---------------------------------------------------------------------

export function updateActors(dt) {
  // Enquanto qualquer diálogo está aberto, NPCs não começam novas ações.
  // O NPC que abriu diálogo continua em "talking".
  const dialogueOpen = isDialogueOpen();

  for (const actor of state.actors ?? []) {
    if (!actor.behavior) continue;

    if (
      actor.behavior.type === 'receptionist' &&
      (!dialogueOpen || actor.behavior.state === 'talking')
    ) {
      updateReceptionist(actor, dt);
    }
  }
}

// ---------------------------------------------------------------------
//  Controle externo para diálogos
// ---------------------------------------------------------------------

export function startActorTalking(actor) {
  if (!actor) return; 
 
  actor.pose = 'talk';

  if (actor.behavior) {
    actor.behavior.state = 'talking';
  }
}

export function stopActorTalking(actor) {
  if (!actor) return;

  actor.pose = 'idle';

  if (actor.behavior) {
    actor.behavior.state = 'watching';
    actor.behavior.returnTimer =
      actor.behavior.returnDelay ?? 2.5;
  }
} 