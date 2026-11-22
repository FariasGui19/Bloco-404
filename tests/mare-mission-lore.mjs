import assert from "node:assert/strict";
import { cell, canStand, createMission, sites } from "../js/dimension/mare-mission-model.js";
import { details } from "../js/dimension/mare-mission-details.js";
import { lore, loreById, useLore } from "../js/dimension/mare-mission-lore.js";
import { visible, nearestSignal } from "../js/dimension/mare-mission-life.js";

assert.equal(lore.length, 6);
assert.equal(new Set(lore.map((l) => l.id)).size, 6);
for (const l of lore) {
  assert.equal(cell(l.x, l.y), 0, l.id + " is on the floor");
  assert.ok([[0.9,0],[-0.9,0],[0,0.9],[0,-0.9]].some(([a,b]) => canStand(l.x + a, l.y + b)), l.id + " has room to approach");
  for (const other of [...details, ...sites]) assert.ok(Math.hypot(l.x - other.x, l.y - other.y) > 0.9, l.id + " spaced from " + other.id);
  assert.equal(loreById(l.id), l);
}
// Every objective and optional record can be approached by a walkable path with LOS.
const seen = new Set(["16,28"]), cells = [[16, 28]];
for (let i = 0; i < cells.length; i++) {
  const [x, y] = cells[i];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const a = x + dx, b = y + dy, k = `${a},${b}`;
    if (a > 0 && b > 0 && a < 31 && b < 31 && !seen.has(k) && canStand(a + 0.5, b + 0.5)) { seen.add(k); cells.push([a, b]); }
  }
}
for (const o of [...sites, ...details, ...lore]) {
  const approach = cells.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }))
    .some((p) => Math.hypot(p.x - o.x, p.y - o.y) < 1.8 && visible(p, o));
  assert.ok(approach, o.id + " approachable with LOS");
}

const progress = { archetype: "mare_astral" }, m = createMission(progress);
assert.deepEqual(m.p.lore, []);
m.x = 6.9; m.y = 9.2;
assert.match(useLore(m, loreById("diario")), /Nulo aprendeu a voz do faroleiro/);
assert.deepEqual(m.p.lore, ["diario"]);
assert.match(useLore(m, loreById("diario")), /preservado/);
assert.equal(m.p.data.length, 0);
assert.equal(m.p.rank, 1);
assert.equal(nearestSignal(m, lore).id, "diario");
// Range and walls still matter.
const far = createMission({});
assert.match(useLore(far, loreById("lente")), /Aproxime-se/);
far.x = 7.5; far.y = 22.5;
assert.equal(visible(far, loreById("lente")), false);
assert.match(useLore(far, loreById("lente")), /Aproxime-se/);
// Reload sanitizes duplicates, unknown ids and non-arrays without inventing records.
const reload = createMission({ mareMission: { lore: ["maca", "maca", "nope", 7] } });
assert.deepEqual(reload.p.lore, ["maca"]);
assert.deepEqual(createMission({ mareMission: { lore: "maca" } }).p.lore, []);
// Lore never becomes a mnemonic data item or a rank gate.
assert.equal(reload.p.data.length, 0);
assert.equal(reload.p.rank, 1);
console.log("Maré lore: six spaced records, walkable LOS approaches, persistent one-shot reading, sanitized reload and no rank/data coupling OK");
