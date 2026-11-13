// =====================================================================
//  INPUT
//
//  Centraliza teclado, mouse, zoom, clique no chão e pan de câmera.
//
//  Guarda teclas por event.key e event.code.
//  Exemplo:
//  input.keys['e']
//  input.keys['keye']
//  input.keys[' ']
//  input.keys['space']
// =====================================================================

import { CONFIG } from '../config.js';
import { state } from '../game/state.js';
import { camera, setZoom, screenToWorld } from './camera.js';

export const input = {
  // Teclas seguradas agora.
  keys: {},

  // Teclas pressionadas apenas neste frame.
  pressed: new Set(),

  // Clique no chão em coordenadas de mundo.
  click: null,
  attackClick: null,
  fpsFire: false,
  mouseDeltaX: 0,
};

const drag = {
  left: false,
  moveClick: false,
  pan: false,

  startX: 0,
  startY: 0,

  camX: 0,
  camY: 0,
};

function normalizeKey(event) {
  return String(event.key ?? '').toLowerCase();
}

function normalizeCode(event) {
  return String(event.code ?? '').toLowerCase();
}

function setKeyState(event, value) {
  const key = normalizeKey(event);
  const code = normalizeCode(event);

  if (key) input.keys[key] = value;
  if (code) input.keys[code] = value;
}

function registerPressed(event) {
  const key = normalizeKey(event);
  const code = normalizeCode(event);

  // Só registra como “pressionada neste frame”
  // se ela não estava segurada antes.
  const wasAlreadyHeld =
    (key && input.keys[key]) ||
    (code && input.keys[code]);

  if (!wasAlreadyHeld) {
    if (key) input.pressed.add(key);
    if (code) input.pressed.add(code);
  }

  setKeyState(event, true);
}

// Ajuda para outros sistemas perguntarem:
// inputWasPressed('e', 'keye')
export function wasPressed(...keys) {
  return keys.some(key => input.pressed.has(String(key).toLowerCase()));
}

export function isHeld(...keys) {
  return keys.some(key => input.keys[String(key).toLowerCase()]);
}

export function endInputFrame() {
  input.pressed.clear();
}

export function initInput(canvas) {
  // -------------------------------------------------------------------
  // Teclado
  // -------------------------------------------------------------------
  window.addEventListener('keydown', event => {
    registerPressed(event);

    const key = normalizeKey(event);
    const code = normalizeCode(event);

    // Evita comportamento padrão do navegador para espaço/setas
    // quando o jogo está recebendo foco.
    if (
      key === ' ' ||
      key === 'arrowup' ||
      key === 'arrowdown' ||
      key === 'arrowleft' ||
      key === 'arrowright'
    ) {
      event.preventDefault();
    }

    // Zoom.
    if (key === '+' || key === '=' || code === 'numpadadd') {
      setZoom(camera.targetZoom * CONFIG.ZOOM_KEY_FACTOR);
    }

    if (key === '-' || key === '_' || code === 'numpadsubtract') {
      setZoom(camera.targetZoom / CONFIG.ZOOM_KEY_FACTOR);
    }

    // Centraliza câmera no player no próximo frame.
    if (key === 'c' || code === 'keyc') {
      camera.follow = true;
    }
  });

  window.addEventListener('keyup', event => {
    setKeyState(event, false);
  });

  // Se a janela perde foco, limpa tudo.
  // Evita player continuar andando se ALT+TAB acontecer.
  window.addEventListener('blur', () => {
    for (const key in input.keys) {
      input.keys[key] = false;
    }

    input.pressed.clear();
    input.click = null;
    input.attackClick = null;
    drag.left = false; drag.pan = false; input.fpsFire = false; input.mouseDeltaX = 0;
    if (state.world.currentMap?.meta?.camera === 'retro-fps' && !state.world.fpsPaused) state.world.fpsPauseRequested = true;
  });

  // A saída do pointer lock pelo navegador também deve pausar o combate.
  globalThis.document?.addEventListener?.('pointerlockchange', () => {
    if (state.world.currentMap?.meta?.camera === 'retro-fps' && !document.pointerLockElement && !state.world.fpsPaused) {
      state.world.fpsPauseRequested = true;
    }
  });

  // -------------------------------------------------------------------
  // Zoom
  // -------------------------------------------------------------------
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (state.world.currentMap?.meta?.camera === 'retro-fps') return;

    setZoom(
      camera.targetZoom *
      Math.exp(-event.deltaY * CONFIG.ZOOM_WHEEL_SPEED)
    );
  }, { passive: false });

  // -------------------------------------------------------------------
  // Mouse
  // -------------------------------------------------------------------
  canvas.addEventListener('mousedown', event => {
    if (state.world.currentMap?.meta?.camera === 'retro-fps') {
      if (event.button === 0 && !state.world.fpsPaused) { input.fpsFire = true; if (document.pointerLockElement !== canvas) { const request=canvas.requestPointerLock?.(); request?.catch?.(() => {}); } }
      return;
    }
    drag.startX = event.clientX;
    drag.startY = event.clientY;

    // Botão esquerdo ataca; Shift + esquerdo preserva o movimento por clique.
    if (event.button === 0) {
      drag.left = true;
      drag.moveClick = event.shiftKey;
      return;
    }

    // Botão do meio ou direito: pan manual da câmera.
    if (event.button === 1 || event.button === 2) {
      event.preventDefault();

      drag.pan = true;
      drag.camX = camera.x;
      drag.camY = camera.y;

      camera.follow = false;
    }
  });

  window.addEventListener('mousemove', event => {
    if (state.world.currentMap?.meta?.camera === 'retro-fps') {
      if (document.pointerLockElement === canvas) input.mouseDeltaX += event.movementX || 0;
      return;
    }
    if (!drag.pan) return;

    camera.x =
      drag.camX -
      (event.clientX - drag.startX) / camera.zoom;

    camera.y =
      drag.camY -
      (event.clientY - drag.startY) / camera.zoom;
  });

  window.addEventListener('mouseup', event => {
    // Clique esquerdo.
    if (event.button === 0 && drag.left) {
      drag.left = false;

      const moved = Math.hypot(
        event.clientX - drag.startX,
        event.clientY - drag.startY
      );

      // Se quase não moveu o mouse, foi clique no chão.
      if (moved < CONFIG.CLICK_DRAG_THRESHOLD && event.target === canvas) {
        const point = screenToWorld(
          event.clientX,
          event.clientY
        );
        if (drag.moveClick) { input.attackClick = null; input.click = point; }
        else { input.click = null; input.attackClick = point; }
      }
    } 

    // Fim de pan.
    if (event.button === 1 || event.button === 2) {
      drag.pan = false;
    }
  });

  canvas.addEventListener('contextmenu', event => {
    event.preventDefault();
  });
}