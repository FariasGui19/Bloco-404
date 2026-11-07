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
