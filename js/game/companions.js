// Fundação isolada e opt-in: não instancia pets nem altera saves ou colisões do jogo.
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

// Protótipo de movimento, NÃO ligado ao mundo. O integrador deve fornecer
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
