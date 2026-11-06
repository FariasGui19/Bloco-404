// js/game/background-calibration.js
// =====================================================================
// BACKGROUND CALIBRATION
//
// Ferramenta interna para alinhar imagens de background grandes
// ao mundo isométrico lógico.
//
// CONTROLES:
// J = ligar/desligar calibração
// WASD / Setas = mover cenário
// U / O = diminuir/aumentar escala horizontal
// N / M = diminuir/aumentar escala vertical
// F = flip horizontal
// G = flip vertical
// T = girar 180°
// B = restaurar valores iniciais
// P = imprimir valores para metro.js
// =====================================================================

import { state } from './state.js';
import { input } from '../engine/input.js';

let enabled = false;
let originalValues = null;

const MOVE_STEP = 8;
const SCALE_STEP = 0.01;

function wasPressed(...keys) {
  return keys.some(key => input.pressed.has(key));
}

export function isBackgroundCalibrationEnabled() {
  return enabled;
}

function getBackground() {
  return state.world.currentMap?.meta?.background ?? null;
}

function cloneBackgroundValues(background) {
  return {
    anchor: {
      x: background.anchor?.x ?? 0,
      y: background.anchor?.y ?? 0,
    },

    pivot: {
      x: background.pivot?.x ?? 0,
      y: background.pivot?.y ?? 0,
    },

    scaleX: background.scaleX ?? background.scale ?? 1,
    scaleY: background.scaleY ?? background.scale ?? 1,

    offsetX: background.offsetX ?? 0,
    offsetY: background.offsetY ?? 0,

    flipX: Boolean(background.flipX),
    flipY: Boolean(background.flipY),
    rotation: background.rotation ?? 0,
  };
}

function ensureBackgroundValues(background) {
  background.offsetX ??= 0;
  background.offsetY ??= 0;

  background.scaleX ??= background.scale ?? 1;
  background.scaleY ??= background.scale ?? 1;

  background.flipX ??= false;
  background.flipY ??= false;
  background.rotation ??= 0;
}

export function updateBackgroundCalibration() {
  if (wasPressed('v', 'keyv')) {
    enabled = !enabled;

    const background = getBackground();

    if (enabled && background) {
      ensureBackgroundValues(background);
      originalValues = cloneBackgroundValues(background);

      console.log('[BG CAL] Calibração ATIVADA.');
      console.log(
        '[BG CAL] WASD/Setas mover | U/O escala X | N/M escala Y | B reset | P copiar'
      );
    } else {
      console.log('[BG CAL] Calibração DESATIVADA.');
    }
  }

  if (!enabled) return;

  const background = getBackground();

  if (!background) {
    console.warn('[BG CAL] Mapa atual não possui background.');
    return;
  }

  ensureBackgroundValues(background);

  // Movimento horizontal.
  if (wasPressed('a', 'arrowleft', 'keya')) {
    background.offsetX -= MOVE_STEP;
  }

  if (wasPressed('d', 'arrowright', 'keyd')) {
    background.offsetX += MOVE_STEP;
  }

  // Movimento vertical.
  if (wasPressed('w', 'arrowup', 'keyw')) {
    background.offsetY -= MOVE_STEP;
  }

  if (wasPressed('s', 'arrowdown', 'keys')) {
    background.offsetY += MOVE_STEP;
  }

  // Escala horizontal.
  if (wasPressed('u', 'keyu')) {
    background.scaleX = Math.max(
      0.15,
      background.scaleX - SCALE_STEP
    );
  }

  if (wasPressed('o', 'keyo')) {
    background.scaleX = Math.min(
      1.5,
      background.scaleX + SCALE_STEP
    );
  }

  // Escala vertical.
  if (wasPressed('n', 'keyn')) {
    background.scaleY = Math.max(
      0.15,
      background.scaleY - SCALE_STEP
    );
  }

  if (wasPressed('m', 'keym')) {
    background.scaleY = Math.min(
      1.5,
      background.scaleY + SCALE_STEP
    );
  }

  // Espelhamentos.
  if (wasPressed('f', 'keyf')) {
    background.flipX = !background.flipX;
  }

  if (wasPressed('g', 'keyg')) {
    background.flipY = !background.flipY;
  }

  // Rotação 180 graus.
  if (wasPressed('t', 'keyt')) {
    background.rotation =
      background.rotation === 180 ? 0 : 180;
  }

  // Reset.
  if (wasPressed('b', 'keyb') && originalValues) {
    background.anchor = { ...originalValues.anchor };
    background.pivot = { ...originalValues.pivot };

    background.scaleX = originalValues.scaleX;
    background.scaleY = originalValues.scaleY;

    background.offsetX = originalValues.offsetX;
    background.offsetY = originalValues.offsetY;

    background.flipX = originalValues.flipX;
    background.flipY = originalValues.flipY;
    background.rotation = originalValues.rotation;

    console.log('[BG CAL] Valores restaurados.');
  }

  if (wasPressed('p', 'keyp')) {
    printBackgroundValues(background);
  }
}

export function getBackgroundCalibrationText() {
  if (!enabled) return null;

  const background = getBackground();

  if (!background) {
    return ['SEM BACKGROUND NO MAPA ATUAL'];
  }

  return [
    'CALIBRAÇÃO DE BACKGROUND [V]',
    `OFFSET X: ${background.offsetX ?? 0}`,
    `OFFSET Y: ${background.offsetY ?? 0}`,
    `SCALE X: ${(background.scaleX ?? 1).toFixed(3)}`,
    `SCALE Y: ${(background.scaleY ?? 1).toFixed(3)}`,
    `FLIP X: ${background.flipX ? 'SIM' : 'NÃO'}`,
    `FLIP Y: ${background.flipY ? 'SIM' : 'NÃO'}`,
    `ROTAÇÃO: ${background.rotation ?? 0}°`,
    'WASD MOVER | U/O X | N/M Y',
    'F/G FLIP | T 180° | B RESET | P COPIAR',
  ];
}

function printBackgroundValues(background) {
  const values = `background: {
  sprite: '${background.sprite}',

  anchor: {
    x: ${background.anchor?.x ?? 0},
    y: ${background.anchor?.y ?? 0},
  },

  pivot: {
    x: ${background.pivot?.x ?? 793},
    y: ${background.pivot?.y ?? 992},
  },

  scaleX: ${(background.scaleX ?? 1).toFixed(3)},
  scaleY: ${(background.scaleY ?? 1).toFixed(3)},

  offsetX: ${background.offsetX ?? 0},
  offsetY: ${background.offsetY ?? 0},

  flipX: ${Boolean(background.flipX)},
  flipY: ${Boolean(background.flipY)},
  rotation: ${background.rotation ?? 0},
},`;

  console.log(
    '%c[BG CAL] COPIE ESTES VALORES PARA metro.js:',
    'color:#35e6d3;font-weight:bold;'
  );

  console.log(values);
} 