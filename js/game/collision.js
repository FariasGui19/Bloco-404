// js/game/collision.js
// =====================================================================
//  COLISÃO
//
//  Player / NPCs / Robô = círculos.
//  Paredes e objetos = retângulos.
//
//  FONTE DA VERDADE DO CHÃO: tileAt()
//    - Se o mapa tem walkMask, ELE decide o que é chão:
//        "." = caminhável | qualquer outro caractere = bloqueado
//      (tem prioridade sobre map.layout)
//    - Sem walkMask, vale o layout normal.
//
//  PORTA ÚNICA DE MOVIMENTO: canStandAt()
//    parede/máscara + objetos sólidos + atores.
//
//  canStandAt aceita:
//    canStandAt(map, x, y, raio, ignorar)
//    canStandAt(x, y, raio, ignorar)
// =====================================================================

import { CONFIG, TILE } from '../config.js';
import { state } from './state.js';
import { getCurrentMap } from './map-manager.js';

const MAX_STEP = 0.08;
const WALKABLE_CHAR = '.';
const avisados = new Set();

const num = (value, fallback) =>
  Number.isFinite(value) ? value : fallback;

// =====================================================================
// WALK MASK
//
// walkMask: [
//   "##################",
//   "#####........#####",
// ]
//
// Linha = y, coluna = x (mesma indexação do layout).
// Fora da máscara = bloqueado.
// =====================================================================

export function isWalkMaskTileWalkable(map, tileX, tileY) {
  if (!map?.walkMask) return true;

  const row = map.walkMask[tileY];
  if (!row) return false;

  return row[tileX] === WALKABLE_CHAR;
}

// =====================================================================
// TILES
// =====================================================================

export function tileAt(map, x, y) {
  if (!map) return TILE.WALL;

  const tileX = Math.floor(x);
  const tileY = Math.floor(y);

  // Mapa com máscara: a máscara manda.
  if (map.walkMask) {
    if (!isWalkMaskTileWalkable(map, tileX, tileY)) {
      return TILE.WALL;
    }

    // Tile liberado pela máscara. Mantém tipos especiais do layout
    // (ex.: ELEVATOR) mas nunca deixa o layout re-bloquear o chão.
    const tile = map.layout?.[tileY]?.[tileX];
    return tile === undefined || tile === TILE.WALL
      ? TILE.FLOOR
      : tile;
  }

  if (!map.layout) return TILE.WALL;

  const tile = map.layout[tileY]?.[tileX];
  return tile === undefined ? TILE.WALL : tile;
}

export function isWall(map, x, y) {
  return tileAt(map, x, y) === TILE.WALL;
}

// Para clique no chão, IA de NPC etc. (não precisa conhecer walkMask).
export function isTileWalkable(map, x, y) {
  return !isWall(map, x, y);
}

// =====================================================================
// GEOMETRIA
// =====================================================================

function circleHitsRect(circleX, circleY, radius, rectX, rectY, rectW, rectH) {
  const nearestX = Math.max(rectX, Math.min(circleX, rectX + rectW));
  const nearestY = Math.max(rectY, Math.min(circleY, rectY + rectH));

  const dx = circleX - nearestX;
  const dy = circleY - nearestY;

  return (dx * dx + dy * dy) < (radius * radius);
}

// =====================================================================
// PAREDES (inclui a máscara, via tileAt)
// =====================================================================

export function hitsWall(map, x, y, radius) {
  const minX = Math.floor(x - radius);
  const maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius);
  const maxY = Math.floor(y + radius);

  for (let tileY = minY; tileY <= maxY; tileY++) {
    for (let tileX = minX; tileX <= maxX; tileX++) {
      if (!isWall(map, tileX, tileY)) continue;

      if (circleHitsRect(x, y, radius, tileX, tileY, 1, 1)) {
        return true;
      }
    }
  }

  return false;
}

// =====================================================================
// OBJETOS — HITBOXES
//
// hitbox:  { offsetX, offsetY, width, height }
// hitboxes: [ { ... }, { ... } ]
//
// Objetos espelhados no renderer (scale(-1,1)) trocam os eixos do mundo
// iso, então a hitbox também troca X<->Y.
// =====================================================================

function buildBox(object, hitbox) {
  let offsetX = num(hitbox.offsetX, -0.30);
  let offsetY = num(hitbox.offsetY, -0.30);
  let width = num(hitbox.width, 0.60);
  let height = num(hitbox.height, 0.60);

  if (object.espelhar) {
    [offsetX, offsetY] = [offsetY, offsetX];
    [width, height] = [height, width];
  }

  return {
    objectId: object.id,

    x: object.x + offsetX,
    y: object.y + offsetY,

    width,
    height,

    // Compatibilidade com ferramentas antigas.
    w: width,
    h: height,
  };
}

export function getObjectHitbox(object) {
  if (!object?.bloqueia) return null;

  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) {
    if (!avisados.has(object.id)) {
      console.warn(
        `[COLISÃO] Objeto "${object.id}" com posição inválida:`,
        object.x,
        object.y
      );
      avisados.add(object.id);
    }
    return null;
  }

  return buildBox(object, object.hitbox ?? {});
}

