import assert from 'node:assert/strict';
import { state } from '../js/game/state.js';
import { loadMap } from '../js/game/map-manager.js';
import { BASIC_ATTACKS, tryBasicAttack, updateBasicCombat } from '../js/game/combat.js';
import { getDerivedStats, rollBasicAttack, grantArchetypeXp } from '../js/game/rpg.js';
import { getQuestState, startQuest } from '../js/game/quests.js';

// rng fixo: 0.5 → variância exata 1.0 e nenhum crítico nos testes de dano.
const flat = () => .5;

state.save.loaded = false; state.save.activeSlot = null;
state.progress = { flags: {}, inventory: [], activeQuest: { id: 'embarque_dimensional', status: 'active' } };
await loadMap('ilha_enseada_ecos', 'inicio');
const map = state.world.currentMap, player = state.player, target = state.trainingTargets[0];
Object.assign(player, { x: 13, y: 15.5, facing: 'down', ability: {} });
const aim = { x: target.x, y: target.y };
const expected = { motor_bio_forja: 9, lamina_dominio_anciao: 13, mare_astral: 10, nucleo_dez_forma: 5 };

assert.equal(target.maxHealth, 60, 'alvos de treino usam vida real, não contagem de toques');
for (const archetype of Object.keys(BASIC_ATTACKS)) {
  state.progress.archetype = archetype; player.combat = null; target.health = target.maxHealth;
  assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim, rng: flat }));
  assert.equal(target.health, target.maxHealth - expected[archetype], `${archetype} tem dano próprio`);
  assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim, rng: flat }), false, 'respeita cooldown');
  assert.equal(target.health, target.maxHealth - expected[archetype]);
}

// A recarga também é do arquétipo: um golpe lento não pode ser mais rápido que o perfil.
const stats = getDerivedStats({ archetype: 'lamina_dominio_anciao', archetypeProgress: {} });
assert.equal(stats.cooldown, BASIC_ATTACKS.lamina_dominio_anciao.cooldown);
player.combat = null;
assert(tryBasicAttack({ player, progress: { ...state.progress, archetype: 'lamina_dominio_anciao' }, map, targets: [], point: aim, rng: flat }));
assert.equal(player.combat.cooldown, BASIC_ATTACKS.lamina_dominio_anciao.cooldown);

// Crítico: rng 0 garante crítico e variância mínima (0,94).
const crit = rollBasicAttack(getDerivedStats({ archetype: 'lamina_dominio_anciao', archetypeProgress: {} }), () => 0);
assert.equal(crit.crit, true);
assert.equal(crit.total, Math.round(13 * 1.85 * .94));

// Forma Veloz multiplica o pulso do Núcleo sem mudar os outros arquétipos.
const base10x = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} });
const form10x = getDerivedStats({ archetype: 'nucleo_dez_forma', archetypeProgress: {} }, { nucleoForm: 'forma_veloz' });
assert(form10x.basicDamage > base10x.basicDamage);
assert.equal(form10x.basicDamage, base10x.basicDamage * BASIC_ATTACKS.nucleo_dez_forma.formMult);

// Sequência de mortes: dano derruba o alvo, XP entra e a missão conta.
state.progress.archetype = 'lamina_dominio_anciao';
state.progress.archetypeProgress = {};
startQuest(state.progress, 'calibracao_de_campo');
target.health = target.maxHealth;
let defeats = 0;
for (let swing = 0; swing < 40 && defeats < 3; swing++) {
  player.combat = null;
  assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim, rng: flat }));
  const down = target.health === 0;
  updateBasicCombat(player, state.trainingTargets, BASIC_ATTACKS.lamina_dominio_anciao.cooldown + .01);
  if (down) {
    defeats++;
    assert(target.downTimer > 0, 'alvo derrubado aguarda recarga');
    updateBasicCombat(player, state.trainingTargets, 4.1);
    assert.equal(target.health, target.maxHealth, 'alvo se recompõe');
  }
}
assert.equal(defeats, 3);
const kit = state.progress.archetypeProgress.lamina_dominio_anciao;
assert(kit.xp >= 0 && kit.level >= 2, 'treino rende XP e nível');
assert(state.progress.inventory.includes('registro_de_calibracao'));
assert.equal(getQuestState(state.progress, 'calibracao_de_campo').status, 'completed');
assert(state.progress.flags.calibracao_de_campo_concluida);

// Clique na parte alta da arte do alvo (não apenas em sua base) também mira no centro.
target.health = target.maxHealth; player.combat = null;
const topOfTarget = { x: target.x - .75, y: target.y - .75 };
assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: topOfTarget, rng: flat }));
assert(target.health < target.maxHealth);

target.health = target.maxHealth; player.combat = null; player.ability = { dash: {} };
assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim, rng: flat }), false, 'não interrompe dash');
player.ability = { effect: { id: 'senso_corrente', timeLeft: .3 } };
assert.equal(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: aim, rng: flat }), false, 'não interrompe ação visual Q/R');
player.ability = {}; player.combat = null;
assert(tryBasicAttack({ player, progress: state.progress, map, targets: state.trainingTargets, point: { x: 10, y: 15.5 }, rng: flat }));
assert.equal(target.health, target.maxHealth, 'não atinge atrás do operador');

// Parede bloqueia o golpe mesmo com alvo no alcance.
player.combat = null;
const wallMap = { layout: [[0, 1, 0]], walkMask: ['.#.'] };
player.x = .5; player.y = .5;
const blocked = [{ x: 1.9, y: .5, health: 60, maxHealth: 60 }];
assert(tryBasicAttack({ player, progress: state.progress, map: wallMap, targets: blocked, point: { x: 2, y: .5 }, rng: flat }));
assert.equal(blocked[0].health, 60, 'golpe não atravessa parede');

// XP para de render no treino depois do nível 5.
const high = { archetype: 'mare_astral', archetypeProgress: { mare_astral: { level: 5, xp: 0, points: 0, nodes: {}, slots: {} } } };
assert.equal(grantArchetypeXp(high, 25).gained, 25, 'nível 5 ainda aceita XP de outras fontes');
assert.equal(high.archetypeProgress.mare_astral.xp, 25);

assert.deepEqual(state.progress.flags.calibracao_de_campo_concluida, true);
await loadMap('hub_saguao');
assert.equal(state.trainingTargets.length, 0);
assert.equal(player.combat, null);
console.log('Ataques básicos: dano por arquétipo, crítico, recarga, XP, missão e treino temporário OK.');
