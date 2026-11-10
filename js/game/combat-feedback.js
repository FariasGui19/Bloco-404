// =====================================================================
// FEEDBACK DE COMBATE
//
// Lista curta de textos flutuantes (dano, crítico, XP). Vive só em memória:
// nada disso entra no save. O renderer desenha; o combate apenas empilha.
// =====================================================================

const items = [];
const MAX_ITEMS = 24;

export function pushCombatText(x, y, text, options = {}) {
  items.push({
    x: x + (Math.random() - .5) * .18,
    y,
    text,
    color: options.color ?? '#f4fff5',
    crit: Boolean(options.crit),
    kind: options.kind ?? 'damage',
    life: options.duration ?? .9,
    duration: options.duration ?? .9,
  });
  if (items.length > MAX_ITEMS) items.shift();
  return items[items.length - 1];
}

export function updateCombatFeedback(dt) {
  for (const item of items) item.life -= dt;
  for (let i = items.length - 1; i >= 0; i--) {
    if (items[i].life <= 0) items.splice(i, 1);
  }
}

export function listCombatFeedback() {
  return items;
}

export function clearCombatFeedback() {
  items.length = 0;
}
