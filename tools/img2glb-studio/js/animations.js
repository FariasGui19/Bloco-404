import * as THREE from 'three';
import { footMinY, poseAndGround } from './humanoid.js';

// Movimentos em loop e no lugar, no espaço local dos ossos. Os controles de
// abertura são incorporados aos clipes, sem alterar o bind pose do esqueleto.
export function createAnimations(character, { scale, arms, stance }) {
  const { model, bones, joints } = character;
  bones.forEach(bone => bone.rotation.set(0, 0, 0));
  poseAndGround(character, scale, arms, stance);
  const base = { arms: THREE.MathUtils.degToRad(arms), stance: THREE.MathUtils.degToRad(stance) };
  const definitions = [
    { name: 'Idle', duration: 2.4 },
    { name: 'Walk', duration: 1.2 },
    { name: 'Run', duration: 0.72 },
    { name: 'Action', duration: 1.4 },
  ];
  const samples = 32;
  const names = ['Hips', 'Spine', 'Chest', 'Neck', 'Head', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftHand', 'RightHand', 'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg', 'LeftFoot', 'RightFoot'];
  for (const side of ['Left', 'Right']) for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) names.push(`${side}${finger}Finger`);
  const quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  return definitions.map(({ name, duration }) => {
    const times = [], values = Object.fromEntries(names.map(n => [n, []]));
    for (let i = 0; i <= samples; i++) {
      const phase = Math.PI * 2 * i / samples, wave = Math.sin(phase);
      const gait = name === 'Walk' ? 0.38 : name === 'Run' ? 0.68 : 0;
      const action = name === 'Action' ? (1 - Math.cos(phase)) / 2 : 0;
      const idle = name === 'Idle' ? wave : 0;
      // Joelhos flexionam durante a fase de avanço; a curva suave evita trancos.
      const leftKnee = Math.pow(Math.max(0, -wave), 2) * gait * 0.9;
      const rightKnee = Math.pow(Math.max(0, wave), 2) * gait * 0.9;
      const leftLeg = gait * wave, rightLeg = -gait * wave;
      const rotations = {
        Hips: [0, gait * wave * 0.12, gait * Math.sin(phase * 2) * 0.025],
        Spine: [idle * 0.012, gait * wave * 0.04, 0],
        Chest: [name === 'Run' ? 0.10 : idle * 0.025, -gait * wave * 0.18, action * 0.10],
        Neck: [-idle * 0.01, -gait * wave * 0.025, 0],
        Head: [-idle * 0.02, gait * wave * 0.06 + action * 0.08, 0],
        LeftUpperArm: [-gait * wave * 0.72, 0, base.arms + idle * 0.018],
        RightUpperArm: [gait * wave * 0.72 - action * 1.35, 0, -base.arms - idle * 0.018],
        LeftLowerArm: [-0.12 - gait * (1 + wave) * 0.15, 0, 0],
        RightLowerArm: [-0.12 - gait * (1 - wave) * 0.15 - action * 0.4, 0, 0],
        LeftHand: [-0.04 + gait * wave * 0.08, 0, 0],
        RightHand: [-0.04 - gait * wave * 0.08 - action * 0.10, 0, 0],
        LeftUpperLeg: [leftLeg, 0, base.stance],
        RightUpperLeg: [rightLeg, 0, -base.stance],
        LeftLowerLeg: [leftKnee, 0, 0],
        RightLowerLeg: [rightKnee, 0, 0],
        LeftFoot: [THREE.MathUtils.clamp(-leftLeg - leftKnee, -0.55, 0.55), 0, 0],
        RightFoot: [THREE.MathUtils.clamp(-rightLeg - rightKnee, -0.55, 0.55), 0, 0],
      };
      for (const side of ['Left', 'Right']) for (const finger of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) {
        const curl = 0.10 + gait * 0.12 + (side === 'Right' ? action * 0.45 : 0) + idle * 0.025;
        rotations[`${side}${finger}Finger`] = [curl * (finger === 'Thumb' ? 0.55 : 1), 0, 0];
      }
      times.push(duration * i / samples);
      for (const boneName of names) {
        euler.set(...rotations[boneName]); quaternion.setFromEuler(euler);
        values[boneName].push(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      }
    }
    const tracks = names.map(n => new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, times, values[n]));
    const clip = new THREE.AnimationClip(name, duration, tracks);
    // Amostra a própria malha deformada e grava a altura da raiz no clipe.
    // Assim a prévia e outros visualizadores glTF recebem a mesma correção,
    // sem depender de uma rotina de chão executada apenas pelo editor.
    const mixer = new THREE.AnimationMixer(model);
    mixer.clipAction(clip).play();
    const ground = [], footPosition = new THREE.Vector3(), baseFootZ = {};
    for (let i = 0; i < times.length; i++) {
      mixer.setTime(times[i]); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
      if (i === 0) for (const side of ['Left', 'Right']) baseFootZ[side] = joints[side].foot.getWorldPosition(footPosition).z;
      let z = 0;
      if (name === 'Walk' || name === 'Run') {
        // Em cada meia passada, estabiliza o tornozelo da perna de apoio no eixo
        // longitudinal. O deslocamento oscila e retorna a zero no fim do ciclo.
        const side = Math.sin(Math.PI * 2 * i / samples) >= 0 ? 'Left' : 'Right';
        z = baseFootZ[side] - joints[side].foot.getWorldPosition(footPosition).z;
      }
      ground.push(0, -footMinY(character) * scale, z);
    }
    mixer.stopAllAction(); mixer.uncacheRoot(model);
    clip.tracks.push(new THREE.VectorKeyframeTrack(`${model.name}.position`, times, ground));
    return clip;
  });
}
