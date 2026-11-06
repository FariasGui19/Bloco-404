// js/game/abilities.js
// =====================================================================
// ABILITIES
//
// Sistema genérico de habilidades dos Módulos de Eco.
//
// Controles planejados:
// Q = habilidade primária
// R = habilidade secundária / interação especial
// X = ultimate
//
// Primeiro módulo funcional:
// MOTOR BIO-FORJA
// - Q: Propulsor de Impulso
// =====================================================================

import { CONFIG } from '../config.js';
import { state } from './state.js';
import { input } from '../engine/input.js';
import { getFloor } from './world.js';
import { moveWithCollision } from './collision.js';
import { tryModuleInteraction } from './module-interactions.js';
import { ARCHETYPE_KITS, IMPLEMENTED_ABILITIES } from '../data/archetype-kits.js';
import { getBioDashProfile } from './ability-context.js';
import { tryArchetypePower, POWER_PROFILES } from './archetype-powers.js';

// ---------------------------------------------------------------------
// CONFIGURAÇÃO INTERNA DE HABILIDADES
// ---------------------------------------------------------------------

export const ARCHETYPE_ABILITIES = Object.fromEntries(
  Object.entries(ARCHETYPE_KITS).map(([id, kit]) => [id, [kit.q, kit.r]])
);

// ---------------------------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------------------------

export function getArchetypeAbilities(archetypeId) {
  return [...(ARCHETYPE_ABILITIES[archetypeId] ?? [])];
}

export function hasAbility(abilityId) {
  return state.progress.abilities?.includes(abilityId) ?? false;
}

export function getCooldownPercent(abilityId) {
  const cooldown = state.player.ability?.cooldowns?.[abilityId] ?? 0;

  if (abilityId === 'bio_dash') {
    return Math.max(0, Math.min(1, cooldown / getBioDashProfile({ archetype: 'motor_bio_forja' }, null).cooldown));
  }

  const duration = POWER_PROFILES[abilityId]?.cooldown;
  return duration ? Math.max(0, Math.min(1, cooldown / duration)) : 0;
}

export function getAbilityLabel(abilityId) {
  const labels = {
    bio_dash: 'PROPULSOR DE IMPULSO',
    bio_diagnostic: 'LINK DE DIAGNÓSTICO',
    forma_veloz: 'PULSO VELOZ',
    eco_scan: 'LEITURA DE ECO',
    golpe_ruptura: 'GOLPE DE RUPTURA',
    postura_dominio: 'LEITURA DE FREQUÊNCIA',
    passo_corrente: 'PASSO DE CORRENTE',
    senso_corrente: 'SENSO DE CORRENTE',
  };

  return labels[abilityId] ?? abilityId.toUpperCase();
}

// ---------------------------------------------------------------------
// INICIALIZAÇÃO
// ---------------------------------------------------------------------

function ensureAbilityState() {
  const player = state.player;

  player.energy ??= CONFIG.ABILITIES.MAX_ENERGY;
  player.maxEnergy ??= CONFIG.ABILITIES.MAX_ENERGY;

  player.ability ??= {
    active: null,
    cooldowns: {},
    dash: null,
    lastMessage: null,
    messageTimer: 0,
  };

  player.ability.cooldowns ??= {};
}

function pressed(...keys) {
  return keys.some(key => input.pressed.has(key));
}

// ---------------------------------------------------------------------
// DIREÇÃO DE DASH
//
// Converte a direção visual do player para direção de mundo isométrico.
// ---------------------------------------------------------------------

function getFacingWorldDirection(facing) {
  const directions = {
    // Baixo na tela.
    down: { x: 1, y: 1 },

    // Cima na tela.
    up: { x: -1, y: -1 },

    // Direita na tela.
    right: { x: 1, y: -1 },

    // Esquerda na tela.
    left: { x: -1, y: 1 },
  };

  const direction = directions[facing] ?? directions.down;

  const length = Math.hypot(direction.x, direction.y);

  return {
    x: direction.x / length,
    y: direction.y / length,
  };
}

// ---------------------------------------------------------------------
// MENSAGEM TEMPORÁRIA DE HABILIDADE
// ---------------------------------------------------------------------

export function showAbilityMessage(text) {
  state.player.ability.lastMessage = text;
  state.player.ability.messageTimer = 1.4;
}

// ---------------------------------------------------------------------
// DASH BIO-FORJA
// ---------------------------------------------------------------------

