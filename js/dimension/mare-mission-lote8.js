// Maré Cromática — lote 8: a orla ganha ofício.
//
// Dez props autorais (desenhados em tools/preparar-mare-lote8.py) espalhados
// pelo pátio, píer e praia. Só a concha cromática é interativa: o resto é
// cenário de silhueta, com altura e sombra próprias no renderer 3D.
export const lote8Names = Object.freeze([
  "boia-sinalizadora",
  "guindaste-baia",
  "rede-pesca",
  "caixa-energia",
  "tubo-corrosivo",
  "placa-ferrugem",
  "concha-cromatica",
  "coral-magenta",
  "poste-luz",
  "caixote-madeira",
]);

export const lote8Props = Object.freeze([
  {
    id: "concha8",
    x: 19.4,
    y: 23.6,
    art: "concha-cromatica",
    scale: 0.82,
    r: 0.46,
    kind: "lote8-concha",
    label: "Concha cromática",
  },
]);

export const lote8Decor = Object.freeze([
  { x: 8.2, y: 27.2, art: "guindaste-baia", scale: 1.1 },
  { x: 9.4, y: 26.0, art: "caixote-madeira", scale: 0.9 },
  { x: 24.6, y: 25.0, art: "caixote-madeira", scale: 0.8 },
  { x: 21.8, y: 26.9, art: "rede-pesca", scale: 0.95 },
  { x: 19.2, y: 21.4, art: "caixa-energia", scale: 0.75 },
  { x: 5.2, y: 22.8, art: "tubo-corrosivo", scale: 0.7 },
  { x: 14.4, y: 24.6, art: "placa-ferrugem", scale: 0.9 },
  { x: 26.8, y: 22.2, art: "poste-luz", scale: 1.2 },
  { x: 3.4, y: 20.2, art: "coral-magenta", scale: 0.7 },
  { x: 21.0, y: 18.8, art: "coral-magenta", scale: 0.6 },
  { x: 12.6, y: 20.6, art: "boia-sinalizadora", scale: 0.65 },
]);

export const isInteractiveLote8 = (prop) => Boolean(prop && prop.kind?.startsWith("lote8-"));

export function conchaRegistrada(m) {
  return Boolean(m?.p?.lote8?.concha);
}

export function useLote8(m, prop) {
  if (!isInteractiveLote8(prop)) return null;
  if (Math.hypot(m.x - prop.x, m.y - prop.y) > 1.7)
    return "A concha brilha fora do alcance.";
  const flags = (m.p.lote8 ??= {});
  if (flags.concha)
    return "CONCHA CROMÁTICA — a espiral já está registrada. O eco continua girando.";
  flags.concha = true;
  return "CONCHA CROMÁTICA — a espiral devolve a maré em cores que não existem. O eco registra 66.6 Hz.";
}

export function lote8Readout(m) {
  return `CONCHA ${conchaRegistrada(m) ? "1/1" : "0/1"}`;
}
