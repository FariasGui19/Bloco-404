// Combate básico: dano por arquétipo, crítico, XP e alvos de treino.
// Inimigos agressivos e dano ao jogador continuam pendentes; aqui o
// jogador só ataca alvos explícitos de treino.
import { canStandAt } from './collision.js';
import { state } from './state.js';
import { CONFIG } from '../config.js';
import { ABILITY_DAMAGE, COMBAT_BALANCE, TRAINING_TARGET_XP, TRAINING_XP_LEVEL_CAP } from '../data/combat-balance.js';
import { getArchetypeLevel, getDerivedStats, grantArchetypeXp, rollBasicAttack } from './rpg.js';
import { recordQuestEvent } from './quests.js';
import { recordMastery } from './mastery.js';
import { pushCombatText, updateCombatFeedback } from './combat-feedback.js';
import { applyUnlocks } from './unlocks.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';
import { chargeFormHit } from './nucleo-form.js';
import { BRUTA_SMASH } from './abilities.js';
import { NUCLEO_FORMS } from '../data/nucleo-forms.js';
import { checkGate, isGateOpen, openGate } from './gates.js';
import { saveGame } from './save.js';

// Compatibilidade: HUD e testes antigos leem rótulo e strain daqui.
export const BASIC_ATTACKS = COMBAT_BALANCE;

export function createTrainingTargets(map) {
  return (map.trainingTargets ?? []).map(item => ({
    ...item,
    x: item.x + .5,
    y: item.y + .5,
    maxHealth: item.maxHealth ?? 60,
    health: item.maxHealth ?? 60,
    downTimer: 0,
    hitTimer: 0,
    renderType: 'trainingTarget',
  }));
}

export function updateBasicCombat(player, targets, dt) {
  if (player.combat) {
    player.combat.cooldown = Math.max(0, player.combat.cooldown - dt);
    player.combat.timeLeft = Math.max(0, player.combat.timeLeft - dt);
    player.combat.chainWindow = Math.max(0, (player.combat.chainWindow ?? 0) - dt);
    if (!player.combat.chainWindow) player.combat.chain = 0;
  }
  for (const target of targets) {
    target.hitTimer = Math.max(0, target.hitTimer - dt);
    if (target.downTimer > 0) {
      target.downTimer = Math.max(0, target.downTimer - dt);
      if (target.downTimer === 0) target.health = target.maxHealth;
    }
  }
  updateCombatFeedback(dt);
}

function clearLine(map, player, target) {
  const dx = target.x - player.x, dy = target.y - player.y;
  const steps = Math.ceil(Math.hypot(dx, dy) / .12);
  for (let i = 1; i < steps; i++) {
    if (!canStandAt(map, player.x + dx * i / steps, player.y + dy * i / steps, .06, player)) return false;
  }
  return true;
}

// Aplica o dano de um ataque inteiro (pode ter mais de um golpe) e devolve
// o que aconteceu. Alvo derrotado fica fora de combate por alguns segundos.
export function applyAttackDamage(target, roll) {
  if (!target || !roll) return null;
  const before = target.health;
  target.health = Math.max(0, target.health - roll.total);
  target.hitTimer = .2;
  const defeated = before > 0 && target.health === 0;
  if (defeated) target.downTimer = 4;
  return { dealt: before - target.health, defeated };
}

// Vitória sobre um alvo de treino: XP até o teto, missão contada, mensagem.
// Usado pelo ataque básico e pelas habilidades de impacto.
function applyMasteryRankUps(player, rankUps) {
  if (!rankUps.length) return;
  player.ability ??= {};
  player.ability.lastMessage = `MAESTRIA • ${rankUps.map(up => up.label).join(' + ')}`;
  player.ability.messageTimer = 3;
}

function registerDefeat(player, progress, target) {
  let xp = 0;
  // Vitória conta para o eco do arquétipo (maestria), não gasta ponto nenhum.
  applyMasteryRankUps(player, recordMastery(progress, 'resonance'));
  if (getDerivedStats(progress) && getArchetypeLevel(progress) < TRAINING_XP_LEVEL_CAP) {
    const gained = grantArchetypeXp(progress, TRAINING_TARGET_XP);
    xp = gained.gained;
    pushCombatText(target.x, target.y - .55, `+${xp} XP`, { color: '#9af9c8', kind: 'xp', duration: 1.2 });
    if (gained.levels > 0) {
      player.ability ??= {};
      const liberado = applyUnlocks(progress, ARCHETYPE_KITS[progress.archetype]);
      player.ability.lastMessage = liberado.length
        ? `NÍVEL ${gained.level} • ${liberado.map(entry => entry.label).join(' + ')} LIBERADO`
        : `NÍVEL ${gained.level} • ${getDerivedStats(progress).maxHealth} VIDA MÁXIMA`;
      player.ability.messageTimer = 3;
    }
  }
  const completed = recordQuestEvent(progress, { type: 'defeat', target: 'training' });
  for (const quest of completed) {
    player.ability ??= {};
    player.ability.lastMessage = `MISSÃO CONCLUÍDA • ${quest.title}`;
    player.ability.messageTimer = 3;
    if (quest.rewards?.xp) pushCombatText(player.x, player.y - 1, `+${quest.rewards.xp} XP`, { color: '#ffe98a', kind: 'xp', duration: 1.4 });
  }
  return xp;
}

