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
import { tryModuleInteraction, hasSharedQuestSystem } from './module-interactions.js';
import { ARCHETYPE_KITS, IMPLEMENTED_ABILITIES } from '../data/archetype-kits.js';
import { getBioDashProfile } from './ability-context.js';
import { tryArchetypePower, POWER_PROFILES } from './archetype-powers.js';
import { openGate, checkGate, isGateOpen } from './gates.js';
import { saveGame } from './save.js';
import { getDerivedStats } from './rpg.js';
import { recordMastery } from './mastery.js';
import { executeBrutaSmash } from './combat.js';
import { chargeFormHit } from './nucleo-form.js';
import { NUCLEO_FORMS } from '../data/nucleo-forms.js';
import { recordQuestEvent } from './quests.js';

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
    pancada_quebra: 'PANCADA DE PESO',
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
  if (getFloor()?.meta?.sideView) {
    const sideDirs = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      right: { x: 1, y: 0 },
      left: { x: -1, y: 0 },
    };
    return sideDirs[facing] ?? sideDirs.right;
  }

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
  recordMastery(state.progress, 'distance', 6); // o dash também treina locomoção
  recordMastery(state.progress, 'ability_use');

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

// Ativa apenas sensores explícitos cruzados pelo deslocamento real do Q.
// Distância ao segmento evita perder o evento em frames longos.
export function activateBioDashSensors(start, end) {
  if (state.progress.archetype !== 'motor_bio_forja') return false;
  const dx = end.x - start.x, dy = end.y - start.y, len2 = dx * dx + dy * dy;
  if (len2 < 1e-8) return false;
  let activated = false;
  for (const sensor of state.objects ?? []) {
    if (!sensor.dashSensor || !sensor.gate || isGateOpen(sensor) || !checkGate(sensor.gate)) continue;
    const t = Math.max(0, Math.min(1, ((sensor.x - start.x) * dx + (sensor.y - start.y) * dy) / len2));
    if (Math.hypot(start.x + dx * t - sensor.x, start.y + dy * t - sensor.y) > (sensor.dashRadius ?? .45)) continue;
    openGate(sensor);
    recordQuestEvent(state.progress, { type: 'breach_gate', target: sensor.id });
    saveGame(); activated = true;
    if (state.player.ability) showAbilityMessage(sensor.dashMessage ?? 'IMPULSO REGISTRADO • ATIVE O PAINEL');
  }
  return activated;
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

  const start = { x: player.x, y: player.y };
  const moved = moveWithCollision(
    map,
    player,
    moveX,
    moveY,
    CONFIG.PLAYER_RADIUS
  );

  if (moved) activateBioDashSensors(start, player);

  if (dash.phaseGateId) {
    const gate = state.objects.find(o => o.id === dash.phaseGateId);
    if (gate && dash.phaseCrosses && (player[dash.phaseAxis ?? 'x'] - gate[dash.phaseAxis ?? 'x']) * dash.phaseDirection >= 0.85 && !state.progress.flags?.[`gate_${gate.id}`]) {
      openGate(gate);
      saveGame();
    }
  }

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
// PANCADA DE PESO — o "Q" da Quebra Sistemas
//
// Sem teleporte e sem atravessar parede: o corpo só se desloca se o caminho
// estiver livre, e o golpe tem preparação longa (a forma sente o peso).
// ---------------------------------------------------------------------
export const BRUTA_SMASH = Object.freeze({
  id: 'pancada_quebra',
  cost: 20,
  cooldown: 2.2,
  // 0,55 s de preparação antes da marreta descer.
  windup: .55,
  reach: 1.7,
  damageMult: 1.4,
  knockback: 1.4,
});

function tryBrutaSmash(player) {
  const perfil = BRUTA_SMASH;
  if ((player.ability.cooldowns[perfil.id] ?? 0) > 0) {
    showAbilityMessage('PISTÕES RECARREGANDO');
    return true;
  }
  if (player.energy < perfil.cost) {
    showAbilityMessage('ENERGIA INSUFICIENTE');
    return true;
  }
  // Preparação: o corpo trava, o golpe básico dura mais e o dano sai no fim
  // (o combate básico já aplica o dano quando a marreta desce).
  player.ability.cooldowns[perfil.id] = perfil.cooldown;
  recordMastery(state.progress, 'ability_use');
  const form = NUCLEO_FORMS[player.nucleoForm];
  player.energy -= perfil.cost;
  // O efeito usa id PRÓPRIO. Antes ele reaproveitava o id da transformação e,
  // com forma já ativa, o jogo desfazia e refazia a metamorfose em vez de
  // socar — era o "me destransforma e transforma de novo" do relato.
  player.ability.cast = {
    id: perfil.id,
    color: form?.color ?? '#ffc94a',
    duration: perfil.windup,
    timeLeft: perfil.windup,
    form: player.nucleoForm,
    windup: true,
  };
  player.moving = false;
  player.target = null;
  showAbilityMessage('PANCADA DE PESO • PREPARANDO');
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

  // O relógio da pancada de peso é separado do efeito de transformação.
  if (ability.cast) {
    ability.cast.timeLeft = Math.max(0, ability.cast.timeLeft - dt);
    // A preparação pode ser cancelada pela própria transformação de volta:
    // aí a marreta não desce, some junto com o corpo.
    if (!(player.nucleoForm === 'forma_bruta')) ability.cast = null;
    else if (ability.cast.timeLeft === 0) {
      const cast = ability.cast;
      ability.cast = null;
      // A marreta desce: dano em disco à frente, empurrão e tremor.
      executeBrutaSmash({ player, progress: state.progress, targets: state.trainingTargets });
      // Corpo e animação de golpe: a folha de ataque da Quebra é escolhida
      // pelo estilo do arquétipo, então o mesmo ataque básico anima a marreta.
      player.combat = { ...(player.combat ?? {}), style: 'nucleo_dez_forma', dx: cast.dx ?? 1, dy: cast.dy ?? 1, duration: .48, timeLeft: .48, cooldown: 0 };
      // O peso do impacto consome barra além do custo de energia.
      chargeFormHit(player);
    }
  }
  for (const key of ['effect', 'reveal', 'sonarAquatico']) {
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

  // Regeneração de energia (a árvore do arquétipo pode somar aqui).
  const energyRegen = CONFIG.ABILITIES.ENERGY_REGEN + (getDerivedStats(state.progress)?.energyRegen ?? 0);
  player.energy = Math.min(
    player.maxEnergy,
    player.energy + energyRegen * dt
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

  // A transição de forma é uma ação curta e não permite interromper com Q/T.
  if (ability.effect?.id === 'transformacao_10x') return true;
  // A preparação da marreta também finca o corpo no chão: o golpe sai de onde
  // o jogador mirou, e o peso aparece no tempo de resposta.
  if (ability.cast?.id === 'pancada_quebra') return true;

  // Dash ativo tem prioridade.
  if (ability.dash) {
    return updateBioDash(dt);
  }

  // Não faz nada sem módulo.
  if (!state.progress.archetype) {
    return false;
  }

  // Ações terrestres não podem travar o relógio do nado ou executar
  // um dash de chão em alto-mar. Nada é cobrado ao recusar.
  if (player.nado?.ativo && state.progress.archetype !== 'mare_astral'
      && (pressed('q', 'keyq') || pressed('r', 'keyr'))) {
    showAbilityMessage('HABILIDADE TERRESTRE • SAIA DA ÁGUA');
    return false;
  }
  // Forma de força bruta: a marreta SUBSTITUI o pulso de arrancada. Não é um
  // dash — é preparação longa e impacto que derruba estruturas por peso.
  if (pressed('q', 'keyq') && player.nucleoForm === 'forma_bruta') {
    return tryBrutaSmash(player);
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
    if (abilityId === 'bio_diagnostic' || (hasAbility(abilityId) && hasSharedQuestSystem())) tryModuleInteraction();
    else if (POWER_PROFILES[abilityId]) tryArchetypePower(abilityId, showAbilityMessage);
    else if (abilityId) showAbilityMessage('HABILIDADE AINDA EM DESENVOLVIMENTO');
  }

  return false;
}