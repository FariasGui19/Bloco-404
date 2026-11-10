// =====================================================================
// ULTIMATE — o quinto slot do módulo (tecla F)
//
// Duas camadas, como o caminho dos arquétipos pede:
//   - ULTIMATE DE ARQUÉTIPO (base): todo operador tem, mesmo sem ferramenta;
//   - SOBRECARGA DE FERRAMENTA (nível 1): substitui a base quando o jogador
//     escolhe uma ferramenta/corrente/forma no Códex.
//
// O `kind` da definição decide a geometria:
//   burst → onda radial            wave  → raio maior, dano menor
//   line  → cone na direção        dash  → avanço com corte
//   guard → invulnerabilidade      surge → bônus e energia
//
// Regras comuns: custo alto, recarga longa, cura proporcional, bônus
// temporário de sessão e bloqueio sem energia/em recarga/sem vida.
// =====================================================================
import { getUltimate, ULTIMATE_IDS } from '../data/ultimates.js';
import { getSelectedTool } from './tools.js';
import { applyConeDamage, applyRadialDamage } from './combat.js';
import { healPlayer } from './health.js';
import { recordMastery } from './mastery.js';
import { getDerivedStats } from './rpg.js';
import { pushCombatText } from './combat-feedback.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const FACING = {
  down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1],
};

// Duração do efeito visual por tipo: corte é rápido, guarda é longa.
const EFFECT_TIME = { burst: .95, wave: 1.05, line: .6, dash: .55, guard: 1.2, surge: .8 };

// Qual Ultimate o operador usa agora, e de onde ela vem.
export function getActiveUltimate(progress) {
  const tool = getSelectedTool(progress);
  if (tool) return { definition: tool.ultimate, tool, tier: 'tool' };
  const definition = getUltimate(progress?.archetype);
  return definition ? { definition, tool: null, tier: 'module' } : null;
}

export function getActiveUltimateDefinition(progress) {
  return getActiveUltimate(progress)?.definition ?? null;
}

export function ensureUltimate(player) {
  if (!player) return { cooldown: 0, buff: null, effect: null, casts: 0 };
  player.ultimate ??= {};
  const runtime = player.ultimate;
  runtime.cooldown = Number.isFinite(runtime.cooldown) ? Math.max(0, runtime.cooldown) : 0;
  runtime.casts = Number.isInteger(runtime.casts) && runtime.casts > 0 ? runtime.casts : 0;
  runtime.buff = runtime.buff && runtime.buff.timeLeft > 0
    ? { ...runtime.buff, timeLeft: Math.max(0, Number(runtime.buff.timeLeft) || 0) }
    : null;
  runtime.effect = runtime.effect && runtime.effect.timeLeft > 0
    ? { ...runtime.effect, timeLeft: Math.max(0, Number(runtime.effect.timeLeft) || 0) }
    : null;
  return runtime;
}

// Estado pronto para HUD/Códex. `charge` vai de 0 (recém-usada) a 1 (pronta).
export function getUltimateStatus(player, progress) {
  const ativo = getActiveUltimate(progress);
  if (!ativo || !player) return null;
  const definition = ativo.definition;
  const runtime = ensureUltimate(player);
  const energy = Math.round(player?.energy ?? 0);
  const ratio = definition.cooldown > 0 ? clamp(1 - runtime.cooldown / definition.cooldown, 0, 1) : 1;
  return {
    definition,
    tool: ativo.tool,
    tier: ativo.tier,
    cooldown: runtime.cooldown,
    charge: ratio,
    ready: runtime.cooldown <= 0 && energy >= definition.cost,
    energy,
    energyOk: energy >= definition.cost,
    buff: runtime.buff?.timeLeft > 0 ? runtime.buff : null,
    casts: runtime.casts,
  };
}

export function getUltimateBuff(player) {
  const buff = player?.ultimate?.buff;
  return buff && buff.timeLeft > 0 ? buff : null;
}

export function canCastUltimate(player, progress) {
  const ativo = getActiveUltimate(progress);
  if (!ativo) return { ok: false, reason: 'SEM MÓDULO ATIVO' };
  const definition = ativo.definition;
  const runtime = ensureUltimate(player);
  if ((player?.health ?? 1) <= 0) return { ok: false, reason: 'ECO DISPERSO' };
  if (runtime.cooldown > 0) return { ok: false, reason: `RECARREGANDO ${runtime.cooldown.toFixed(1)}s`, cooldown: runtime.cooldown };
  if ((player?.energy ?? 0) < definition.cost) return { ok: false, reason: 'ENERGIA INSUFICIENTE' };
  return { ok: true, definition, tool: ativo.tool, tier: ativo.tier };
}

