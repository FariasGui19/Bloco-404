import assert from 'node:assert/strict';
import { listInventory, getSkillTree, createHealth, applyHealthDamage } from '../js/game/systems-foundation.js';
const progress = { archetype:'motor_bio_forja', inventory:['x','x','y'] };
assert.deepEqual(listInventory(progress), ['x','y']); assert.deepEqual(progress.inventory,['x','x','y']);
const tree=getSkillTree(progress); assert.equal(tree.length,5); assert(tree.every(x=>x.level===1)); assert.equal(tree.find(x=>x.slot==='ultimate').abilityId,null);
assert.deepEqual(getSkillTree({archetype:'desconhecido'}),[]);
const health=createHealth(100); assert.deepEqual(applyHealthDamage(health,120),{current:0,max:100}); assert.equal(health.current,100); assert.equal(applyHealthDamage(health,-1),null); assert.equal(createHealth(0),null);
console.log('Fundação: inventário, slots de habilidades e vida pura sem mutação OK.');
