import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFExporter } from '../vendor/GLTFExporter.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { createHumanoid, poseAndGround, footMinY } from './humanoid.js';
import { extractPalette, extractRegionalColors } from './palette.js';
import { createAnimations } from './animations.js';
import { makeExportScene } from './export-scene.js';
import { detectRegions, createRegionTextures } from './textures.js';

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

let character, helper, jointMarkers, mixer, clips = [], currentAction, transition, rebuildTimer;
let rigVisible = false, playing = true, imageUrl = null, imageRequest = 0, referenceSource = null;
let regions = null, projectionActive = false, textureMaps = {}, textureFrame = 0;
let referenceFile = null, aiConfigured = false, aiBusy = false, aiBuffer = null, aiModel = null, viewMode = 'base';
const state = () => ({ entity: $('entity').value, head: +$('head').value, width: +$('width').value, legs: +$('legs').value, limbs: +$('limbs').value, texturedHead: !!(projectionActive && referenceSource && $('tex-face').checked), details: { hair: $('detail-hair').checked, face: $('detail-face').checked, glasses: $('detail-glasses').checked, gear: $('detail-gear').checked, scale: +$('detail-scale').value, offset: +$('detail-offset').value, faceX: +$('face-x').value, faceY: +$('face-y').value, faceScale: +$('face-scale').value }, colors: { body: $('color-body').value, clothes: $('color-clothes').value, detail: $('color-detail').value, top: $('color-top').value, hair: $('color-hair').value, sole: $('color-sole').value, accent: $('color-accent').value } });
function rebuild() {
  if (character) {
    mixer.stopAllAction(); mixer.uncacheRoot(character.model);
    scene.remove(character.model, helper, jointMarkers);
    character.mesh.geometry.dispose(); character.mesh.material.forEach(m => m.dispose()); helper.dispose();
    jointMarkers.geometry.dispose(); jointMarkers.material.dispose();
  }
  character = createHumanoid(state()); scene.add(character.model);
  applyMaterialMaps();
  helper = new THREE.SkeletonHelper(character.mesh); helper.material.color.set('#d6f888'); helper.material.depthTest = false; helper.renderOrder = 10; helper.visible = rigVisible; scene.add(helper);
  const markerGeometry = new THREE.SphereGeometry(0.025, 10, 8);
  const markerMaterial = new THREE.MeshBasicMaterial({ color: '#e3ff99', depthTest: false });
  jointMarkers = new THREE.InstancedMesh(markerGeometry, markerMaterial, character.bones.length); jointMarkers.renderOrder = 11; jointMarkers.visible = rigVisible; scene.add(jointMarkers);
  const settings = { scale: +$('scale').value, arms: +$('arms').value, stance: +$('stance').value };
  clips = createAnimations(character, settings);
  poseAndGround(character, settings.scale, settings.arms, settings.stance);
  mixer = new THREE.AnimationMixer(character.model); currentAction = null; transition = null;
  selectAnimation();
  setStudioView(viewMode);
  updateMarkers();
}
function selectAnimation() {
  const clip = clips.find(item => item.name === $('animation').value);
  const next = mixer.clipAction(clip);
  if (currentAction === next && next.isRunning()) return;
  if (transition) { transition.previous.stop(); transition = null; }
  if (playing && currentAction && currentAction.isRunning()) {
    next.reset().stopFading().setEffectiveWeight(1).play();
    currentAction.crossFadeTo(next, 0.18, false);
    transition = { previous: currentAction, remaining: 0.18 };
  } else {
    mixer.stopAllAction(); next.reset().stopFading().setEffectiveWeight(1).play();
  }
  currentAction = next; mixer.timeScale = playing ? +$('speed').value : 0;
  mixer.update(0); character.model.updateMatrixWorld(true);
}
function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => { rebuildTimer = null; rebuild(); }, 120);
}
function flushRebuild() { if (rebuildTimer) { clearTimeout(rebuildTimer); rebuildTimer = null; rebuild(); } }
const markerMatrix = new THREE.Matrix4(), markerPoint = new THREE.Vector3();
function updateMarkers() {
  if (!rigVisible || viewMode !== 'base') return;
  character.model.updateMatrixWorld(true);
  const matrix = markerMatrix, point = markerPoint;
  character.bones.forEach((bone, index) => { bone.getWorldPosition(point); matrix.makeTranslation(point.x, point.y, point.z); jointMarkers.setMatrixAt(index, matrix); });
  jointMarkers.instanceMatrix.needsUpdate = true;
}
function updateOutputs() {
  for (const id of ['scale', 'head', 'width', 'legs', 'limbs']) document.querySelector(`output[for="${id}"]`).value = `${Math.round(+$(id).value * 100)}%`;
  for (const id of ['arms', 'stance']) document.querySelector(`output[for="${id}"]`).value = `${$(id).value}°`;
  document.querySelector('output[for="speed"]').value = `${(+$('speed').value).toFixed(2).replace(/0$/, '')}×`;
  document.querySelector('output[for="detail-scale"]').value = `${Math.round(+$('detail-scale').value * 100)}%`;
  document.querySelector('output[for="detail-offset"]').value = (+$('detail-offset').value).toFixed(2);
  for (const id of ['face-x', 'face-y']) document.querySelector(`output[for="${id}"]`).value = (+$(id).value).toFixed(3);
  document.querySelector('output[for="face-scale"]').value = `${Math.round(+$('face-scale').value * 100)}%`;
  document.querySelector('output[for="texture-strength"]').value = `${Math.round(+$('texture-strength').value * 100)}%`;
}
for (const id of ['head', 'width', 'legs', 'limbs', 'scale', 'arms', 'stance', 'detail-scale', 'detail-offset', 'face-x', 'face-y', 'face-scale']) $(id).addEventListener('input', () => { updateOutputs(); scheduleRebuild(); });
const colorSlots = { body: 0, clothes: 1, detail: 2, top: 16, hair: 17, sole: 18, accent: 19 };
const textureSlots = { face: [4, 'body'], torso: [5, 'top'], leftUpper: [6, 'clothes'], leftLower: [7, 'clothes'], rightUpper: [8, 'clothes'], rightLower: [9, 'clothes'], leftArmUpper: [10, 'body'], leftArmLower: [11, 'body'], rightArmUpper: [12, 'body'], rightArmLower: [13, 'body'], leftFoot: [14, 'detail'], rightFoot: [15, 'detail'] };
function applyMaterialMaps() {
  for (const [name, [index, color]] of Object.entries(textureSlots)) {
    const material = character.mesh.material[index], map = textureMaps[name] || null;
    material.map = map; material.color.set(map ? '#ffffff' : $(`color-${color}`).value); material.needsUpdate = true;
  }
}
function refreshTextures() {
  if (textureFrame) { cancelAnimationFrame(textureFrame); textureFrame = 0; }
  const old = textureMaps;
  textureMaps = projectionActive && referenceSource && regions
    ? createRegionTextures(referenceSource, regions, { face: $('tex-face').checked, torso: $('tex-torso').checked, arms: $('tex-arms').checked, legs: $('tex-legs').checked }, state().colors, +$('texture-strength').value, $('remove-background').checked)
    : {};
  if (character) applyMaterialMaps();
  Object.values(old).forEach(texture => texture.dispose());
}
function scheduleTextureRefresh() {
  if (!textureFrame) textureFrame = requestAnimationFrame(() => { textureFrame = 0; refreshTextures(); });
}
function updateColors() {
  for (const [name, index] of Object.entries(colorSlots)) character.mesh.material[index].color.set($(`color-${name}`).value);
  character.mesh.material[21].color.set($('color-clothes').value).multiplyScalar(0.72);
  scheduleTextureRefresh();
}
for (const name of Object.keys(colorSlots)) $(`color-${name}`).addEventListener('input', updateColors);
for (const id of ['detail-hair', 'detail-face', 'detail-glasses', 'detail-gear']) $(id).addEventListener('change', scheduleRebuild);
$('entity').addEventListener('change', () => {
  const creature = $('entity').value === 'creature';
  const preset = creature
    ? { head: 1.3, width: 1.35, legs: 0.8, limbs: 1.3, arms: 24, stance: 12, 'color-body': '#80a776', 'color-clothes': '#586b64', 'color-detail': '#d4bd72', 'color-top': '#48564b', 'color-hair': '#363b32', 'color-sole': '#c5b8ad', 'color-accent': '#d78338' }
    : { head: 1, width: 1, legs: 1, limbs: 1, arms: 12, stance: 0, 'color-body': '#b97558', 'color-clothes': '#a99a91', 'color-detail': '#333039', 'color-top': '#252329', 'color-hair': '#292127', 'color-sole': '#c5b8ad', 'color-accent': '#d78338' };
  for (const [id, value] of Object.entries(preset)) $(id).value = value;
  $('detail-face').checked = !creature; $('detail-glasses').checked = !creature;
  $('entity-label').textContent = creature ? 'MODELO BASE CRIATURA' : 'MODELO BASE HUMANOIDE';
  updateOutputs(); refreshTextures(); scheduleRebuild();
});
$('animation').addEventListener('change', () => { flushRebuild(); selectAnimation(); updateMarkers(); });
$('play-pause').addEventListener('click', () => {
  playing = !playing; mixer.timeScale = playing ? +$('speed').value : 0;
  $('play-pause').textContent = playing ? '❚❚ Pausar' : '▶ Reproduzir';
  $('play-pause').setAttribute('aria-pressed', String(playing));
});
$('speed').addEventListener('input', () => { updateOutputs(); mixer.timeScale = playing ? +$('speed').value : 0; });
$('toggle-rig').addEventListener('click', () => { rigVisible = !rigVisible; helper.visible = jointMarkers.visible = rigVisible && viewMode === 'base'; $('toggle-rig').classList.toggle('active', rigVisible); $('toggle-rig').setAttribute('aria-pressed', String(rigVisible)); $('rig-label').textContent = rigVisible ? 'Ocultar rig' : 'Mostrar rig'; });
$('reset-camera').addEventListener('click', () => orbit.reset());
$('view-front').addEventListener('click', () => { orbit.target.set(0, 1.15, 0); camera.position.set(0, 1.15, 5.5); orbit.update(); });
$('reset-all').addEventListener('click', () => {
  clearTimeout(rebuildTimer); rebuildTimer = null; setStudioView('base');
  for (const id of ['scale', 'head', 'width', 'legs', 'limbs', 'arms', 'stance', 'speed', 'detail-scale', 'detail-offset', 'face-x', 'face-y', 'face-scale', 'texture-strength', 'color-body', 'color-clothes', 'color-detail', 'color-top', 'color-hair', 'color-sole', 'color-accent']) $(id).value = $(id).defaultValue;
  $('entity').value = 'human'; $('animation').value = 'Idle'; $('entity-label').textContent = 'MODELO BASE HUMANOIDE';
  projectionActive = false; for (const id of ['detail-hair', 'detail-face', 'detail-glasses', 'detail-gear', 'tex-face', 'tex-torso', 'tex-arms', 'tex-legs']) $(id).checked = true; for (const id of ['remove-background']) $(id).checked = false; refreshTextures();
  playing = true; $('play-pause').textContent = '❚❚ Pausar'; $('play-pause').setAttribute('aria-pressed', 'true');
  updateOutputs(); rebuild(); orbit.reset(); notify('Configurações restauradas.');
});
let statusTimer;
function notify(message) { $('status').textContent = message; $('status').classList.add('visible'); clearTimeout(statusTimer); statusTimer = setTimeout(() => $('status').classList.remove('visible'), 3500); }
function removeImage() {
  imageRequest++; clearAiModel(); referenceFile = null; updateAIControls(); if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = null; referenceSource = null; regions = null; projectionActive = false; refreshTextures(); $('texture-panel').hidden = true; scheduleRebuild();
  $('reference-image').removeAttribute('src'); $('reference-image').hidden = true; $('upload-placeholder').hidden = false; $('change-image').hidden = true; $('image-info').hidden = true; $('image-input').value = ''; $('extract').disabled = true;
}
$('remove-image').addEventListener('click', removeImage);
$('upload-label').addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); $('image-input').click(); } });
$('image-input').addEventListener('change', () => {
  const file = $('image-input').files[0]; if (!file) return;
  if (!['image/png', 'image/jpeg'].includes(file.type)) { notify('Escolha uma imagem PNG ou JPG.'); $('image-input').value = ''; return; }
  const request = ++imageRequest, url = URL.createObjectURL(file), image = new Image();
  clearAiModel(); referenceFile = null; updateAIControls();
  image.onload = () => {
    if (request !== imageRequest) { URL.revokeObjectURL(url); return; }
    if (imageUrl) URL.revokeObjectURL(imageUrl); imageUrl = url; referenceSource = image; referenceFile = file; updateAIControls();
    regions = detectRegions(image); $('texture-panel').hidden = false; syncCrop();
    applyReferenceColors(); projectionActive = true; refreshTextures(); scheduleRebuild();
    $('reference-image').src = url; $('reference-image').hidden = false; $('upload-placeholder').hidden = true; $('change-image').hidden = false; $('image-info').hidden = false; $('image-name').textContent = file.name; $('extract').disabled = false;
  };
  image.onerror = () => { URL.revokeObjectURL(url); if (request === imageRequest) { $('image-input').value = ''; notify('Não foi possível abrir esta imagem.'); } };
  image.src = url;
});
// O canvas do recorte usa coordenadas normalizadas para funcionar com qualquer resolução.
const cropCanvas = $('crop-canvas'), cropCtx = cropCanvas.getContext('2d');
let cropDrag = null;
function cropFrame() {
  const scale = Math.min(cropCanvas.width / referenceSource.naturalWidth, cropCanvas.height / referenceSource.naturalHeight);
  const w = referenceSource.naturalWidth * scale, h = referenceSource.naturalHeight * scale;
  return { x: (cropCanvas.width - w) / 2, y: (cropCanvas.height - h) / 2, w, h };
}
function drawCrop(rect = regions?.[$('crop-target').value]) {
  if (!referenceSource || !rect) return;
  const f = cropFrame(); cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
  cropCtx.drawImage(referenceSource, f.x, f.y, f.w, f.h);
  cropCtx.fillStyle = 'rgba(0,0,0,.4)'; cropCtx.fillRect(f.x, f.y, f.w, f.h);
  cropCtx.save(); cropCtx.beginPath(); cropCtx.rect(f.x + rect.x * f.w, f.y + rect.y * f.h, rect.w * f.w, rect.h * f.h); cropCtx.clip(); cropCtx.drawImage(referenceSource, f.x, f.y, f.w, f.h); cropCtx.restore();
  cropCtx.strokeStyle = '#d2f367'; cropCtx.lineWidth = 2; cropCtx.strokeRect(f.x + rect.x * f.w, f.y + rect.y * f.h, rect.w * f.w, rect.h * f.h);
}
function syncCrop() {
  if (!regions) return;
  const rect = regions[$('crop-target').value];
  for (const key of ['x', 'y', 'w', 'h']) { $(`crop-${key}`).value = Math.round(rect[key] * 1000) / 10; document.querySelector(`output[for="crop-${key}"]`).value = `${(rect[key] * 100).toFixed(1)}%`; }
  drawCrop();
}
$('crop-target').addEventListener('change', syncCrop);
for (const key of ['x', 'y', 'w', 'h']) $(`crop-${key}`).addEventListener('input', () => {
  const rect = regions[$('crop-target').value]; rect[key] = +$(`crop-${key}`).value / 100;
  rect.w = Math.min(rect.w, 1 - rect.x); rect.h = Math.min(rect.h, 1 - rect.y);
  syncCrop(); if (projectionActive) scheduleTextureRefresh();
});
function cropPoint(event) {
  const box = cropCanvas.getBoundingClientRect(), f = cropFrame();
  return { x: THREE.MathUtils.clamp(((event.clientX - box.left) * cropCanvas.width / box.width - f.x) / f.w, 0, 1), y: THREE.MathUtils.clamp(((event.clientY - box.top) * cropCanvas.height / box.height - f.y) / f.h, 0, 1) };
}
function dragRect(a, b) { return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) }; }
cropCanvas.addEventListener('pointerdown', event => { if (!regions) return; cropDrag = cropPoint(event); cropCanvas.setPointerCapture(event.pointerId); });
cropCanvas.addEventListener('pointermove', event => { if (cropDrag) drawCrop(dragRect(cropDrag, cropPoint(event))); });
cropCanvas.addEventListener('pointerup', event => {
  if (!cropDrag) return; const rect = dragRect(cropDrag, cropPoint(event)); cropDrag = null;
  if (rect.w >= 0.01 && rect.h >= 0.01) { regions[$('crop-target').value] = rect; if (projectionActive) scheduleTextureRefresh(); }
  syncCrop();
});
cropCanvas.addEventListener('pointercancel', () => { cropDrag = null; syncCrop(); });
$('apply-texture').addEventListener('click', () => { if (!referenceSource) return; projectionActive = true; refreshTextures(); scheduleRebuild(); notify('Projeção frontal aplicada.'); });
$('clear-texture').addEventListener('click', () => { projectionActive = false; refreshTextures(); scheduleRebuild(); notify('Projeção removida; a referência foi mantida.'); });
for (const id of ['tex-face', 'tex-torso', 'tex-arms', 'tex-legs']) $(id).addEventListener('change', () => { if (projectionActive) { refreshTextures(); scheduleRebuild(); } });
$('texture-strength').addEventListener('input', () => { updateOutputs(); if (projectionActive) scheduleTextureRefresh(); });
$('remove-background').addEventListener('change', () => { if (projectionActive) refreshTextures(); });
function applyReferenceColors() {
  if (!referenceSource || !regions) return 0;
  const fallback = extractPalette(referenceSource, $('entity').value);
  const palette = $('entity').value === 'human' ? { ...fallback, ...extractRegionalColors(referenceSource, regions) } : fallback;
  const entries = Object.entries(palette);
  for (const [name, color] of entries) $(`color-${name}`).value = color;
  updateColors(); return entries.length;
}
$('extract').addEventListener('click', () => {
  try {
    const count = applyReferenceColors();
    if (!count) { notify('Nenhuma cor adequada encontrada; as cores atuais foram mantidas.'); return; }
    notify('Cores aproximadas das regiões aplicadas.');
  } catch (error) { console.error(error); notify('Não foi possível extrair as cores.'); }
});
function updateAIControls() { $('generate-ai').disabled = !aiConfigured || !referenceFile || aiBusy; }
function setStudioView(mode) {
  viewMode = mode === 'ai' && aiModel ? 'ai' : 'base';
  if (character) character.model.visible = viewMode === 'base';
  if (aiModel) aiModel.visible = viewMode === 'ai';
  if (helper) helper.visible = jointMarkers.visible = rigVisible && viewMode === 'base';
  $('toggle-rig').disabled = viewMode === 'ai';
  for (const id of ['animation', 'play-pause', 'speed']) $(id).disabled = viewMode === 'ai';
  $('export-label').textContent = viewMode === 'ai' ? 'Exportar GLB da IA' : 'Exportar GLB';
}
function disposeAiModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue; materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  geometries.forEach(item => item.dispose()); materials.forEach(item => item.dispose()); textures.forEach(item => { item.image?.close?.(); item.dispose(); });
}
function clearAiModel() {
  setStudioView('base');
  if (aiModel) { scene.remove(aiModel); disposeAiModel(aiModel); }
  aiModel = null; aiBuffer = null; $('ai-result').hidden = true;
}
async function checkAIService() {
  try {
    const response = await fetch('/api/reconstruct/status', { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('offline');
    const data = await response.json(); aiConfigured = data.configured === true;
    $('ai-status').textContent = aiConfigured ? 'TripoSR configurado. Carregue uma imagem para gerar.' : 'Servidor ativo, mas TripoSR não configurado. Veja o README.';
  } catch { aiConfigured = false; $('ai-status').textContent = 'Servidor de IA não encontrado. Inicie o servidor opcional descrito no README.'; }
  updateAIControls();
}
$('view-ai').addEventListener('click', () => setStudioView('ai'));
$('view-base').addEventListener('click', () => setStudioView('base'));
$('generate-ai').addEventListener('click', async () => {
  if (!referenceFile || !aiConfigured || aiBusy) return;
  const file = referenceFile, request = imageRequest; aiBusy = true; updateAIControls();
  $('ai-status').textContent = 'Gerando malha no TripoSR local. Isso pode levar vários minutos…';
  try {
    const response = await fetch('/api/reconstruct', { method: 'POST', headers: { 'Content-Type': file.type }, body: file });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || `Falha na reconstrução (${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    if (request !== imageRequest) { $('ai-status').textContent = 'Imagem alterada; gere novamente para a referência atual.'; return; }
    const gltf = await new GLTFLoader().parseAsync(buffer, '');
    if (request !== imageRequest) { disposeAiModel(gltf.scene); $('ai-status').textContent = 'Imagem alterada; gere novamente para a referência atual.'; return; }
    const bounds = new THREE.Box3().setFromObject(gltf.scene), size = bounds.getSize(new THREE.Vector3());
    if (bounds.isEmpty() || !Number.isFinite(size.y) || size.y < 1e-6) { disposeAiModel(gltf.scene); throw new Error('O GLB gerado não contém geometria utilizável.'); }
    clearAiModel();
    const center = bounds.getCenter(new THREE.Vector3());
    gltf.scene.position.sub(new THREE.Vector3(center.x, bounds.min.y, center.z));
    aiModel = new THREE.Group(); aiModel.name = 'Previa_IA'; aiModel.add(gltf.scene); aiModel.scale.setScalar(2.4 / size.y); scene.add(aiModel);
    aiBuffer = buffer; $('ai-result').hidden = false; setStudioView('ai'); orbit.reset();
    $('ai-status').textContent = 'Malha IA pronta. Prévia redimensionada; GLB original é estático, sem rig ou clipes.';
  } catch (error) { console.error(error); $('ai-status').textContent = request === imageRequest ? (error.message || 'Falha ao gerar a malha.') : 'Imagem alterada; gere novamente para a referência atual.'; }
  finally { aiBusy = false; updateAIControls(); }
});
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export').addEventListener('click', async () => {
  if (viewMode === 'ai' && aiBuffer) {
    downloadBlob(new Blob([aiBuffer], { type: 'model/gltf-binary' }), 'reconstrucao-ia.glb');
    notify('GLB estático da IA exportado.'); return;
  }
  const button = $('export'); button.disabled = true;
  const workspace = document.querySelector('.workspace'); workspace.inert = true;
  let exportMixer;
  try {
    if (textureFrame) refreshTextures();
    flushRebuild(); exportMixer = mixer; exportMixer.timeScale = 0;
    // Apenas o personagem: chão, iluminação e visualização do rig ficam de fora.
    character.model.updateMatrixWorld(true);
    const data = await new GLTFExporter().parseAsync(makeExportScene(character), { binary: true, onlyVisible: true, animations: clips });
    downloadBlob(new Blob([data], { type: 'model/gltf-binary' }), 'personagem-bloco404.glb'); notify('GLB exportado com sucesso.');
  } catch (error) { console.error(error); notify('Não foi possível exportar o GLB.'); } finally { if (mixer === exportMixer) mixer.timeScale = playing ? +$('speed').value : 0; workspace.inert = false; button.disabled = false; }
});
function resize() { const { clientWidth, clientHeight } = viewport; if (!clientWidth || !clientHeight) return; camera.aspect = clientWidth / clientHeight; camera.updateProjectionMatrix(); renderer.setSize(clientWidth, clientHeight, false); }
new ResizeObserver(resize).observe(viewport); resize(); updateOutputs(); rebuild(); checkAIService();
let previousTime;
renderer.setAnimationLoop(time => {
  const delta = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
  previousTime = time; mixer.update(delta);
  if (transition && playing) {
    // O blend de dois clipes pode afundar ligeiramente os pés; corrija enquanto
    // dura a transição, sem alterar os clipes independentes exportados.
    character.model.updateMatrixWorld(true);
    character.model.position.y = -footMinY(character) * character.model.scale.y;
    transition.remaining -= delta * mixer.timeScale; if (transition.remaining <= 0) { transition.previous.stop(); transition = null; } }
  updateMarkers(); orbit.update(); renderer.render(scene, camera);
});