function tryStartBioDash() {
  const player = state.player;
  const ability = player.ability;

  if (!hasAbility('bio_dash')) return false;
  const profile = getBioDashProfile(state.progress, player);
  if (!profile) return false;

  const cooldown = ability.cooldowns.bio_dash ?? 0;

  if (cooldown > 0) {
    showAbilityMessage('PROPULSOR RECARREGANDO');
    return false;
  }

  if (player.energy < profile.energyCost) {
    showAbilityMessage('ENERGIA INSUFICIENTE');
    return false;
  }

  const direction = getFacingWorldDirection(player.facing);

  player.energy -= profile.energyCost;

  ability.cooldowns.bio_dash = profile.cooldown;

  ability.active = 'bio_dash';

  ability.dash = {
    directionX: direction.x,
    directionY: direction.y,

    timeLeft: profile.duration,
    speed: profile.distance / profile.duration,
    mode: profile.mode,

    // Usaremos isso depois no renderer para rastro/partículas.
    trailTimer: 0,
  };

  showAbilityMessage(profile.mode === 'equipped' ? 'PROPULSOR • TRAJE ATIVO' : 'PROPULSOR • MODO RÁPIDO');

  return true;
}

function updateBioDash(dt) {
  const player = state.player;
  const dash = player.ability?.dash;

  if (!dash) return false;

  const map = getFloor();

  if (!map) {
    player.ability.dash = null;
    player.ability.active = null;
    return false;
  }

  const stepTime = Math.min(dt, dash.timeLeft);

  const moveX = dash.directionX * dash.speed * stepTime;
  const moveY = dash.directionY * dash.speed * stepTime;

  const moved = moveWithCollision(
    map,
    player,
    moveX,
    moveY,
    CONFIG.PLAYER_RADIUS
  );

  // Se bateu em parede ou objeto, encerra o dash.
  if (!moved) {
    dash.timeLeft = 0;
  }

  dash.timeLeft -= dt;

  player.moving = moved;

  if (dash.timeLeft <= 0) {
    player.ability.dash = null;
    player.ability.active = null;
    player.moving = false;
  }

  // true = bloqueia updatePlayer normal enquanto dasha.
  return true;
}

// ---------------------------------------------------------------------
// UPDATE GERAL
//
// Retorna true se o player está executando habilidade de movimento
// e o updatePlayer normal deve ser bloqueado.
// ---------------------------------------------------------------------

export function updateAbilities(dt) {
  ensureAbilityState();

  const player = state.player;
  const ability = player.ability;

  for (const key of ['effect', 'reveal']) {
    if (!ability[key]) continue;
    ability[key].timeLeft -= dt;
    if (ability[key].timeLeft <= 0) ability[key] = null;
  }

  // Cooldowns.
  for (const id in ability.cooldowns) {
    ability.cooldowns[id] = Math.max(
      0,
      ability.cooldowns[id] - dt
    );
  }

  // Regeneração de energia.
  player.energy = Math.min(
    player.maxEnergy,
    player.energy + CONFIG.ABILITIES.ENERGY_REGEN * dt
  );
  // NOVO: Controla o tempo que o player fica ajoelhado escaneando
  if (player.ability.scanning > 0) {
    player.ability.scanning -= dt;

    // Bloqueia o movimento enquanto estiver escaneando
    if (player.ability.scanning <= 0) {
      player.ability.scanning = 0;
    }
    return true; // Retorna true para travar o updatePlayer normal
  }

  // Mensagem temporária.
  if (ability.messageTimer > 0) {
    ability.messageTimer -= dt;

    if (ability.messageTimer <= 0) {
      ability.lastMessage = null;
      ability.messageTimer = 0;
    }
  }

  // Dash ativo tem prioridade.
  if (ability.dash) {
    return updateBioDash(dt);
  }

  // Não faz nada sem módulo.
  if (!state.progress.archetype) {
    return false;
  }

  // Q = habilidade primária.
  if (pressed('q', 'keyq')) {
    // Pega a primeira habilidade da lista do arquétipo atual (ex: 'bio_dash')
    const abilityId = ARCHETYPE_ABILITIES[state.progress.archetype]?.[0];

    if (abilityId === 'bio_dash') {
      return tryStartBioDash();
    }
    if (POWER_PROFILES[abilityId]) return tryArchetypePower(abilityId, showAbilityMessage);
    if (abilityId && !IMPLEMENTED_ABILITIES.includes(abilityId)) {
      showAbilityMessage('HABILIDADE AINDA EM DESENVOLVIMENTO');
    }
  }

  // R = interação especial do módulo (mantém como está).
  if (pressed('r', 'keyr')) {
    const abilityId = ARCHETYPE_ABILITIES[state.progress.archetype]?.[1];
    if (abilityId === 'bio_diagnostic') tryModuleInteraction();
    else if (POWER_PROFILES[abilityId]) tryArchetypePower(abilityId, showAbilityMessage);
    else if (abilityId) showAbilityMessage('HABILIDADE AINDA EM DESENVOLVIMENTO');
  }

  return false;
}