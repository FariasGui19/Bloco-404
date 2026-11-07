// Fauna ambiental limitada por mapa: não participa de colisões nem de saves.
// As espécies têm territórios curtos e nunca atravessam o limite terra/água.
const aquatic = tile => tile != null && 'YyDdX'.includes(tile);
const terrestrial = tile => tile != null && 'SMT'.includes(tile);
const tileAt = (map, x, y) => map.aguaPraia?.[Math.floor(y)]?.[Math.floor(x)];
export function habitatAllows(map, species, x, y) {
  const tile = tileAt(map, x, y);
  if (species !== 'peixes') return terrestrial(tile);
  // A arte do cardume é mais larga que o ponto lógico: não deixe os peixes
  // desenharem sobre uma ponte ou na areia ao seguir a borda da água.
  return [-.65, 0, .65].every(dx => [-.65, 0, .65].every(dy => aquatic(tileAt(map, x + dx, y + dy))));
}
export function createCoastalFauna(map) {
  return (map.fauna ?? []).filter(a => habitatAllows(map, a.species, a.x, a.y)).map((a, i) => ({
    ...a, homeX: a.x, homeY: a.y, clock: i * 1.37, moving: false, fleeing: false, flip: false,
    renderType: 'fauna',
  }));
}
export function updateCoastalFauna(map, animals, player, dt) {
  if (!map?.aguaPraia) return;
  dt = Math.max(0, Math.min(dt, 0.1));
  for (const a of animals) {
    a.clock += dt;
    const dx = a.x - player.x, dy = a.y - player.y;
    const distance = Math.hypot(dx, dy);
    a.fleeing = distance < (a.species === 'gaivota' ? 2.8 : 2.1);
    // O destino de passeio muda suavemente; fuga aponta para longe do jogador.
    const radius = a.species === 'peixes' ? 0.75 : 1.15;
    let tx = a.homeX + Math.sin(a.clock * 0.27 + a.homeX) * radius;
    let ty = a.homeY + Math.cos(a.clock * 0.27 + a.homeX) * radius;
    if (a.fleeing && distance > 0.001) {
      tx = a.homeX + dx / distance * radius;
      ty = a.homeY + dy / distance * radius;
    }
    let vx = tx - a.x, vy = ty - a.y;
    const length = Math.hypot(vx, vy);
    a.moving = length > 0.12;
    if (!a.moving) continue;
    const speed = a.fleeing ? (a.species === 'gaivota' ? 1.5 : 1.0) : 0.25;
    const step = Math.min(length, speed * dt);
    vx = vx / length * step; vy = vy / length * step;
    // Movimento eixo a eixo permite contornar a beira do habitat.
    if (habitatAllows(map, a.species, a.x + vx, a.y)) a.x += vx;
    if (habitatAllows(map, a.species, a.x, a.y + vy)) a.y += vy;
    if (Math.abs(vx - vy) > 0.001) a.flip = vx - vy < 0;
  }
}
