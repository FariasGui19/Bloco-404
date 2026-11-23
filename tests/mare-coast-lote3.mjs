import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Contrato do lote 3 de arte da Maré Cromática: espuma, água rasa, concreto
// salgado, piso do píer, areia de conchas, azulejo e a fauna da arrebentação.
// Cada nome precisa existir no original, no pipeline e no jogo — o fallback
// procedural só cobre uma imagem corrompida, nunca um nome esquecido.

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const mission = read("js/dimension/mare-mission.js");
const world = read("js/dimension/mare-mission-world3d.js");
const prep = read("tools/preparar-mare-coast.py");

const textures = [
  "espuma-mar",
  "agua-rasa-caustica",
  "parede-concreto-sal",
  "piso-pier-molhado",
  "areia-conchas",
  "parede-azulejo-mar",
];
const sprites = ["caranguejo", "gaivota", "peixe", "onda"];

for (const name of textures) {
  const file = path.join(root, "assets/textures/mare-coast", `${name}.png`);
  assert.ok(fs.existsSync(file), `textura do lote 3 ausente: ${name}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.deepEqual([...png.subarray(16, 24)], [0, 0, 1, 0, 0, 0, 1, 0], `${name} é 256x256`);
  assert.ok(png.length > 12000, `${name} tem detalhe suficiente`);
  assert.match(prep, new RegExp(`"${name}"`), `${name} está no pipeline`);
}

for (const name of sprites) {
  const file = path.join(root, "assets/sprites/mare-coast", `${name}.png`);
  assert.ok(fs.existsSync(file), `sprite do lote 3 ausente: ${name}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(png[25], 6, `${name} preserva alpha RGBA`);
  assert.ok(png.length > 2500, `${name} não é um placeholder vazio`);
  assert.ok(fs.existsSync(path.join(root, "assets/source-art/mare-coast", `${name}.png`)),
    `original de ${name} preservado em source-art`);
  assert.match(prep, new RegExp(`"${name}"`), `${name} está no pipeline`);
  assert.match(mission, new RegExp(`"${name}"`), `${name} está em coastNames`);
}

assert.match(prep, /len\(TEXTURES\)/);
assert.match(prep, /texture_fallback/);
assert.match(prep, /len\(SINGLES\)/);
assert.match(prep, /background_is_light/);

// O jogo consome as seis texturas nos materiais certos, sem repetir o mapa da
// espuma (map + alphaMap iguais viravam blocos escuros).
assert.match(world, /espuma-mar/);
assert.match(world, /agua-rasa-caustica/);
assert.match(world, /parede-concreto-sal/);
assert.match(world, /piso-pier-molhado/);
assert.match(world, /areia-conchas/);
assert.match(world, /parede-azulejo-mar/);
assert.match(world, /alphaMap: foamMap/);
assert.doesNotMatch(world, /map: foamMap/);

// Fauna e maré: cinco caranguejos, três gaivotas, três peixes e quatro faixas
// de espuma, todos animados no render.
assert.match(world, /const crabs = \[/);
assert.match(world, /const gulls = \[/);
assert.match(world, /const fish = \[/);
assert.match(world, /const waves = \[/);
assert.match(world, /scenerySprite\("caranguejo"/);
assert.match(world, /airSprite\("gaivota"/);
assert.match(world, /airSprite\("peixe"/);
assert.match(world, /spriteTexture\("onda"\)/);
assert.match(world, /crab\.sprite\.position\.x = crab\.x \+ wob/);
assert.match(world, /gull\.sprite\.material\.rotation/);
assert.match(world, /f\.sprite\.material\.rotation = -Math\.cos\(p \* Math\.PI\)/);
assert.match(world, /wave\.sheet\.position\.set/);

console.log("Maré lote 3: 6 texturas 256px, 4 sprites com alpha, fauna animada e espuma/azulejo integrados OK");
