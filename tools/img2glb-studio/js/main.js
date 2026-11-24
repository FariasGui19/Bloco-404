import { state as initialState } from '../../../js/game/state.js';
import { createSpatialWorld } from '../../../js/dimension/runtime.js';
import { loadGLB, disposeModel, findClip } from './glb.js';

const $ = id => document.getElementById(id);
const mount = $('dimension-root');
let runtime, preview = null, generation = 0, raf = 0, lastTime = 0, frameDelta = 0, flip = false, currentClip = null;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };

function discardPreview() {
  if (!preview) return;
  runtime.world.scene.remove(preview.pivot);
  preview.mixer.stopAllAction(); preview.mixer.uncacheRoot(preview.model);
  disposeModel(preview.model); preview = null; currentClip = null;
  if (runtime.operator?.root) runtime.operator.root.visible = true;
}
function setOptions(model) {
  const select = $('clip'); select.replaceChildren();
  select.add(new Option('Automático · Idle / Walk / Run', 'auto'));
  model.clips.forEach((clip, i) => select.add(new Option(clip.name || `Clipe ${i + 1}`, String(i))));
  if (!model.clips.length) select.add(new Option('Sem animações', 'none'));
  select.value = model.clips.length ? 'auto' : 'none';
  select.disabled = model.clips.length === 0;
}
function updatePreview(c) {
  if (!preview) return;
  preview.pivot.position.set(c.x, c.y, c.z);
  preview.pivot.rotation.y = c.yaw + (flip ? Math.PI : 0);
  const mode = $('clip').value;
  const speed = Math.hypot(c.vx, c.vz);
  const kind = speed > 9 ? 'run' : speed > 0.25 ? 'walk' : 'idle';
  const chosen = mode === 'auto' ? (findClip(preview.clips, kind) || (kind === 'run' ? findClip(preview.clips, 'walk') : null)) : mode === 'none' ? null : preview.clips[Number(mode)];
  if (chosen !== currentClip) {
    preview.mixer.stopAllAction();
    if (chosen) preview.mixer.clipAction(chosen).reset().play();
    currentClip = chosen || null;
  }
  preview.mixer.update(frameDelta);
}
// O runtime original continua comandando física, câmera e HUD. Envolvemos apenas
// o método visual no laboratório, sem modificar módulos do jogo ou seu save.
function wrapOperator() {
  const operator = runtime.operator;
  if (operator.__glbLabWrapped) return;
  const animate = operator.animate;
  operator.animate = function (controller, time, options) {
    animate.call(operator, controller, time, options);
    operator.root.visible = !preview;
    updatePreview(controller);
  };
  operator.__glbLabWrapped = true;
}
function tick(time) {
  if (!runtime) return;
  frameDelta = lastTime ? Math.min(Math.max((time - lastTime) / 1000, 0), 0.05) : 0;
  lastTime = time;
  try { wrapOperator(); runtime.frame(frameDelta, { mode: '3d', progress: 1 }); }
  catch (error) { console.error(error); status(`O laboratório parou: ${error.message}`, true); return; }
  raf = requestAnimationFrame(tick);
}
try {
  // Estado inteiramente independente do jogo real; nenhuma leitura ou escrita de save.
  const state = structuredClone(initialState);
  state.progress.archetype = 'motor_bio_forja';
  state.player.health = state.player.maxHealth = 100;
  runtime = createSpatialWorld({ state, mount, sourceCanvas: null, developerTools: false,
    exit: () => { location.href = '../../index.html'; }, fail: error => status(error.message, true) });
  raf = requestAnimationFrame(tick);
} catch (error) { console.error(error); status(`Não foi possível iniciar o setor: ${error.message}`, true); $('glb-file').disabled = true; }

// Soltar as teclas do runtime ao interagir com o painel evita movimento preso
// se o foco mudar enquanto uma tecla de jogo está pressionada.
document.querySelector('.lab-panel').addEventListener('pointerdown', () => window.dispatchEvent(new Event('blur')));

$('glb-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; event.target.value = '';
  if (!file || !runtime) return;
  const request = ++generation;
  if (!file.name.toLowerCase().endsWith('.glb') || file.size > 100 * 1024 * 1024) { status('Selecione um arquivo .glb de até 100 MiB.', true); return; }
  status(`Carregando ${file.name}…`);
  try {
    const candidate = await loadGLB(await file.arrayBuffer());
    if (request !== generation) { candidate.mixer.uncacheRoot(candidate.model); disposeModel(candidate.model); return; }
    discardPreview(); preview = candidate; flip = false; setOptions(candidate);
    runtime.world.scene.add(candidate.pivot); runtime.operator.root.visible = false;
    updatePreview(runtime.controller); $('model-controls').hidden = false;
    $('model-info').textContent = `${candidate.meshes} malha(s) · ${candidate.skins} skinned mesh(es) · ${candidate.bones} ossos · ${candidate.clips.length} clipe(s). Altura ajustada para 1,85 m.`;
    status(`${file.name} carregado localmente.`); mount.querySelector('.dimension-viewport canvas').focus();
  } catch (error) { console.error(error); if (request === generation) status(`Não foi possível abrir: ${error.message || 'GLB inválido ou recurso não suportado.'}`, true); }
});
$('rotate').addEventListener('click', () => { flip = !flip; mount.querySelector('.dimension-viewport canvas')?.focus(); });
$('clip').addEventListener('change', () => mount.querySelector('.dimension-viewport canvas')?.focus());
$('remove').addEventListener('click', () => {
  generation++; discardPreview(); $('model-controls').hidden = true; status('Operador original restaurado.'); mount.querySelector('.dimension-viewport canvas')?.focus();
});
window.addEventListener('pagehide', event => { if (event.persisted) return; generation++; cancelAnimationFrame(raf); if (runtime) { discardPreview(); runtime.dispose(); runtime = null; } });
