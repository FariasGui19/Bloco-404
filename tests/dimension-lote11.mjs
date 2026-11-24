import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "../js/vendor/three.module.js";
import {
  LIMIAR_PROPS,
  PROP_PROMPTS,
  createLimiarProps,
} from "../js/dimension/sector-props.js";
import { LIMIAR_ROUTE, LIMIAR_PYLONS } from "../js/dimension/sector-wayfinding.js";
import { createSectorMaterials } from "../js/dimension/sector-materials.js";
import { terrainHeight } from "../js/dimension/sector-data.js";

const TEX = (n) => `assets/textures/setor-limiar-lote11/${n}.png`;
const SPR = (n) => `assets/sprites/setor-limiar-lote11/${n}.png`;

const TEXTURES = ["piso-trilha", "ponte-madeira", "agua-limiar", "runa-brilho"];
const SPRITES = [
  "placa-limiar",
  "estandarte-limiar",
  "lanterna-limiar",
  "estatua-limiar",
  "caixote-limiar",
  "pilar-runa-arte",
];

const fakeState = () => ({ progress: { flags: {} } });

function distToRoute(x, z) {
  let best = Infinity;
  for (let i = 1; i < LIMIAR_ROUTE.length; i++) {
    const [x0, z0] = LIMIAR_ROUTE[i - 1],
      [x1, z1] = LIMIAR_ROUTE[i];
    const dx = x1 - x0,
      dz = z1 - z0;
    const t = Math.max(
      0,
      Math.min(1, ((x - x0) * dx + (z - z0) * dz) / (dx * dx + dz * dz)),
    );
    best = Math.min(best, Math.hypot(x - (x0 + dx * t), z - (z0 + dz * t)));
  }
  return best;
}

test("lote 11 entrega quatro texturas 256 px e seis sprites recortados", () => {
  for (const name of TEXTURES) {
    assert.ok(fs.existsSync(TEX(name)), `textura ausente: ${name}`);
    assert.ok(fs.statSync(TEX(name)).size > 20000, `textura vazia: ${name}`);
    const head = fs.readFileSync(TEX(name)).subarray(16, 24);
    assert.equal(head.readUInt32BE(0), 256, `${name} tem 256 px de largura`);
    assert.equal(head.readUInt32BE(4), 256, `${name} tem 256 px de altura`);
  }
  for (const name of SPRITES) {
    assert.ok(fs.existsSync(SPR(name)), `sprite ausente: ${name}`);
    assert.ok(fs.statSync(SPR(name)).size > 2000, `sprite vazio: ${name}`);
    const header = fs.readFileSync(SPR(name)).subarray(16, 26);
    assert.equal(header.readUInt8(9), 6, `${name} é RGBA`);
  }
});

test("os adereços ficam fora da trilha, dentro do setor e sem sobreposição", () => {
  const ids = new Set();
  for (const prop of LIMIAR_PROPS) {
    assert.ok(!ids.has(prop.id), `id repetido: ${prop.id}`);
    ids.add(prop.id);
    assert.ok(Math.abs(prop.x) < 120 && Math.abs(prop.z) < 120, `${prop.id} fora do setor`);
    // Adereço colado no caminho atravessa o operador: mantém folga lateral.
    assert.ok(distToRoute(prop.x, prop.z) > 1.4, `${prop.id} invade a trilha`);
  }
  for (let i = 0; i < LIMIAR_PROPS.length; i++)
    for (let j = i + 1; j < LIMIAR_PROPS.length; j++) {
      const a = LIMIAR_PROPS[i],
        b = LIMIAR_PROPS[j];
      assert.ok(
        Math.hypot(a.x - b.x, a.z - b.z) > 1.9,
        `${a.id} e ${b.id} se sobrepõem`,
      );
    }
  for (const pylon of LIMIAR_PYLONS)
    assert.ok(
      !LIMIAR_PROPS.some(
        (p) => Math.hypot(p.x - pylon.x, p.z - pylon.z) < 1.5,
      ),
      `${pylon.id} colide com adereço`,
    );
  // Quem responde ao E não pode brigar com o pilar: 3,4 m de folga.
  for (const prop of LIMIAR_PROPS.filter((p) => p.kind !== "decor"))
    for (const pylon of LIMIAR_PYLONS)
      assert.ok(
        Math.hypot(prop.x - pylon.x, prop.z - pylon.z) > 3.4,
        `${prop.id} disputa o E com ${pylon.id}`,
      );
  const kinds = LIMIAR_PROPS.reduce(
    (acc, p) => ((acc[p.kind] = (acc[p.kind] ?? 0) + 1), acc),
    {},
  );
  assert.deepEqual(kinds, { decor: 5, lantern: 4, crate: 2, shrine: 1 });
});

