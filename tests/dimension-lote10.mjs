import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { lote10Frames, lote10Names, lote10Readout, lote10Animated } from "../js/dimension/mare-mission-lote10.js";

const texture = (n) => `assets/textures/setor-limiar-lote10/${n}.png`;
const sprite = (n) => `assets/sprites/setor-limiar-lote10/${n}.png`;
const frame = (n) => `assets/sprites/mare-missao-lote10/${n}.png`;

test("lote 10 entrega seis texturas, dois sprites e oito quadros", () => {
  const textures = ["piso-ruina", "parede-ruina", "musgo-limiar", "grade-limiar", "tatuagem-traco", "ruptura-veu"];
  for (const name of textures) {
    assert.ok(fs.existsSync(texture(name)), `textura ausente: ${name}`);
    assert.ok(fs.statSync(texture(name)).size > 20000, `textura vazia: ${name}`);
  }
  for (const name of ["vegetacao-limiar", "totem-limiar"]) {
    assert.ok(fs.existsSync(sprite(name)), `sprite ausente: ${name}`);
    assert.ok(fs.statSync(sprite(name)).size > 2000, `sprite vazio: ${name}`);
  }
  for (const name of lote10Names) {
    assert.ok(fs.existsSync(frame(name)), `quadro ausente: ${name}`);
    assert.ok(fs.statSync(frame(name)).size > 5000, `quadro vazio: ${name}`);
  }
  assert.equal(lote10Names.length, 8);
});

test("cada família tem quatro quadros contíguos para o renderer", () => {
  for (const family of ["afogado", "guardiao"]) {
    const frames = lote10Frames[family];
    assert.equal(frames.length, 4);
    assert.deepEqual(
      frames,
      frames.map((_, i) => `${family}-${i}`),
      `${family} usa o contrato família-quadro`,
    );
    for (const name of frames) assert.ok(lote10Animated(name));
  }
  assert.equal(lote10Animated("afogado-9"), false);
});

test("readout dos quadros reflete as ameaças animadas vivas", () => {
  assert.equal(lote10Readout([]), "QUADROS —");
  assert.equal(lote10Readout([{ hunter: true }, { dead: true }]), "QUADROS 1×4");
  assert.equal(lote10Readout([{ guardian: true }, { hunter: true }]), "QUADROS 2×4");
  assert.equal(lote10Readout([{}]), "QUADROS —");
});