// Dano radial: usado pela Ultimate, que não depende de direção.
// Devolve o total causado e os alvos atingidos para HUD/testes.
export function applyRadialDamage({ player, progress, targets, radius, damage, color = '#ffffff', rng = Math.random }) {
  const hits = [];
  if (!targets?.length || !(radius > 0) || !(damage > 0)) return { total: 0, hits };
  for (const target of targets) {
    if (!target || target.health <= 0) continue;
    if (Math.hypot(target.x - player.x, target.y - player.y) > radius) continue;
    const rolagem = Math.max(1, Math.round(damage * (.94 + rng() * .12)));
    const outcome = applyAttackDamage(target, { hits: [rolagem], total: rolagem });
    pushCombatText(target.x, target.y, String(rolagem), { color, duration: 1.1 });
    if (outcome?.defeated) registerDefeat(player, progress, target);
    hits.push({ target, damage: rolagem });
  }
  return { total: hits.reduce((sum, item) => sum + item.damage, 0), hits };
}

// Dano em cone: usado pelas sobrecargas de ferramenta que cortam/avançam
// (lâmina, investida, corrente, chicote). `arc` é o cosseno mínimo do ângulo:
// 0 = meio plano, .25 = cone de ~75°, .5 = cone de 60°.
// Devolve o total e os alvos atingidos para HUD/testes.
export function applyConeDamage({ player, progress, targets, range, arc = .25, damage, color = '#ffffff', rng = Math.random }) {
  const hits = [];
  if (!targets?.length || !(range > 0) || !(damage > 0)) return { total: 0, hits };
  const vectors = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };
  const [fx, fy] = vectors[player.facing] ?? vectors.down;
  const length = Math.hypot(fx, fy) || 1;
  for (const target of targets) {
    if (!target || target.health <= 0) continue;
    const dx = target.x - player.x, dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance > range || distance < .001) continue;
    if ((dx * fx + dy * fy) / (distance * length) < arc) continue;
    const rolagem = Math.max(1, Math.round(damage * (.94 + rng() * .12)));
    const outcome = applyAttackDamage(target, { hits: [rolagem], total: rolagem });
    pushCombatText(target.x, target.y, String(rolagem), { color, duration: 1.1 });
    if (outcome?.defeated) registerDefeat(player, progress, target);
    hits.push({ target, damage: rolagem });
  }
  return { total: hits.reduce((sum, item) => sum + item.damage, 0), hits };
}

// Habilidade de impacto: atinge alvos de treino à frente, no raio do gesto.
// Devolve o total causado para a HUD/testes; não altera a mobilidade do Q.
export function tryAbilityDamage({ player, progress, targets, abilityId, rng = Math.random }) {
  const multiplier = ABILITY_DAMAGE[abilityId];
  const stats = getDerivedStats(progress, player);
  if (!multiplier || !stats || !targets?.length) return null;
  const vectors = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };
  const [fx, fy] = vectors[player.facing] ?? vectors.down;
  const length = Math.hypot(fx, fy);
  const distance = Math.max(stats.range, 1.8) + .6;
  const damage = Math.max(1, Math.round(stats.basicDamage * multiplier * (1 + stats.abilityDamagePct) * (.94 + rng() * .12)));
  const hit = [];
  for (const target of targets) {
    if (target.health <= 0) continue;
    const dx = target.x - player.x, dy = target.y - player.y;
    const range = Math.hypot(dx, dy);
    if (range > distance || range < .001 || (dx * fx + dy * fy) / (range * length) < .25) continue;
    const outcome = applyAttackDamage(target, { hits: [damage], total: damage });
    pushCombatText(target.x, target.y, String(damage), { color: stats.color, duration: 1 });
    if (outcome?.defeated) registerDefeat(player, progress, target);
    hit.push({ target, damage });
  }
  return { damage, hits: hit, total: hit.reduce((sum, item) => sum + item.damage, 0) };
}

