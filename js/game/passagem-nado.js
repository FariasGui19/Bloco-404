// Travessias de água são zonas físicas, não prompts. Ar e profundidade
// permanecem no player durante loadMap; a troca ainda usa o fade do jogo.
import { state } from './state.js';
import { usePortal, isPortalLocked } from './portals.js';

let mapaAnterior = null;
const desarmados = new Set();
export function atualizarPassagemNado() {
  const map = state.world.currentMap, player = state.player;
  if (!map || !player) return false;
  const portas = (state.portals ?? []).filter(p => p.automaticoNado);
  const distancia = p => Math.hypot(player.x - (p.x + .5), player.y - (p.y + .5));
  if (map !== mapaAnterior) {
    mapaAnterior = map; desarmados.clear();
    for (const p of portas) if (distancia(p) <= (p.raioAutomatico ?? 1) + .4) desarmados.add(p.id);
  }
  for (const p of portas) {
    const raio = p.raioAutomatico ?? 1, d = distancia(p);
    if (d > raio + .4) desarmados.delete(p.id);
    if (d > raio || desarmados.has(p.id) || !player.nado?.ativo || state.world.isLoading || isPortalLocked()) continue;
    if (p.requiresFlag && state.progress.flags?.[p.requiresFlag] !== true) continue;
    if (p.requiresArchetype && state.progress.archetype !== p.requiresArchetype) continue;
    desarmados.add(p.id);
    return usePortal(p);
  }
  return false;
}