export function getCustomObjectHitbox(object, hitbox) {
  if (!object?.bloqueia || !hitbox) return null;

  if (!Number.isFinite(object.x) || !Number.isFinite(object.y)) {
    return null;
  }

  return buildBox(object, hitbox);
}

// =====================================================================
// BARREIRAS ATRAVESSÁVEIS POR DASH
//
// { bloqueia: true, dashPassable: true,
//   dashPassableRequiresFlag: 'cargoSecurityDiagnosed' }
//
// Só libera OBJETOS. Paredes e máscara continuam valendo no dash.
// =====================================================================

function canDashPassObject(object, ignore) {
  if (ignore !== state.player) return false;
  // As barreiras de impulso existentes foram projetadas para a Bio-Forja;
  // um dash de outro arquétipo não herda automaticamente essa capacidade.
  if (!state.player?.ability?.dash) return false;
  if (object.phaseAction || object.phaseActions) {
    const allowed = object.phaseActions ?? [object.phaseAction];
    const archetype = state.progress.archetype;
    const expected = archetype === 'mare_astral' ? 'passo_corrente' : archetype === 'nucleo_dez_forma' ? 'forma_veloz' : null;
    return !!expected && allowed.includes(expected) && state.player.ability.active === expected &&
      (!object.gate?.scanFlag || !!state.progress.flags?.[object.gate.scanFlag]) &&
      state.player.ability.dash.phaseGateId === object.id;
  }
  if (state.player.ability.active !== 'bio_dash') return false;
  if (!object.dashPassable) return false;

  if (object.dashPassableRequiresFlag) {
    return state.progress?.flags?.[object.dashPassableRequiresFlag] === true;
  }

  return true;
}

// =====================================================================
// OBJETOS — BLOQUEIO
// =====================================================================

export function getBlockingObject(x, y, radius, ignore = null, pular = null) {
  for (const object of state.objects ?? []) {
    if (!object?.bloqueia) continue;
    if (object === ignore) continue;
    // Filtro opcional de quem chama (ex.: o nadador não esbarra na trava
    // da ponte que está em cima do deque).
    if (pular && pular(object)) continue;

    // Objeto escondido por progresso não bloqueia mais.
    if (
      object.hideWhenFlag &&
      state.progress?.flags?.[object.hideWhenFlag]
    ) {
      continue;
    }

    // Bloqueia andando, libera durante dash.
    if (canDashPassObject(object, ignore)) continue;

    // Múltiplas hitboxes.
    if (Array.isArray(object.hitboxes) && object.hitboxes.length > 0) {
      for (const customHitbox of object.hitboxes) {
        const box = getCustomObjectHitbox(object, customHitbox);
        if (!box) continue;

        if (
          circleHitsRect(x, y, radius, box.x, box.y, box.width, box.height)
        ) {
          return object;
        }
      }

      // Já testou as múltiplas; não testa a hitbox simples.
      continue;
    }

    // Hitbox única.
    const box = getObjectHitbox(object);
    if (!box) continue;

    if (circleHitsRect(x, y, radius, box.x, box.y, box.width, box.height)) {
      return object;
    }
  }

  return null;
}

export function hitsSolidObject(x, y, radius, ignore = null) {
  return getBlockingObject(x, y, radius, ignore) !== null;
}

// =====================================================================
// ATORES / NPCs / ROBÔS
//
// solido: false permite atravessar aquele ator.
// =====================================================================

export function hitsActor(x, y, radius, ignore = null) {
  for (const actor of state.actors ?? []) {
    if (!actor) continue;
    if (actor === ignore) continue;
    if (actor.solido === false) continue;

    const actorRadius = actor.raio ?? CONFIG.NPC_RADIUS ?? 0.28;
    const minDistance = radius + actorRadius;

    const dx = x - actor.x;
    const dy = y - actor.y;

    if ((dx * dx + dy * dy) < (minDistance * minDistance)) {
      return true;
    }
  }

  return false;
}

// =====================================================================
// PODE FICAR NESTA POSIÇÃO?  (PORTA ÚNICA DE MOVIMENTO)
// =====================================================================

