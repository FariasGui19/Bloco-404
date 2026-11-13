// js/game/map-manager.js
// =====================================================================
//  MAP MANAGER
//  Carrega os mapas e padroniza a posição no centro do tile (+0.5).
// =====================================================================

import { WORLD_REGISTRY } from '../data/world-registry.js';
import { state } from './state.js';
import { snapCameraTo, setMapZoomMin } from '../engine/camera.js';
import { createActorRuntime } from './actors.js';
import { createCoastalFauna } from './fauna-costeira.js';
import { createTrainingTargets } from './combat.js';
import { createHazards } from './hazards.js';
import { rememberMapLocation } from './save.js';
import { applyGateStates } from './gates.js';
import { startQuest, recordQuestEvent } from './quests.js';
import { reachFirstRoute } from './frequencia-quest.js';

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

// Ponto seguro do mapa atual: spawn declarado ou o primeiro tile livre.
export function getSafeSpawn() {
  const map = state.world.currentMap;
  if (!map) return null;
  const point = map.spawnPoints?.[state.world.currentSpawnId] ?? map.spawnPoints?.inicio ?? findDefaultSpawn(map.layout);
  return { x: point.x, y: point.y };
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
    state.companion = null; // posição do vínculo é runtime, não atravessa saves/mapas
    state.fauna = createCoastalFauna(mapData);
    state.trainingTargets = createTrainingTargets(mapData);
    state.hazards = createHazards(mapData);
    state.player.combat = null;
    // Uma ação não atravessa a eclusa: nada de marretada pendente disparar
    // no mapa seguinte depois de um Q dado durante a transformação.
    if (state.player.ability) {
      state.player.ability.cast = null;
      state.player.ability.queuedSmash = null;
    }
    state.objects = [];
    state.portals = [];
    state.collectibles = [];
    // Prompts e gestos são efêmeros; nunca atravessam a troca de mapa.
    state.interaction.encontroMare = null;
    state.interaction.faunaPronta = null;
    state.player.mareAcao = null;

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
    // O rastro está em coordenadas do mapa anterior; fôlego e nado ficam.
    p._esteira = [];

    setMapZoomMin(mapData.meta?.minZoom);
    snapCameraTo(p.x, p.y, mapData);
    if (mapData.id === 'ilha_praia_inicial' && state.progress) {
      state.progress.flags ??= {};
      state.progress.flags.visitou_praia_inicial = true;
    }
    if (mapData.id === 'sala_bio_forja' && state.progress?.archetype === 'motor_bio_forja') {
      if (!state.progress.questLog?.forja_do_propulsor) {
        startQuest(state.progress, 'forja_do_propulsor');
        const fl = state.progress.flags ?? {};
        if (fl.bio_placa_diagnostico) recordQuestEvent(state.progress, { type: 'diagnose', target: 'bio_placa_diagnostico' });
        if (fl.gate_grade_impeto_vivo) recordQuestEvent(state.progress, { type: 'breach_gate', target: 'grade_impeto_vivo' });
        if (fl.collected_fragmento_eco_bio) recordQuestEvent(state.progress, { type: 'collect', target: 'fragmento_eco_bio' });
        if (fl.oficina_bio_sincronizada) recordQuestEvent(state.progress, { type: 'sync_forge', target: 'maquina_bio' });
      }
    }
    if (mapData.id === 'sala_dominio' && state.progress?.archetype === 'lamina_dominio_anciao') {
      if (!state.progress.questLog?.prova_da_ruptura) {
        startQuest(state.progress, 'prova_da_ruptura');
        const fl = state.progress.flags ?? {};
        if (fl.scan_lacre_sala) recordQuestEvent(state.progress, { type: 'diagnose', target: 'scan_lacre_sala' });
        if (fl.gate_lacre_frequencia_sala) recordQuestEvent(state.progress, { type: 'breach_gate', target: 'lacre_frequencia_sala' });
        if (fl.collected_fragmento_eco_dominio) recordQuestEvent(state.progress, { type: 'collect', target: 'fragmento_eco_dominio' });
        if (fl.santuario_dominio_consagrado) recordQuestEvent(state.progress, { type: 'consecrate_blade', target: 'pedestal_lamina' });
      }
    }
    if (mapData.id === 'sala_mare' && state.progress?.archetype === 'mare_astral') {
      if (!state.progress.questLog?.calibragem_de_corrente) {
        startQuest(state.progress, 'calibragem_de_corrente');
        const fl = state.progress.flags ?? {};
        if (fl.scan_fluxo_sala) recordQuestEvent(state.progress, { type: 'diagnose', target: 'scan_fluxo_sala' });
        if (fl.gate_fluxo_contido_sala) recordQuestEvent(state.progress, { type: 'breach_gate', target: 'fluxo_contido_sala' });
        if (fl.collected_fragmento_eco_mare) recordQuestEvent(state.progress, { type: 'collect', target: 'fragmento_eco_mare' });
        if (fl.darsena_mare_sincronizada) recordQuestEvent(state.progress, { type: 'sync_tide', target: 'gerador_corrente' });
      }
    }
    if (mapData.id === 'sala_nucleo' && state.progress?.archetype === 'nucleo_dez_forma') {
      const entry = state.progress.questLog?.sincronia_dos_vetores;
      if (!entry || entry.status !== 'completed') {
        startQuest(state.progress, 'sincronia_dos_vetores');
        const fl = state.progress.flags ?? {};
        if (fl.scan_malha_sala) recordQuestEvent(state.progress, { type: 'diagnose', target: 'scan_malha_sala' });
        if (fl.gate_malha_cinetica_sala) recordQuestEvent(state.progress, { type: 'breach_gate', target: 'malha_cinetica_sala' });
        if (fl.collected_fragmento_eco_nucleo) recordQuestEvent(state.progress, { type: 'collect', target: 'fragmento_eco_nucleo' });
        if (fl.base_vetores_sincronizada) recordQuestEvent(state.progress, { type: 'sync_vectors', target: 'nucleo_adaptacao' });
      }
    }
    if (mapData.id === 'viaduto_dos_vetores' && state.progress) {
      state.progress.flags ??= {};
      state.progress.flags.visitou_viaduto_vetores = true;
    }
    reachFirstRoute(state.progress, mapData.id);
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