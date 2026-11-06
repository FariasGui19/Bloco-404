// js/game/portals.js
// =====================================================================
// PORTALS
//
// Executa viagens entre mapas.
//
// Proteções:
// - impede viagens simultâneas;
// - evita acionar portal de retorno imediatamente ao chegar;
// - só revela o novo mapa depois que loadMap termina.
// =====================================================================

import { loadMap } from './map-manager.js';
import { playTransition, hideTransition } from '../ui/transition.js';
import { state } from './state.js';

// Tempo mínimo em milissegundos antes de outro portal poder ser usado.
// Evita "teleporte ping-pong" ao nascer muito perto de um portal.
const PORTAL_LOCK_TIME = 700;

export function isPortalLocked() {
  return performance.now() < (state.world.portalLockUntil ?? 0);
}

export function lockPortals(duration = PORTAL_LOCK_TIME) {
  state.world.portalLockUntil = performance.now() + duration;
}

export async function usePortal(portal) {
  if (!portal) return false;

  if (state.world.isLoading) return false;

  if (isPortalLocked()) {
    return false;
  }

  if (portal.bloqueado) {
    return false;
  }

  if (!portal.destino?.mapId) {
    console.warn(
      `[PORTAL] Portal '${portal.id}' não possui destino.`
    );

    return false;
  }

  console.log(
    `[PORTAL] '${portal.id}' → '${portal.destino.mapId}'`
  );

  // Trava imediatamente antes de começar a viagem.
  lockPortals();

  try {
    const message = portal.label
      ? `VIAJANDO PARA:\n${portal.label}`
      : 'VIAJANDO...';

    await playTransition(message);

    const loaded = await loadMap(
      portal.destino.mapId,
      portal.destino.spawnId ?? 'inicio'
    );

    if (!loaded) {
      console.error(
        `[PORTAL] Não foi possível carregar '${portal.destino.mapId}'.`
      );

      return false;
    }

    // Pequena pausa visual para o mapa estabilizar.
    await new Promise(resolve => setTimeout(resolve, 140));

    // Mantém a trava por mais um curto período após chegar.
    lockPortals(550);

    return true;
  } catch (error) {
    console.error('[PORTAL] Erro durante viagem:', error);

    return false;
  } finally {
    await hideTransition();
  }
} 