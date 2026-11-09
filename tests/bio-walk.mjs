import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { getBioWalkFrame, bioWalkSheet } from '../js/data/bio-walk.js';
const progress = { archetype: 'motor_bio_forja' };
const p = { equippedSuit: 'bio_forja', moving: true, facing: 'down', ability: {} };
for (const [facing, cols] of Object.entries({down:[0,1,0,1], up:[0,1,2,3], left:[0,1,2,3], right:[0,1,2,3]})) {
  for (let phase=0; phase<4; phase++) assert.deepEqual(getBioWalkFrame(progress,{...p,facing},phase*220),{row:0,col:cols[phase]});
  assert.deepEqual(getBioWalkFrame(progress,{...p,facing},880),{row:0,col:cols[0]});
  assert(bioWalkSheet(facing));
}
assert.equal(bioWalkSheet('left').flip,true);
assert.equal(bioWalkSheet('right').flip,false);
assert.equal(bioWalkSheet('left').id,bioWalkSheet('right').id);
assert.equal(getBioWalkFrame(progress,{...p,facing:'invalid'},0),null);
for (const ability of [{dash:{}},{active:'bio_dash'},{scanning:.3},{effect:{timeLeft:.2}}]) assert.equal(getBioWalkFrame(progress,{...p,ability},0),null);
assert.equal(getBioWalkFrame(progress,{...p,combat:{timeLeft:.2}},0),null);
assert.equal(getBioWalkFrame(progress,{...p,moving:false},0),null);
assert.equal(getBioWalkFrame(progress,{...p,equippedSuit:null},0),null);
assert.equal(getBioWalkFrame({archetype:'mare_astral'},p,0),null);
assert.equal(getBioWalkFrame(progress,p,NaN),null);
for (const [name,w,h] of [['bio-frente-andar-0314.png',896,512],['bio-andar-lateral-0315.png',2064,512],['bio-andar-costas-0315.png',1400,784]]) {
 const png=readFileSync(new URL('../assets/sprites/player/'+name,import.meta.url));
 assert.equal(png.readUInt32BE(16),w); assert.equal(png.readUInt32BE(20),h); assert.equal(png[25],6);
 if(name.includes('frente')) assert.equal(createHash('sha256').update(png).digest('hex'), '7d5f6a7728e745adb70c85665204b24f79db1a25ca5be7958e3816761d31796d');
}
console.log('Bio: quatro direções, alpha, prioridade e folha frontal preservada OK.');