export function canStandAt(...args) {
  // canStandAt(x, y, radius, ignore)  ou
  // canStandAt(map, x, y, radius, ignore)
  if (typeof args[0] === 'number') {
    args.unshift(getCurrentMap());
  }

  const [
    map,
    x,
    y,
    radius = CONFIG.PLAYER_RADIUS ?? 0.25,
    ignore = null,
  ] = args;

  if (!map || !Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  if (hitsWall(map, x, y, radius)) return false;           // layout + walkMask
  if (hitsSolidObject(x, y, radius, ignore)) return false; // props sólidos
  if (hitsActor(x, y, radius, ignore)) return false;       // NPCs / robôs

  return true;
}

// =====================================================================
// PONTO CAMINHÁVEL MAIS PRÓXIMO
//
// Para clique no chão: se o clique caiu no vazio/parede/prop, devolve
// o ponto válido mais próximo dentro de maxDist tiles, ou null.
// =====================================================================

export function findNearestStandable(
  map,
  x,
  y,
  radius = CONFIG.PLAYER_RADIUS ?? 0.25,
  maxDist = 1.5,
  ignore = null
) {
  if (canStandAt(map, x, y, radius, ignore)) return { x, y };

  const step = 0.25;
  const maxSq = maxDist * maxDist;
  let best = null;
  let bestSq = Infinity;

  for (let dy = -maxDist; dy <= maxDist; dy += step) {
    for (let dx = -maxDist; dx <= maxDist; dx += step) {
      const sq = dx * dx + dy * dy;
      if (sq > maxSq || sq >= bestSq) continue;

      if (canStandAt(map, x + dx, y + dy, radius, ignore)) {
        best = { x: x + dx, y: y + dy };
        bestSq = sq;
      }
    }
  }

  return best;
}

// =====================================================================
// MOVIMENTO COM COLISÃO
//
// Divide movimentos grandes em passos pequenos.
// Tenta diagonal, depois deslize X, depois deslize Y.
// =====================================================================

// ---------------------------------------------------------------------
// MOVIMENTO COM ÁGUA
//
// A regra de chão continua sendo `walkMask` (via `tileAt`). A diferença é
// que água nadável conta como superfície válida: o resto da checagem
// (objetos sólidos, atores, passos pequenos, deslize) é idêntico.
//
// `nado.destinoValido` é quem sabe o que é água — colisão não importa
// `nado.js` para não criar ciclo (nado não importa colisão tampouco).
// ---------------------------------------------------------------------
//
// A BEIRA. `canStandAt` exige o corpo inteiro (raio) em chão firme e a
// água exige o CENTRO dentro do mar. Entre uma coisa e outra existe uma
// faixa da largura do raio (0,25 tile) em que o corpo não cabe mais na
// areia e o centro ainda não é mar. O passo por quadro é menor que essa
// faixa (0,067 tile a 60 FPS), então NINGUÉM entrava no mar andando: o
// operador parava a um quarto de tile da água e o nado inteiro ficava
// inalcançável no jogo de verdade.
// Na beira vale: centro em chão firme e tudo o que o corpo encosta além
// do chão é água que ESTE nadador pode entrar (rocha e vazio continuam
// sendo parede; água além do degrau também).
function naBeira(map, x, y, radius, agua) {
  if (isWall(map, Math.floor(x), Math.floor(y))) return false;
  const minX = Math.floor(x - radius), maxX = Math.floor(x + radius);
  const minY = Math.floor(y - radius), maxY = Math.floor(y + radius);
  for (let tileY = minY; tileY <= maxY; tileY++) {
    for (let tileX = minX; tileX <= maxX; tileX++) {
      if (!isWall(map, tileX, tileY)) continue;
      if (!circleHitsRect(x, y, radius, tileX, tileY, 1, 1)) continue;
      // Ponto da célula mais próximo do centro, um tico para dentro dela.
      const px = Math.max(tileX + .02, Math.min(tileX + .98, x));
      const py = Math.max(tileY + .02, Math.min(tileY + .98, y));
      if (!agua(map, px, py)) return false;
    }
  }
  return true;
}

function podeIrPara(map, x, y, radius, ignore, agua) {
  if (canStandAt(map, x, y, radius, ignore)) return true;
  if (!agua) return false;
  // Na água (ou na beira dela): não pode entrar em objeto sólido nem em
  // outro ator, mas o "chão" da grade não bloqueia.
  if (hitsActor(x, y, radius, ignore)) return false;
  if (agua(map, x, y)) {
    // TRAVA DE PONTE não é parede no mar. A caixa da trava sobra meio tile
    // para cada lado do deque (é o que impede passar andando pela beirada);
    // para quem nada, essa sobra era uma parede invisível dentro d'água.
    // Quem está na água não está no deque, então a trava continua
    // fechando a ponte para quem anda.
    return getBlockingObject(x, y, radius, ignore, ehTravaDePonte) === null;
  }
  return !hitsSolidObject(x, y, radius, ignore) && naBeira(map, x, y, radius, agua);
}

const ehTravaDePonte = object => Boolean(object.gate);

export function moveWithCollision(map, entity, dx, dy, radius, agua = null) {
  const distance = Math.hypot(dx, dy);

  if (!distance || !map) return false;

  const steps = Math.max(1, Math.ceil(distance / MAX_STEP));
  const stepX = dx / steps;
  const stepY = dy / steps;

  let moved = false;

  for (let i = 0; i < steps; i++) {
    if (podeIrPara(map, entity.x + stepX, entity.y + stepY, radius, entity, agua)) {
      entity.x += stepX;
      entity.y += stepY;
      moved = true;
      continue;
    }

    if (
      stepX !== 0 &&
      podeIrPara(map, entity.x + stepX, entity.y, radius, entity, agua)
    ) {
      entity.x += stepX;
      moved = true;
    }

    if (
      stepY !== 0 &&
      podeIrPara(map, entity.x, entity.y + stepY, radius, entity, agua)
    ) {
      entity.y += stepY;
      moved = true;
    }
  }

  return moved;
} 