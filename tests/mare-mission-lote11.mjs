import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { cell, canStand } from "../js/dimension/mare-mission-model.js";
import {
  LOTE11_BEACON,
  lote11BeaconOn,
  lote11Count,
  lote11Cue,
  lote11Decor,
  lote11Hint,
  lote11Names,
  lote11Props,
  lote11Readout,
  lote11RingPulse,
  lote11Textures,
  isInteractiveLote11,
  useLote11,
} from "../js/dimension/mare-mission-lote11.js";
import { lote8Names, lote8Props } from "../js/dimension/mare-mission-lote8.js";
import { lote9Names, lote9Props } from "../js/dimension/mare-mission-lote9.js";
import { lote10Names } from "../js/dimension/mare-mission-lote10.js";

const sprite = (name) => `assets/sprites/mare-missao-lote11/${name}.png`;
const texture = (name) => `assets/textures/mare-missao-lote11/${name}.png`;

const fakeMission = (overrides = {}) => ({
  x: 16,
  y: 28,
  p: { elapsed: 10, lore: [], ...overrides.p },
  stress: 50,
  stamina: 30,
  lamp: 20,
  lampOn: false,
  noise: 0,
  ...overrides,
});

test("lote 11 entrega sete props, três texturas e quatro interativos", () => {
  assert.equal(lote11Names.length, 7);
  assert.equal(lote11Textures.length, 3);
  for (const name of lote11Names) {
    assert.ok(fs.existsSync(sprite(name)), `sprite ausente: ${name}`);
    assert.ok(fs.statSync(sprite(name)).size > 8000, `sprite vazio: ${name}`);
  }
  for (const name of lote11Textures) {
    assert.ok(fs.existsSync(texture(name)), `textura ausente: ${name}`);
    assert.ok(fs.statSync(texture(name)).size > 30000, `textura vazia: ${name}`);
    const head = fs.readFileSync(texture(name)).subarray(16, 24);
    assert.equal(head.readUInt32BE(0), 256, `${name} tem 256 px`);
    assert.equal(head.readUInt32BE(4), 256, `${name} tem 256 px`);
  }
  assert.deepEqual(
    [...new Set([...lote11Props, ...lote11Decor].map((d) => d.art))].sort(),
    [...lote11Names].sort(),
  );
  assert.equal(lote11Props.filter(isInteractiveLote11).length, 4);
  assert.ok(lote11Props.every(isInteractiveLote11));
});

test("nomes do lote 11 não roubam arte de lotes anteriores", () => {
  const previous = [...lote8Names, ...lote9Names, ...lote10Names];
  for (const name of lote11Names)
    assert.ok(!previous.includes(name), `${name} já existia em outro lote`);
});

test("props do lote 11 ficam em célula livre, com aproximação e longe uns dos outros", () => {
  for (const prop of lote11Props) {
    assert.equal(cell(prop.x, prop.y), 0, `${prop.id} caiu em célula bloqueada`);
    const ring = [
      [1.1, 0],
      [-1.1, 0],
      [0, 1.1],
      [0, -1.1],
    ].map(([dx, dy]) => canStand(prop.x + dx, prop.y + dy));
    assert.ok(ring.some(Boolean), `${prop.id} sem aproximação`);
  }
  const interactives = [...lote11Props, ...lote8Props, ...lote9Props];
  for (const a of lote11Props)
    for (const b of interactives) {
      if (a === b) continue;
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) > 1.6,
        `${a.id} encosta em ${b.id ?? b.art}`,
      );
    }
  assert.ok(
    Math.hypot(
      LOTE11_BEACON.x - lote11Props[0].x,
      LOTE11_BEACON.y - lote11Props[0].y,
    ) > 3.4,
    "farolim e mesa de cartas não dividem espaço",
  );
});