// Portões/estruturas que só cedem a impacto físico (gate.breaksWith = 'peso').
// A procura é curta e à frente do corpo, como o alcance da marreta; abrir
// grava a flag do save, então a demolição é permanente.
function breakWeightGates(player, dx, dy) {
  let broke = false;
  for (const object of state.objects ?? []) {
    if (!object?.gate || isGateOpen(object) || !checkGate(object.gate)) continue;
    if (object.gate.breaksWith !== 'peso') continue;
    if (object.gate.requiredLevel && getArchetypeLevel(state.progress) < object.gate.requiredLevel) continue;
    if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) continue;
    const ox = object.x - player.x, oy = object.y - player.y;
    const distancia = Math.hypot(ox, oy);
    const alcance = object.gate.strikeRadius ?? 1.9;
    if (distancia > alcance || distancia < .001) continue;
    if ((ox * dx + oy * dy) / distancia < .35) continue;
    openGate(object);
    recordQuestEvent(state.progress, { type: 'breach_gate', target: object.id });
    if (object.gate.bonusXp > 0 && state.progress.archetype) grantArchetypeXp(state.progress, object.gate.bonusXp);
    if (object.gate.routeFlag) {
      state.progress.flags ??= {};
      state.progress.flags[object.gate.routeFlag] = true;
    }
    player.ability ??= {};
    player.ability.massFlash = { x: object.x, y: object.y, timeLeft: 0.7, duration: 0.7 };
    player.ultimate ??= {};
    player.ultimate.shake = { timeLeft: 0.42, duration: 0.42, power: 10.5, source: 'contrapeso' };
    player.ability.lastMessage = object.gate.breakMessage ?? 'ESTRUTURA DEMOLIDA • PESO CEDEU';
    player.ability.messageTimer = 2.2;
    broke = true;
  }
  if (broke) saveGame();
  return broke;
}

// =====================================================================
// PANCADA DE PESO — o Q da Quebra Sistemas, executado de verdade
// =====================================================================
// Na preparação (js/game/abilities.js) o corpo trava e as fagulhas correm nos
// pistões; aqui a marreta desce de fato: dano em disco à frente do corpo,
// empurrão, onda de choque e tremor de câmera. Sem alvo, o golpe ainda sai —
// quebrar o chão já é o ponto da forma.
export function executeBrutaSmash({ player, progress, targets, rng = Math.random }) {
  if (!player) return null;
  const perfil = BRUTA_SMASH;
  const fx = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] }[player.facing] ?? [1, 1];
  const comprimento = Math.hypot(fx[0], fx[1]) || 1;
  const centro = {
    x: player.x + (fx[0] / comprimento) * perfil.reach * .6,
    y: player.y + (fx[1] / comprimento) * perfil.reach * .6,
  };
  const dano = Math.max(1, Math.round(getDerivedStats(progress, player).basicDamage * perfil.damageMult));
  const hits = [];
  let total = 0;
  for (const target of targets ?? []) {
    if (!target || target.health <= 0) continue;
    if (Math.hypot(target.x - centro.x, target.y - centro.y) > perfil.reach) continue;
    const rolagem = Math.max(1, Math.round(dano * (.94 + rng() * .12)));
    const outcome = applyAttackDamage(target, { hits: [rolagem], total: rolagem });
    pushCombatText(target.x, target.y, String(rolagem), { color: '#ffc94a', duration: 1.1 });
    // Impacto cinético: o alvo é arremessado para longe do corpo.
    const ddx = target.x - player.x, ddy = target.y - player.y;
    const dl = Math.hypot(ddx, ddy) || 1;
    target.x += (ddx / dl) * perfil.knockback * .18;
    target.y += (ddy / dl) * perfil.knockback * .18;
    if (outcome?.defeated) registerDefeat(player, progress, target);
    hits.push({ target, damage: rolagem });
    total += rolagem;
  }
  // Câmera e chão sentem o peso mesmo quando não há ninguém por perto.
  player.ultimate ??= { cooldown: 0, buff: null, effect: null, casts: 0, charge: 0 };
  const tremor = NUCLEO_FORMS[player.nucleoForm]?.form?.stompShake ?? 2.4;
  if (!player.ultimate.shake || (player.ultimate.shake.power ?? 0) <= tremor) {
    player.ultimate.shake = { timeLeft: .26, duration: .26, power: tremor, source: 'pancada' };
  }
  player.ability ??= {};
  player.ability.lastMessage = total > 0 ? `PANCADA DE PESO • ${total} DE DANO` : 'PANCADA DE PESO • CHÃO RACHADO';
  player.ability.messageTimer = 1.4;
  // A marreta da Quebra também demolia travas de peso no fim do windup do Q,
  // não só no ataque básico. O helper grava gate/missão/XP e o flash de massa.
  breakWeightGates(player, fx[0] / comprimento, fx[1] / comprimento);
  return { total, hits, center: centro, knockback: perfil.knockback };
}

