import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../../../js/vendor/three.module.js';
import { inspectGLB, loadGLB, disposeModel, findClip } from '../js/glb.js';

import { glb, sample } from './fixtures.mjs';
test('verifica cabeçalho e recusa referências externas e compressão sem decoder', () => {
  assert.throws(() => inspectGLB(new ArrayBuffer(12)), /válido/);
  assert.throws(() => inspectGLB(glb({asset:{version:'2.0'}, images:[{uri:'https://example.com/a.png'}]})), /externos/);
  assert.throws(() => inspectGLB(glb({asset:{version:'2.0'}, buffers:[{uri:'a.bin'}]})), /externos/);
  for (const ext of ['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'])
    assert.throws(() => inspectGLB(glb({asset:{version:'2.0'},extensionsRequired:[ext]})), /não suportada/);
  assert.equal(inspectGLB(sample()).asset.version,'2.0');
});
test('carrega rig e animação, normaliza sem alterar o nó animado e limpa', async () => {
  const result = await loadGLB(sample());
  assert.equal(result.meshes,1); assert.equal(result.skins,1); assert.equal(result.bones,1); assert.equal(result.clips[0].name,'Idle');
  result.pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(result.pivot,true);
  assert.ok(Math.abs(box.min.y) < 1e-6); assert.ok(Math.abs(box.max.y - 1.85) < 1e-6);
  const bone = result.model.getObjectByName('Bone');
  result.mixer.clipAction(result.clips[0]).play(); result.mixer.update(0.5);
  assert.ok(bone.position.y > 0);
  result.mixer.stopAllAction(); result.mixer.uncacheRoot(result.model); disposeModel(result.model);
});
test('modo automático reconhece nomes e não inventa clipes', () => {
  const clips = [{name:'mixamo.com|Idle'}, {name:'Walk'}, {name:'corrida'}, {name:'ataque'}];
  assert.equal(findClip(clips,'idle'), clips[0]); assert.equal(findClip(clips,'walk'), clips[1]); assert.equal(findClip(clips,'run'), clips[2]);
  assert.equal(findClip([{name:'Jump'}], 'walk'), null);
});
