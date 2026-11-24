import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';
import { createHumanoid, poseAndGround } from './humanoid.js';
import { extractPalette } from './palette.js';
import { createAnimations } from './animations.js';

const $ = id => document.getElementById(id);
const viewport = $('viewport');
const scene = new THREE.Scene(); scene.background = new THREE.Color('#252c27');
scene.fog = new THREE.Fog('#252c27', 9, 19);
const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
camera.position.set(3.1, 2.45, 5.2);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
viewport.prepend(renderer.domElement);
const orbit = new OrbitControls(camera, renderer.domElement); orbit.target.set(0, 1.15, 0); orbit.enableDamping = true; orbit.minDistance = 2; orbit.maxDistance = 12; orbit.maxPolarAngle = Math.PI / 2 - 0.03; orbit.update(); orbit.saveState();
scene.add(new THREE.HemisphereLight('#e4f1db', '#545e50', 2.1));
const light = new THREE.DirectionalLight('#fff5dd', 2.5); light.position.set(3, 6, 4); light.castShadow = true; light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -4; light.shadow.camera.right = 4; light.shadow.camera.top = 4; light.shadow.camera.bottom = -4; light.shadow.bias = -0.0003; scene.add(light);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#252c27', roughness: 1 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.position.y = -0.012; scene.add(floor);
const grid = new THREE.GridHelper(20, 40, '#61725b', '#445045'); grid.position.y = -0.005; grid.material.transparent = true; grid.material.opacity = 0.38; scene.add(grid);

