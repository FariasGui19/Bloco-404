// js/game/world.js
// =====================================================================
//  WORLD
//  Ponte entre o mapa ativo, colisão e suporte aos métodos globais.
// =====================================================================

import { state } from './state.js';
import { loadMap, getCurrentMap } from './map-manager.js';
import {
  tileAt as collisionTileAt,
  isTileWalkable,
  canStandAt,
  findNearestStandable,
} from './collision.js';

export function getCurrentWorldMap() {
  return getCurrentMap();
}

export const getFloor = () => getCurrentMap();

export function tileAt(map, x, y) {
  return collisionTileAt(map, x, y);
}

// Respeita walkMask (via tileAt).
export function isWalkable(map, x, y) {
  return isTileWalkable(map, x, y);
}

// `ignore` = entidade que está testando (ex.: state.player),
// necessário para dash atravessar barreiras e para não colidir consigo.
export function canStand(map, x, y, radius, ignore = null) {
  return canStandAt(map, x, y, radius, ignore);
}

// Ponto válido mais próximo de (x, y), ou null. Use no clique no chão.
export function nearestStandable(map, x, y, radius, maxDist, ignore = null) {
  return findNearestStandable(map, x, y, radius, maxDist, ignore);
}

const MAP_IDS_SEQUENCE = [
  'hub_saguao',
  'hub_aeroporto',
  'hub_setor_anime',
];

export async function loadFloor(index) {
  state.floorIndex = index;
  const mapId = MAP_IDS_SEQUENCE[index] ?? 'hub_saguao';
  return loadMap(mapId, 'inicio');
}

export async function changeFloor(index) {
  state.floorIndex = index;
  const mapId = MAP_IDS_SEQUENCE[index] ?? 'hub_saguao';
  return loadMap(mapId, 'inicio');
} 