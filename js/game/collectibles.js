// js/game/collectibles.js
// =====================================================================
// COLLECTIBLES
//
// Sistema básico de itens coletáveis.
// Primeiro uso: Fragmento de Sincronização.
// =====================================================================

import { state } from './state.js';
import { saveGame } from './save.js';
import { openDialogue } from '../ui/dialogue.js';
import { recordQuestEvent } from './quests.js';

const DEFAULT_COLLECT_DISTANCE = 1.25;

function distance(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function isCollected(item) {
  return state.progress.flags?.[`collected_${item.id}`] === true;
}

function isAvailable(item) {
  if (isCollected(item)) return false;
  if (item.id.startsWith('lumeo_') && state.progress.flags?.companheiro_lumeo) return false;

  if (item.requiresFlag) {
    return state.progress.flags?.[item.requiresFlag] === true;
  }

  return true;
}

export function getNearestCollectible() {
  const player = state.player;
  let best = null;

  for (const item of state.collectibles ?? []) {
    if (!isAvailable(item)) continue;

    const maxDistance =
      item.interactionDistance ??
      DEFAULT_COLLECT_DISTANCE;

    const itemDistance = distance(
      player.x,
      player.y,
      item.x,
      item.y
    );

    if (itemDistance > maxDistance) continue;

    if (!best || itemDistance < best.distance) {
      best = {
        item,
        distance: itemDistance,
      };
    }
  }

  return best;
}

export function getCollectiblePrompt(item) {
  return item.label ?? 'COLETAR ITEM';
}

export function collectItem(item) {
  if (!item || !isAvailable(item)) return false;

  state.progress.inventory ??= [];
  state.progress.flags ??= {};

  if (!item.id.startsWith('lumeo_') && !state.progress.inventory.includes(item.id)) {
    state.progress.inventory.push(item.id);
  }

  state.progress.flags[`collected_${item.id}`] = true;
  if (item.id === 'lumeo_vinculo') state.progress.flags.companheiro_lumeo = true;
  recordQuestEvent(state.progress, { type: 'collect', target: item.id });

  // Descobertas opcionais da Enseada não substituem a missão ativa.
  const tracks = ['enseada_rastro_mar', 'enseada_rastro_pedra', 'enseada_rastro_mata'];
  if (tracks.includes(item.id) && tracks.every(id => state.progress.flags[`collected_${id}`])) {
    state.progress.flags.enseada_ecos_mapeada = true;
  }

  // Missão Calibração de Eco.
  if (item.id === 'fragmento_sincronizacao') {
    state.progress.flags.fragmentoSincronizacaoColetado = true;

    if (state.progress.activeQuest?.id === 'calibracao_de_eco') {
      state.progress.activeQuest.stage = 'return_to_metro';
      state.progress.activeQuest.description =
        'Leve o Fragmento de Sincronização ao painel da Linha Interdimensional no Saguão Central.';
    }
  }

  saveGame();

  openDialogue({
    speaker: item.speaker ?? 'ARQUIVO DE ECO',

    dialogue: item.id.startsWith('enseada_rastro_') && state.progress.flags.enseada_ecos_mapeada
      ? [...(item.dialogue ?? []), 'TRÊS VESTÍGIOS REGISTRADOS. UM PEQUENO ECO SURGIU PERTO DA TRILHA DE RETORNO.']
      : item.dialogue ?? [
      `${item.nome ?? 'ITEM'} COLETADO.`,
    ],
  });

  return true;
}

export function isCollectibleVisible(item) {
  return isAvailable(item);
}