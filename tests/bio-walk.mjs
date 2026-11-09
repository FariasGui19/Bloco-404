import assert from 'node:assert/strict';
import { getBioWalkFrame, bioWalkMetrics } from '../js/data/bio-walk.js';
import { CONFIG } from '../js/config.js';
const progress = { archetype: 'motor_bio_forja' };
const p = { equippedSuit: 'bio_forja', moving: true, facing: 'right', ability: {} };
for (const [facing, row] of Object.entries({ down: 0, right: 1, up: 2, left: 3 })) {
  p.facing = facing;
  for (let col = 0; col < 6; col++) assert.deepEqual(getBioWalkFrame(progress, p, col * 150), { row, col });
  assert.deepEqual(getBioWalkFrame(progress, p, 900), { row, col: 0 });
}
assert.equal(CONFIG.PLAYER_BIO_FORJA_WALK_SPRITE.SHEET_COLS, 6);
assert.equal(CONFIG.PLAYER_BIO_FORJA_WALK_SPRITE.SHEET_ROWS, 4);
for (const [facing, height] of Object.entries({ down: 128.65, right: 132.68, up: 126.79, left: 132.68 })) {
  for (const frameHeight of [213, 228, 237]) {
    const m = bioWalkMetrics(facing, frameHeight);
    assert(Math.abs(m.scale * frameHeight - height) < .001);
    assert(Number.isFinite(m.footOffset));
  }
}
assert.equal(bioWalkMetrics('left', 0), null);
// Alturas reais aproximadas das duas folhas: diferença menor que 5%.
assert(Math.abs(228 * CONFIG.PLAYER_BIO_FORJA_WALK_SPRITE.SCALE / (420 * CONFIG.PLAYER_BIO_FORJA_SPRITE.SCALE) - 1) < .05);
for (const ability of [{ dash: {} }, { scanning: .3 }, { effect: { timeLeft: .2 } }]) {
  p.ability = ability; assert.equal(getBioWalkFrame(progress, p, 0), null);
}
p.ability = {}; p.combat = { timeLeft: .2 };
assert.equal(getBioWalkFrame(progress, p, 0), null);
p.combat = null; p.moving = false; assert.equal(getBioWalkFrame(progress, p, 0), null);
p.moving = true; p.equippedSuit = null; assert.equal(getBioWalkFrame(progress, p, 0), null);
assert.equal(getBioWalkFrame({ archetype: 'mare_astral' }, { ...p, equippedSuit: 'bio_forja' }, 0), null);
assert.equal(getBioWalkFrame(progress, { ...p, equippedSuit: 'bio_forja', facing: 'invalid' }, 0), null);
console.log('Bio: seis quadros por direção, proporção e prioridades OK.');
