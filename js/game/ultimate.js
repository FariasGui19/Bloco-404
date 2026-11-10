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
import { getUnlockState } from './unlocks.js';
import { getFeatureLevel } from '../data/archetype-unlocks.js';
import { applyConeDamage, applyRadialDamage } from './combat.js';
import { healPlayer } from './health.js';
import { recordMastery } from './mastery.js';
import { getDerivedStats } from './rpg.js';
import { pushCombatText } from './combat-feedback.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// Tempo de carga antes de soltar a Ultimate: o corpo se prepara, a energia
// converge e só depois a onda sai. É animação de verdade, com estado real.
export const ULTIMATE_WINDUP = .42;
// Tremor de câmera e clarão no instante da soltura, por tipo.
const IMPACT_SHAKE = { burst: 11, wave: 9, line: 7, dash: 6, guard: 4, surge: 5 };

// Núcleo 10X: as Ultimates são de FORMA, não de operador. Sem transformação
// ativa elas não existem — o corpo base não aguenta a sobrecarga.
function precisaDeForma(progress, player) {
  return progress?.archetype === 'nucleo_dez_forma' && player?.nucleoForm !== 'forma_veloz';
}

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
  runtime.charge = Number.isFinite(runtime.charge) ? Math.max(0, runtime.charge) : 0;
  runtime.shake = runtime.shake && runtime.shake.timeLeft > 0
    ? { ...runtime.shake, timeLeft: Math.max(0, Number(runtime.shake.timeLeft) || 0) }
    : null;
  runtime.flash = runtime.flash && runtime.flash.timeLeft > 0
    ? { ...runtime.flash, timeLeft: Math.max(0, Number(runtime.flash.timeLeft) || 0) }
    : null;
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
  const unlock = getUnlockState(progress);
  const locked = !unlock.features.ultimate;
  const needsForm = !locked && precisaDeForma(progress, player);
  const windupDuration = runtime.chargeDuration || ULTIMATE_WINDUP;
  return {
    definition,
    tool: ativo.tool,
    tier: ativo.tier,
    cooldown: runtime.cooldown,
    charge: ratio,
    ready: !locked && !needsForm && runtime.cooldown <= 0 && energy >= definition.cost,
    locked,
    needsForm,
    formHint: needsForm ? 'TRANSFORME-SE (T) PARA USAR' : null,
    requiredLevel: getFeatureLevel('ultimate'),
    level: unlock.level,
    charging: runtime.charge > 0,
    windup: runtime.charge > 0 ? clamp(1 - runtime.charge / windupDuration, 0, 1) : 0,
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
  const unlock = getUnlockState(progress);
  if (!unlock.features.ultimate) {
    return { ok: false, reason: `ULTIMATE BLOQUEADA · NÍVEL ${getFeatureLevel('ultimate')}`, locked: true };
  }
  if (precisaDeForma(progress, player)) return { ok: false, reason: 'TRANSFORME-SE (T) PARA USAR', needsForm: true };
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

// Resolve a Ultimate: efeito, bônus, cura, dano, tremor e clarão.
// Chamado direto pelo modo instantâneo e, no jogo, ao fim da carga.
function resolveUltimate({ player, progress, targets = [], definition, kind, check = {}, rng = Math.random }) {
  const runtime = ensureUltimate(player);
  const duration = EFFECT_TIME[kind] ?? .95;

  runtime.effect = {
    id: definition.id,
    kind,
    signature: definition.signature ?? null,
    color: definition.color,
    radius: definition.radius ?? 0,
    range: definition.range ?? 0,
    facing: player.facing ?? 'down',
    timeLeft: duration,
    duration,
  };
  runtime.buff = { ...definition.buff, timeLeft: definition.buff.duration, color: definition.color };
  runtime.shake = { timeLeft: .34, duration: .34, power: IMPACT_SHAKE[kind] ?? 8 };
  runtime.flash = { timeLeft: .26, duration: .26, color: definition.color };
  runtime.charge = 0;

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
  const rotulo = check.tool ? `${check.tool.short} · ${definition.name}` : definition.name;
  const mensagem = rankUps.length
    ? `${rotulo} • MAESTRIA ${rankUps.map(up => up.label).join(' + ')}`
    : rotulo;
  player.ability ??= {};
  player.ability.lastMessage = mensagem;
  player.ability.messageTimer = 3;

  return { definition, kind, healed, damage, buff: runtime.buff, guard, tool: check.tool ?? null, message: mensagem };
}

// Começa a Ultimate: cobra energia, inicia a recarga e (no jogo) abre a carga.
// `instant` resolve na hora — usado por testes e por chamadas fora do loop.
export function beginUltimate({ player, progress, targets = [], showMessage, rng = Math.random, instant = false }) {
  const check = canCastUltimate(player, progress);
  if (!check.ok) {
    showMessage?.(check.reason);
    return null;
  }
  const { definition } = check;
  const runtime = ensureUltimate(player);
  const kind = definition.kind ?? 'burst';

  player.energy = Math.max(0, player.energy - definition.cost);
  runtime.cooldown = definition.cooldown;
  runtime.casts += 1;

  if (!instant) {
    runtime.charge = ULTIMATE_WINDUP;
    runtime.chargeDuration = ULTIMATE_WINDUP;
    runtime.chargeDefinition = { id: definition.id, color: definition.color, kind, name: definition.name };
    showMessage?.(definition.name);
    return { started: true, definition, kind, tool: check.tool, tier: check.tier };
  }

  const resultado = resolveUltimate({ player, progress, targets, definition, kind, check, rng });
  if (showMessage) showMessage(resultado.message);
  return resultado;
}

// API curta: uma Ultimate completa em uma chamada (sem carga).
export function tryUltimate(opts) {
  return beginUltimate({ ...opts, instant: true });
}

// Recarga, bônus, carga, tremor e efeito avançam com o tempo de jogo.
// `options.targets` é usado quando a carga termina (o golpe encontra os alvos
// do quadro atual, não os do momento em que o F foi apertado).
export function updateUltimate(player, progress, dt, options = {}) {
  const runtime = ensureUltimate(player);
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
  runtime.cooldown = Math.max(0, runtime.cooldown - elapsed);

  let resolvedNow = false;
  if (runtime.charge > 0) {
    runtime.charge = Math.max(0, runtime.charge - elapsed);
    player.moving = false;
    player.target = null;
    if (runtime.charge === 0) {
      const ativo = getActiveUltimate(progress);
      if (ativo) {
        const kind = ativo.definition.kind ?? 'burst';
        const resultado = resolveUltimate({
          player, progress,
          targets: options.targets ?? [],
          definition: ativo.definition,
          kind,
          check: { tool: ativo.tool, tier: ativo.tier },
          rng: options.rng ?? Math.random,
        });
        runtime.lastResult = resultado;
        resolvedNow = true;
        if (options.showMessage) options.showMessage(resultado.message);
      }
      runtime.chargeDefinition = null;
    }
  }

  // No quadro da soltura, tremor e clarão nascem cheios (senão o dt da carga
  // os apagaria antes de aparecer).
  if (!resolvedNow && runtime.shake) {
    runtime.shake.timeLeft = Math.max(0, runtime.shake.timeLeft - elapsed);
    if (runtime.shake.timeLeft === 0) runtime.shake = null;
  }
  if (!resolvedNow && runtime.flash) {
    runtime.flash.timeLeft = Math.max(0, runtime.flash.timeLeft - elapsed);
    if (runtime.flash.timeLeft === 0) runtime.flash = null;
  }

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
