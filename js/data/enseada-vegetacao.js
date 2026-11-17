// VEGETAÇÃO DA ENSEADA — POSICIONADA À MÃO A PARTIR DO PÔSTER.
//
// O gerador automático (`tools/gerar-vegetacao-enseada.py`) foi DESLIGADO: ele
// recortava a mata numa grade fixa de 36 px e plantava o MESMO sprite em
// blocos quadrados, o que enchia as bordas de árvores clonadas e jogava
// palmeiras em cima da cachoeira e da placa "ESTAÇÃO 66.6".
//
// Aqui cada entrada é um grupo lido no pôster: coordenada do PÉ do grupo e a
// mistura de palmeiras altas, palmeiras curvas, árvores frondosas e moitas que
// existe naquele ponto da arte. Nada é plantado em cima da cachoeira, da placa
// da estação, do Pórtico Oeste ou do caminho da calçada.
//
// Chaves de sprite:
//   P = palmeira alta      M = palmeira de copa cheia   B = palmeira baixa
//   J = palmeira jovem     T = árvore frondosa        C = árvore do platô
//   D = moita densa        F = arbusto florido        G = palmeiral inteiro
export const SPRITES_VEGETACAO = {
  P: 'enseada_ne_palmeira',
  M: 'enseada_ne_palmeira_media',
  B: 'enseada_ne_palmeira_baixa',
  J: 'enseada6_palmeira',
  T: 'enseada_ne_arvores',
  C: 'enseada_camp_ref_arvore',
  D: 'enseada_ne_arbustos',
  F: 'enseada_ne_arbusto_florido',
  G: 'enseada3_palmeiral',
};

// [tipo, x, y, larguraPx] — x/y é o PÉ do sprite no mundo (projeção do motor).
export const VEGETACAO = [
  // ---------- Mata fechada da borda OESTE (pôster 120–320, 360–570) ----------
  ['T', 17.0, 55.6, 190], ['T', 18.4, 54.2, 178], ['T', 19.9, 52.6, 186],
  ['T', 16.2, 53.9, 168], ['T', 20.5, 51.0, 172], ['T', 15.4, 52.4, 176],
  ['T', 21.6, 49.8, 180], ['T', 22.6, 48.4, 168],
  ['B', 19.3, 56.2, 96], ['P', 17.9, 52.1, 80], ['J', 21.2, 50.4, 78],
  ['B', 15.9, 54.6, 92], ['P', 20.9, 53.4, 84], ['J', 18.2, 57.0, 74],

  // ---------- Palmeiras atrás e ao lado do Pórtico Oeste ----------
  ['P', 16.2, 48.6, 92], ['P', 17.4, 47.2, 88], ['B', 15.3, 47.4, 90],
  ['J', 18.3, 46.3, 76], ['P', 19.2, 45.2, 82],

  // ---------- Palmeiral em frente à piscina da capivara ----------
  ['P', 23.2, 49.4, 94], ['P', 24.4, 48.2, 90], ['B', 22.4, 47.9, 92],
  ['J', 25.2, 47.1, 78], ['P', 26.1, 46.0, 86], ['B', 24.0, 46.0, 88],
  ['P', 21.4, 46.6, 84],

  // ---------- Palmeiras do norte do platô (gramado atrás da bancada) ----------
  ['P', 12.4, 33.4, 90], ['P', 11.2, 34.8, 86], ['B', 13.4, 32.2, 88],
  ['P', 14.4, 30.8, 84], ['J', 12.8, 29.8, 74], ['P', 15.6, 29.4, 82],

  // ---------- Duas árvores de copa redonda atrás da tenda (só duas) ----------
  ['C', 23.9, 27.4, 118], ['C', 26.6, 25.2, 112],

  // ---------- Copa fechada à direita do acampamento (pôster 560–700, 100–250) ----------
  ['T', 29.0, 30.2, 176], ['T', 30.8, 28.2, 182], ['B', 28.2, 31.6, 92],
  ['P', 31.9, 26.4, 88], ['J', 29.9, 32.6, 76],

  // ---------- Palmeiras que emolduram a clareira central ----------
  ['P', 27.8, 36.4, 92], ['P', 29.2, 35.0, 88], ['B', 26.8, 37.6, 90],
  ['P', 33.8, 30.6, 94], ['P', 35.2, 29.4, 90], ['J', 32.8, 32.0, 78],
  ['B', 36.4, 28.2, 92], ['P', 37.6, 27.0, 88],

  // ---------- Palmeiras do jardim cercado / lado leste do monólito ----------
  ['P', 41.4, 30.2, 92], ['P', 42.8, 28.8, 88], ['B', 40.4, 31.8, 90],
  ['P', 44.2, 27.4, 86], ['J', 39.4, 33.0, 76],

  // ---------- Mata da encosta leste (pôster 900–1010, 300–430) ----------
  ['T', 43.0, 32.4, 174], ['T', 44.6, 34.0, 168], ['B', 41.9, 34.4, 94],
  ['P', 45.8, 35.4, 88], ['J', 42.9, 36.0, 76], ['B', 44.8, 36.8, 90],

  // ---------- Palmeiras da praia sul (entre a praça do espelho e a rede) ----------
  ['P', 39.6, 44.2, 94], ['P', 41.0, 43.0, 90], ['B', 38.6, 45.6, 92],
  ['P', 43.4, 42.2, 86], ['J', 40.2, 46.6, 78], ['B', 42.2, 45.0, 88],
  ['P', 45.0, 43.4, 88], ['J', 46.4, 42.0, 76],

  // ---------- Matinha da praia sudoeste (pôster 100–200, 560–640) ----------
  ['T', 25.6, 62.4, 176], ['T', 27.2, 61.0, 168],
  ['B', 24.4, 63.6, 92], ['P', 28.6, 59.8, 86], ['J', 26.4, 64.2, 74],

  // ---------- Palmeiras e moitas do litoral leste ----------
  ['P', 51.4, 40.4, 90], ['P', 52.8, 39.0, 86], ['B', 50.4, 41.8, 88],
  ['P', 54.2, 37.6, 84], ['J', 53.0, 35.4, 74],

  // ---------- Palmeral alto atrás do promontório sudeste ----------
  ['P', 57.2, 22.2, 92], ['P', 58.6, 20.8, 88], ['B', 56.2, 23.6, 90],
  ['P', 60.0, 19.4, 84], ['J', 59.2, 24.6, 76],

  // ---------- Moitas e arbustos floridos soltos (recheio, não mata) ----------
  ['D', 21.8, 43.4, 112], ['D', 24.8, 41.4, 108], ['D', 31.2, 41.0, 110],
  ['D', 34.4, 39.4, 106], ['D', 38.0, 40.2, 108], ['D', 47.2, 38.6, 110],
  ['F', 20.2, 40.2, 46], ['F', 26.8, 39.2, 44], ['F', 33.2, 37.6, 46],
  ['F', 44.0, 39.8, 44], ['F', 49.2, 36.4, 46], ['F', 37.2, 42.0, 44],
];
