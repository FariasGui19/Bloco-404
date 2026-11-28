import assert from "node:assert/strict";
import { cell, canStand, move, createMission, sites } from "../js/dimension/mare-mission-model.js";
import { details, visible, nearestSignal, useDetail, terrain, createPursuit, enemyArt, hurtEnemy } from "../js/dimension/mare-mission-life.js";

// Props: exactly eight, unique ids, empty tiles, reachable from the dock.
assert.equal(details.length, 8);
assert.equal(new Set(details.map((d) => d.id)).size, 8);
const reached = new Set(["16,28"]), queue = [[16, 28]];
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = x + dx, b = y + dy, k = `${a},${b}`;
    if (!cell(a + 0.5, b + 0.5) && !reached.has(k)) { reached.add(k); queue.push([a, b]); }
  }
}
for (const d of details) {
  assert.equal(cell(d.x, d.y), 0, d.id + " sits on the floor");
  assert.ok(reached.has(`${Math.floor(d.x)},${Math.floor(d.y)}`), d.id + " reachable");
  for (const s of sites) assert.ok(Math.hypot(s.x - d.x, s.y - d.y) > 0.9, d.id + " clear of " + s.id);
}
// LOS: the south cabin west wall blocks signals through it.
const inside = { x: 7.5, y: 22.5 }, outside = { x: 3.5, y: 22.5 };
assert.equal(visible(inside, outside), false);
assert.equal(visible({ x: 16, y: 28 }, { x: 16, y: 26 }), true);
assert.equal(nearestSignal(inside, [{ id: "outside", x: outside.x, y: outside.y }]), undefined);
assert.equal(nearestSignal({ x: 9.3, y: 6.7 }, details).id, "radio");

const p = { archetype: "mare_astral" }, m = createMission(p);
assert.deepEqual(m.p.details, {});
assert.equal(m.stamina, 100);
m.x = 9.3; m.y = 6.7; m.stamina = 12;
assert.match(useDetail(m, details.find((d) => d.id === "radio")), /RÁDIO/);
assert.equal(m.decoy.id || m.decoy.x, 9.8);
const saved = m.p.details.radio;
assert.match(useDetail(m, details.find((d) => d.id === "radio")), /ainda está ativo/);
assert.equal(m.p.details.radio, saved);
m.decoy.left = 0.05;
assert.equal(m.p.data.length, 0);
m.x = 20.2; m.y = 9.5;
assert.match(useDetail(m, details.find((d) => d.id === "armario")), /fôlego restaurado/);
assert.equal(m.stamina, 100);
m.stamina = 40; m.stress = 60;
useDetail(m, details.find((d) => d.id === "armario"));
assert.equal(m.stamina, 40); // once per run: no farming stamina
m.x = 16.5; m.y = 10.5;
assert.equal(terrain(m), "resina");
assert.match(useDetail(m, details.find((d) => d.id === "valvula")), /Resina drenada/);
assert.equal(terrain(m), "areia");
assert.equal(terrain({ x: 24, y: 20, p: m.p }), "madeira"); // píer de serviço
assert.equal(terrain({ x: 29, y: 16, p: m.p }), "agua"); // mar aberto
assert.equal(terrain({ x: 7.5, y: 22.5, p: m.p }), "madeira");
m.x = 17.5; m.y = 23.4;
assert.match(useDetail(m, details.find((d) => d.id === "boia")), /Baliza/);
assert.equal(m.p.checkpoint, "boia");
// Out of range or through a wall never interacts.
const far = createMission({});
assert.match(useDetail(far, details[0]), /parede|alcance/);
assert.equal(far.p.details.retrato, undefined);
// Details never masquerade as the three mnemonic data or rank.
assert.equal(m.p.rank, 1);
assert.deepEqual(m.p.data, []);

// Substepped movement: cannot tunnel through a wall with a large delta, and bad input is inert.
const w = createMission({});
w.x = 8.5; w.y = 19.2;
move(w, 0, 40);
assert.ok(w.y < 20 && canStand(w.x, w.y), "wall stops a 40-unit impulse: " + w.y);
const before = { x: w.x, y: w.y };
move(w, NaN, 1);
assert.deepEqual({ x: w.x, y: w.y }, before);

// Pursuit: flow field routes both enemies around cabin walls, states wind up/strike/recover.
const sim = createMission({});
sim.x = 16.5; sim.y = 28.5; sim.idle = 0;
const enemies = [{ x: 25, y: 17 }, { x: 10, y: 18 }]; // fora do novo painel sólido
const pursuit = createPursuit();
const start = enemies.map((e) => Math.hypot(e.x - sim.x, e.y - sim.y));
for (let i = 0; i < 30 * 45; i++) {
  pursuit.update(sim, enemies, 1 / 30, "mare_astral");
  for (const e of enemies) assert.ok(canStand(e.x, e.y), "enemy stays out of geometry");
}
const end = enemies.map((e) => Math.hypot(e.x - sim.x, e.y - sim.y));
assert.ok(end.every((d, i) => d < start[i] - 3), `pursuers close in: ${start} -> ${end}`);
assert.ok(enemies.some((e) => ["windup", "strike", "recover"].includes(e.phase)), "attack states reached");
sim.decoy = { x: 4.5, y: 28.5, left: 12 };
for (let i = 0; i < 20; i++) pursuit.update(sim, enemies, 1 / 30, "mare_astral");
assert.equal(sim.decoy.left < 12, true);
sim.ward = 0.5;
pursuit.update(sim, enemies, 1 / 30, "mare_astral");
assert.equal(enemies[0].phase, "stunned");
// Animation states stay legible and distinct.
assert.equal(enemyArt({ phase: "windup", variant: "baixo" }), "infectado-golpe-baixo");
assert.equal(enemyArt({ phase: "windup", variant: "alto" }), "infectado-golpe-alto");
assert.equal(enemyArt({ phase: "hurt" }), "infectado-dano");
assert.equal(enemyArt({ phase: "dissolve" }), "infectado-dissolvido");
assert.equal(enemyArt({ phase: "stunned" }), "infectado-atordoado");
assert.equal(enemyArt({ phase: "rise" }), "infectado-erguendo");
assert.equal(enemyArt({ phase: "listen" }), "infectado-escuta");
assert.equal(enemyArt({ phase: "search" }), "infectado-busca");

