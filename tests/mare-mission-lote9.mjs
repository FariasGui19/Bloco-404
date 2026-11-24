import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {cell, canStand} from "../js/dimension/mare-mission-model.js";
import {
  lote9Decor,
  lote9Names,
  lote9Props,
  lote9Readout,
  lote9Textures,
  lote9Cue,
  isInteractiveLote9,
  useLote9,
} from "../js/dimension/mare-mission-lote9.js";

const sprite = (name) => `assets/sprites/mare-missao-lote9/${name}.png`;
const texture = (name) => `assets/textures/mare-missao-lote9/${name}.png`;

test("lote 9 entrega sete props e três texturas de material", () => {
  assert.equal(lote9Names.length, 7);
  assert.equal(lote9Textures.length, 3);
  for (const name of lote9Names) {
    assert.ok(fs.existsSync(sprite(name)), `sprite ausente: ${name}`);
    assert.ok(fs.statSync(sprite(name)).size > 8000, `sprite vazio: ${name}`);
  }
  for (const name of lote9Textures) {
    assert.ok(fs.existsSync(texture(name)), `textura ausente: ${name}`);
    assert.ok(fs.statSync(texture(name)).size > 40000, `textura vazia: ${name}`);
  }
  assert.deepEqual(
    [...new Set([...lote9Props, ...lote9Decor].map((d) => d.art))].sort(),
    [...lote9Names].sort(),
  );
});

test("props do lote 9 ficam em células livres com acesso", () => {
  for (const prop of lote9Props) {
    assert.equal(cell(prop.x, prop.y), 0, `${prop.id} caiu em célula bloqueada`);
    const ring = [
      [0.9, 0],
      [-0.9, 0],
      [0, 0.9],
      [0, -0.9],
    ].map(([dx, dy]) => canStand(prop.x + dx, prop.y + dy));
    assert.ok(ring.some(Boolean), `${prop.id} sem aproximação`);
  }
});

test("apenas os quatro props funcionais abrem interação", () => {
  assert.equal(lote9Props.filter(isInteractiveLote9).length, 4);
  assert.equal(isInteractiveLote9(lote9Decor[0]), false);
  assert.equal(lote9Cue("lote9-guincho").wave, "sawtooth");
  assert.equal(lote9Cue("x"), null);
});

test("fora de alcance nada acontece", () => {
  const m = {x: 0, y: 0, lamp: 10, p: {}};
  assert.equal(useLote9(m, lote9Props[0]), "O objeto está fora do alcance.");
  assert.equal(m.lamp, 10);
  assert.equal(m.p.lote9, undefined);
});

test("lanterna recarrega querosene uma única vez", () => {
  const prop = lote9Props.find((p) => p.kind === "lote9-lanterna");
  const m = {x: prop.x - 0.8, y: prop.y, lamp: 20, lampOn: false, p: {}};
  const first = useLote9(m, prop);
  assert.match(first, /55%/);
  assert.equal(m.lamp, 75);
  assert.equal(m.lampOn, true);
  assert.equal(m.p.lote9.lanterna, true);
  assert.match(useLote9(m, prop), /vazia/);
  assert.equal(m.lamp, 75);
});

test("bote vira checkpoint e guincho devolve fôlego", () => {
  const bote = lote9Props.find((p) => p.kind === "lote9-bote");
  const guincho = lote9Props.find((p) => p.kind === "lote9-guincho");
  const m = {x: bote.x, y: bote.y, stamina: 12, stress: 60, p: {checkpoint: null}};
  assert.match(useLote9(m, bote), /eco agora retorna/);
  assert.equal(m.p.checkpoint, "bote");
  assert.ok(m.stamina >= 70);
  m.x = guincho.x;
  m.y = guincho.y;
  m.stamina = 20;
  assert.match(useLote9(m, guincho), /Fôlego restaurado/);
  assert.equal(m.stamina, 100);
  assert.equal(m.stress, 32);
  assert.match(useLote9(m, guincho), /manivela/);
});

test("drusa registra o eco e o readout reflete o estado", () => {
  const drusa = lote9Props.find((p) => p.kind === "lote9-drusa");
  const m = {x: drusa.x, y: drusa.y, p: {}};
  assert.match(lote9Readout(m), /DRUSA 0\/1/);
  assert.match(useLote9(m, drusa), /66\.6/);
  assert.match(useLote9(m, drusa), /já registrada/);
  assert.match(lote9Readout(m), /DRUSA 1\/1/);
  assert.match(lote9Readout(m), /QUEROSENE —/);
});