test("adereços nascem no chão e a interação muda o mundo", () => {
  const scene = new T.Scene(),
    state = fakeState();
  const props = createLimiarProps({ scene, heightAt: terrainHeight, state });
  assert.equal(props.count, 12);
  assert.equal(props.total, 7);
  for (const prop of props.props)
    assert.ok(
      Math.abs(prop.root.position.y - terrainHeight(prop.def.x, prop.def.z)) < 1e-9,
      `${prop.def.id} não está no chão`,
    );
  // Sem textura (Node) o adereço ainda existe: lógica e colisão independem da arte.
  assert.equal(props.props.filter((p) => p.sprite).length, 0);
  const lantern = LIMIAR_PROPS.find((p) => p.id === "lanterna-1");
  assert.equal(props.nearest({ x: 30, z: 30 }), null);
  assert.equal(props.interact({ x: 30, z: 30 }), null);
  assert.equal(props.prompt({ x: lantern.x + 0.6, z: lantern.z }), PROP_PROMPTS.lantern);
  const hit = props.interact({ x: lantern.x, z: lantern.z });
  assert.equal(hit.def.id, "lanterna-1");
  assert.equal(hit.active, true);
  assert.ok(hit.glow === null && hit.sprite === null);
  assert.deepEqual(state.progress.flags.limiarProps, ["lanterna-1"]);
  assert.equal(props.lit, 1);
  // Repetir no mesmo adereço não conta duas vezes.
  assert.equal(props.interact({ x: lantern.x, z: lantern.z }), null);
  assert.equal(props.lit, 1);
  // O anel de choque fica visível logo após a interação e some ao fim da onda.
  assert.equal(props.rings.filter((r) => r.mesh.visible).length, 1);
  props.update(0, 0.2, false);
  assert.ok(props.rings[0].mesh.scale.x > 1);
  props.update(0, 0.6, false);
  assert.equal(props.rings.filter((r) => r.mesh.visible).length, 0);
  assert.equal(props.dots().length, 7);
});

test("caixote e estátua deixam marcas próprias e persistem no save", () => {
  const state = fakeState();
  const props = createLimiarProps({ scene: new T.Scene(), heightAt: terrainHeight, state });
  const crate = LIMIAR_PROPS.find((p) => p.kind === "crate");
  const shrine = LIMIAR_PROPS.find((p) => p.kind === "shrine");
  assert.equal(props.prompt({ x: crate.x, z: crate.z }), PROP_PROMPTS.crate);
  props.interact({ x: crate.x, z: crate.z });
  const used = props.props.find((p) => p.def.id === crate.id);
  assert.ok(used.marker, "caixote aberto precisa de marca flutuante");
  assert.equal(props.prompt({ x: shrine.x, z: shrine.z }), PROP_PROMPTS.shrine);
  props.interact({ x: shrine.x, z: shrine.z });
  assert.deepEqual(state.progress.flags.limiarProps.sort(), [crate.id, shrine.id].sort());
  // Recarregar o save reconstrói o estado usado, sem repetir a interação.
  const again = createLimiarProps({
    scene: new T.Scene(),
    heightAt: terrainHeight,
    state,
  });
  assert.equal(again.lit, 2);
  assert.equal(again.interact({ x: crate.x, z: crate.z }), null);
});

test("materiais do lote 11 evitam MeshPhong e trocam piso, prancha e fundo", () => {
  const m = createSectorMaterials();
  for (const key of ["trail", "plank", "seabed"])
    assert.ok(m[key], `material ausente: ${key}`);
  assert.equal(m.sigilTexture, null, "sem DOM a runa fica sem textura");
  m.plank.map === null && assert.equal(m.plank.color.getHex(), 0xc2ab90);
  const phong = Object.values(m).filter(
    (v) => v && v.isMaterial && v.type === "MeshPhongMaterial",
  );
  assert.equal(phong.length, 0, "MeshPhongMaterial é proibido no setor");
  assert.ok(m.textures.length >= 3, "texturas empilhadas para descarte");
});