let character, helper, jointMarkers, mixer, clips = [], currentAction, rebuildTimer;
let rigVisible = true, playing = true, imageUrl = null, imageRequest = 0, referenceSource = null;
const state = () => ({ entity: $('entity').value, head: +$('head').value, width: +$('width').value, legs: +$('legs').value, limbs: +$('limbs').value, colors: { body: $('color-body').value, clothes: $('color-clothes').value, detail: $('color-detail').value } });
function rebuild() {
  if (character) {
    mixer.stopAllAction(); mixer.uncacheRoot(character.model);
    scene.remove(character.model, helper, jointMarkers);
    character.mesh.geometry.dispose(); character.mesh.material.forEach(m => m.dispose()); helper.dispose();
    jointMarkers.geometry.dispose(); jointMarkers.material.dispose();
  }
  character = createHumanoid(state()); scene.add(character.model);
  helper = new THREE.SkeletonHelper(character.mesh); helper.material.color.set('#d6f888'); helper.material.depthTest = false; helper.renderOrder = 10; helper.visible = rigVisible; scene.add(helper);
  const markerGeometry = new THREE.SphereGeometry(0.025, 10, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#e3ff99', depthTest: false });
  jointMarkers = new THREE.InstancedMesh(markerGeometry, markerMaterial, character.bones.length); jointMarkers.renderOrder = 11; jointMarkers.visible = rigVisible; scene.add(jointMarkers);
  const settings = { scale: +$('scale').value, arms: +$('arms').value, stance: +$('stance').value };
  clips = createAnimations(character, settings);
  poseAndGround(character, settings.scale, settings.arms, settings.stance);
  mixer = new THREE.AnimationMixer(character.model);
  selectAnimation();
  updateMarkers();
}
function selectAnimation() {
  mixer.stopAllAction();
  currentAction = mixer.clipAction(clips.find(clip => clip.name === $('animation').value));
  currentAction.play(); mixer.timeScale = playing ? +$('speed').value : 0;
  mixer.update(0); character.model.updateMatrixWorld(true);
}
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => { rebuildTimer = null; rebuild(); }, 120);
}
function flushRebuild() { if (rebuildTimer) { clearTimeout(rebuildTimer); rebuildTimer = null; rebuild(); } }
const markerMatrix = new THREE.Matrix4(), markerPoint = new THREE.Vector3();
function updateMarkers() {
  if (!rigVisible) return;
  character.model.updateMatrixWorld(true);
  const matrix = markerMatrix, point = markerPoint;
  character.bones.forEach((bone, index) => { bone.getWorldPosition(point); matrix.makeTranslation(point.x, point.y, point.z); jointMarkers.setMatrixAt(index, matrix); });
  jointMarkers.instanceMatrix.needsUpdate = true;
}
function updateOutputs() {
  for (const id of ['scale', 'head', 'width', 'legs', 'limbs']) document.querySelector(`output[for="${id}"]`).value = `${Math.round(+$(id).value * 100)}%`;
  for (const id of ['arms', 'stance']) document.querySelector(`output[for="${id}"]`).value = `${$(id).value}°`;
  document.querySelector('output[for="speed"]').value = `${(+$('speed').value).toFixed(2).replace(/0$/, '')}×`;
}
for (const id of ['head', 'width', 'legs', 'limbs', 'scale', 'arms', 'stance']) $(id).addEventListener('input', () => { updateOutputs(); scheduleRebuild(); });
const colorSlots = { body: 0, clothes: 1, detail: 2 };
function updateColors() {
  for (const [name, index] of Object.entries(colorSlots)) character.mesh.material[index].color.set($(`color-${name}`).value);
}
for (const name of Object.keys(colorSlots)) $(`color-${name}`).addEventListener('input', updateColors);
$('entity').addEventListener('change', () => {
  const creature = $('entity').value === 'creature';
  const preset = creature
    ? { head: 1.3, width: 1.35, legs: 0.8, limbs: 1.3, arms: 24, stance: 12, 'color-body': '#80a776', 'color-clothes': '#586b64', 'color-detail': '#d4bd72' }
    : { head: 1, width: 1, legs: 1, limbs: 1, arms: 12, stance: 0, 'color-body': '#d28a6b', 'color-clothes': '#d3c2a7', 'color-detail': '#514b47' };
  for (const [id, value] of Object.entries(preset)) $(id).value = value;
  $('entity-label').textContent = creature ? 'MODELO BASE CRIATURA' : 'MODELO BASE HUMANOIDE';
  updateOutputs(); scheduleRebuild();
});
$('animation').addEventListener('change', () => { flushRebuild(); selectAnimation(); updateMarkers(); });
$('play-pause').addEventListener('click', () => {
  playing = !playing; mixer.timeScale = playing ? +$('speed').value : 0;
  $('play-pause').textContent = playing ? '❚❚ Pausar' : '▶ Reproduzir';
  $('play-pause').setAttribute('aria-pressed', String(playing));
});
$('speed').addEventListener('input', () => { updateOutputs(); mixer.timeScale = playing ? +$('speed').value : 0; });
$('toggle-rig').addEventListener('click', () => { rigVisible = !rigVisible; helper.visible = jointMarkers.visible = rigVisible; $('toggle-rig').classList.toggle('active', rigVisible); $('toggle-rig').setAttribute('aria-pressed', String(rigVisible)); $('rig-label').textContent = rigVisible ? 'Ocultar rig' : 'Mostrar rig'; });
$('reset-camera').addEventListener('click', () => orbit.reset());
$('reset-all').addEventListener('click', () => {
  clearTimeout(rebuildTimer); rebuildTimer = null;
  for (const id of ['scale', 'head', 'width', 'legs', 'limbs', 'arms', 'stance', 'speed', 'color-body', 'color-clothes', 'color-detail']) $(id).value = $(id).defaultValue;
  $('entity').value = 'human'; $('animation').value = 'Idle'; $('entity-label').textContent = 'MODELO BASE HUMANOIDE';
  playing = true; $('play-pause').textContent = '❚❚ Pausar'; $('play-pause').setAttribute('aria-pressed', 'true');
  updateOutputs(); rebuild(); orbit.reset(); notify('Configurações restauradas.');
});
let statusTimer;
function notify(message) { $('status').textContent = message; $('status').classList.add('visible'); clearTimeout(statusTimer); statusTimer = setTimeout(() => $('status').classList.remove('visible'), 3500); }
function removeImage() {
  imageRequest++; if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = null; referenceSource = null;
  $('reference-image').removeAttribute('src'); $('reference-image').hidden = true; $('upload-placeholder').hidden = false; $('change-image').hidden = true; $('image-info').hidden = true; $('image-input').value = ''; $('extract').disabled = true;
}
$('remove-image').addEventListener('click', removeImage);
$('upload-label').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('image-input').click(); } });
$('image-input').addEventListener('change', () => {
  const file = $('image-input').files[0]; if (!file) return;
  if (!['image/png', 'image/jpeg'].includes(file.type)) { notify('Escolha uma imagem PNG ou JPG.'); $('image-input').value = ''; return; }
  const request = ++imageRequest, url = URL.createObjectURL(file), image = new Image();
  image.onload = () => {
    if (request !== imageRequest) { URL.revokeObjectURL(url); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = url; referenceSource = image;
    $('reference-image').src = url; $('reference-image').hidden = false; $('upload-placeholder').hidden = true; $('change-image').hidden = false; $('image-info').hidden = false; $('image-name').textContent = file.name; $('extract').disabled = false;
  };
  image.onerror = () => { URL.revokeObjectURL(url); if (request === imageRequest) { $('image-input').value = ''; notify('Não foi possível abrir esta imagem.'); } };
  image.src = url;
});
$('extract').addEventListener('click', () => {
  try {
    const palette = extractPalette(referenceSource, $('entity').value);
    const entries = Object.entries(palette);
    if (!entries.length) { notify('Nenhuma cor clara o suficiente encontrada; as cores atuais foram mantidas.'); return; }
    for (const [name, color] of entries) $(`color-${name}`).value = color;
    updateColors();
    notify(entries.length < 3 ? 'Poucas cores distintas: as demais foram mantidas.' : 'Cores representativas aplicadas.');
  } catch (error) { console.error(error); notify('Não foi possível extrair as cores.'); }
});
$('export').addEventListener('click', async () => {
  const button = $('export'); button.disabled = true;
  flushRebuild();
  const exportMixer = mixer; exportMixer.timeScale = 0;
  try {
    // Apenas o personagem: chão, iluminação e visualização do rig ficam de fora.
    character.model.updateMatrixWorld(true);
    const data = await new GLTFExporter().parseAsync(character.model, { binary: true, onlyVisible: true, animations: clips });
    const url = URL.createObjectURL(new Blob([data], { type: 'model/gltf-binary' }));
    const link = document.createElement('a'); link.href = url; link.download = 'personagem-bloco404.glb'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); notify('GLB exportado com sucesso.');
  } catch (error) { console.error(error); notify('Não foi possível exportar o GLB.'); } finally { if (mixer === exportMixer) mixer.timeScale = playing ? +$('speed').value : 0; button.disabled = false; }
});
function resize() { const { clientWidth, clientHeight } = viewport; if (!clientWidth || !clientHeight) return; camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight, false); }
new ResizeObserver(resize).observe(viewport); resize(); updateOutputs(); rebuild();
let previousTime;
renderer.setAnimationLoop(time => {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time; mixer.update(delta); updateMarkers(); orbit.update(); renderer.render(scene, camera);
});
