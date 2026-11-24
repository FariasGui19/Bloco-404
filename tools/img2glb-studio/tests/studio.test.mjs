import test from 'node:test';
import assert from 'node:assert/strict';
import { AnimationMixer, Box3, Vector3 } from '../../../js/vendor/three.module.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';
import { createHumanoid, poseAndGround, footMinY } from '../js/humanoid.js';
import { createAnimations } from '../js/animations.js';
import { defaultRegionsFromPixels } from '../js/textures.js';
import { paletteFromPixels, regionalColorsFromPixels } from '../js/palette.js';

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
  assert.deepEqual(paletteFromPixels(pixels([[100, 140, 180, 255], 100])), { body: '#648cb4' });
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
    assert.equal(c.bones.length, 27);
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
  assert.equal(c.bones.length, 27);
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
  assert.equal(json.skins[0].joints.length, 27);
  assert.equal(json.meshes.length, 1);
  assert.ok(Math.abs(json.nodes.find(n => n.name === 'LeftUpperArm').matrix[1] - Math.sin(42 * Math.PI / 180)) < 1e-6);
  assert.ok(json.materials.some(m => m.pbrMetallicRoughness.baseColorFactor[0] === 1 && m.pbrMetallicRoughness.baseColorFactor[1] === 0));
});

test('fundo neutro extremo não domina e criaturas recebem cor de corpo viva', () => {
  const palette = paletteFromPixels(pixels([[250, 250, 250, 255], 1000], [[15, 15, 15, 255], 500], [[60, 165, 105, 255], 120], [[180, 115, 210, 255], 80], [[225, 170, 50, 255], 70]), 'creature');
  assert.equal(palette.body, '#3ca569');
  assert.ok(palette.clothes && palette.detail);
  assert.ok(!Object.values(palette).includes('#fafafa'));
});

test('presets produzem bases diferentes sem trocar a hierarquia do rig', () => {
  const human = createHumanoid({ ...defaults, entity: 'human', limbs: 1 });
  const creature = createHumanoid({ ...defaults, entity: 'creature', head: 1.3, width: 1.35, legs: 0.8, limbs: 1.3 });
  assert.deepEqual(human.bones.map(b => b.name), creature.bones.map(b => b.name));
  assert.notEqual(human.mesh.geometry.attributes.position.count, creature.mesh.geometry.attributes.position.count);
  assert.notEqual(human.joints.Left.elbow.position.y, creature.joints.Left.elbow.position.y);
});

test('quatro clipes animam o rig em loop com pés próximos ao chão e controles de velocidade', () => {
  for (const entity of ['human', 'creature']) {
    const c = createHumanoid({ ...defaults, entity, head: 1.3, width: 1.35, legs: 0.8, limbs: 1.3 });
    const clips = createAnimations(c, { scale: 1.25, arms: 24, stance: 12 });
    assert.deepEqual(clips.map(clip => clip.name), ['Idle', 'Walk', 'Run', 'Action']);
    for (const clip of clips) {
      const mixer = new AnimationMixer(c.model);
      mixer.clipAction(clip).play();
      for (let i = 0; i < 40; i++) {
        mixer.setTime(clip.duration * i / 40);
        c.model.updateMatrixWorld(true);
        const foot = footMinY(c) * 1.25 + c.model.position.y;
        assert.ok(Math.abs(foot) < 0.008, `${entity} ${clip.name} pé: ${foot}`);
      }
      mixer.setTime(0); c.model.updateMatrixWorld(true);
      const start = c.joints.Right.shoulder.quaternion.clone();
      mixer.timeScale = 0; mixer.update(0.2); assert.ok(start.angleTo(c.joints.Right.shoulder.quaternion) < 1e-7);
      mixer.timeScale = 2; mixer.update(clip.duration / 8);
      assert.ok(start.angleTo(c.joints.Right.shoulder.quaternion) > 0.001, `${clip.name} não animou`);
      mixer.stopAllAction();
    }
  }
});

test('GLB animado inclui quatro clipes com canais de ossos e altura da raiz', async () => {
  globalThis.FileReader = class { readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result = result; this.onloadend(); }); } };
  const c = createHumanoid({ ...defaults, entity: 'creature', limbs: 1.3 });
  const clips = createAnimations(c, { scale: 1.1, arms: 24, stance: 12 });
  const mixer = new AnimationMixer(c.model);
  mixer.clipAction(clips[2]).play(); mixer.setTime(0.2); c.model.updateMatrixWorld(true);
  const buffer = await new GLTFExporter().parseAsync(c.model, { binary: true, animations: clips });
  const view = new DataView(buffer);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, view.getUint32(12, true))).trim());
  assert.equal(json.skins[0].joints.length, 27);
  assert.deepEqual(json.animations.map(animation => animation.name), ['Idle', 'Walk', 'Run', 'Action']);
  for (const animation of json.animations) {
    assert.ok(animation.channels.some(c => c.target.path === 'rotation' && json.nodes[c.target.node].name === 'LeftUpperLeg'));
    assert.ok(animation.channels.some(c => c.target.path === 'translation' && json.nodes[c.target.node].name === 'Personagem_404'));
  }
});

