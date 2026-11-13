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

// Pesos contínuos ligados ao mesmo clima que afeta física e visibilidade.
// Fase e posição não dependem de Math.random nem de alocação de partículas.
export function detalhesDoMar(indice, tempo, clima, neblina = 0, reduzirMovimento = false) {
  const t = reduzirMovimento ? 0 : tempo;
  const mar = clamp01(clima?.mar ?? .15), vento = clamp01(clima?.vento ?? .35), chuva = clamp01(clima?.chuva);
  const fase = indice * 2.17 + t * (.28 + vento * .35);
  return { fase, deslocamento: Math.sin(fase)*(.4+mar),
    calmo: (1-mar)*.22, vento: vento*.25, ressaca: Math.max(0,(mar-.4)/.6)*.38,
    chuva: chuva*.35, neblina: clamp01(neblina)*.22,
    direcao: Number.isFinite(clima?.direcao) ? clima.direcao : 0 };
}