test("mesa de cartas baixa a tensão e passa a orientar o objetivo", () => {
  const m = fakeMission();
  const cartas = lote11Props.find((p) => p.kind === "lote11-cartas");
  assert.equal(lote11Hint(m), null);
  m.x = cartas.x + 9;
  m.y = cartas.y;
  assert.equal(useLote11(m, cartas), "O objeto está fora do alcance.");
  m.x = cartas.x;
  m.y = cartas.y;
  const text = useLote11(m, cartas);
  assert.match(text, /SINO/);
  assert.equal(m.p.lote11.cartas, true);
  assert.equal(m.stress, 40);
  assert.match(lote11Hint(m), /FAROLIM/);
  assert.match(useLote11(m, cartas), /já está na sua cabeça/);
  assert.equal(m.stress, 40, "releitura não farma tensão");
});

test("sino acalma, faz barulho e respeita a vibração do bronze", () => {
  const m = fakeMission();
  const sino = lote11Props.find((p) => p.kind === "lote11-sino");
  m.x = sino.x;
  m.y = sino.y;
  const first = useLote11(m, sino);
  assert.match(first, /tensão cai/);
  assert.equal(m.stress, 34);
  assert.equal(m.noise, 0.6);
  assert.equal(m.p.lote11.sino, 10);
  assert.match(useLote11(m, sino), /bronze ainda vibra/);
  assert.equal(m.stress, 34);
  m.p.elapsed = 15;
  assert.match(useLote11(m, sino), /neblina/);
  assert.equal(m.stress, 18);
  // O pulso visual vai de 1 a 0 em 2,4 s.
  m.p.elapsed = 15;
  assert.equal(lote11RingPulse(m), 1);
  m.p.elapsed = 16.2;
  assert.ok(lote11RingPulse(m) > 0.4 && lote11RingPulse(m) < 0.6);
  m.p.elapsed = 18;
  assert.equal(lote11RingPulse(m), 0);
});

test("gerador acende o farolim, devolve carga e fôlego", () => {
  const m = fakeMission();
  const gerador = lote11Props.find((p) => p.kind === "lote11-gerador");
  m.x = gerador.x;
  m.y = gerador.y;
  assert.equal(lote11BeaconOn(m), false);
  assert.match(useLote11(m, gerador), /farolim acende/);
  assert.equal(m.p.lote11.power, true);
  assert.equal(m.lamp, 100);
  assert.equal(m.lampOn, true);
  assert.equal(m.stamina, 80);
  assert.equal(lote11BeaconOn(m), true);
  assert.match(lote11Readout(m), /FAROL ON/);
  assert.match(useLote11(m, gerador), /mantém o farolim aceso/);
});

test("placa guarda a quarentena e o painel de sinais conta 4", () => {
  const m = fakeMission();
  for (const prop of lote11Props) {
    m.x = prop.x;
    m.y = prop.y;
    m.p.elapsed += 6;
    const text = useLote11(m, prop);
    assert.ok(text && text.length > 20, `${prop.kind} sem resposta`);
    if (prop.kind !== "lote11-sino") assert.ok(lote11Cue(prop.kind));
  }
  assert.equal(lote11Count(m), 4);
  assert.match(lote11Readout(m), /SINAL 4\/4/);
  assert.match(lote11Hint(m), /completos/);
  assert.equal(m.p.lore.length, 0, "o lote não escreve na lista de lore antiga");
});

test("decor do lote 11 fica no chão e o farolim aponta para a água", () => {
  for (const d of lote11Decor) {
    assert.ok(d.kind, `${d.art} sem tipo de animação`);
    assert.ok(d.scale > 0 && d.scale < 1.6);
  }
  const farolim = lote11Decor.find((d) => d.art === "lente-farolim");
  assert.ok(farolim, "farolim precisa existir como cenário");
  assert.equal(farolim.x, LOTE11_BEACON.x);
  assert.equal(farolim.y, LOTE11_BEACON.y);
  // O farolim está em terra firme, mas perto da lâmina d'água.
  assert.equal(cell(LOTE11_BEACON.x, LOTE11_BEACON.y), 0);
  const boia = lote11Decor.find((d) => d.art === "boia-cromatica");
  assert.equal(cell(boia.x, boia.y), 4, "a boia boia na água");
});
