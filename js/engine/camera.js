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

export function updateCamera(dt, targetWx, targetWy, nado = null, map = null, cameraCtx = null) {
  if (map) sideViewActive = !!map?.meta?.sideView;
  let focusWx = targetWx;
  let focusWy = targetWy;
  let dominioZoomFactor = 1;

  if (!sideViewActive && map?.meta?.estiloSala === 'dominio_anciao') {
    const lacreAberto = !!cameraCtx?.flags?.gate_lacre_frequencia_sala;
    // Passarela do Anel: antecipa o enquadramento do Lacre de Frequência à frente da lâmina
    if (!lacreAberto && targetWx >= 5.2 && targetWx <= 10.3 && targetWy >= 3.8 && targetWy <= 8.2) {
      const pesoPassarela = Math.min(1, Math.max(0, (targetWx - 5.2) / 3.0));
      focusWx += 0.82 * pesoPassarela;
      focusWy += (6.0 - targetWy) * 0.28 * pesoPassarela;
      dominioZoomFactor *= 0.97;
    } else if (lacreAberto && targetWx >= 10.0) {
      // Câmara da Coroa: abre levemente o quadro para revelar o santuário conquistado
      focusWx += (12.2 - targetWx) * 0.22;
      focusWy += (6.0 - targetWy) * 0.25;
      dominioZoomFactor *= 0.95;
    }
    // Postura do Domínio [R]: foco tático aproximado enquanto o ponto frágil pulsa
    if ((cameraCtx?.ability?.reveal?.timeLeft ?? 0) > 0) {
      dominioZoomFactor *= 1.10;
    }
    // Golpe de Ruptura [Q]: pulso curto de impacto no instante da clivagem
    const flash = cameraCtx?.ability?.ruptureFlash;
    if (flash && flash.timeLeft > 0 && flash.duration > 0) {
      dominioZoomFactor *= 1 + 0.065 * (flash.timeLeft / flash.duration);
    }
  }

  if (!sideViewActive && map?.meta?.estiloSala === 'mare_astral') {
    const flags = cameraCtx?.flags ?? {};
    const fluxoAberto = !!flags.gate_fluxo_contido_sala;
    const observatorio = !!flags.observatorio_aquario_mare && targetWy <= 4.2 && targetWx <= 11.2;

    if (observatorio) {
      // Modo Observatório Abissal: abre o quadro sobre os janelões e o Grande Aquário Oceânico
      focusWx += (11.6 - targetWx) * 0.52;
      focusWy += (4.8 - targetWy) * 0.45;
      dominioZoomFactor *= 0.83;
    } else if (targetWx >= 13.4) {
      // Travessia do Grande Aquário Oceânico: amplia o horizonte aquático rumo ao Conduto da Enseada
      const pesoMar = Math.min(1, Math.max(0, (targetWx - 13.4) / 2.2));
      focusWx += (17.8 - targetWx) * 0.28 * pesoMar;
      focusWy += (5.8 - targetWy) * 0.24 * pesoMar;
      dominioZoomFactor *= 1 - 0.15 * pesoMar;
    } else if (targetWy <= 2.85 && targetWx >= 2.0 && targetWx <= 9.6) {
      // Galeria dos Janelões Bioluminescentes: inclina o foco para o aquário mural de águas-vivas
      const pesoGaleria = Math.min(1, Math.max(0, (2.85 - targetWy) / 1.4));
      focusWy -= 0.62 * pesoGaleria;
      focusWx += 0.30 * pesoGaleria;
      dominioZoomFactor *= 1 + 0.06 * pesoGaleria;
    } else if (!fluxoAberto && targetWx >= 5.2 && targetWx <= 10.3 && targetWy >= 3.8 && targetWy <= 8.2) {
      // Corredor de Pressão: antecipa o Fluxo Contido antes do Passo de Corrente
      const pesoFluxo = Math.min(1, Math.max(0, (targetWx - 5.2) / 3.0));
      focusWx += 0.80 * pesoFluxo;
      focusWy += (6.0 - targetWy) * 0.28 * pesoFluxo;
      dominioZoomFactor *= 0.97;
    } else if (fluxoAberto && targetWx >= 10.0 && targetWx < 13.4) {
      // Relicário de Coral + vista da Comporta do Aquário Oceânico
      focusWx += (13.4 - targetWx) * 0.26;
      focusWy += (5.8 - targetWy) * 0.22;
      dominioZoomFactor *= 0.94;
    }

    // Senso de Corrente [R]: lente de sonar tático
    if ((cameraCtx?.ability?.reveal?.timeLeft ?? 0) > 0) {
      dominioZoomFactor *= 1.09;
    }
    // Passo de Corrente [Q]: onda fluida de expansão na travessia
    const tideFlash = cameraCtx?.ability?.tideFlash;
    if (tideFlash && tideFlash.timeLeft > 0 && tideFlash.duration > 0) {
      const p = tideFlash.timeLeft / tideFlash.duration;
      dominioZoomFactor *= 1 + 0.055 * Math.sin(p * Math.PI);
    }
  }

  if (!sideViewActive && map?.meta?.estiloSala === 'nucleo_10x') {
    const flags = cameraCtx?.flags ?? {};
    const malhaAberta = !!flags.gate_malha_cinetica_sala;
    const observatorio = !!flags.observatorio_vetores_nucleo && targetWy <= 3.6 && targetWx <= 10.4;

    if (observatorio) {
      // Lente panorâmica dos anéis: revela o Eixo de Adaptação e a pista.
      focusWx += (6.4 - targetWx) * 0.48;
      focusWy += (3.4 - targetWy) * 0.42;
      dominioZoomFactor *= 0.86;
    } else if (!malhaAberta && targetWx >= 5.2 && targetWx <= 10.3 && targetWy >= 3.8 && targetWy <= 8.2) {
      // Corredor de aceleração antecipa a Malha Cinética antes do Pulso Veloz.
      const pesoPista = Math.min(1, Math.max(0, (targetWx - 5.2) / 3.0));
      focusWx += 0.82 * pesoPista;
      focusWy += (6.0 - targetWy) * 0.28 * pesoPista;
      dominioZoomFactor *= 0.97;
    } else if (malhaAberta && targetWx >= 10.0 && targetWx < 14.2) {
      // Relicário de Vetor + contrapeso: abre o quadro da câmara conquistada.
      focusWx += (12.6 - targetWx) * 0.24;
      focusWy += (6.0 - targetWy) * 0.22;
      dominioZoomFactor *= 0.95;
    } else if (malhaAberta && targetWx >= 14.2) {
      // Eclusa de manutenção: antecipa o Viaduto dos Vetores a leste.
      const pesoEclusa = Math.min(1, Math.max(0, (targetWx - 14.2) / 2.0));
      focusWx += 0.70 * pesoEclusa;
      dominioZoomFactor *= 1 - 0.06 * pesoEclusa;
    }

    // Eco Scan [R]: lente tática de leitura; Forma Veloz [Q]: pulso de avanço.
    if ((cameraCtx?.ability?.reveal?.timeLeft ?? 0) > 0) dominioZoomFactor *= 1.10;
    if (cameraCtx?.ability?.dash && cameraCtx?.ability?.active === 'forma_veloz') dominioZoomFactor *= 1.05;
    // Quebra Sistemas: o quadro pesa junto com o corpo.
    if (cameraCtx?.form === 'forma_bruta') dominioZoomFactor *= 0.97;
    const massFlash = cameraCtx?.ability?.massFlash;
    if (massFlash && massFlash.timeLeft > 0 && massFlash.duration > 0) {
      const p = massFlash.timeLeft / massFlash.duration;
      dominioZoomFactor *= 1 + 0.07 * Math.sin(p * Math.PI);
    }
    const tideFlash = cameraCtx?.ability?.tideFlash;
    if (tideFlash && tideFlash.timeLeft > 0 && tideFlash.duration > 0) {
      const p = tideFlash.timeLeft / tideFlash.duration;
      dominioZoomFactor *= 1 + 0.05 * Math.sin(p * Math.PI);
    }
  }

  if (camera.follow) {
    if (sideViewActive) {
      // Side-view: câmera acompanha o eixo horizontal X com precisão
      // e amortiza suavemente a profundidade Y para manter o janelão espacial estável.
      const targetX = focusWx * TILE_W;
      const targetY = focusWy * SIDE_DEPTH_STEP;
      const k = 1 - Math.exp(-CONFIG.FOLLOW_SMOOTH * dt);
      camera.x += (targetX - camera.x) * k;
      camera.y += (targetY - camera.y) * k * 0.35;
    } else {
      const t = worldToIso(focusWx, focusWy);
      const k = 1 - Math.exp(-CONFIG.FOLLOW_SMOOTH * dt); // independente de FPS
      camera.x += (t.x - camera.x) * k;
      camera.y += (t.y - camera.y) * k;
    }
  }
  // Zoom é um offset transitório: roda do mouse e preferência são preservados.
  const mergulho = nado?.ativo && nado.mareAstral && nado.profundidade > 1.25;
  const fatorBase = mergulho ? (nado.arrancada > 0 ? .96 : 1.06) : 1;
  const fator = fatorBase * dominioZoomFactor;
  const zoomTemporario = Math.min(CONFIG.ZOOM_MAX, Math.max(mapMinZoom, camera.targetZoom * fator));
  camera.zoom += (zoomTemporario - camera.zoom) * (1 - Math.exp(-CONFIG.ZOOM_SMOOTH * dt));
}
