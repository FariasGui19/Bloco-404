import assert from 'node:assert/strict';
import { COMBAT_BALANCE, ARCHETYPE_VITALS } from '../js/data/combat-balance.js';
import { getProgressionTree, getTreeNode } from '../js/data/progression-tree.js';
import {
  MAX_LEVEL, canRankNode, getArchetypeLevel, getDerivedStats, getNodeRank,
  getTreePoints, grantArchetypeXp, rankNode, rollBasicAttack, xpToNext,
} from '../js/game/rpg.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const progress = { archetype: 'nucleo_dez_forma', archetypeProgress: {} };
ensureArchetypeProgress(progress);
const kit = progress.archetypeProgress.nucleo_dez_forma;
assert.equal(kit.level, 1);
assert.equal(kit.xp, 0);
assert.equal(kit.points, 0);
assert.deepEqual(kit.nodes, {});

// Curva: 40 XP no primeiro nível e sempre crescente até o teto.
assert.equal(xpToNext(1), 40);
assert(xpToNext(2) > xpToNext(1));
for (let level = 1; level < MAX_LEVEL; level++) assert(xpToNext(level) > 0);
assert.equal(xpToNext(MAX_LEVEL), Infinity);

// Um nível por vez concede exatamente um ponto.
const first = grantArchetypeXp(progress, xpToNext(1));
assert.equal(first.levels, 1);
assert.equal(first.level, 2);
assert.equal(first.points, 1);
assert.equal(getArchetypeLevel(progress), 2);
assert.equal(getTreePoints(progress), 1);
assert.equal(kit.xp, 0);

// Nó de ataque: custa 1 ponto no primeiro rank e aumenta o dano em 6%.
const baseDamage = getDerivedStats(progress).basicDamage;
assert.equal(rankNode(progress, 'ataque_1').ranked, true);
assert.equal(getNodeRank(progress, 'nucleo_dez_forma', 'ataque_1'), 1);
assert.equal(getTreePoints(progress), 0);
assert.equal(getDerivedStats(progress).basicDamage, baseDamage * 1.06);
assert.equal(canRankNode(progress, 'ataque_1').ok, false);
assert.match(canRankNode(progress, 'ataque_1').reason, /pontos/);

// Pré-requisito: ataque_2 exige ataque_1 no rank 2.
kit.points = 6;
assert.equal(canRankNode(progress, 'ataque_2').ok, false);
assert.match(canRankNode(progress, 'ataque_2').reason, /requisito/);
assert.equal(rankNode(progress, 'ataque_1').ranked, true);
assert.equal(canRankNode(progress, 'ataque_2').ok, true);
const beforeAtaque2 = getDerivedStats(progress).basicDamage;
assert.equal(rankNode(progress, 'ataque_2').ranked, true);
const afterAtaque2 = getDerivedStats(progress);
assert(afterAtaque2.basicDamage > beforeAtaque2);
assert(afterAtaque2.critChance > COMBAT_BALANCE.nucleo_dez_forma.crit);

// Fluxo reduz a recarga; eco aumenta o dano de habilidade e o XP recebido.
kit.points += 14; // pontos de teste para percorrer os três ramos
const beforeFluxo = getDerivedStats(progress).cooldown;
assert.equal(rankNode(progress, 'fluxo_1').ranked, true);
assert(getDerivedStats(progress).cooldown < beforeFluxo);
assert.equal(rankNode(progress, 'eco_1').ranked, true);
assert.equal(rankNode(progress, 'eco_1').ranked, true);
assert.equal(canRankNode(progress, 'eco_2').ok, true);
assert.equal(rankNode(progress, 'eco_2').ranked, true);
const withEco = getDerivedStats(progress);
assert(withEco.abilityDamagePct > 0);
assert(withEco.xpBonusPct > 0);
assert.equal(grantArchetypeXp(progress, 100).gained, Math.round(100 * (1 + withEco.xpBonusPct)));

// Nós não podem passar do rank máximo.
kit.points = 50;
for (let i = 0; i < 10; i++) rankNode(progress, 'ataque_1');
assert.equal(getNodeRank(progress, 'nucleo_dez_forma', 'ataque_1'), getTreeNode('nucleo_dez_forma', 'ataque_1').maxRank);

// Vida cresce com o nível e energia segue o arquétipo.
const low = getDerivedStats({ archetype: 'mare_astral', archetypeProgress: {} });
const high = getDerivedStats({ archetype: 'mare_astral', archetypeProgress: { mare_astral: { level: 10, xp: 0, points: 0, nodes: {} } } });
assert(high.maxHealth > low.maxHealth);
assert.equal(low.maxHealth, ARCHETYPE_VITALS.mare_astral.health);
const fluxo2 = getDerivedStats({ archetype: 'mare_astral', archetypeProgress: { mare_astral: { level: 1, xp: 0, points: 0, nodes: { fluxo_2: 1 } } } });
assert(fluxo2.energyRegen > 0, 'fluxo_2 devolve regeneração de energia');

// Árvore tem sabor por arquétipo, mas a grade de nós é a mesma.
for (const archetype of Object.keys(COMBAT_BALANCE)) {
  const tree = getProgressionTree(archetype);
  assert.equal(tree.length, getProgressionTree('nucleo_dez_forma').length);
  if (archetype !== 'nucleo_dez_forma') assert.notEqual(tree[0].name, getProgressionTree('nucleo_dez_forma')[0].name);
  assert(Object.isFrozen(tree[0]));
}
assert.deepEqual(getProgressionTree('arquétipo inexistente'), []);

// Save antigo: campos ausentes viram valores neutros e lixo é descartado.
const legacy = ensureArchetypeProgress({ archetype: 'motor_bio_forja', archetypeProgress: { motor_bio_forja: { level: 0, xp: -8, points: 2.5, nodes: { ataque_1: 0, fluxo_1: 2 } } } });
const legacyKit = legacy.archetypeProgress.motor_bio_forja;
assert.equal(legacyKit.level, 1);
assert.equal(legacyKit.xp, 0);
assert.equal(legacyKit.points, 0);
assert.deepEqual(legacyKit.nodes, { fluxo_1: 2 });

// Rolagem múltipla (Maré) devolve um valor por golpe.
const mare = getDerivedStats({ archetype: 'mare_astral', archetypeProgress: {} });
const roll = rollBasicAttack(mare, () => .5);
assert.equal(roll.hits.length, 2);
assert.equal(roll.total, roll.hits[0] + roll.hits[1]);
assert.equal(roll.crit, false);

console.log('RPG: XP, níveis, pontos, pré-requisitos, efeitos da árvore e migração de save OK.');
