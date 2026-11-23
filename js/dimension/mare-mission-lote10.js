// Maré Cromática — lote 10: animação de inimigos.
//
// Quatro poses pintadas para o afogado e quatro para o guardião. O renderer já
// prefere `${família}-${quadro}` quando o quadro existe, então a tira vira
// caminhada de verdade sem tocar na lógica de combate.
export const lote10Frames = Object.freeze({
  afogado: Object.freeze(["afogado-0", "afogado-1", "afogado-2", "afogado-3"]),
  guardiao: Object.freeze(["guardiao-0", "guardiao-1", "guardiao-2", "guardiao-3"]),
});

export const lote10Names = Object.freeze([
  ...lote10Frames.afogado,
  ...lote10Frames.guardiao,
]);

export const lote10Animated = (name) => lote10Names.includes(name);

export function lote10Readout(enemies = []) {
  const animated = enemies.filter(
    (e) => !e.dead && (e.hunter || e.guardian),
  ).length;
  return `QUADROS ${animated ? `${animated}×4` : "—"}`;
}