export function tryBasicAttack({ player, progress, map, targets, point, rng = Math.random }) {
  const profile = BASIC_ATTACKS[progress?.archetype];
  if (!profile || !map || !point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  // A preparação da Pancada de Peso (Q da Quebra Sistemas) bloqueia o ataque
  // comum e só libera quando a marreta termina de subir: é a janela de peso
  // que dá leitura ao golpe, e o `cast` segura o corpo sem travar o resto.
  if (player.ability?.cast?.id === 'pancada_quebra') return false;
  if (player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 || (player.combat?.cooldown ?? 0) > 0) return false;

  // Um clique na parte alta do holograma deve mirar na base do alvo.
  const iso = p => ({ x: (p.x - p.y) * CONFIG.TILE_W / 2, y: (p.x + p.y) * CONFIG.TILE_H / 2 });
  const click = iso(point);
  const selected = (targets ?? []).find(target => {
    if (target.health <= 0) return false;
    const at = iso(target), dx = click.x - at.x, dy = click.y - at.y;
    return Math.abs(dx) <= 20 && dy >= -55 && dy <= 10;
  });
  if (selected) point = selected;

  let dx = point.x - player.x, dy = point.y - player.y;
  let length = Math.hypot(dx, dy);
  if (length < .05) {
    const vectors = { down: [1, 1], up: [-1, -1], left: [-1, 1], right: [1, -1] };
    [dx, dy] = vectors[player.facing] ?? vectors.down;
    length = Math.SQRT2;
  }
  dx /= length; dy /= length;
  const sx = dx - dy, sy = dx + dy;
  player.facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
  player.target = null;

  const stats = getDerivedStats(progress, player);
  // O strain e a preparação vêm do perfil ativo: o operador e a Quebra
  // Sistemas não compartilham o mesmo ritmo de golpe.
  const strainProfile = stats.strain ?? profile.strain;
  const windup = stats.windup ?? 0;
  const previous = player.combat;
  const chain = previous?.style === progress.archetype && previous.chainWindow > 0 ? (previous.chain ?? 0) + 1 : 1;
  const strained = chain >= strainProfile.hits;
  // Golpe com preparação dura mais na tela para o peso ser legível.
  const duration = .32 + windup * .6;
  player.combat = {
    cooldown: stats.cooldown + (strained ? strainProfile.extra : 0),
    duration,
    timeLeft: duration,
    dx,
    dy,
    color: stats.color ?? profile.color,
    chain: strained ? 0 : chain,
    chainWindow: strained ? 0 : 1.3,
    strained,
    style: progress.archetype,
    form: stats.formId ?? null,
    transformed: player.nucleoForm === 'forma_veloz',
    equipped: !!player.equippedSuit,
  };
  if (strained) {
    player.ability ??= {};
    player.ability.lastMessage = `${strainProfile.label} • RECUPERAÇÃO DO ATAQUE`;
    player.ability.messageTimer = 1.8;
  }
  // Cada golpe carregado da Quebra Sistemas começa a comer a barra de forma.
  const formaGasta = chargeFormHit(player);
  if (formaGasta > 0 && (player.nucleoRuntime?.remaining ?? 0) > 0) {
    player.ability ??= {};
    player.ability.lastMessage = `IMPACTO • FORMA −${formaGasta.toFixed(0)}s`;
    player.ability.messageTimer = 1.2;
  }
  // Forma de força bruta: a marreta abre portões travados por peso e escudos
  // de impacto que nenhum outro golpe move. Mesma economia de gate do Q.
  if (stats.formId === 'forma_bruta') breakWeightGates(player, dx, dy);

  let best = null, nearest = Infinity;
  for (const target of targets ?? []) {
    if (target.health <= 0) continue;
    const tx = target.x - player.x, ty = target.y - player.y, distance = Math.hypot(tx, ty);
    if (distance > stats.range || distance < .001 || (tx * dx + ty * dy) / distance < .55) continue;
    if (distance >= nearest || !clearLine(map, player, target)) continue;
    best = target; nearest = distance;
  }

  const roll = rollBasicAttack(stats, rng);
  if (best) {
    player.combat.damage = roll.total;
    player.combat.crit = roll.crit;
    applyMasteryRankUps(player, recordMastery(progress, 'basic_hit'));
    const outcome = applyAttackDamage(best, roll);
    // Um número por golpe dá leitura de ritmo a ataques múltiplos como a Maré.
    roll.hits.forEach((value, index) => {
      pushCombatText(best.x, best.y - index * .12, String(value), {
        color: roll.crit ? '#ffe98a' : profile.color,
        crit: roll.crit,
        duration: .9 + index * .12,
      });
    });
    if (outcome?.defeated) registerDefeat(player, progress, best);
  }
  return true;
}
