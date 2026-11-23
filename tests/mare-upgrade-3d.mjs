import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Contrato estático do upgrade PSX/Puppet-Combo da Maré Cromática.
// Não reutiliza arte de lotes anteriores: as texturas e os três sprites
// novos têm origem e preparo próprios (tools/preparar-mare-upgrade.py).

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (...p) => fs.readFileSync(path.join(root, ...p), "utf8");
const mission = read("js/dimension/mare-mission.js");
const world = read("js/dimension/mare-mission-world3d.js");
const css = read("css/dimension.css");
const manager = read("js/dimension/dimension-manager.js");
const prep = read("tools/preparar-mare-upgrade.py");

// 1. Arte própria, em tamanho PS1 e com alpha real.
const textures = [
  "madeira-tabuas",
  "concreto-limoso",
  "agua-negra",
  "pier-madeira",
  "rocha-basalto",
  "container-ferrugem",
  "metal-ondulado",
];
const sprites = ["cristal-magenta", "terminal-baia", "farol-lanterna"];
for (const name of textures) {
  const file = path.join(root, "assets/textures/mare-upgrade", `${name}.png`);
  assert.ok(fs.existsSync(file), `textura ausente: ${name}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.deepEqual([...png.subarray(16, 24)], [0, 0, 1, 0, 0, 0, 1, 0], `${name} é 256x256`);
  assert.ok(png.length > 10000, `${name} tem detalhe suficiente`);
}
for (const name of sprites) {
  const file = path.join(root, "assets/sprites/mare-upgrade", `${name}.png`);
  assert.ok(fs.existsSync(file), `sprite ausente: ${name}`);
  const png = fs.readFileSync(file);
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.equal(png[25], 6, `${name} é RGBA`);
  assert.ok(png.length > 20000, `${name} preserva o glow`);
  assert.ok(fs.existsSync(path.join(root, "assets/source-art/mare-upgrade", `${name}.png`)) ||
    fs.readdirSync(path.join(root, "assets/source-art/mare-upgrade")).length >= 9);
}
assert.match(prep, /MinFilter\(3\)/);
assert.match(prep, /Quantize|quantize/);

// 2. O mundo novo é 3D de verdade: câmera com pitch, névoa exponencial,
// lanterna SpotLight presa ao olhar e filtro Nearest nas texturas.
assert.match(mission, /createMareWorld3D/);
assert.match(world, /FogExp2/);
assert.match(world, /SpotLight/);
assert.match(world, /NearestFilter/);
assert.match(world, /MirroredRepeatWrapping/);
assert.match(world, /camera\.rotation\.set/);
assert.match(world, /m\.pitch/);
assert.match(world, /breathRate/);
assert.match(world, /toneMapping = THREE\.ACESFilmicToneMapping/);
assert.match(world, /torch\.target\.position\.set\(0, 0, -5\.5\)/);
assert.match(world, /state\.fear/);
assert.match(world, /onFear/);
assert.match(world, /lighthouse/);
assert.match(world, /crystalMat/);
assert.match(world, /buffer|BufferGeometry/);

// 3. Câmera livre: mouse e botões de tela, com clamps naturais.
assert.match(mission, /ArrowUp/);
assert.match(mission, /ArrowDown/);
assert.match(mission, /m\.pitch = Math\.max\(-0\.92, Math\.min\(0\.92/);
assert.match(mission, /data-key="ArrowUp"/);
assert.match(mission, /data-key="ArrowDown"/);
assert.match(mission, /movementY/);
assert.match(mission, /idle|breath/);

// 4. HUD limpo: o prompt só aparece com nome real, sem `E - undefined`.
const signalsBlock = mission.slice(mission.indexOf("const signals = () => ["), mission.indexOf("function action()"));
assert.ok(!signalsBlock.includes("lote7Decor"), "decoração não pode virar alvo interativo");
assert.match(mission, /const nearLabel = typeof near\?\.label === "string"/);
assert.match(mission, /`\[E\] \$\{nearLabel\}`/);
assert.match(css, /\.mare-readout \{ position:absolute!important/);
assert.match(css, /\.mare-mission aside:empty \{ display:none; \}/);
assert.match(css, /\.mare-compass/);
assert.match(css, /\.mare-signal-bars/);
assert.match(mission, /class="mare-tension"/);
assert.match(mission, /class="mare-torch"/);
assert.match(css, /\.mare-frame::before/);

// 5. Entrada cinematográfica e ruptura continuam ligadas ao manager.
assert.match(mission, /intro=2\.0/);
assert.match(mission, /intro=Math\.max\(0,intro-dt\)/);
assert.match(world, /entry > 0\.002/);
assert.match(world, /m\.finished/);
assert.match(world, /endClock/);
assert.match(mission, /complete\(\)/);
assert.match(mission, /exit\(\)/);
assert.match(manager, /enteringDuration/);
assert.match(manager, /startsWith\("mare-cromatica:baia"\)/);
assert.match(manager, /this\.elapsed >= this\.enteringDuration/);
assert.match(mission, /requestRupture|complete/);

// 6. Nada de saves/inventário/base controls destruídos no arquivo da missão.
assert.match(mission, /save\(\)/);
assert.match(mission, /state\.progress/);
assert.match(mission, /data-exit/);
assert.match(mission, /dispose\(\)/);

console.log(
  "Maré upgrade 3D: 7 texturas 256px, 3 sprites alfa, névoa/lanterna/pitch, HUD sem undefined, entrada/ruptura e contrato de saves OK",
);
