import { IMMERSIVE_MODE } from '../game/immersive-view-manager.js';
import { worldToScreen } from '../engine/camera.js';
import { immersiveSoundEnabled, toggleImmersiveSound } from './immersive-audio.js';
import { createDioramaRenderer } from './enseada-diorama-renderer.js';

const reducedMotion = () => !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

export function initImmersiveView(manager) {
  const el = id => document.getElementById(id);
  const root = el('immersiveView'), effects = el('immersiveEffects');
  const title = el('immersiveTitle'), subtitle = el('immersiveSubtitle'), message = el('immersiveMessage');
  const one = el('immersiveAction1'), two = el('immersiveAction2'), exit = el('immersiveExit'), sound = el('immersiveSound');
  if (!root || !effects) return () => {};
  const drawDiorama = createDioramaRenderer(effects);
  root.addEventListener('pointermove', event => {
    if (!reducedMotion()) manager.look(event.clientX, event.clientY, window.innerWidth, window.innerHeight);
  });
  one?.addEventListener('click', () => manager.action(1));
  two?.addEventListener('click', () => manager.action(2));
  exit?.addEventListener('click', () => manager.exit());
  sound?.addEventListener('click', () => {
    const on = toggleImmersiveSound(); sound.textContent = on ? 'SOM LIGADO' : 'SOM DESLIGADO';
    sound.setAttribute('aria-pressed', String(on));
  });
  let lastScene = null;
  return function renderImmersive(dt, gameCanvas) {
    const active = manager.active, scene = manager.scene;
    document.body.classList.toggle('immersive-active', active && !!scene);
    if (manager.mode === IMMERSIVE_MODE.QUICK) {
      root.hidden = true;
      drawQuickFeedback(gameCanvas, manager);
      lastScene = null;
      return;
    }
    if (!active || !scene) { root.hidden = true; lastScene = null; return; }
    if (manager.mode === IMMERSIVE_MODE.ENTERING) drawQuickFeedback(gameCanvas, manager);
    root.hidden = false; root.dataset.scene = scene;
    root.style.opacity = String(manager.alpha);
    root.style.pointerEvents = manager.mode === IMMERSIVE_MODE.FIRST_PERSON_DIORAMA ? 'auto' : 'none';
    if (lastScene !== scene) {
      title.textContent = scene === 'fonte' ? 'Fonte da Capivara' : 'Abrigo da Concha';
      subtitle.textContent = scene === 'fonte' ? 'ÁGUAS DA ENSEADA · UM INSTANTE PARA RESPIRAR' : 'UM ABRIGO DE MADREPÉROLA DIANTE DO MAR';
      one.innerHTML = scene === 'fonte' ? '<b>1</b> Fazer carinho' : '<b>1</b> Observar o horizonte';
      two.innerHTML = scene === 'fonte' ? '<b>2</b> Submergir / relaxar' : '<b>2</b> Descansar';
      sound.textContent = immersiveSoundEnabled() ? 'SOM LIGADO' : 'SOM DESLIGADO';
      sound.setAttribute('aria-pressed', String(immersiveSoundEnabled()));
      lastScene = scene;
    }
    const status = manager.message || 'MOVA O MOUSE PARA OLHAR AO REDOR';
    if (message.textContent !== status) message.textContent = status;
    two.setAttribute('aria-pressed', String(manager.relaxing));
    const still = reducedMotion(), x = still ? 0 : manager.lookX, y = still ? 0 : manager.lookY;
    const t = still ? 0 : performance.now() / 1000;
    drawDiorama(scene, manager, t, still, x, y);
  };
}

function drawQuickFeedback(canvas, manager) {
  if (!canvas || !manager.object) return;
  const c = canvas.getContext('2d'), p = worldToScreen(manager.object.x, manager.object.y), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const f = clamp(manager.time / (manager.scene ? .7 : .48),0,1), alpha = Math.sin(f*Math.PI);
  const player = worldToScreen(manager.state.player.x, manager.state.player.y);
  const id = manager.object.id, warm = id === 'acampamento_vigilia_enseada' || id === 'enseada_banco_tronco_camp';
  c.save();c.setTransform(dpr,0,0,dpr,0,0);c.strokeStyle=warm ? `rgba(255,202,117,${alpha*.85})` : `rgba(157,255,226,${alpha*.8})`;c.lineWidth=2;
  c.beginPath();c.ellipse(p.x,p.y-18,12+f*24,5+f*8,0,0,Math.PI*2);c.stroke();
  // Um gesto curto acompanha o personagem nos marcos; a posição física não muda.
  if (['totem_eco_enseada','estela_navegadores_enseada','espelho_arquetipos_enseada','carrilhao_vento_enseada'].includes(id)) {
    const dx = p.x-player.x, dy = (p.y-25)-(player.y-18), length = Math.hypot(dx,dy) || 1;
    c.lineWidth=3; c.lineCap='round'; c.beginPath();c.moveTo(player.x,player.y-18);
    c.lineTo(player.x+dx/length*16*alpha,player.y-18+dy/length*16*alpha);c.stroke();
  }
  c.restore();
}
