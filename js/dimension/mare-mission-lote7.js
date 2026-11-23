// Maré Cromática — lote 7: a baía como fita de terror.
//
// Presentation layer: a hanging work lamp, the heavy door material and the
// large echo portal. Textures live in the mission renderer; this module keeps
// the interactive lamp independent from the mission model.
export const lote7Props = Object.freeze([
  { id: 'lampada7', x: 18.4, y: 19.6, art: 'lanterna-sinal', scale: 0.42, r: 0.16, kind: 'lote7-lamp', label: 'Lâmpada de serviço' },
]);

// Barreiras costeiras baixas e dunas: o pátio virou orla aberta. Estes
// volumes continuam com colisão (e o teste do lote 7 continua válido), mas são
// desenhados como rochas de 0,7-1,1 m, nunca como corredores de muro alto.
export const lote7Walls = Object.freeze([
  [1, 27, 7, 1],
  [11, 27, 2, 1],
  [18, 27, 5, 1],
  [26, 27, 4, 1],
  [2, 4, 1, 4],
  [28, 6, 1, 4],
  [4, 17, 2, 1],
  [24, 11, 2, 1],
  [9, 13, 2, 1],
  [20, 18, 2, 1],
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
