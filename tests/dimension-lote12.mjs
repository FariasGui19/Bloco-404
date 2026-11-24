import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as T from "../js/vendor/three.module.js";
import {
  LIMIAR_PROPS,
  createLimiarProps,
} from "../js/dimension/sector-props.js";
import { createSectorMaterials } from "../js/dimension/sector-materials.js";
import { terrainHeight } from "../js/dimension/sector-data.js";
import { createFootfall } from "../js/dimension/footfall.js";
import { frameAt, frameIndex, loadFrames } from "../js/dimension/sprite-frames.js";

const TEX = (n) => `assets/textures/setor-limiar-lote12/${n}.png`;
const SPR = (n) => `assets/sprites/setor-limiar-lote12/${n}.png`;

const TEXTURES = [
  "detalhe-terreno",
  "detalhe-pedra",
  "agua-caustica",
  "mascara-transicao",
];
const ADDITIVES = ["halo-aditivo", "neblina-fundo"];
const STRIPS = {
  "lanterna-chama": 4,
  "estandarte-tremura": 4,
  "poeira-passo": 6,
  "folhas-vento": 6,
};

const pngSize = (file) => {
  const head = fs.readFileSync(file).subarray(16, 24);
  return { width: head.readUInt32BE(0), height: head.readUInt32BE(4) };
};
const pngColorType = (file) => fs.readFileSync(file).subarray(25, 26).readUInt8(0);

test("lote 12 entrega quatro texturas 256 px e dois aditivos recortados", () => {
  for (const name of TEXTURES) {
    const file = TEX(name);
    assert.ok(fs.existsSync(file), `textura ausente: ${name}`);
    assert.ok(fs.statSync(file).size > 8000, `textura vazia: ${name}`);
    const { width, height } = pngSize(file);
    assert.equal(width, 256, `${name} tem 256 px de largura`);
    assert.equal(height, 256, `${name} tem 256 px de altura`);
  }
  for (const name of ADDITIVES) {
    const file = SPR(name);
    assert.ok(fs.existsSync(file), `sprite ausente: ${name}`);
    assert.equal(pngColorType(file), 6, `${name} é RGBA`);
    const { width, height } = pngSize(file);
    assert.equal(width, height, `${name} é quadrado`);
    assert.ok(width >= 128, `${name} tem resolução de sprite`);
  }
});

test("as quatro tiras têm o mesmo canvas por quadro", () => {
  for (const [name, count] of Object.entries(STRIPS)) {
    const sizes = new Set();
    for (let index = 0; index < count; index++) {
      const file = SPR(`${name}-${index}`);
      assert.ok(fs.existsSync(file), `quadro ausente: ${name}-${index}`);
      assert.equal(pngColorType(file), 6, `${name}-${index} é RGBA`);
      assert.ok(fs.statSync(file).size > 400, `quadro vazio: ${name}-${index}`);
      const { width, height } = pngSize(file);
      assert.equal(width, height, `${name}-${index} é quadrado`);
      sizes.add(`${width}x${height}`);
    }
    assert.equal(sizes.size, 1, `${name} muda de canvas entre quadros`);
    // Um quadro a mais do que a tira declara é erro de fatiamento silencioso.
    assert.ok(!fs.existsSync(SPR(`${name}-${count}`)), `${name} sobra quadro`);
  }
});

test("sem DOM o flipbook é vazio e nada quebra", () => {
  assert.deepEqual(loadFrames("folhas-vento", 6), [], "Node não tem Image");
  assert.equal(frameAt([], 1, 10), null);
  assert.equal(frameIndex([], 1, 10), -1);
  assert.equal(frameIndex([0, 1, 2, 3], 0.5, 4), 2);
  assert.equal(frameIndex([0, 1, 2, 3], 1.0, 4), 0, "o ciclo fecha");
  const dust = createFootfall(null);
  assert.equal(dust.ready, false);
  dust.spawn(0, 0, 0);
  dust.update(0.2);
  dust.dispose();
});

test("poeira do passo só nasce com cena e folhas carregadas", () => {
  const scene = new T.Scene();
  const dust = createFootfall(scene);
  assert.equal(dust.ready, false, "sem textura o pool fica inerte");
  assert.equal(scene.children.length, 0, "nenhum grupo vazio é pendurado");
});

test("materiais do lote 12 entram sem quebrar o fallback de Node", () => {
  const m = createSectorMaterials();
  for (const key of ["detailTerrain", "detailStone", "caustics", "haloTexture", "mistTexture"])
    assert.equal(m[key], null, `${key} depende de DOM`);
  assert.ok(m.seabed, "o leito existe mesmo sem cáustica");
  assert.equal(m.seabed.type, "MeshLambertMaterial");
  const phong = Object.values(m).filter(
    (v) => v && v.isMaterial && v.type === "MeshPhongMaterial",
  );
  assert.equal(phong.length, 0, "MeshPhongMaterial é proibido no setor");
});

test("estandarte tremula e lanterna acende o flipbook quando há folhas", () => {
  const fakeFrames = (count) =>
    Array.from({ length: count }, (_, index) => {
      const tex = new T.Texture();
      tex.userData = { frame: index };
      return tex;
    });
  const state = { progress: { flags: {} } };
  const props = createLimiarProps({
    scene: new T.Scene(),
    heightAt: terrainHeight,
    state,
    billboard: () => new T.Texture(),
    frames: (base, count) => fakeFrames(base === "poeira-passo" ? 6 : count),
  });
  const banner = props.props.find((p) => p.def.art === "estandarte-limiar");
  assert.ok(banner.flutter, "o estandarte precisa do flipbook");
  assert.equal(banner.flutter.frames.length, 4);
  // O pano já nasce com a arte da tira; o quadro muda com o tempo.
  assert.equal(banner.sprite.material.map.userData.frame, 0);
  props.update(0, 0.016, false);
  const first = banner.sprite.material.map.userData.frame;
  props.update(0.5, 0.016, false);
  const later = banner.sprite.material.map.userData.frame;
  assert.notEqual(later, first, "o pano muda de quadro");
  assert.ok(later >= 0 && later < 4);
  // Movimento reduzido congela no primeiro quadro.
  props.update(9.9, 0.016, true);
  assert.equal(banner.sprite.material.map.userData.frame, 0);

  const lantern = LIMIAR_PROPS.find((p) => p.kind === "lantern");
  const lit = props.props.find((p) => p.def.id === lantern.id);
  assert.ok(lit.flame, "a lanterna precisa do flipbook de chama");
  assert.equal(lit.flame.material.opacity, 0, "apagada não mostra chama");
  props.interact({ x: lantern.x, z: lantern.z });
  assert.equal(lit.flame.material.opacity, 0.95, "acesa mostra chama");
  props.update(1.2, 0.016, false);
  assert.ok(lit.flame.material.map.userData.frame >= 0);
});

test("sem folhas o adereço continua exatamente como no lote 11", () => {
  const props = createLimiarProps({
    scene: new T.Scene(),
    heightAt: terrainHeight,
    billboard: () => new T.Texture(),
  });
  for (const prop of props.props) {
    assert.equal(prop.flutter, null);
    assert.equal(prop.flame, null);
  }
  props.update(1, 0.016, false);
  assert.equal(props.count, 12);
});
