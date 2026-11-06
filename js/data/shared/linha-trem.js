// js/data/shared/linha-trem.js
// =====================================================================
// LINHA DO TREM (trilho + trem + totem de embarque)
//
// Overrides aceitos:
//   over.trilho  -> sobrescreve campos do trilho
//   over.trem    -> sobrescreve campos do trem
//   over.totem   -> sobrescreve campos do totem
//   over.global  -> { x, y } soma ajusteX/ajusteY em trilho + trem juntos
//                   (o totem fica de fora porque está preso ao chão)
//
// Exemplo (mapa da praia):
//   ...linhaDoTrem({
//     global: { y: 6 },
//     trilho: { larguraPx: 390, ajusteX: 9, ajusteY: 31.5 },
//   })
// =====================================================================
export function linhaDoTrem(over = {}) {
  const gx = over.global?.x ?? 0;
  const gy = over.global?.y ?? 0;

  const lista = [
    {
      id: 'trilho_dimensional_principal',
      tipo: 'trilho_dimensional',
      x: 7.1, y: 2.0,
      sprite: 'dimensional_rail_strip',
      frame: { col: 0, row: 0 },
      useCrop: true,
      camada: 'fundo',
      ordem: 0,
      larguraPx: 430,
      pivotX: 0.5,
      pivotY: 0.5,
      ajusteX: -30,
      ajusteY: 12,
      skewY: 0.14,
      bloqueia: false,
      ...over.trilho,
    },
    {
      id: 'trem_dimensional',
      tipo: 'trem',
      x: 7.1, y: 2.0,
      sprite: 'dimensional_train',
      frame: { col: 0, row: 0 },
      useCrop: true,
      camada: 'fundo',
      ordem: 1,
      larguraPx: 375,
      pivotX: 0.5,
      pivotY: 1.0,
      ajusteX: 12.5,
      ajusteY: 58,
      skewY: 0.18,
      espelhar: true,
      bloqueia: false,
      ...over.trem,
    },
    {
      id: 'terminal_embarque_trem',
      tipo: 'terminal_embarque',
      x: 7.45, y: 3.35,
      sprite: 'train_boarding_terminal',
      frame: { col: 0, row: 0 },
      useCrop: true,
      larguraPx: 85,
      pivotY: 1.0,
      ajusteY: 20,
      bloqueia: true,
      hitbox: { offsetX: -0.28, offsetY: -0.28, width: 0.56, height: 0.56 },
      brilho: { cor: '#35E6D3', raio: 1.5, forca: 0.34 },
      ...over.totem,
    },
  ];

  // Desloca só trilho e trem (camada 'fundo'); o totem fica onde está.
  return lista.map(o =>
    o.camada === 'fundo'
      ? { ...o, ajusteX: (o.ajusteX ?? 0) + gx, ajusteY: (o.ajusteY ?? 0) + gy }
      : o
  );
} 