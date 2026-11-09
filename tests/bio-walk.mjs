import assert from 'node:assert/strict';
import { getBioWalkFrame } from '../js/data/bio-walk.js';
const progress = { archetype: 'motor_bio_forja' };
const p = { equippedSuit: 'bio_forja', moving: true, facing: 'right', ability: {} };
assert.deepEqual(getBioWalkFrame(progress, p, 0), { row: 0, col: 0 });
assert.deepEqual(getBioWalkFrame(progress, p, 180), { row: 0, col: 1 });
p.facing = 'left';
assert.deepEqual(getBioWalkFrame(progress, p, 0), { row: 0, col: 2 });
assert.deepEqual(getBioWalkFrame(progress, p, 180), { row: 0, col: 3 });
for (const facing of ['up', 'down']) { p.facing = facing; assert.equal(getBioWalkFrame(progress, p, 100), null); }
p.facing = 'left';
for (const ability of [{ dash: {} }, { scanning: .3 }, { effect: { timeLeft: .2 } }]) {
  p.ability = ability; assert.equal(getBioWalkFrame(progress, p, 0), null);
}
p.ability = {}; p.combat = { timeLeft: .2 };
assert.equal(getBioWalkFrame(progress, p, 0), null);
p.combat = null; p.moving = false; assert.equal(getBioWalkFrame(progress, p, 0), null);
p.moving = true; p.equippedSuit = null; assert.equal(getBioWalkFrame(progress, p, 0), null);
assert.equal(getBioWalkFrame({ archetype: 'mare_astral' }, { ...p, equippedSuit: 'bio_forja' }, 0), null);
console.log('Bio: dois passos laterais, prioridade de ação e fallback direcional OK.');
