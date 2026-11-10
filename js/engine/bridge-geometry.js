// Centro e pontas visuais da travessia, calculados a partir do deck real.
// object está em coordenadas runtime (centro do tile), como o hitbox.
export function bridgeThresholdGeometry(rows, object, axis) {
  const alongX = axis === 'x';
  const cx = Math.floor(object.x), cy = Math.floor(object.y);
  const bridge = alongX ? 'B' : 'b';
  const cell = n => alongX ? rows?.[n]?.[cx] : rows?.[cy]?.[n];
  const initial = alongX ? cy : cx;
  if (cell(initial) !== bridge) return null;
  let first = initial, last = initial;
  while (cell(first - 1) === bridge) first--;
  while (cell(last + 1) === bridge) last++;
  const min = first + .08, max = last + .92;
  return alongX
    ? { x: object.x, y: (min + max) / 2, halfWidth: (max - min) / 2 }
    : { x: (min + max) / 2, y: object.y, halfWidth: (max - min) / 2 };
}

// Identidade dos obstáculos. As rotas compartilhadas exibem as duas leituras,
// sem fingir que um gate é exclusivo de um arquétipo que não exige.
export const BRIDGE_GATE_PROFILES = Object.freeze({
  rocha_rachada: { axis: 'x', kind: 'dominio' },
  teleferico_quebrado: { axis: 'y', kind: 'bio' },
  travessia_mare_eco: { axis: 'x', kind: 'mare_nucleo' },
  passagem_mare_eco: { axis: 'y', kind: 'mare_nucleo' },
  caverna_alagada: { axis: 'y', kind: 'mare' },
  fenda_estreita: { axis: 'x', kind: 'nucleo' },
});
export function bridgeGateGeometry(rows, object) {
  const profile = BRIDGE_GATE_PROFILES[object?.id];
  if (!profile) return null;
  const center = bridgeThresholdGeometry(rows, object, profile.axis);
  return center ? { ...center, ...profile } : null;
}
