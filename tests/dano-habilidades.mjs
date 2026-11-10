import assert from 'node:assert/strict';
import { ABILITY_DAMAGE } from '../js/data/combat-balance.js';
import { tryAbilityDamage } from '../js/game/combat.js';
import { getDerivedStats } from '../js/game/rpg.js';
import { startQuest } from '../js/game/quests.js';

const flat = () => .5; // variância exata 1.0
const progress = { archetype: 'lamina_dominio_anciao', archetypeProgress: {}, inventory: [], flags: {} };
const player = { x: 5, y: 5, facing: 'right', ability: {} };

// Alvo à frente (direção isométrica direita = +x, -y) recebe dano da habilidade.
const front = { x: 6.5, y: 3.5, health: 60, maxHealth: 60 };
const behind = { x: 3.5, y: 6.5, health: 60, maxHealth: 60 };
const stats = getDerivedStats(progress);
const result = tryAbilityDamage({ player, progress, targets: [front, behind], abilityId: 'golpe_ruptura', rng: flat });
assert(result);
assert.equal(result.hits.length, 1);
assert.equal(front.health, 60 - Math.round(stats.basicDamage * ABILITY_DAMAGE.golpe_ruptura));
assert.equal(behind.health, 60, 'habilidade não acerta atrás do operador');

// Habilidade sem impacto não causa dano.
assert.equal(tryAbilityDamage({ player, progress, targets: [front], abilityId: 'eco_scan' }), null);
assert.equal(tryAbilityDamage({ player, progress, targets: [], abilityId: 'golpe_ruptura' }), null);

// Maestria de eco (conquistada com uso) aumenta o dano das habilidades.
const tree = { archetype: 'lamina_dominio_anciao', archetypeProgress: { lamina_dominio_anciao: { level: 1, xp: 0, mastery: { eco: 20 } } } };
const treeStats = getDerivedStats(tree);
assert(treeStats.abilityDamagePct > 0);
const targetA = { x: 6.5, y: 3.5, health: 60, maxHealth: 60 };
const powered = tryAbilityDamage({ player, progress: tree, targets: [targetA], abilityId: 'golpe_ruptura', rng: flat });
assert(powered.damage > Math.round(stats.basicDamage * ABILITY_DAMAGE.golpe_ruptura));

// Golpe de habilidade também derruba, dá XP e conta missão.
const questProgress = { archetype: 'lamina_dominio_anciao', archetypeProgress: {}, inventory: [], flags: {} };
startQuest(questProgress, 'calibracao_de_campo');
const weak = { x: 6.5, y: 3.5, health: 1, maxHealth: 60 };
const kill = tryAbilityDamage({ player, progress: questProgress, targets: [weak], abilityId: 'passo_corrente' });
assert.equal(kill.hits.length, 1);
assert.equal(weak.health, 0);
assert(weak.downTimer > 0);
assert.equal(questProgress.questLog.calibracao_de_campo.counters[0], 1);
assert(questProgress.archetypeProgress.lamina_dominio_anciao.xp > 0);

console.log('Habilidades: dano de impacto à frente, escala pela árvore, XP e missão OK.');
