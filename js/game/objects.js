// js/game/objects.js
import { TILE } from '../config.js';

let propsSheet = null;
let isLoaded = false;

export function loadHubProps() {
  return new Promise((resolve) => {
    if (isLoaded) return resolve(true);
     
    propsSheet = new Image();
    propsSheet.src = 'assets/sprites/objects/hub-lobby-props.png';
    
    propsSheet.onload = () => {
      isLoaded = true;
      console.log('[OBJECTS] Sucesso! A imagem hub-lobby-props.png carregou perfeitamente.');
      resolve(true);
    };
    
    propsSheet.onerror = (err) => {
      console.error('[OBJECTS] ERRO CRÍTICO: O navegador não encontrou a imagem em assets/sprites/objects/hub-lobby-props.png', err);
      resolve(false);
    };
  });
}

export function renderObject(ctx, obj, isoToScreen) {
  if (!isLoaded || !propsSheet) {
    // Se cair aqui, a imagem ainda não terminou de baixar quando o jogo tentou desenhar
    return;
  }

  const cols = 4;
  const rows = 4;
  const cellW = propsSheet.width / cols;
  const cellH = propsSheet.height / rows;

  const col = obj.frame?.col || 0;
  const row = obj.frame?.row || 0;

  const sourceX = col * cellW;
  const sourceY = row * cellH;

  const screen = isoToScreen(obj.x, obj.y);

  const drawW = 96;
  const drawH = 96;

  ctx.drawImage(
    propsSheet,
    sourceX, sourceY, cellW, cellH,
    screen.x - drawW / 2, screen.y - drawH + 16,
    drawW, drawH
  );
}

export function isObjectSolid(map, x, y) {
  if (!map || !map.objects) return false;
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);

  for (const obj of map.objects) {
    if (obj.bloqueia && Math.floor(obj.x) === tileX && Math.floor(obj.y) === tileY) {
      return true;
    }
  }
  return false;
}