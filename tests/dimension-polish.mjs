import assert from 'node:assert/strict';
import { createOperator } from '../js/dimension/operator.js';
const suits = { motor_bio_forja: 'bio_forja', mare_astral: 'mare', lamina_dominio_anciao: 'dominio' };
for (const [archetype, equippedSuit] of Object.entries(suits)) {
  const progress = { archetype }, player = { equippedSuit };
  const before = JSON.stringify({progress, player});
  const civil = createOperator(progress), equipped = createOperator(progress, player);
  assert.equal(civil.root.userData.identity.clothing, 'civilian');
  assert.equal(equipped.root.userData.identity.clothing, equippedSuit);
  assert.equal(createOperator(progress, {equippedSuit:'invalid'}).root.userData.identity.clothing, 'civilian');
  const colors = rig => { const values = new Set(); rig.root.traverse(o => { for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m?.color) values.add(m.color.getHex()); }); return values; };
  assert(colors(civil).has(0xd3d0c7), 'canonical light cargo material survives batching');
  assert(!colors(equipped).has(0xd3d0c7));
  for (const rig of [civil, equipped]) {
    assert(rig.root.getObjectByName('layered-hair'));
    rig.root.traverse(o => assert.notEqual(o.geometry?.type, 'OctahedronGeometry'));
  }
  assert.equal(JSON.stringify({progress, player}), before);
}
assert.equal(createOperator({archetype:'nucleo_dez_forma'}, {equippedSuit:'bio_forja'}).root.userData.identity.clothing, 'civilian');
console.log('Polish: explicit matching suits, civilian cargo, bracelet-only X10, no crystal geometry, immutable inputs OK.');
