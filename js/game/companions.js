// Espécies e movimento: o vínculo de Lúmeo é opcional; os demais permanecem conceitos.
// Bolt representa o cachorro do criador; a autorização/obtenção será definida depois.
export const COMPANION_SPECIES = Object.freeze({
  bolt: Object.freeze({ name: 'Bolt', kind: 'cão', art: null, availability: 'private-future' }),
  lumeo: Object.freeze({ name: 'Lúmeo', kind: 'eco luminoso', art: null, availability: 'concept' }),
  marujo: Object.freeze({ name: 'Marujo', kind: 'eco anfíbio', art: null, availability: 'concept' }),
  trisco: Object.freeze({ name: 'Trisco', kind: 'eco mineral', art: null, availability: 'concept' }),
});

export function createCompanion(speciesId, owner) {
  if (!Object.hasOwn(COMPANION_SPECIES, speciesId) || !Number.isFinite(owner?.x) || !Number.isFinite(owner?.y)) return null;
  return { speciesId, x: owner.x, y: owner.y, facing: 'down', moving: false };
}

// Movimento isolado: o integrador deve fornecer
// teste de trajetória/colisão; sem ele o companheiro permanece parado.
export function updateCompanion(companion, owner, dt, canMove) {
  if (!companion || !Number.isFinite(owner?.x) || !Number.isFinite(owner?.y) || typeof canMove !== 'function') return;
  const dx = owner.x - companion.x, dy = owner.y - companion.y, distance = Math.hypot(dx, dy);
  companion.moving = false;
  if (distance <= 1.1 || !Number.isFinite(dt) || dt <= 0) return;
  const step = Math.min(distance - 1.1, 1.8 * dt, .08);
  const x = companion.x + dx / distance * step, y = companion.y + dy / distance * step;
  if (!canMove(companion.x, companion.y, x, y)) return;
  companion.x = x; companion.y = y; companion.moving = true;
  const sx = dx - dy, sy = dx + dy;
  companion.facing = Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'right' : 'left') : (sy > 0 ? 'down' : 'up');
}

// Vínculo persistido em flags; posição é somente runtime e reinicia com o mapa.
export function updateOwnedCompanion(state, map, dt, canStandAt) {
  if (!map || typeof canStandAt !== 'function') { state.companion = null; return; }
  const id = state.progress?.companions?.active ?? (state.progress?.flags?.companheiro_lumeo ? 'lumeo' : null);
  if (!id || (id === 'lumeo' && !state.progress?.flags?.companheiro_lumeo) || !['bolt', 'lumeo'].includes(id)) { state.companion = null; return; }
  const player = state.player;
  if (!state.companion || state.companion.mapId !== map.id || state.companion.speciesId !== id) {
    const pet = { ...createCompanion(id, player), mapId: map.id, renderType: 'companion', blocked: 0 };
    for (const [dx, dy] of [[-.8, 0], [0, .8], [.8, 0], [0, -.8]]) {
      if (canStandAt(map, player.x + dx, player.y + dy, .15, pet)) { pet.x += dx; pet.y += dy; break; }
    }
    state.companion = pet;
  }
  const pet = state.companion;
  const previous = { x: pet.x, y: pet.y };
  updateCompanion(pet, player, dt, (_x, _y, x, y) => canStandAt(map, x, y, .15, pet));
  const distance = Math.hypot(player.x - pet.x, player.y - pet.y);
  pet.blocked = distance > 1.5 && pet.x === previous.x && pet.y === previous.y ? pet.blocked + dt : 0;
  // Reencontro apenas em uma posição comprovadamente segura; não atravessa paredes.
  if ((pet.blocked > 4 || distance > 8) && canStandAt(map, player.x, player.y, .15, pet)) {
    pet.x = player.x; pet.y = player.y; pet.blocked = 0;
  }
}
