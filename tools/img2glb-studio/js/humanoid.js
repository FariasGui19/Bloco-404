import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// Cada peça tem peso 1 em um osso: é um skin rígido, simples de animar no GLB.
export function createHumanoid({ head, width, legs, colors }) {
  const model = new THREE.Group();
  model.name = 'Personagem_404';
  const bones = [];
  const makeBone = (name, parent, x, y, z = 0) => {
    const bone = new THREE.Bone(); bone.name = name; bone.position.set(x, y, z);
    if (parent) parent.add(bone);
    bones.push(bone); return bone;
  };
  const legLength = 0.98 * legs;
  const footY = 0.11;
  const hips = makeBone('Hips', null, 0, footY + legLength);
  const spine = makeBone('Spine', hips, 0, 0.14);
  const chest = makeBone('Chest', spine, 0, 0.40);
  const neck = makeBone('Neck', chest, 0, 0.26);
  const headBone = makeBone('Head', neck, 0, 0.15);
  const joints = {};
  for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
    const shoulder = makeBone(`${side}UpperArm`, chest, sign * 0.38 * width, 0.12);
    const elbow = makeBone(`${side}LowerArm`, shoulder, 0, -0.36);
    const hand = makeBone(`${side}Hand`, elbow, 0, -0.31);
    const thigh = makeBone(`${side}UpperLeg`, hips, sign * 0.18 * width, 0);
    const shin = makeBone(`${side}LowerLeg`, thigh, 0, -legLength * 0.5);
    const foot = makeBone(`${side}Foot`, shin, 0, -legLength * 0.5);
    joints[side] = { shoulder, elbow, hand, thigh, shin, foot };
  }
  hips.updateMatrixWorld(true);
  const geometries = [];
  const materials = [colors.body, colors.clothes, colors.detail, '#171c1a'].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  const part = (bone, shape, center, size, material) => {
    const torsoProfile = [
      [0, -0.10], [0.21, -0.09], [0.25, -0.02], [0.26, 0.18],
      [0.30, 0.39], [0.32, 0.48], [0.28, 0.55], [0.17, 0.60], [0, 0.61],
    ];
    const geometry = shape === 'torso'
      ? new THREE.LatheGeometry(torsoProfile.map(([radius, y]) => new THREE.Vector2(radius, y)), 24)
      : new THREE.SphereGeometry(1, 20, 14);
    const pos = new THREE.Vector3(); bone.getWorldPosition(pos);
    geometry.scale(...size); geometry.translate(pos.x + center[0], pos.y + center[1], pos.z + center[2]);
    const count = geometry.attributes.position.count;
    const indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { indices[i * 4] = bones.indexOf(bone); weights[i * 4] = 1; }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    geometries.push({ geometry, material });
  };
  // As peças se sobrepõem levemente para manter uma silhueta contínua nas juntas.
  part(hips, 'sphere', [0, 0.06, 0], [0.25 * width, 0.16, 0.15], 2);
  part(spine, 'torso', [0, 0, 0], [width, 1, 0.55], 1);
  part(neck, 'sphere', [0, 0.07, 0], [0.105, 0.13, 0.105], 0);
  part(headBone, 'sphere', [0, 0.20 * head, 0], [0.215 * head, 0.245 * head, 0.195 * head], 0);
  part(headBone, 'sphere', [0, 0.34 * head, -0.015 * head], [0.215 * head, 0.105 * head, 0.19 * head], 2);
  for (const sign of [-1, 1]) part(headBone, 'sphere', [sign * 0.08 * head, 0.22 * head, 0.186 * head], [0.018 * head, 0.025 * head, 0.012 * head], 3);
  for (const side of ['Left', 'Right']) {
    const { shoulder, elbow, hand, thigh, shin, foot } = joints[side];
    part(shoulder, 'sphere', [0, -0.16, 0], [0.13, 0.23, 0.13], 2);
    part(elbow, 'sphere', [0, -0.14, 0], [0.105, 0.20, 0.11], 0);
    part(hand, 'sphere', [0, -0.05, 0], [0.105, 0.13, 0.075], 0);
    part(thigh, 'sphere', [0, -legLength * 0.23, 0], [0.145, legLength * 0.30, 0.145], 1);
    part(shin, 'sphere', [0, -legLength * 0.24, 0], [0.115, legLength * 0.30, 0.12], 1);
    part(foot, 'sphere', [0, 0, 0.09], [0.14, 0.11, 0.23], 2);
  }
  const merged = mergeGeometries(geometries.map(p => p.geometry), true);
  merged.groups.forEach((group, index) => { group.materialIndex = geometries[index].material; });
  geometries.forEach(p => p.geometry.dispose());
  const mesh = new THREE.SkinnedMesh(merged, materials);
  mesh.name = 'Corpo'; mesh.add(hips); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true; model.add(mesh);
  return { model, mesh, bones, joints };
}

export function poseAndGround(character, scale, arms, stance) {
  const { model, mesh, joints } = character;
  model.position.set(0, 0, 0); model.scale.setScalar(scale);
  joints.Left.shoulder.rotation.z = THREE.MathUtils.degToRad(arms);
  joints.Right.shoulder.rotation.z = -THREE.MathUtils.degToRad(arms);
  joints.Left.thigh.rotation.z = THREE.MathUtils.degToRad(stance);
  joints.Right.thigh.rotation.z = -THREE.MathUtils.degToRad(stance);
  model.updateMatrixWorld(true);
  mesh.computeBoundingBox();
  // A caixa está no espaço local da malha; a escala do grupo é aplicada ao chão.
  model.position.y = -mesh.boundingBox.min.y * scale;
  model.updateMatrixWorld(true);
}
