import assert from 'node:assert/strict';
import { VITALS_RULES } from '../js/data/combat-balance.js';
import { damagePlayer, ensureHealth, healPlayer, updateHealth } from '../js/game/health.js';
import { createHazards, isInsideHazard, updateHazards } from '../js/game/hazards.js';
import { getDerivedStats } from '../js/game/rpg.js';
import { loadMap, getSafeSpawn } from '../js/game/map-manager.js';
import { clearCombatFeedback } from '../js/game/combat-feedback.js';
import { state } from '../js/game/state.js';

const progress = { archetype: 'lamina_dominio_anciao', archetypeProgress: {} };
const stats = getDerivedStats(progress);
const player = { x: 4, y: 4, ability: {} };

// Vida nasce cheia e acompanha o máximo do arquétipo.
const vitals = ensureHealth(player, progress);
assert.equal(player.maxHealth, stats.maxHealth);
assert.equal(player.health, stats.maxHealth);
assert.equal(vitals.percent, 1);

// Dano reduz vida, abre invulnerabilidade e não empilha dentro da janela.
const first = damagePlayer(player, progress, 20);
assert.equal(first.dealt, 20);
assert.equal(first.dead, false);
assert.equal(player.health, stats.maxHealth - 20);
assert.equal(player.invulnerable, VITALS_RULES.invulnerability);
assert.equal(damagePlayer(player, progress, 20).dealt, 0, 'invulnerável ignora o segundo golpe');
assert.equal(player.health, stats.maxHealth - 20);

// Depois da janela, o dano volta a valer.
updateHealth(player, progress, VITALS_RULES.invulnerability + .1);
assert.equal(player.invulnerable, 0);
assert.equal(damagePlayer(player, progress, 10).dealt, 10);
clearCombatFeedback();

// Fora de combate, a vida regenera só depois do atraso.
player.health = 50;
player.sinceDamage = 0;
updateHealth(player, progress, 2);
assert.equal(player.health, 50, 'ainda dentro do atraso de regeneração');
updateHealth(player, progress, VITALS_RULES.regenDelay);
assert(player.health > 50, 'regenera após o atraso');

// Cura respeita o máximo.
player.health = player.maxHealth - 5;
assert.equal(healPlayer(player, progress, 999), 5);
assert.equal(player.health, player.maxHealth);

// Morte: fica caído, depois renasce no ponto seguro com fração da vida.
player.health = 10;
player.invulnerable = 0;
const lethal = damagePlayer(player, progress, 999);
assert.equal(lethal.dead, true);
assert.equal(player.health, 0);
assert(player.deathTimer > 0);
const respawn = updateHealth(player, progress, VITALS_RULES.deathDelay, { onRespawn: () => ({ x: 7.5, y: 9.5 }) });
assert.equal(respawn.dead, false);
assert.equal(player.x, 7.5);
assert.equal(player.y, 9.5);
assert.equal(player.health, Math.round(player.maxHealth * VITALS_RULES.respawnRatio));
assert.equal(player.invulnerable, VITALS_RULES.respawnInvulnerability);
assert(player.health > 0, 'nunca renasce com zero');

// Zonas de eco instável: dano com intervalo, nada durante o dash.
const hazard = createHazards({ hazards: [{ id: 'teste', x: 5, y: 5, radius: 1, damage: 7, interval: 1 }] })[0];
player.x = 5.5; player.y = 5.5;
player.invulnerable = 0;
assert(isInsideHazard(player, hazard));
const hit = updateHazards([hazard], player, progress, .1);
assert(hit && hit.dealt > 0);
const healthAfterHit = player.health;
player.invulnerable = 0;
assert.equal(updateHazards([hazard], player, progress, .1), null, 'respeita o intervalo entre pulsos');
assert.equal(player.health, healthAfterHit);
player.x = 20; player.y = 20;
assert.equal(updateHazards([hazard], player, progress, 2), null, 'fora da zona não há dano');

const dashing = { x: 5.5, y: 5.5, ability: { dash: {} }, health: 100, maxHealth: 100, invulnerable: 0 };
hazard.cooldown = 0;
assert.equal(updateHazards([hazard], dashing, progress, .1), null, 'dash atravessa a zona');
clearCombatFeedback();

// Mapas reais: hazard nunca em cima do spawn, do alvo de treino ou de parede.
state.save.loaded = false;
for (const mapId of ['ilha_enseada_ecos', 'ilha_estacao_bio']) {
  await loadMap(mapId, 'inicio');
  const map = state.world.currentMap;
  for (const zone of state.hazards) {
    assert.notEqual(map.layout[Math.floor(zone.y)][Math.floor(zone.x)], 1, `${zone.id} precisa estar em piso caminhável`);
    const spawn = getSafeSpawn();
    assert(Math.hypot(zone.x - spawn.x, zone.y - spawn.y) > 3, `${zone.id} longe do spawn`);
    for (const target of state.trainingTargets) {
      assert(Math.hypot(zone.x - target.x, zone.y - target.y) > 2.5, `${zone.id} não cobre o alvo de treino`);
    }
  }
}

console.log('Vida: dano, invulnerabilidade, regeneração, morte segura e zonas de eco OK.');
