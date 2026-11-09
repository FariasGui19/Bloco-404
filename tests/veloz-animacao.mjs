import assert from 'node:assert/strict';
import { getVelozAnimation, getVelozPulse } from '../js/data/veloz-animation.js';
const progress = { archetype: 'nucleo_dez_forma' };
const p = { nucleoForm: 'forma_veloz', facing: 'right', moving: true, ability: {} };
assert.equal(getVelozAnimation(progress, p, 0).col, 0);
assert.equal(getVelozAnimation(progress, p, 95).col, 1);
p.facing = 'left'; assert(getVelozAnimation(progress, p, 95).flip);
p.facing = 'up'; assert.equal(getVelozAnimation(progress, p, 95), null);
p.combat = { style: 'nucleo_dez_forma', timeLeft: .16, duration: .32 };
assert.equal(getVelozAnimation(progress, p, 0).row, 2);
p.facing = 'down'; assert.equal(getVelozAnimation(progress, p, 0).row, 0);
p.facing = 'right'; assert.equal(getVelozAnimation(progress, p, 0).row, 2);
p.ability.effect = { timeLeft: .2 }; assert.equal(getVelozAnimation(progress, p, 0), null);
p.ability = { dash: {} }; assert.equal(getVelozAnimation(progress, p, 0), null);
p.ability = {}; p.nucleoForm = null; assert.equal(getVelozAnimation(progress, p, 0), null);
assert.equal(getVelozAnimation({ archetype: 'mare_astral' }, p, 0), null);
console.log('Forma veloz: seleção visual direcional, corrida lateral e prioridade das habilidades OK.');

const effect={id:'forma_veloz',duration:.45,timeLeft:.3};
for(const facing of ['up','down','left','right']) {
 const v={nucleoForm:'forma_veloz',facing,ability:{effect,dash:{}}};
 const pose=getVelozPulse(progress,v); assert(pose); assert.equal(pose.flip,facing==='left');
 assert.equal(pose.sprite, ['left','right'].includes(facing)?'veloz_corrida_lateral':'veloz_ataque_direcional');
 assert.equal(getVelozPulse(progress,{...v,nucleoForm:null}),null);
 assert.equal(getVelozPulse(progress,{...v,ability:{effect:{...effect,id:'eco_scan'}}}),null);
 assert.equal(getVelozPulse(progress,{...v,ability:{effect,scanning:1}}),null);
}
assert.equal(getVelozPulse({archetype:'mare_astral'},{nucleoForm:'forma_veloz',facing:'up',ability:{effect}}),null);
