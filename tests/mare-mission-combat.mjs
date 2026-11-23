import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { combatProps, pods, isInteractiveCombat, useCombatProp } from "../js/dimension/mare-mission-combat.js";
import { createMission, cell } from "../js/dimension/mare-mission-model.js";
import { nearestSignal, visible } from "../js/dimension/mare-mission-life.js";

const lote4 = ["infectado-golpe-baixo","infectado-golpe-alto","infectado-dano","infectado-dissolvido","casulo-mare","eco-operador","painel-contencao","cabo-energia","lanterna-sinal","porta-fenda"];
for (const name of lote4) {
  for (const dir of ["source-art", "sprites"]) {
    const path = `assets/${dir}/mare-missao-lote4/${name}.png`;
    assert.ok(existsSync(path), `${path} exists`);
    const buf = readFileSync(path);
    assert.equal(buf.toString("ascii", 1, 4), "PNG");
    if (dir === "sprites") assert.equal(buf[25], 6, `${name} sprite is RGBA`);
  }
}
assert.equal(new Set(combatProps.map((p) => p.id)).size, combatProps.length);
assert.equal(pods.length, 2, "two casulo respawn anchors");
for (const p of combatProps) {
  assert.ok(p.scale > .4 && p.r >= .4, `${p.id} readable/collidable`);
  // The prop center blocks movement, but a free approach cell exists within reach.
  let approach = false;
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const x = p.x + dx * .45, y = p.y + dy * .45;
    if (!cell(Math.floor(x), Math.floor(y)) && visible({ x, y }, p)) approach = true;
  }
  assert.ok(approach, `${p.id} approachable`);
}
const m = createMission({});
for (const p of combatProps) {
  const free = [[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5]].map(([dx,dy]) => ({x:p.x+dx,y:p.y+dy})).find((q) => visible(q,p) && !cell(Math.floor(q.x),Math.floor(q.y)) && Math.hypot(q.x-p.x,q.y-p.y)<=1.8);
  assert.ok(free, `${p.id} has a visible free approach`);
  m.x=free.x;m.y=free.y;
  const near = nearestSignal(m,[p]);
  if (isInteractiveCombat(p)) assert.equal(near?.id, p.id, `${p.id} is reachable by E`);
}
// Hazard isolation is one-shot and relieves local stress.
m.x=15.9;m.y=12.6;m.stress=50;
assert.match(useCombatProp(m,combatProps.find(p=>p.id==="cabo"),[]),/ISOLADO/);
assert.equal(m.p.containment.cabo,true);
assert.equal(m.stress,38);
assert.match(useCombatProp(m,combatProps.find(p=>p.id==="cabo"),[]),/já está isolado/);
// Lantern trades stress for visibility.
m.x=22.5;m.y=24.2;
assert.match(useCombatProp(m,combatProps.find(p=>p.id==="lanterna"),[]),/ACESA/);
assert.equal(m.p.containment.lanterna,true);
assert.match(useCombatProp(m,combatProps.find(p=>p.id==="lanterna"),[]),/APAGADA/);
// Panel reports live threats; eco is one-shot.
m.x=19.0;m.y=18.4;
assert.match(useCombatProp(m,combatProps.find(p=>p.id==="painel"),[{},{}]),/2\/2/);
const eco=combatProps.find(p=>p.id==="eco");m.x=13.0;m.y=14.5;
const first=useCombatProp(m,eco,[]);
assert.match(first,/ECO/);assert.match(useCombatProp(m,eco,[]),/repete/);
// Non-boolean/unknown containment state is sanitized and identity untouched.
const dirty=createMission({mareMission:{containment:{cabo:"yes",lanterna:1,eco:true,hack:true},inventory:["x"],health:42}});
assert.deepEqual(dirty.p.containment,{eco:true});
assert.deepEqual(dirty.p.inventory,["x"],"mission payload stays local");
assert.equal(dirty.p.health,42);
console.log("Maré combat: 10 RGBA sheets, 7 grounded props, 2 casulos, LOS interaction, isolated hazard, lantern trade-off, panel/eco one-shots and sanitized containment OK.");
