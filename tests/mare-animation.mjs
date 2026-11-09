import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getMareWalk, getMareAttack, mareSheet } from '../js/data/mare-animation.js';
const progress={archetype:'mare_astral'}, player={equippedSuit:'mare',moving:true,facing:'down',ability:{}};
for(const facing of ['down','up','left','right']) {
 for(let i=0;i<4;i++) {
  const p={...player,facing};
  assert.equal(getMareWalk(progress,p,i*220).col, facing==='down' ? [0,2,0,2][i] : i);
  assert.equal(getMareAttack(progress,{...p,combat:{style:'mare_astral',duration:.32,timeLeft:.32*(1-(i+.1)/4)}}).col,i);
 }
 assert.equal(mareSheet(facing,'andar').flip,facing==='left');
 for(const kind of ['andar','ataque']) {
  const profile=mareSheet(facing,kind); const name=profile.id.replaceAll('_','-');
  const png=readFileSync(new URL('../assets/sprites/player/'+name+'.png',import.meta.url));
  assert.equal(png.readUInt32BE(16),1840); assert.equal(png.readUInt32BE(20),448); assert.equal(png[25],6);
 }
}
const combat={style:'mare_astral',duration:.32,timeLeft:.2};
for(const ability of [{dash:{}},{scanning:1},{effect:{timeLeft:1}}]) {
 assert.equal(getMareWalk(progress,{...player,ability},0),null);
 assert.equal(getMareAttack(progress,{...player,ability,combat}),null);
}
assert.equal(getMareWalk(progress,{...player,combat},0),null);
assert.equal(getMareWalk(progress,{...player,moving:false},0),null);
assert.equal(getMareWalk(progress,{...player,equippedSuit:'dominio'},0),null);
assert.equal(getMareAttack({archetype:'lamina_dominio_anciao'},{...player,combat}),null);
assert.equal(getMareAttack(progress,{...player,combat:{...combat,style:'motor_bio_forja'}}),null);
assert.equal(getMareAttack(progress,{...player,facing:'invalid',combat}),null);
console.log('Maré: direções, folhas e prioridade visual OK');
