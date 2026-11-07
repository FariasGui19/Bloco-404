// js/game/map-manager.js
// =====================================================================
//  MAP MANAGER
//  Carrega os mapas e padroniza a posição no centro do tile (+0.5).
// =====================================================================

import { WORLD_REGISTRY } from '../data/world-registry.js';
import { state } from './state.js';
import { snapCameraTo } from '../engine/camera.js';
import { createActorRuntime } from './actors.js';
import { createCoastalFauna } from './fauna-costeira.js';
import { rememberMapLocation } from './save.js';
import { applyGateStates } from './gates.js';

function findDefaultSpawn(layout) {
  const height = layout.length;
  const width = layout[0]?.length ?? 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (layout[y][x] !== 1) {
        return { x: x + 0.5, y: y + 0.5 };
      }
    }
  }

  return { x: 1.5, y: 1.5 };
}

export async function loadMap(mapId, spawnId = 'inicio') {
  const mapEntry = WORLD_REGISTRY[mapId];

  if (!mapEntry) {
    console.error(`[MAP MANAGER] O mapa '${mapId}' não foi encontrado no WORLD_REGISTRY.`);
    return false;
  }

  if (state.world.isLoading) return false;
  state.world.isLoading = true;

  try {
    const module = await mapEntry.load();
    const mapData = module.map;

    if (!mapData) throw new Error(`O mapa '${mapId}' não exporta "map".`);

    state.actors = [];
    state.fauna = createCoastalFauna(mapData);
    state.objects = [];
    state.portals = [];
    state.collectibles = [];

    state.world.currentMapId = mapData.id;
    state.world.currentDimension = mapData.meta?.dimensao ?? 'unknown';
    state.world.currentMap = mapData;
    state.world.currentSpawnId = spawnId;

    // NPCs -> centro do tile
    state.actors = (mapData.actors ?? []).map(actor =>
      createActorRuntime({
        ...actor,

        // Dados do mapa usam tile inteiro.
        // Runtime usa centro do tile.
        x: actor.x + 0.5,
        y: actor.y + 0.5,

        facing: actor.facing ?? 'down',
        pose: actor.pose ?? 'idle',

        renderType: 'actor',
      })
    );

    // Objetos -> centro do tile
    state.objects = (mapData.objects ?? []).map(object => ({
      ...object,
      x: object.x + 0.5,
      y: object.y + 0.5,
      renderType: 'object',
    }));

    // Reaplica os gates persistidos sem alterar os dados originais do mapa.
    applyGateStates(state.objects);

    // Portais
    state.portals = (mapData.portals ?? []).map(portal => ({
      ...portal,
      renderType: 'portal',
    }));
    // Coletáveis -> centro do tile.
    state.collectibles = (mapData.collectibles ?? []).map(item => ({
      ...item,
      x: item.x + 0.5,
      y: item.y + 0.5,
      renderType: 'collectible',
    }));

    let spawn = mapData.spawnPoints?.[spawnId] ?? mapData.spawnPoints?.inicio ?? findDefaultSpawn(mapData.layout);

    const p = state.player;
    p.x = spawn.x;
    p.y = spawn.y;
    p.target = null;
    p.moving = false;

    snapCameraTo(p.x, p.y);
    // Salva a última localização somente se um perfil estiver ativo.
    rememberMapLocation(mapData.id, spawnId);
    return true;
  } catch (error) {
    console.error(`[MAP MANAGER] Falha ao carregar mapa '${mapId}':`, error);
    return false;
  } finally {
    state.world.isLoading = false;
  }
}

export function getCurrentMap() {
  return state.world.currentMap;
}