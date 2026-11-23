// Maré Cromática — lote 7: a baía como fita de terror.
//
// Presentation layer: a hanging work lamp, the heavy door material and the
// large echo portal. Textures live in the mission renderer; this module keeps
// the interactive lamp independent from the mission model.
export const lote7Props = Object.freeze([
  { id: 'lampada7', x: 16.6, y: 20.4, art: 'lampada-industrial', scale: 0.62, r: 0.16, kind: 'lote7-lamp', label: 'Lâmpada de serviço' },
]);

// Broken service partitions: they cut sightlines and create chokepoints without
// inventing a maze or blocking any authored interaction. The gap in the south
// wall is the only entrance from the spawn ledge.
export const lote7Walls = Object.freeze([
  [1, 27, 7, 1],
  [11, 27, 2, 1],
  [18, 27, 5, 1],
  [26, 27, 4, 1],
  [13, 25, 1, 3],
  [18, 25, 1, 3],
  [2, 13, 1, 5],
  [29, 8, 1, 7],
  [11, 11, 4, 1],
  [20, 16, 3, 1],
  [6, 17, 3, 1],
  [24, 20, 1, 2],
  [14, 23, 1, 2],
  [8, 13, 3, 1],
  [21, 15, 3, 1],
  [12, 17, 2, 1],
  [20, 17, 2, 1],
  [15, 18, 1, 1],
  [17, 19, 1, 1],
  [14, 20, 1, 1],
  [18, 20, 1, 1],
  [8, 18, 2, 1],
  [14, 13, 3, 1],
  [19, 24, 3, 1],
  [10, 20, 1, 1],
  [22, 20, 1, 1],
]);

// Non-blocking set dressing: silhouette, rust and clutter at knee height.
export const lote7Decor = Object.freeze([
  { x: 15.4, y: 26.6, art: 'caixa-sinal', scale: 0.5 },
  { x: 16.7, y: 25.2, art: 'tubo-vapor', scale: 0.45 },
  { x: 17.7, y: 28.2, art: 'cabo-energia', scale: 0.45 },
  { x: 12.6, y: 25.4, art: 'residuo', scale: 0.42 },
  { x: 23.2, y: 26.7, art: 'caixa-sinal', scale: 0.58 },
  { x: 25.8, y: 25.1, art: 'tubo-vapor', scale: 0.4 },
  { x: 4.5, y: 24.8, art: 'lanterna-sinal', scale: 0.34 },
  { x: 15.2, y: 26.2, art: 'lanterna-sinal', scale: 0.34 },
  { x: 28.4, y: 19.4, art: 'residuo', scale: 0.48 },
  { x: 23.3, y: 19.2, art: 'caixa-sinal', scale: 0.56 },
  { x: 27.1, y: 20.6, art: 'tubo-vapor', scale: 0.42 },
  { x: 23.4, y: 20.3, art: 'lanterna-sinal', scale: 0.3 },
]);

export const isInteractiveLote7 = (prop) => Boolean(prop && prop.kind?.startsWith('lote7-'));

export function useLote7(m, prop) {
  if (!isInteractiveLote7(prop)) return null;
  if (Math.hypot(m.x - prop.x, m.y - prop.y) > 1.8) return 'A lâmpada balança fora do alcance.';
  const flags = (m.p.lote7 ??= {});
  flags.lampada = !flags.lampada;
  return flags.lampada
    ? 'LÂMPADA DE SERVIÇO — o filamento acorda e a baía ganha um cone de luz sujo. Algo recua para fora do círculo.'
    : 'LÂMPADA APAGADA — o zumbido cai. A escuridão volta a ficar mais perto do que as paredes.';
}

export const lampOn = (m) => Boolean(m?.p?.lote7?.lampada);
export const lote7Readout = (m) => `LUZ ${lampOn(m) ? 'ON' : 'OFF'}`;
