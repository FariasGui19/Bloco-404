import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getDominioWalk, getDominioAttack } from '../js/data/dominio-animation.js';
const progress = { archetype:'lamina_dominio_anciao' };
const player = {equippedSuit:'dominio',moving:true,facing:'down',ability:{}};
for (let i=0;i<4;i++) assert.deepEqual(getDominioWalk(progress,player,i*220),{col:i%2});
for(const facing of ['left','right','up']) for (let i=0;i<4;i++) assert.deepEqual(getDominioWalk(progress,{...player,facing},i*220),{col:i});
assert.equal(getDominioWalk(progress,{...player,facing:'invalid'},0),null);
assert.equal(getDominioWalk(progress,{...player,moving:false},0),null);
assert.equal(getDominioWalk(progress,{...player,combat:{timeLeft:.2}},0),null);
const combat={style:'lamina_dominio_anciao',duration:.32,timeLeft:.32};
for(let i=0;i<4;i++) {
 const p={...player,facing:'right',combat:{...combat,timeLeft:.32*(1-(i+.1)/4)}};
 assert.deepEqual(getDominioAttack(progress,p),{col:i,flip:false});
 assert.deepEqual(getDominioAttack(progress,{...p,facing:'left'}),{col:i,flip:true});
}
for (const ability of [{dash:{}},{scanning:.2},{effect:{timeLeft:.2}}]) {
 assert.equal(getDominioWalk(progress,{...player,ability},0),null);
 assert.equal(getDominioAttack(progress,{...player,facing:'right',ability,combat}),null);
}
for (const facing of ['up','down']) assert.deepEqual(getDominioAttack(progress,{...player,facing,combat}),{col:0,flip:false});
assert.equal(getDominioAttack(progress,{...player,facing:'invalid',combat}),null);
assert.equal(getDominioAttack(progress,{...player,facing:'right',combat:{...combat,style:'motor_bio_forja'}}),null);
assert.equal(getDominioAttack({archetype:'mare_astral'},{...player,facing:'right',combat}),null);
for(const [name,w,h] of [['dominio-andar-frente-0316.png',1200,448],['dominio-ataque-lateral-0316.png',1800,768],...['andar-lateral','andar-costas','ataque-frente','ataque-costas'].map(n=>['dominio-'+n+'-0317.png',1760,700])]) {
 const png=readFileSync(new URL('../assets/sprites/player/'+name,import.meta.url));
 assert.equal(png.readUInt32BE(16),w); assert.equal(png.readUInt32BE(20),h); assert.equal(png[25],6);
}
console.log('Domínio: caminhada e ataque direcionais, fallback e prioridades OK.');
