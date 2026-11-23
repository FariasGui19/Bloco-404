import assert from "node:assert/strict";
import {
  cell,
  sites,
  createMission,
  move,
  interact,
  canStand,
  abilities,
} from "../js/dimension/mare-mission-model.js";
const progress = { archetype: "mare_astral" },
  m = createMission(progress);
assert.equal(m.p.rank, 1);
assert.equal(Object.keys(abilities).length, 4);
const seen = new Set(["16,28"]),
  queue = [[16, 28]];
for (let i = 0; i < queue.length; i++) {
  const [x, y] = queue[i];
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]) {
    const a = x + dx,
      b = y + dy,
      k = `${a},${b}`;
    if (!cell(a + 0.5, b + 0.5) && !seen.has(k)) {
      seen.add(k);
      queue.push([a, b]);
    }
  }
}
for (const s of sites)
  assert.ok(
    seen.has(`${Math.floor(s.x)},${Math.floor(s.y)}`),
    s.id + " reachable",
  );
const anchor = sites.find((s) => s.id === "ancora");
m.x = anchor.x;
m.y = anchor.y;
interact(m, anchor);
assert.equal(m.finished, false);
for (const s of sites.slice(0, 3)) {
  m.x = s.x;
  m.y = s.y;
  interact(m, s);
  interact(m, s);
}
assert.equal(m.p.data.length, 3);
assert.equal(m.p.rank, 1);
const terminal = sites.find((s) => s.id === "terminal");
m.x = terminal.x;
m.y = terminal.y;
interact(m, terminal);
assert.equal(m.p.rank, 4);
m.x = anchor.x;
m.y = anchor.y;
interact(m, anchor);
assert.equal(m.finished, true);
m.x = 1.3;
m.y = 1.3;
for (let i = 0; i < 100; i++) move(m, -0.05, 0);
assert.ok(m.x >= 1.2);
assert.ok(canStand(m.x, m.y));
const ref = m.p;
assert.equal(createMission(progress).p, ref);
assert.equal(progress.archetype, "mare_astral");
console.log(
  "Maré mission: connected cabins, guarded objective, idempotent collection, recompilation, radius collision and resume OK",
);
