import { CONFIG } from '../config.js';

export const view = { w: 0, h: 0, dpr: 1 };  // tamanho da janela (preenchido pelo renderer)
export const camera = { x: 0, y: 0, zoom: 1, targetZoom: 1, follow: true }; // x,y em espaço ISO ou side-view

let mapMinZoom = CONFIG.ZOOM_MIN;
let sideViewActive = false;

export function setMapZoomMin(value) {
  mapMinZoom = Number.isFinite(value) ? Math.max(CONFIG.ZOOM_MIN, Math.min(CONFIG.ZOOM_MAX, value)) : CONFIG.ZOOM_MIN;
  camera.zoom = Math.max(camera.zoom, mapMinZoom);
  camera.targetZoom = Math.max(camera.targetZoom, mapMinZoom);
}

export function setCameraSideView(active) {
  sideViewActive = !!active;
}

export function isSideViewCamera() {
  return sideViewActive;
}

const HW = CONFIG.TILE_W / 2;
const HH = CONFIG.TILE_H / 2;
const TILE_W = CONFIG.TILE_W;

// ---- Constantes Side-View (2.5D Sci-Fi) ----
// wx mapeia horizontalmente (64 px por unidade);
// wy mapeia na profundidade da passarela (menor wy = mais ao fundo / mais alto na tela;
// maior wy = mais perto da borda frontal / mais baixo na tela).
export const SIDE_DEPTH_STEP = 22;
export const SIDE_FLOOR_Y = 115;

// ---- Conversões (side-view) ----
export function svWorldToScreen(wx, wy, viewW = view.w, viewH = view.h, zoom = camera.zoom) {
  return {
    x: (wx * TILE_W - camera.x) * zoom + viewW / 2,
    y: (wy * SIDE_DEPTH_STEP - camera.y) * zoom + (viewH / 2 + SIDE_FLOOR_Y),
  };
}

export function svScreenToWorld(sx, sy, viewW = view.w, viewH = view.h, zoom = camera.zoom) {
  return {
    x: ((sx - viewW / 2) / zoom + camera.x) / TILE_W,
    y: ((sy - (viewH / 2 + SIDE_FLOOR_Y)) / zoom + camera.y) / SIDE_DEPTH_STEP,
  };
}

// ---- Conversões (isométrico + delegação automática side-view) ----
export function worldToIso(wx, wy) {
  return { x: (wx - wy) * HW, y: (wx + wy) * HH };
}
export function isoToWorld(ix, iy) {
  return { x: (ix / HW + iy / HH) / 2, y: (iy / HH - ix / HW) / 2 };
}
export function worldToScreen(wx, wy) {
  if (sideViewActive) {
    return svWorldToScreen(wx, wy, view.w, view.h, camera.zoom);
  }
  return {
    x: ((wx - wy) * HW - camera.x) * camera.zoom + view.w / 2,
    y: ((wx + wy) * HH - camera.y) * camera.zoom + view.h / 2,
  };
}
export function screenToWorld(sx, sy) {
  if (sideViewActive) {
    return svScreenToWorld(sx, sy, view.w, view.h, camera.zoom);
  }
  return isoToWorld(
    (sx - view.w / 2) / camera.zoom + camera.x,
    (sy - view.h / 2) / camera.zoom + camera.y
  );
}

// ---- Controle ----
export function setZoom(z) {
  camera.targetZoom = Math.min(CONFIG.ZOOM_MAX, Math.max(mapMinZoom, z));
}

export function snapCameraTo(wx, wy, map = null) {
  if (map) sideViewActive = !!map?.meta?.sideView;
  if (sideViewActive) {
    camera.x = wx * TILE_W;
    camera.y = wy * SIDE_DEPTH_STEP;
  } else {
    const i = worldToIso(wx, wy);
    camera.x = i.x;
    camera.y = i.y;
  }
  camera.follow = true;
}

export function updateCamera(dt, targetWx, targetWy, nado = null, map = null) {
  if (map) sideViewActive = !!map?.meta?.sideView;
  if (camera.follow) {
    if (sideViewActive) {
      // Side-view: câmera acompanha o eixo horizontal X com precisão
      // e amortiza suavemente a profundidade Y para manter o janelão espacial estável.
      const targetX = targetWx * TILE_W;
      const targetY = targetWy * SIDE_DEPTH_STEP;
      const k = 1 - Math.exp(-CONFIG.FOLLOW_SMOOTH * dt);
      camera.x += (targetX - camera.x) * k;
      camera.y += (targetY - camera.y) * k * 0.35;
    } else {
      const t = worldToIso(targetWx, targetWy);
      const k = 1 - Math.exp(-CONFIG.FOLLOW_SMOOTH * dt); // independente de FPS
      camera.x += (t.x - camera.x) * k;
      camera.y += (t.y - camera.y) * k;
    }
  }
  // Zoom é um offset transitório: roda do mouse e preferência são preservados.
  const mergulho = nado?.ativo && nado.mareAstral && nado.profundidade > 1.25;
  const fator = mergulho ? (nado.arrancada > 0 ? .96 : 1.06) : 1;
  const zoomTemporario = Math.min(CONFIG.ZOOM_MAX, Math.max(mapMinZoom, camera.targetZoom * fator));
  camera.zoom += (zoomTemporario - camera.zoom) * (1 - Math.exp(-CONFIG.ZOOM_SMOOTH * dt));
}
