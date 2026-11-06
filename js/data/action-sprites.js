// Poses provisórias durante Q. As folhas não são sequências de animação.
// R mantém o sprite atual e usa apenas os efeitos visuais da varredura.
export const ACTION_SPRITES = Object.freeze({
  // Apenas a pose lateral contém espada / arrancada; outras colunas mostram punhos ou escudo.
  golpe_ruptura: Object.freeze({ sprite: 'player_dominio_reference', row: 1, rows: 2, column: 1, height: 115 }),
  passo_corrente: Object.freeze({ sprite: 'player_mare_reference', row: 1, rows: 2, column: 1, height: 115 }),
  // A terceira imagem da referência é a criatura veloz; a quarta é o orbe.
  forma_veloz: Object.freeze({ sprite: 'player_10x_reference', row: 0, rows: 1, column: 2, height: 108 }),
});
