// =====================================================================
// SAVE SYSTEM
//
// Usa localStorage.
// Sem servidor, sem login, leve e suficiente para o BLOCO 404.
//
// Estrutura:
// BLOCO404_SAVE_SLOT_1
// BLOCO404_SAVE_SLOT_2
// BLOCO404_SAVE_SLOT_3
// =====================================================================

import { state } from './state.js';
import { ensureArchetypeProgress } from './progression.js';
import { ensureTools } from './tools.js';
import { applyUnlocks } from './unlocks.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';

const SAVE_VERSION = 1;
const SLOT_COUNT = 3;
const SAVE_PREFIX = 'BLOCO404_SAVE_SLOT_';

function getSlotKey(slot) {
  return `${SAVE_PREFIX}${slot}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDefaultProgress() {
  return {
    onboardingStarted: false,
    onboardingCompleted: false,
    talkedToNexo: false,
    onboardingQuestionIndex: 0,

    onboardingScores: {
      nucleo_dez_forma: 0,
      lamina_dominio_anciao: 0,
      motor_bio_forja: 0,
      mare_astral: 0,
    },

    archetype: null,

    abilities: [],
    archetypeProgress: {},
    tools: {},
    inventory: [],

    activeQuest: null,
    completedQuests: [],

    unlockedMaps: [
      'hub_saguao',
      'hub_aeroporto',
      'hub_elevadores',
      'hub_setor_anime',
    ],

    unlockedPortals: [],
    flags: {},
  };
}

export function createNewSave(slot, profileName = null) {
  const now = new Date().toISOString();

  const save = {
    version: SAVE_VERSION,

    meta: {
      slot,
      profileName: profileName || `OPERADOR ${String(slot).padStart(2, '0')}`,
      createdAt: now,
      updatedAt: now,
      playTimeSeconds: 0,
    },

    player: {
      facing: 'down',
    },

    progress: createDefaultProgress(),

    world: {
      lastMapId: 'hub_saguao',
      lastSpawnId: 'inicio',
    },
  };

  localStorage.setItem(
    getSlotKey(slot),
    JSON.stringify(save)
  );

  return save;
}

export function getSave(slot) {
  try {
    const raw = localStorage.getItem(getSlotKey(slot));

    if (!raw) return null;

    const save = JSON.parse(raw);

    if (!save || typeof save !== 'object') {
      return null;
    }

    return migrateSave(save, slot);
  } catch (error) {
    console.warn('[SAVE] Falha ao ler save:', error);
    return null;
  }
}

function migrateSave(save, slot) {
  // Garante compatibilidade se o save crescer no futuro.
  const safeSave = {
    version: save.version ?? SAVE_VERSION,

    meta: {
      slot,
      profileName:
        save.meta?.profileName ??
        `OPERADOR ${String(slot).padStart(2, '0')}`,
      createdAt: save.meta?.createdAt ?? new Date().toISOString(),
      updatedAt: save.meta?.updatedAt ?? new Date().toISOString(),
      playTimeSeconds: save.meta?.playTimeSeconds ?? 0,
    },

    player: {
      facing: save.player?.facing ?? 'down',
    },

    progress: {
      ...createDefaultProgress(),
      ...(save.progress ?? {}),
    },

    world: {
      lastMapId: save.world?.lastMapId ?? 'hub_saguao',
      lastSpawnId: save.world?.lastSpawnId ?? 'inicio',
    },
  };

  ensureArchetypeProgress(safeSave.progress);
  ensureTools(safeSave.progress);
  return safeSave;
}

export function listSaves() {
  const saves = [];

  for (let slot = 1; slot <= SLOT_COUNT; slot++) {
    saves.push({
      slot,
      save: getSave(slot),
    });
  }

  return saves;
}

export function hasSave(slot) {
  return Boolean(getSave(slot));
}

export function deleteSave(slot) {
  localStorage.removeItem(getSlotKey(slot));

  if (state.save.activeSlot === slot) {
    state.save.activeSlot = null;
    state.save.profileName = null;
    state.save.loaded = false;
  }
}

export function loadSaveIntoState(slot) {
  const save = getSave(slot);

  if (!save) {
    return null;
  }

  state.save.activeSlot = slot;
  state.save.profileName = save.meta.profileName;
  state.save.loaded = true;

  state.progress = clone(save.progress);
  ensureTools(state.progress);
  applyUnlocks(state.progress, ARCHETYPE_KITS[state.progress.archetype]);

  state.player.facing = save.player?.facing ?? 'down';
  state.player.nucleoForm = null;
  state.player.nucleoRuntime = null;
  // Vida e Ultimate são de sessão: cada carregamento começa limpo.
  state.player.ultimate = { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null };
  state.player.health = null;
  state.player.maxHealth = null;
  state.player.invulnerable = 0;
  state.player.hurtTimer = 0;
  state.player.sinceDamage = 0;
  state.player.deathTimer = 0;

  if (state.player.ability?.effect?.id === 'transformacao_10x') state.player.ability.effect = null;

  state.world.currentMapId = save.world.lastMapId;
  state.world.currentSpawnId = save.world.lastSpawnId;

  return save;
}

export function startNewSave(slot, profileName = null) {
  const save = createNewSave(slot, profileName);

  state.save.activeSlot = slot;
  state.save.profileName = save.meta.profileName;
  state.save.loaded = true;

  state.progress = clone(save.progress);
  ensureTools(state.progress);
  applyUnlocks(state.progress, ARCHETYPE_KITS[state.progress.archetype]);

  state.player.facing = save.player.facing;
  state.player.nucleoForm = null;
  state.player.nucleoRuntime = null;
  // Vida e Ultimate são de sessão: cada partida começa limpa.
  state.player.ultimate = { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0, shake: null, flash: null };
  state.player.health = null;
  state.player.maxHealth = null;
  state.player.invulnerable = 0;
  state.player.hurtTimer = 0;
  state.player.sinceDamage = 0;
  state.player.deathTimer = 0;

  if (state.player.ability?.effect?.id === 'transformacao_10x') state.player.ability.effect = null;

  state.world.currentMapId = save.world.lastMapId;
  state.world.currentSpawnId = save.world.lastSpawnId;

  return save;
}

export function buildCurrentSave() {
  return {
    version: SAVE_VERSION,

    meta: {
      slot: state.save.activeSlot,
      profileName:
        state.save.profileName ??
        `OPERADOR ${String(state.save.activeSlot ?? 1).padStart(2, '0')}`,

      updatedAt: new Date().toISOString(),
    },

    player: {
      facing: state.player.facing ?? 'down',
    },

    progress: clone(state.progress),

    world: {
      lastMapId: state.world.currentMapId ?? 'hub_saguao',
      lastSpawnId: state.world.currentSpawnId ?? 'inicio',
    },
  };
}

export function saveGame() {
  if (!state.save.loaded || !state.save.activeSlot) {
    return false;
  }

  try {
    const oldSave = getSave(state.save.activeSlot);

    const current = buildCurrentSave();

    current.meta.createdAt =
      oldSave?.meta?.createdAt ??
      new Date().toISOString();

    current.meta.playTimeSeconds =
      oldSave?.meta?.playTimeSeconds ?? 0;

    localStorage.setItem(
      getSlotKey(state.save.activeSlot),
      JSON.stringify(current)
    );

    return true;
  } catch (error) {
    console.error('[SAVE] Falha ao salvar:', error);
    return false;
  }
}

export function rememberMapLocation(mapId, spawnId = 'inicio') {
  state.world.currentMapId = mapId;
  state.world.currentSpawnId = spawnId;

  saveGame();
}

export function saveOnPageExit() {
  saveGame();
}