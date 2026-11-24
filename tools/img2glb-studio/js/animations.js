import * as THREE from 'three';
import { footMinY, poseAndGround } from './humanoid.js';

// Movimentos em loop e no lugar, no espaço local dos ossos. Os controles de
// abertura são incorporados aos clipes, sem alterar o bind pose do esqueleto.
export function createAnimations(character, { scale, arms, stance }) {
  const { model, bones } = character;
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
  const names = ['Chest', 'Head', 'LeftUpperArm', 'RightUpperArm', 'LeftLowerArm', 'RightLowerArm', 'LeftUpperLeg', 'RightUpperLeg', 'LeftLowerLeg', 'RightLowerLeg'];
  const quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
  return definitions.map(({ name, duration }) => {
    const times = [], values = Object.fromEntries(names.map(n => [n, []]));
    for (let i = 0; i <= samples; i++) {
      const phase = Math.PI * 2 * i / samples, wave = Math.sin(phase);
      const gait = name === 'Walk' ? 0.48 : name === 'Run' ? 0.82 : 0;
      // Action é um golpe cíclico, começando e terminando na pose base.
      const action = name === 'Action' ? (1 - Math.cos(phase)) / 2 : 0;
      const idle = name === 'Idle' ? wave : 0;
      const rotations = {
        Chest: [name === 'Run' ? 0.12 : idle * 0.035, 0, action * 0.13],
        Head: [-idle * 0.025, action * 0.12, 0],
        LeftUpperArm: [-gait * wave, 0, base.arms + idle * 0.025],
        RightUpperArm: [gait * wave - action * 1.55, 0, -base.arms - idle * 0.025],
        LeftLowerArm: [Math.max(0, gait * wave) * 0.25, 0, 0],
        RightLowerArm: [Math.max(0, -gait * wave) * 0.25 - action * 0.55, 0, 0],
        LeftUpperLeg: [gait * wave, 0, base.stance],
        RightUpperLeg: [-gait * wave, 0, -base.stance],
        LeftLowerLeg: [Math.max(0, -wave) * gait * 0.55, 0, 0],
        RightLowerLeg: [Math.max(0, wave) * gait * 0.55, 0, 0],
      };
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
    const ground = [];
    for (const time of times) {
      mixer.setTime(time); model.position.set(0, 0, 0); model.updateMatrixWorld(true);
      ground.push(0, -footMinY(character) * scale, 0);
    }
    mixer.stopAllAction(); mixer.uncacheRoot(model);
    clip.tracks.push(new THREE.VectorKeyframeTrack(`${model.name}.position`, times, ground));
    return clip;
  });
}
