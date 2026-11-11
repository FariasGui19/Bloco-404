// Locomoção angular independente da câmera/renderizador. As coordenadas X/Y
// continuam sendo as do mapa; profundidade é um terceiro eixo limitado pelo
// leito. Assim outras perspectivas podem reutilizar a mesma física/colisão.
export function iniciarVoo(nado) {
  const x = nado.dirX ?? 0, y = nado.dirY ?? 1;
  return { heading: Math.atan2(y, x), profundidadeAlvo: Math.max(1.3, nado.profundidade), pitch: 0, roll: 0, giro: 0 };
}

export function atualizarVoo(voo, controles, dt) {
  const tempo = Math.max(0, Math.min(.05, dt));
  const giro = (controles.direita ? 1 : 0) - (controles.esquerda ? 1 : 0);
  const vertical = (controles.descer ? 1 : 0) - (controles.subir ? 1 : 0);
  // A entrada e a saída da curva têm amortecimento, sem perder o controle.
  voo.giro ??= 0;
  voo.giro += (giro * 2.0 - voo.giro) * (1 - Math.exp(-9 * tempo));
  voo.heading += voo.giro * tempo;
  voo.profundidadeAlvo = Math.max(.9, Math.min(2, voo.profundidadeAlvo + vertical * .8 * tempo));
  const k = 1 - Math.exp(-4 * tempo);
  voo.roll += (-giro * .35 - voo.roll) * k;
  voo.pitch += (vertical * .3 - voo.pitch) * k;
  return { x: Math.cos(voo.heading), y: Math.sin(voo.heading), ativo: vertical > 0, subir: voo.profundidadeAlvo <= 1.30 && vertical < 0 };
}