// Stealth: before any Nulo ping or noise, the pair patrols instead of homing.
const hidden = createMission({});
hidden.x = 16.5; hidden.y = 28.5; hidden.idle = 0;
const guards = [{ x: 26, y: 10 }, { x: 4, y: 10 }], calm = createPursuit();
for (let i = 0; i < 6 * 30; i++) calm.update(hidden, guards, 1 / 30, "mare_astral");
assert.equal(calm.track, null);
assert.ok(guards.every((e) => Math.hypot(e.x - hidden.x, e.y - hidden.y) > 10), "no omniscient chase");
assert.ok(guards.every((e) => !["windup", "strike"].includes(e.phase)));
// Footstep noise is a real lure even without sight.
hidden.x = 24.5; hidden.y = 17.5; hidden.noise = 1;
const beforeNoise = Math.hypot(guards[0].x - hidden.x, guards[0].y - hidden.y);
calm.update(hidden, guards, 1 / 30, "mare_astral");
assert.ok(calm.track, "noise creates a track");
for (let i = 0; i < 90; i++) calm.update(hidden, guards, 1 / 30, "mare_astral");
assert.ok(Math.hypot(guards[0].x - hidden.x, guards[0].y - hidden.y) < beforeNoise - 0.4, "pursuer follows the sound");
assert.ok(["search", "listen", "windup", "strike", "recover"].includes(guards[0].phase), "audible pursuit becomes search: " + guards[0].phase);
// Crouching shortens the detection range without changing the close attack range.
const low = createMission({});
low.x = 16.5; low.y = 27.5; low.crouched = true; low.idle = 0;
const distant = [{ x: 16.5, y: 17.6 }], scout = createPursuit();
scout.update(low, distant, 1 / 30, "mare_astral");
assert.equal(scout.track, null, "crouched silhouette hides a distant player");
low.crouched = false; scout.update(low, distant, 1 / 30, "mare_astral");
assert.ok(scout.track, "standing in the open is seen");
// Ward: stunned -> rising -> hunt, with distinct sprites.
const shock = createMission({});
shock.x = 16; shock.y = 28; const near = [{ x: 16, y: 26.8 }], ward = createPursuit();
shock.ward = 0.4; ward.update(shock, near, 1 / 30, "mare_astral");
assert.equal(near[0].phase, "stunned");
shock.ward = 0; ward.update(shock, near, 0.5, "mare_astral");
assert.equal(near[0].phase, "rise");
ward.update(shock, near, 1, "mare_astral");
assert.equal(near[0].phase, "hunt");
// Local combat: three hits dissolve, the casulo reforms after 30s, variants telegraph.
const combat = createMission({});
combat.x = 16.5; combat.y = 27.5; combat.idle = 0;
const foes = [{ x: 16.5, y: 26.4, hp: 3 }], fight = createPursuit();
assert.equal(hurtEnemy(foes[0], 1), "hurt");
assert.equal(foes[0].phase, "hurt");
assert.equal(enemyArt(foes[0]), "infectado-dano");
assert.equal(hurtEnemy(foes[0], 1), "hurt");
assert.equal(hurtEnemy(foes[0], 1), "defeated");
assert.equal(foes[0].phase, "dissolve");
for (let i = 0; i < 40; i++) fight.update(combat, foes, 1 / 30, "mare_astral");
assert.equal(foes[0].dead, true);
assert.equal(foes[0].hp, 0);
for (let i = 0; i < 1000 && foes[0].dead; i++) fight.update(combat, foes, 1 / 30, "mare_astral");
assert.equal(foes[0].dead, false);
assert.equal(foes[0].hp, 3);
assert.equal(foes[0].phase, "rise");
assert.ok(Math.hypot(foes[0].x - 26.2, foes[0].y - 15.2) < .2, "reforms at a casulo");
// High/low variants use different telegraph timings.
const variant = createMission({});
variant.x = 16.5; variant.y = 28; variant.idle = 0;
const close = [{ x: 16.5, y: 27.55, hp: 3 }], tel = createPursuit();
tel.update(variant, close, 1 / 30, "mare_astral");
assert.equal(close[0].phase, "windup");
assert.equal(close[0].variant, "baixo");
assert.ok(Math.abs(close[0].clock - 0.55) < 0.04);
// Lantern trades stealth for a wider detection cone.
const dark = createMission({}); dark.x = 16.5; dark.y = 27.5; dark.idle = 0; dark.crouched = true;
const watcher = [{ x: 16.5, y: 17.6, hp: 3 }], sight = createPursuit();
sight.update(dark, watcher, 1 / 30, "mare_astral");
assert.equal(sight.track, null);
dark.p.containment = { lanterna: true };
sight.update(dark, watcher, 1 / 30, "mare_astral");
assert.ok(sight.track, "lantern extends detection");
console.log("Maré life: eight grounded props, LOS targeting, one-shot reserves, terrain, substepped collision and shared-field pursuit OK");
