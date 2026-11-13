// Descrição compartilhada entre as duas perspectivas: sem física, aleatoriedade
// por quadro ou dependência do renderer. Rotas futuras podem fornecer suas
// próprias listas de ondas e peças submersas.
const clamp01 = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
export function estadoMar(clima) {
  const mar = clamp01(clima?.mar ?? .15), chuva = clamp01(clima?.chuva ?? 0);
  return { mar, chuva, amplitude: .45 + mar * .55, visibilidade: 1 - mar * .32 };
}
export function animacaoMar(indice, tempo, clima, reduzirMovimento = false) {
  const t = reduzirMovimento ? 0 : tempo;
  const { mar, chuva, amplitude } = estadoMar(clima);
  const fase = t * (.6 + mar * .8) + indice * 2.17;
  return { deslocamento: Math.sin(fase) * amplitude, inclinacao: Math.sin(fase * .7) * (.012 + mar * .026),
    espuma: .25 + mar * .45, chuva, fase };
}
