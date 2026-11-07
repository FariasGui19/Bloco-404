import assert from 'node:assert/strict';
import { BASIC_ATTACKS, tryBasicAttack, updateBasicCombat } from '../js/game/combat.js';
import { COMPANION_SPECIES, createCompanion, updateCompanion } from '../js/game/companions.js';
const map = { layout: Array.from({length: 8}, () => Array(8).fill(0)) };
for (const [archetype, profile] of Object.entries(BASIC_ATTACKS)) {
  const player = { x: 3, y: 3, facing: 'down', ability: {} };
  for (let i = 0; i < profile.strain.hits; i++) {
    assert(tryBasicAttack({player, progress: { archetype }, map, targets: [], point: {x: 4, y: 4}}));
    if (i < profile.strain.hits - 1) updateBasicCombat(player, [], .5);
  }
  assert.equal(player.combat.strained, true);
  assert.equal(player.combat.cooldown, profile.cooldown + profile.strain.extra);
  assert.match(player.ability.lastMessage, /RECUPERAÇÃO/);
  updateBasicCombat(player, [], 2);
  assert.equal(player.combat.chain, 0);
}
assert.equal(COMPANION_SPECIES.bolt.art, null);
assert.equal(createCompanion('desconhecido', {x: 0, y: 0}), null);
const bolt = createCompanion('bolt', {x: 0, y: 0});
updateCompanion(bolt, {x: 3, y: 0}, 1);
assert.equal(bolt.x, 0, 'sem colisão integrada não anda');
updateCompanion(bolt, {x: 3, y: 0}, 1, () => false);
assert.equal(bolt.x, 0, 'não atravessa obstáculo');
updateCompanion(bolt, {x: 3, y: 0}, 1, () => true);
assert(bolt.x > 0 && bolt.x <= .08);
console.log('Sobrecarga e fundação isolada de companheiros OK.');
