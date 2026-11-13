// Fauna cenográfica, determinística e sem colisão/recompensa. Mesmo trajeto
// nas duas perspectivas; números pequenos e nenhum objeto criado por quadro.
export function posicaoVidaRota(item, indice, tempo, reduzirMovimento = false) {
  const t = reduzirMovimento ? 0 : tempo;
  const fase = indice * 1.71;
  const fixa = item.tipo === 'alga';
  return { x: item.x + (fixa ? 0 : Math.sin(t * .27 + fase) * .75),
    y: item.y + (fixa ? 0 : Math.cos(t * .23 + fase) * .42),
    altura: Math.sin(t * 1.1 + fase) * .08,
    inclinacao: Math.sin(t * 1.6 + fase) * (fixa ? .06 : .035) };
}
