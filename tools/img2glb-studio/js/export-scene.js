import * as THREE from 'three';
import { clone } from '../vendor/SkeletonUtils.js';

// glTF ignora transforms em malhas com skin. A malha deve ser nó raiz sem
// transform; a raiz animada fica separada, como ancestral somente dos ossos.
// A clonagem preserva skeleton/bind matrices e não altera a prévia no editor.
export function makeExportScene(character) {
  character.model.updateMatrixWorld(true);
  const copy = clone(character.model);
  const mesh = copy.getObjectByName(character.mesh.name);
  const armature = new THREE.Group();
  armature.name = character.model.name;
  armature.position.copy(copy.position);
  armature.quaternion.copy(copy.quaternion);
  armature.scale.copy(copy.scale);
  armature.add(mesh.skeleton.bones[0]);
  const scene = new THREE.Scene();
  scene.name = 'Personagem';
  scene.add(mesh, armature);
  scene.updateMatrixWorld(true);
  return scene;
}
