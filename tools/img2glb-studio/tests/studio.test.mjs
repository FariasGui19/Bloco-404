import test from 'node:test';
import assert from 'node:assert/strict';
import { Box3 } from '../../../js/vendor/three.module.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';
import { createHumanoid, poseAndGround } from '../js/humanoid.js';
import { paletteFromPixels } from '../js/palette.js';

const pixels = (...groups) => new Uint8ClampedArray(groups.flatMap(([rgba, count]) => Array.from({ length: count }, () => rgba).flat()));
const defaults = { head: 1, width: 1, legs: 1, colors: { body: '#d28a6b', clothes: '#d3c2a7', detail: '#514b47' } };

test('ignora fundo escuro e seleciona pele, roupa clara e destaque distintos', () => {
  const palette = paletteFromPixels(pixels([[5, 6, 7, 255], 800], [[188, 116, 83, 255], 100], [[220, 210, 190, 255], 160], [[52, 135, 178, 255], 65], [[255, 0, 0, 0], 200]));
  assert.deepEqual(palette, { body: '#bc7453', clothes: '#dcd2be', detail: '#3487b2' });
});

test('uma área cinza escura dominante não supera uma roupa clara representativa', () => {
  const palette = paletteFromPixels(pixels([[65, 65, 65, 255], 800], [[188, 116, 83, 255], 100], [[220, 210, 190, 255], 160], [[52, 135, 178, 255], 65]));
  assert.equal(palette.body, '#bc7453');
  assert.equal(palette.clothes, '#dcd2be');
  assert.equal(palette.detail, '#3487b2');
});

test('imagens escuras, transparentes ou com uma cor não tornam o boneco monocromático', () => {
  assert.deepEqual(paletteFromPixels(pixels([[0, 0, 0, 255], 100], [[250, 200, 170, 0], 10])), {});
  assert.deepEqual(paletteFromPixels(pixels([[190, 120, 90, 255], 100])), { body: '#be785a' });
  assert.deepEqual(paletteFromPixels(pixels([[100, 140, 180, 255], 100])), { clothes: '#648cb4' });
});

test('agrupa tons próximos em vez de aplicá-los nos três seletores', () => {
  const palette = paletteFromPixels(pixels([[190, 120, 90, 255], 100], [[194, 125, 95, 255], 90], [[198, 130, 100, 255], 80]));
  assert.deepEqual(Object.keys(palette), ['body']);
});

test('rig, escala e proporções mantêm os pés no chão', () => {
  for (const scale of [0.65, 1, 1.4]) for (const legs of [0.7, 1, 1.35]) for (const width of [0.7, 1.4]) for (const stance of [0, 25]) {
    const c = createHumanoid({ ...defaults, width, legs });
    poseAndGround(c, scale, 75, stance);
    const box = new Box3().setFromObject(c.model, true);
    assert.ok(Math.abs(box.min.y) < 1e-5, `pé fora do chão: ${box.min.y}`);
    assert.equal(c.bones.length, 17);
    c.mesh.geometry.dispose(); c.mesh.material.forEach(m => m.dispose());
  }
});

test('seletores usam materiais distintos sem recriar o esqueleto', () => {
  const c = createHumanoid(defaults);
  const before = c.mesh.material.map(m => m.color.getHexString());
  c.mesh.material[1].color.set('#00ff00');
  assert.equal(c.mesh.material[1].color.getHexString(), '00ff00');
  assert.equal(c.mesh.material[0].color.getHexString(), before[0]);
  assert.equal(c.mesh.material[2].color.getHexString(), before[2]);
  assert.ok(c.mesh.geometry.groups.some(g => g.materialIndex === 1));
  assert.equal(c.bones.length, 17);
});

test('GLB inclui malha, materiais, esqueleto e pose atual', async () => {
  // FileReader é fornecido pelo navegador; o teste usa o Blob nativo do Node.
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend(); }); } };
  const c = createHumanoid(defaults);
  c.mesh.material[0].color.set('#ff0000');
  poseAndGround(c, 1.2, 42, 20);
  const buffer = await new GLTFExporter().parseAsync(c.model, { binary: true });
  const view = new DataView(buffer);
  assert.equal(view.getUint32(0, true), 0x46546c67); // glTF
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))).trim());
  assert.equal(json.skins.length, 1);
  assert.equal(json.skins[0].joints.length, 17);
  assert.equal(json.meshes.length, 1);
  assert.ok(Math.abs(json.nodes.find(n => n.name === 'LeftUpperArm').matrix[1] - Math.sin(42 * Math.PI / 180)) < 1e-6);
  assert.ok(json.materials.some(m => m.pbrMetallicRoughness.baseColorFactor[0] === 1 && m.pbrMetallicRoughness.baseColorFactor[1] === 0));
});