// Avanço curto da Ultimate (dash/corrente/investida). Usa o mesmo runtime do
// dash de Q, então a colisão e o mapa continuam mandando — nada de teleporte.
function startUltimateDash(player, definition) {
  const [fx, fy] = FACING[player.facing] ?? FACING.down;
  const length = Math.hypot(fx, fy) || 1;
  const duration = .26;
  player.ability ??= {};
  player.ability.dash = {
    directionX: fx / length,
    directionY: fy / length,
    timeLeft: duration,
    speed: (definition.range ?? 4) / duration,
    mode: 'ultimate',
    phaseGateId: null,
  };
}

// Executa a Ultimate. Devolve o resultado (ou null quando bloqueada).
export function tryUltimate({ player, progress, targets = [], showMessage, rng = Math.random }) {
  const check = canCastUltimate(player, progress);
  if (!check.ok) {
    showMessage?.(check.reason);
    return null;
  }
  const { definition } = check;
  const runtime = ensureUltimate(player);
  const kind = definition.kind ?? 'burst';
  const duration = EFFECT_TIME[kind] ?? .95;

  player.energy = Math.max(0, player.energy - definition.cost);
  runtime.cooldown = definition.cooldown;
  runtime.casts += 1;
  runtime.effect = {
    id: definition.id,
    kind,
    color: definition.color,
    radius: definition.radius ?? 0,
    range: definition.range ?? 0,
    facing: player.facing ?? 'down',
    timeLeft: duration,
    duration,
  };
  runtime.buff = { ...definition.buff, timeLeft: definition.buff.duration, color: definition.color };

  // Cura antes do bônus: o bônus de vida/s começa a valer no próximo quadro.
  const stats = getDerivedStats(progress, player);
  const maxHealth = stats?.maxHealth ?? player.maxHealth ?? 100;
  const heal = Math.round(maxHealth * (definition.healPct ?? 0));
  const healed = heal > 0 ? healPlayer(player, progress, heal) : 0;
  if (healed > 0) {
    pushCombatText(player.x, player.y - .8, `+${healed}`, { color: '#9af9c8', kind: 'heal', duration: 1.1 });
  }

  let damage = { total: 0, hits: [] };
  let guard = 0;
  if (kind === 'line') {
    damage = applyConeDamage({
      player, progress, targets,
      range: definition.range, arc: definition.arc ?? .22,
      damage: definition.damage, color: definition.color, rng,
    });
  } else if (kind === 'dash') {
    startUltimateDash(player, definition);
    damage = applyConeDamage({
      player, progress, targets,
      range: (definition.range ?? 4) + .6, arc: definition.arc ?? .3,
      damage: definition.damage, color: definition.color, rng,
    });
  } else if (kind === 'guard') {
    guard = Math.max(0, definition.guard ?? 0);
    player.invulnerable = Math.max(player.invulnerable ?? 0, guard);
    if (definition.damage > 0) {
      damage = applyRadialDamage({
        player, progress, targets,
        radius: definition.radius ?? 2.5, damage: definition.damage, color: definition.color, rng,
      });
    }
  } else {
    // burst, wave e surge compartilham a onda radial; o raio e o dano mudam.
    damage = applyRadialDamage({
      player, progress, targets,
      radius: definition.radius, damage: definition.damage, color: definition.color, rng,
    });
  }

  const rankUps = recordMastery(progress, 'ability_use', 2);
  const rotulo = check.tier === 'tool' ? `${check.tool.short} · ${definition.name}` : definition.name;
  const mensagem = rankUps.length
    ? `${rotulo} • MAESTRIA ${rankUps.map(up => up.label).join(' + ')}`
    : rotulo;
  if (showMessage) showMessage(mensagem);
  else {
    player.ability ??= {};
    player.ability.lastMessage = mensagem;
    player.ability.messageTimer = 3;
  }

  return { definition, kind, healed, damage, buff: runtime.buff, guard, tool: check.tool };
}

// Recarga, bônus e efeito visual avançam com o tempo de jogo.
export function updateUltimate(player, progress, dt) {
  const runtime = ensureUltimate(player);
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
  runtime.cooldown = Math.max(0, runtime.cooldown - elapsed);
  if (runtime.effect) {
    runtime.effect.timeLeft = Math.max(0, runtime.effect.timeLeft - elapsed);
    if (runtime.effect.timeLeft === 0) runtime.effect = null;
  }
  if (!runtime.buff) return runtime;
  runtime.buff.timeLeft = Math.max(0, runtime.buff.timeLeft - elapsed);
  if (runtime.buff.timeLeft === 0) {
    runtime.buff = null;
  } else {
    if (runtime.buff.healPerSecond) healPlayer(player, progress, runtime.buff.healPerSecond * elapsed);
    if (runtime.buff.energyRegen) {
      player.energy = Math.min(player.maxEnergy ?? 100, (player.energy ?? 0) + runtime.buff.energyRegen * elapsed);
    }
  }
  return runtime;
}

export function isUltimateId(id) {
  return ULTIMATE_IDS.includes(id);
}
