import { CONFIG } from '../config.js';

export const view = { w: 0, h: 0, dpr: 1 };  // tamanho da janela (preenchido pelo renderer)
export const camera = { x: 0, y: 0, zoom: 1, targetZoom: 1, follow: true }; // x,y em espaço ISO

const HW = CONFIG.TILE_W / 2;
const HH = CONFIG.TILE_H / 2;

// ---- Conversões ----
export function worldToIso(wx, wy) {
  return { x: (wx - wy) * HW, y: (wx + wy) * HH };
}
export function isoToWorld(ix, iy) {
  return { x: (ix / HW + iy / HH) / 2, y: (iy / HH - ix / HW) / 2 };
}
export function worldToScreen(wx, wy) {
  return {
    x: ((wx - wy) * HW - camera.x) * camera.zoom + view.w / 2,
    y: ((wx + wy) * HH - camera.y) * camera.zoom + view.h / 2,
  };
}
export function screenToWorld(sx, sy) {
  return isoToWorld(
    (sx - view.w / 2) / camera.zoom + camera.x,
    (sy - view.h / 2) / camera.zoom + camera.y
  );
}

// ---- Controle ----
export function setZoom(z) {
  camera.targetZoom = Math.min(CONFIG.ZOOM_MAX, Math.max(CONFIG.ZOOM_MIN, z));
}

export function snapCameraTo(wx, wy) {
  const i = worldToIso(wx, wy);
  camera.x = i.x; camera.y = i.y;
  camera.follow = true;
}

export function updateCamera(dt, targetWx, targetWy) {
  if (camera.follow) {
    const t = worldToIso(targetWx, targetWy);
    const k = 1 - Math.exp(-CONFIG.FOLLOW_SMOOTH * dt); // independente de FPS
    camera.x += (t.x - camera.x) * k;
    camera.y += (t.y - camera.y) * k;
  }
  camera.zoom += (camera.targetZoom - camera.zoom) * (1 - Math.exp(-CONFIG.ZOOM_SMOOTH * dt));
}