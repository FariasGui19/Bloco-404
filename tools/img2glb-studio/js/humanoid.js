import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

// Cada peça tem peso 1 em um osso: é um skin rígido, simples de animar no GLB.
export function createHumanoid({ head, width, legs, limbs = 1, entity = 'human', colors, texturedHead = false, details = {} }) {
  const creature = entity === 'creature';
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
    const elbow = makeBone(`${side}LowerArm`, shoulder, 0, -0.36 * limbs);
    const hand = makeBone(`${side}Hand`, elbow, 0, -0.31 * limbs);
    // Um osso por dedo, permitindo pequenas flexões além da articulação do pulso.
    const fingers = {};
    for (const [finger, x, y] of [['Thumb', -0.082, -0.035], ['Index', -0.052, -0.105], ['Middle', -0.017, -0.11], ['Ring', 0.018, -0.105], ['Little', 0.052, -0.095]]) {
      fingers[finger] = makeBone(`${side}${finger}Finger`, hand, sign * x, y, 0.015);
    }
    const thigh = makeBone(`${side}UpperLeg`, hips, sign * 0.18 * width, 0);
    const shin = makeBone(`${side}LowerLeg`, thigh, 0, -legLength * 0.5);
    const foot = makeBone(`${side}Foot`, shin, 0, -legLength * 0.5);
    joints[side] = { shoulder, elbow, hand, fingers, thigh, shin, foot };
  }
  hips.updateMatrixWorld(true);
  const geometries = [];
  // Slots extras mantêm as regiões frontais independentes e exportáveis no glTF.
  const materials = [colors.body, colors.clothes, colors.detail, '#171c1a', colors.body, colors.clothes, colors.clothes, colors.clothes, colors.clothes, colors.clothes, colors.detail, colors.body, colors.detail, colors.body, colors.detail, colors.detail, colors.top || '#242127', colors.hair || '#292127', colors.sole || '#c5b8ad', colors.accent || '#d78338', '#9b958f', new THREE.Color(colors.clothes).multiplyScalar(0.72)].map(color => new THREE.MeshStandardMaterial({ color, roughness: 0.86 }));
  const regionMaterials = { face: 4, torso: 5, leftUpper: 6, leftLower: 7, rightUpper: 8, rightLower: 9, leftArmUpper: 10, leftArmLower: 11, rightArmUpper: 12, rightArmLower: 13, leftFoot: 14, rightFoot: 15 };
  const part = (bone, shape, center, size, material, region, rotation) => {
    const torsoProfile = [
      [0, -0.10], [0.21, -0.09], [0.25, -0.02], [0.26, 0.18],
      [0.30, 0.39], [0.32, 0.48], [0.28, 0.55], [0.17, 0.60], [0, 0.61],
    ];
    const profiles = {
      torso: torsoProfile,
      upperArm: [[0, -0.38], [0.082, -0.37], [0.095, -0.32], [0.112, -0.22], [0.13, -0.11], [0.125, -0.035], [0.08, 0.025], [0, 0.04]],
      neck: [[0, -0.01], [0.085, -0.01], [0.088, 0.07], [0.075, 0.16], [0, 0.18]],
      forearm: [[0, -0.32], [0.065, -0.31], [0.075, -0.25], [0.095, -0.15], [0.11, -0.07], [0.09, 0], [0, 0.025]],
      thigh: [[0, -1.03], [0.125, -1], [0.14, -0.8], [0.155, -0.48], [0.155, -0.15], [0.13, 0], [0, 0.05]],
      shin: [[0, -1.02], [0.095, -1], [0.115, -0.85], [0.125, -0.58], [0.14, -0.25], [0.125, 0], [0, 0.04]],
    };
    const geometry = profiles[shape]
      ? new THREE.LatheGeometry(profiles[shape].map(([radius, y]) => new THREE.Vector2(radius, y)), 20)
      : shape === 'box' ? new THREE.BoxGeometry(1, 1, 1)
      : shape === 'ring' ? new THREE.TorusGeometry(1, 0.12, 6, 20)
      : shape === 'detail' ? new THREE.SphereGeometry(1, 10, 7)
      : new THREE.SphereGeometry(1, 20, 14);
    const pos = new THREE.Vector3(); bone.getWorldPosition(pos);
    geometry.scale(...size);
    if (rotation) { geometry.rotateX(rotation[0]); geometry.rotateY(rotation[1]); geometry.rotateZ(rotation[2]); }
    geometry.translate(pos.x + center[0], pos.y + center[1], pos.z + center[2]);
    const count = geometry.attributes.position.count;
    const indices = new Uint16Array(count * 4), weights = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) { indices[i * 4] = bones.indexOf(bone); weights[i * 4] = 1; }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    if (region) {
      // Apenas triângulos voltados para +Z recebem projeção planar; laterais e
      // costas conservam a cor sólida, evitando repetir o rosto atrás da cabeça.
      geometry.computeBoundingBox();
      const box = geometry.boundingBox, uv = geometry.attributes.uv, position = geometry.attributes.position;
      for (let i = 0; i < count; i++) uv.setXY(i, (position.getX(i) - box.min.x) / (box.max.x - box.min.x), (position.getY(i) - box.min.y) / (box.max.y - box.min.y));
      const front = [], back = [], index = geometry.index, normal = geometry.attributes.normal;
      for (let i = 0; i < index.count; i += 3) {
        const triangle = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        const facing = triangle.reduce((sum, n) => sum + normal.getZ(n), 0) / 3;
        (facing > 0.2 ? front : back).push(...triangle);
      }
      const projected = geometry.clone(); projected.setIndex(front); geometry.setIndex(back);
      geometries.push({ geometry, material }, { geometry: projected, material: regionMaterials[region] });
    } else geometries.push({ geometry, material });
  };
  // As peças se sobrepõem levemente para manter uma silhueta contínua nas juntas.
  part(hips, 'sphere', [0, 0.06, 0], [0.25 * width, 0.16, 0.15], 1);
  part(spine, 'torso', [0, 0, 0], [width, 1, 0.55], 16, 'torso');
  part(neck, 'neck', [0, 0, 0], [1, 1, 0.85], 0);
  part(headBone, 'sphere', [0, 0.20 * head, 0], [0.215 * head, 0.245 * head, 0.195 * head], 0, 'face');
  const ds = details.scale ?? 1, dy = details.offset ?? 0;
  const faceScale = details.faceScale ?? 1, fx = (details.faceX ?? 0) * head, fy = (details.faceY ?? 0) * head;
  const facial = (shape, center, size, material) => part(headBone, shape, [center[0] + fx, center[1] + fy + dy, center[2]], size.map(n => n * faceScale * ds), material);
  if (details.hair !== false && creature) {
    for (const sign of [-1, 1]) part(headBone, 'sphere', [sign * 0.16 * head, 0.42 * head + dy, -0.02 * head], [0.055 * head * ds, 0.18 * head * ds, 0.065 * head * ds], 17);
  } else if (details.hair !== false) {
    // Base de corte baixo nas laterais e cachos volumosos individuais no topo.
    part(headBone, 'sphere', [0, 0.33 * head + dy, -0.055 * head], [0.208 * head * ds, 0.125 * head * ds, 0.15 * head * ds], 17);
    for (let row = 0; row < 4; row++) for (let col = -3; col <= 3; col++) {
      const x = col * 0.052 * head, z = (-0.105 + row * 0.06) * head;
      const y = (0.405 + (3 - Math.abs(col)) * 0.009 + (row === 1 || row === 2 ? 0.012 : 0)) * head + dy;
      part(headBone, 'detail', [x, y, z], [0.046 * head * ds, 0.045 * head * ds, 0.047 * head * ds], 17);
    }
    for (const sign of [-1, 1]) {
      part(headBone, 'detail', [sign * 0.185 * head, 0.28 * head + dy, -0.035 * head], [0.035 * head * ds, 0.105 * head * ds, 0.10 * head * ds], 17);
      part(headBone, 'detail', [sign * 0.145 * head, 0.39 * head + dy, 0.10 * head], [0.058 * head * ds, 0.055 * head * ds, 0.055 * head * ds], 17);
    }
  }
  if (!texturedHead) for (const sign of [-1, 1]) {
    part(headBone, 'detail', [sign * 0.08 * head, 0.22 * head, 0.187 * head], [0.025 * head, 0.017 * head, 0.012 * head], 18);
    part(headBone, 'detail', [sign * 0.08 * head, 0.22 * head, 0.199 * head], [0.010 * head, 0.011 * head, 0.007 * head], 3);
  }
  if (details.face !== false && !creature) {
    // Relevo facial separado da textura projetada; pode ser desligado se necessário.
    facial('detail', [0, 0.125 * head, 0.19 * head], [0.027 * head, 0.048 * head, 0.038 * head], 0);
    for (const sign of [-1, 1]) {
      facial('detail', [sign * 0.08 * head, 0.215 * head, 0.184 * head], [0.047 * head, 0.009 * head, 0.009 * head], 17);
      facial('detail', [sign * 0.026 * head, 0.067 * head, 0.191 * head], [0.035 * head, 0.012 * head, 0.009 * head], 17);
    }
    facial('detail', [0, 0.020 * head, 0.173 * head], [0.025 * head, 0.022 * head, 0.009 * head], 17);
  }
  if (!creature) {
    // Alças, gola e barra acompanham os ossos do tronco.
    for (const sign of [-1, 1]) part(chest, 'detail', [sign * 0.19 * width, 0.13, 0.15], [0.033 * width, 0.085, 0.012], 16);
    part(chest, 'ring', [0, 0.115, 0.165], [0.14 * width, 0.06, 0.01], 16);
    part(spine, 'detail', [0, -0.015, 0.145], [0.245 * width, 0.022, 0.025], 16);
  }
  for (const side of ['Left', 'Right']) {
    const { shoulder, elbow, hand, fingers, thigh, shin, foot } = joints[side];
    part(shoulder, 'upperArm', [0, 0, 0], [creature ? 1.2 : 1, limbs, creature ? 1.2 : 1], 0, side === 'Left' ? 'leftArmUpper' : 'rightArmUpper');
    part(elbow, 'forearm', [0, 0, 0], [creature ? 1.2 : 1, limbs, creature ? 1.2 : 1], 0, side === 'Left' ? 'leftArmLower' : 'rightArmLower');
    const sign = side === 'Left' ? 1 : -1;
    part(shoulder, 'detail', [0, -0.015 * limbs, 0], [0.13, 0.09, 0.12], 0);
    part(elbow, 'detail', [0, -0.015 * limbs, 0], [0.10, 0.08, 0.105], 0);
    part(hand, 'sphere', [0, -0.047, 0], [creature ? 0.12 : 0.082, 0.09, creature ? 0.09 : 0.045], 0);
    for (const [finger, bone] of Object.entries(fingers)) {
      const thumb = finger === 'Thumb', length = thumb ? 0.064 : finger === 'Middle' ? 0.082 : finger === 'Little' ? 0.055 : 0.072;
      part(bone, 'detail', [0, -length * 0.45, 0], [thumb ? 0.021 : 0.016, length * 0.58, 0.021], 0, undefined, thumb ? [0, 0, -sign * 0.42] : undefined);
    }
    part(thigh, 'thigh', [0, 0, 0], [1, legLength * 0.5, 0.93], 1, side === 'Left' ? 'leftUpper' : 'rightUpper');
    part(shin, 'shin', [0, 0, 0], [1, legLength * 0.5, 0.93], 1, side === 'Left' ? 'leftLower' : 'rightLower');
    part(foot, 'sphere', [0, 0.005, 0.09], [0.135, 0.085, 0.215], 2, side === 'Left' ? 'leftFoot' : 'rightFoot');
    // Tênis com sola, cabedal, cadarços e pequeno acento laranja.
    part(foot, 'sphere', [0, -0.073, 0.085], [0.145, 0.042, 0.235], 18);
    part(foot, 'sphere', [0, -0.035, 0.09], [0.14, 0.026, 0.225], 2);
    part(foot, 'detail', [0, 0.063, 0.065], [0.085, 0.022, 0.13], 2);
    for (let i = 0; i < 3; i++) part(foot, 'box', [0, 0.086, 0.005 + i * 0.045], [0.115, 0.009, 0.009], 18);
    part(foot, 'box', [sign * 0.127, 0.018, 0.085], [0.014, 0.045, 0.07], 19);
  }
  // Acessórios são primitivas de baixo custo, ponderadas ao osso local.
  const accessory = (bone, shape, center, size, material = 2) => part(bone, shape, [center[0], center[1] + dy, center[2]], size.map(n => n * ds), material);
  if (details.glasses) {
    for (const sign of [-1, 1]) {
      facial('ring', [sign * 0.081 * head, 0.18 * head, 0.207 * head], [0.064 * head, 0.045 * head, 0.026], 17);
      facial('box', [sign * 0.147 * head, 0.18 * head, 0.11 * head], [0.014, 0.014, 0.19 * head], 17);
    }
    facial('box', [0, 0.18 * head, 0.216 * head], [0.055 * head, 0.012, 0.018], 17);
  }
  if (details.gear) {
    // Cós, cinto, fivela e passadores.
    accessory(hips, 'detail', [0, 0.10, 0], [0.26 * width, 0.055, 0.16], 2);
    accessory(hips, 'box', [0, 0.10, 0.161], [0.085, 0.065, 0.025], 20);
    accessory(hips, 'box', [0, 0.10, 0.178], [0.045, 0.033, 0.012], 3);
    for (const sign of [-1, 1]) accessory(hips, 'box', [sign * 0.15 * width, 0.10, 0.157], [0.025, 0.075, 0.02], 1);
    for (const [side, sign] of [['Left', 1], ['Right', -1]]) {
      const { shoulder, thigh, shin } = joints[side];
      // Faixas nos braços e bolsos cargo com abas e costuras em relevo.
      part(shoulder, 'ring', [0, -0.18 * limbs + dy, 0], [0.12 * ds, 0.12 * ds, 0.025 * ds], 2, undefined, [Math.PI / 2, 0, 0]);
      accessory(thigh, 'detail', [sign * 0.13, -legLength * 0.26, 0.07], [0.075, 0.12 * legs, 0.065], 1);
      accessory(thigh, 'box', [sign * 0.13, -legLength * 0.15, 0.115], [0.13, 0.045, 0.028], 1);
      accessory(thigh, 'box', [sign * 0.13, -legLength * 0.27, 0.135], [0.018, 0.15 * legs, 0.012], 20);
      for (let i = 0; i < 3; i++) {
        part(shin, 'detail', [sign * 0.055, -legLength * (0.15 + i * 0.09), 0.105], [0.065, 0.008, 0.008], 21, undefined, [0, 0, sign * 0.22]);
      }
      // Tira de joelho e fivela; o anel é deitado no plano XZ.
      part(shin, 'ring', [0, -0.035 + dy, 0], [0.12 * ds, 0.12 * ds, 0.035 * ds], 2, undefined, [Math.PI / 2, 0, 0]);
      accessory(shin, 'box', [sign * 0.08, -0.035, 0.115], [0.05, 0.045, 0.022], 20);
    }
  }
  // Agrupa por material para reduzir primitivas/draw calls no GLB final.
  geometries.sort((a, b) => a.material - b.material);
  const merged = mergeGeometries(geometries.map(p => p.geometry), true);
  const groups = [];
  merged.groups.forEach((group, index) => {
    const materialIndex = geometries[index].material, previous = groups.at(-1);
    if (previous && previous.materialIndex === materialIndex) previous.count += group.count;
    else groups.push({ start: group.start, count: group.count, materialIndex });
  });
  merged.clearGroups(); groups.forEach(g => merged.addGroup(g.start, g.count, g.materialIndex));
  geometries.forEach(p => p.geometry.dispose());
  const mesh = new THREE.SkinnedMesh(merged, materials);
  mesh.name = 'Corpo'; mesh.add(hips); mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true; model.add(mesh);
  const feet = new Set([bones.indexOf(joints.Left.foot), bones.indexOf(joints.Right.foot)]);
  const footVertices = [];
  for (let i = 0; i < merged.attributes.position.count; i++) {
    if (feet.has(merged.attributes.skinIndex.getX(i))) footVertices.push(i);
  }
  return { model, mesh, bones, joints, footVertices };
}

// Menor vértice dos pés no espaço local, independentemente de braços compridos.
export function footMinY(character) {
  const point = new THREE.Vector3();
  let min = Infinity;
  for (const index of character.footVertices) {
    character.mesh.getVertexPosition(index, point);
    min = Math.min(min, point.y);
  }
  return min;
}

export function poseAndGround(character, scale, arms, stance) {
  const { model, joints } = character;
  model.position.set(0, 0, 0); model.scale.setScalar(scale);
  joints.Left.shoulder.rotation.z = THREE.MathUtils.degToRad(arms);
  joints.Right.shoulder.rotation.z = -THREE.MathUtils.degToRad(arms);
  joints.Left.thigh.rotation.z = THREE.MathUtils.degToRad(stance);
  joints.Right.thigh.rotation.z = -THREE.MathUtils.degToRad(stance);
  model.updateMatrixWorld(true);
  // A geometria dos pés está no espaço local da malha.
  model.position.y = -footMinY(character) * scale;
  model.updateMatrixWorld(true);
}
