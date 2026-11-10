import assert from 'node:assert/strict';
import { COMBAT_BALANCE, ARCHETYPE_VITALS } from '../js/data/combat-balance.js';
import {
  MAX_LEVEL, getArchetypeLevel, getArchetypeXp, getDerivedStats,
  grantArchetypeXp, rollBasicAttack, xpToNext,
} from '../js/game/rpg.js';
import { ensureArchetypeProgress } from '../js/game/progression.js';

const progress = { archetype: 'nucleo_dez_forma', archetypeProgress: {} };
ensureArchetypeProgress(progress);
const kit = progress.archetypeProgress.nucleo_dez_forma;
assert.equal(kit.level, 1);
assert.equal(kit.xp, 0);
assert.deepEqual(kit.mastery, {}, 'maestria começa vazia, sem pontos para gastar');
assert.equal(kit.points, undefined);

// Curva: 40 XP no primeiro nível e sempre crescente até o teto.
assert.equal(xpToNext(1), 40);
assert(xpToNext(2) > xpToNext(1));
for (let level = 1; level < MAX_LEVEL; level++) assert(xpToNext(level) > 0);
assert.equal(xpToNext(MAX_LEVEL), Infinity);

// Subir de nível não entrega ponto de árvore: maestria é por uso.
const first = grantArchetypeXp(progress, xpToNext(1));
assert.equal(first.levels, 1);
assert.equal(first.level, 2);
assert.equal(getArchetypeLevel(progress), 2);
assert.equal(kit.xp, 0);
assert.equal(getArchetypeXp(progress), 0);
assert.equal(kit.points, undefined);

// Nível aumenta a vida máxima; maestria vazia não altera dano base.
const level1 = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} });
const level2 = getDerivedStats(progress);
assert(level2.maxHealth > level1.maxHealth);
assert.equal(level2.basicDamage, COMBAT_BALANCE.nucleo_dez_forma.damage * (1 + COMBAT_BALANCE.nucleo_dez_forma.perLevel));
assert.equal(level2.critChance, COMBAT_BALANCE.nucleo_dez_forma.crit);
assert.equal(level2.cooldown, COMBAT_BALANCE.nucleo_dez_forma.cooldown);

// Vida base vem do arquétipo.
const mare = getDerivedStats({ archetype: 'mare_astral', archetypeProgress: {} });
assert.equal(mare.maxHealth, ARCHETYPE_VITALS.mare_astral.health);

// Forma Veloz multiplica só o Núcleo.
const form = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} }, { nucleoForm: 'forma_veloz' });
assert.equal(form.basicDamage, COMBAT_BALANCE.nucleo_dez_forma.damage * COMBAT_BALANCE.nucleo_dez_forma.formMult);

// Rolagem múltipla (Maré) devolve um valor por golpe.
const roll = rollBasicAttack(mare, () => .5);
assert.equal(roll.hits.length, 2);
assert.equal(roll.total, roll.hits[0] + roll.hits[1]);
assert.equal(roll.crit, false);

// Save antigo: campos ausentes viram valores neutros e lixo é descartado.
const legacy = ensureArchetypeProgress({ archetype: 'motor_bio_forja', archetypeProgress: { motor_bio_forja: { level: 0, xp: -8, points: 9, nodes: { ataque_1: 2 } } } });
const legacyKit = legacy.archetypeProgress.motor_bio_forja;
assert.equal(legacyKit.level, 1);
assert.equal(legacyKit.xp, 0);
assert.deepEqual(legacyKit.mastery, {}, 'pontos e nós antigos são ignorados, não viram poder');
assert.equal(legacyKit.points, 9, 'dado antigo não é apagado à força');

console.log('RPG: XP, níveis, estatísticas derivadas, dano e migração de save OK.');
