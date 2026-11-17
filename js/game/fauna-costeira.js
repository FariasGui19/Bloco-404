// Fauna ambiental limitada por mapa: não participa de colisões nem de saves.
// As espécies têm territórios curtos e nunca atravessam o limite terra/água.
const aquatic = tile => tile != null && 'YyDdX'.includes(tile);
const terrestrial = tile => tile != null && 'SMT'.includes(tile);
export function faunaFootAnchor(box, frameHeight) {
  if (!box || !Number.isFinite(frameHeight) || frameHeight <= 0) return .78;
  return Math.max(0, Math.min(1, (box.y + box.h) / frameHeight));
}
const tileAt = (map, x, y) => map.aguaPraia?.[Math.floor(y)]?.[Math.floor(x)];

// Espécies que vivem NA ÁGUA. Antes só 'peixes' era aquático; com a
// fauna nova (golfinho, tartaruga) o habitat precisa saber distinguir,
// senão eles nascem na areia e são filtrados para fora do mapa.
export const ESPECIES_AQUATICAS = Object.freeze(['peixes', 'golfinho', 'tartaruga', 'arraia']);
export const ehEspecieAquatica = (s) => ESPECIES_AQUATICAS.includes(s);

export function habitatAllows(map, species, x, y) {
  const tile = tileAt(map, x, y);
  if (ehEspecieAquatica(species)) {
    // Aquático exige água em toda a pegada — golfinho na areia é bicho
    // encalhado, não fauna passeando.
    for (const dx of [-.55, 0, .55]) for (const dy of [-.55, 0, .55]) {
      if (!aquatic(tileAt(map, x + dx, y + dy))) return false;
    }
    return true;
  }
  return terrestrial(tile);
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
    // Fauna com rotina calma/interativa tolera aproximação para diálogo antes de recuar.
    const fleeRadius = a.calma ? 0.75 : (a.interacao ? 1.15 : (a.species === 'gaivota' ? 2.8 : 2.1));
    a.fleeing = distance < fleeRadius;
    // O destino de passeio muda suavemente; fuga aponta para longe do jogador.
    const radius = a.raioPasseio ?? (a.species === 'peixes' ? 0.75 : (a.calma ? 0.55 : 1.15));
    const freq = a.species === 'tartaruga' || a.species === 'capivara' ? 0.18 : 0.27;
    let tx = a.homeX + Math.sin(a.clock * freq + a.homeX) * radius;
    let ty = a.homeY + Math.cos(a.clock * freq + a.homeX) * radius;
    if (a.fleeing && distance > 0.001) {
      tx = a.homeX + dx / distance * radius;
      ty = a.homeY + dy / distance * radius;
    }
    let vx = tx - a.x, vy = ty - a.y;
    const length = Math.hypot(vx, vy);
    a.moving = length > 0.12;
    if (!a.moving) continue;
    const speed = a.fleeing ? (a.species === 'gaivota' ? 1.5 : 1.0) : (a.calma ? 0.18 : 0.25);
    const step = Math.min(length, speed * dt);
    vx = vx / length * step; vy = vy / length * step;
    // Movimento eixo a eixo permite contornar a beira do habitat.
    if (habitatAllows(map, a.species, a.x + vx, a.y)) a.x += vx;
    if (habitatAllows(map, a.species, a.x, a.y + vy)) a.y += vy;
    if (Math.abs(vx - vy) > 0.001) a.flip = vx - vy < 0;
  }
}