test('sugere recortes normalizados mesmo com fundo escuro ou imagem vazia', () => {
  const w = 80, h = 160, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, subject = x > 25 && x < 55 && y > 10 && y < 150;
    rgba.set(subject ? [190, 120, 80, 255] : [20, 20, 20, 255], i);
  }
  const regions = defaultRegionsFromPixels(rgba, w, h);
  assert.deepEqual(Object.keys(regions), ['face', 'torso', 'arms', 'legs']);
  for (const rect of Object.values(regions)) assert.ok(rect.x >= 0 && rect.y >= 0 && rect.w > 0 && rect.h > 0 && rect.x + rect.w <= 1 && rect.y + rect.h <= 1);
  assert.ok(regions.face.y < regions.torso.y && regions.torso.y < regions.legs.y);
  const empty = defaultRegionsFromPixels(new Uint8ClampedArray(16 * 16 * 4), 16, 16);
  for (const rect of Object.values(empty)) assert.ok(rect.w > 0 && rect.h > 0);
});

test('detalhes são opcionais e presos aos ossos; regiões frontais têm materiais próprios', () => {
  const bare = createHumanoid({ ...defaults, details: { hair: false } });
  const detail = createHumanoid({ ...defaults, details: { hair: true, glasses: true, gear: true, scale: 1.2, offset: 0.04 } });
  assert.ok(detail.mesh.geometry.index.count > bare.mesh.geometry.index.count);
  assert.deepEqual(detail.bones.map(b => b.name), bare.bones.map(b => b.name));
  const groups = new Set(detail.mesh.geometry.groups.map(g => g.materialIndex));
  for (const slot of [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]) assert.ok(groups.has(slot), `faltou região ${slot}`);
  const skin = detail.mesh.geometry.getAttribute('skinWeight');
  for (let i = 0; i < skin.count; i++) assert.equal(skin.getX(i), 1);
  poseAndGround(detail, 1, 12, 0); assert.ok(Math.abs(footMinY(detail) + detail.model.position.y) < 1e-5);
});

test('clipes incluem movimento de quadril e orientação dos pés', () => {
  const c = createHumanoid({ ...defaults, details: { gear: true, glasses: true } });
  const clips = createAnimations(c, { scale: 1, arms: 12, stance: 0 });
  for (const clip of clips) for (const bone of ['Hips', 'LeftFoot', 'RightFoot']) assert.ok(clip.tracks.some(t => t.name === `${bone}.quaternion`));
});

test('extração regional diferencia pele, cabelo, regata, calça e calçado', () => {
  const w = 80, h = 200, data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let rgba = y < 12 ? [40, 30, 35, 255] : y < 40 ? [190, 120, 85, 255] : y < 80 ? [38, 36, 42, 255] : y < 176 ? [170, 155, 145, 255] : y < 194 ? [55, 50, 55, 255] : [205, 190, 180, 255];
    if (y >= 181 && y < 186 && x > 30 && x < 45) rgba = [220, 120, 35, 255];
    data.set(rgba, (y * w + x) * 4);
  }
  const regions = { face: { x: 0, y: 0, w: 1, h: 0.2 }, torso: { x: 0, y: 0.2, w: 1, h: 0.2 }, legs: { x: 0, y: 0.4, w: 1, h: 0.6 } };
  const colors = regionalColorsFromPixels(data, w, h, regions);
  assert.equal(colors.body, '#be7855'); assert.equal(colors.hair, '#281e23');
  assert.equal(colors.top, '#26242a'); assert.equal(colors.clothes, '#aa9b91');
  assert.equal(colors.detail, '#373237'); assert.equal(colors.sole, '#cdbeb4');
  assert.equal(colors.accent, '#dc7823');
});

test('passadas mantêm tornozelo de apoio estável no eixo longitudinal', () => {
  const c = createHumanoid({ ...defaults, details: { gear: true, glasses: true, face: true } });
  const clips = createAnimations(c, { scale: 1, arms: 12, stance: 0 });
  for (const clip of clips.filter(c => c.name === 'Walk' || c.name === 'Run')) {
    const mixer = new AnimationMixer(c.model); mixer.clipAction(clip).play();
    mixer.setTime(0); c.model.updateMatrixWorld(true);
    const leftZ = c.joints.Left.foot.getWorldPosition(new Vector3()).z;
    const rightZ = c.joints.Right.foot.getWorldPosition(new Vector3()).z;
    for (let i = 1; i < 32; i++) {
      mixer.setTime(clip.duration * i / 32); c.model.updateMatrixWorld(true);
      const side = i <= 16 ? 'Left' : 'Right';
      const position = c.joints[side].foot.getWorldPosition(new Vector3());
      assert.ok(Math.abs(position.z - (side === 'Left' ? leftZ : rightZ)) < 0.002, `${clip.name} ${side}: ${position.z}`);
    }
    mixer.stopAllAction();
  }
});

test('dedos possuem ossos e se flexionam na ação sem perder o rig', () => {
  const c = createHumanoid({ ...defaults, details: { hair: true, face: true, glasses: true, gear: true } });
  assert.equal(c.bones.length, 27);
  const clip = createAnimations(c, { scale: 1, arms: 12, stance: 0 }).find(c => c.name === 'Action');
  const mixer = new AnimationMixer(c.model); mixer.clipAction(clip).play();
  mixer.setTime(0); const rest = c.joints.Right.fingers.Index.quaternion.clone();
  mixer.setTime(clip.duration / 2);
  assert.ok(rest.angleTo(c.joints.Right.fingers.Index.quaternion) > 0.3);
  assert.ok(clip.tracks.some(t => t.name === 'RightIndexFinger.quaternion'));
});
