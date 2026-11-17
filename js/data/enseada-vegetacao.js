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



  ['P', 20.9, 53.4, 84],

  // ---------- Palmeiras atrás e ao lado do Pórtico Oeste ----------
  ['B', 16.76, 45.57, 106], ['J', 18.24, 45.20, 96], ['M', 16.6, 46.7, 95],
  ['P', 12.51, 43.11, 118], ['B', 16.1, 47.9, 88], ['F', 16.9, 47.7, 72],
  ['D', 16.8, 45.6, 95], ['F', 18.6, 44.2, 64],


  // ---------- Palmeiral em frente à piscina da capivara ----------
  ['P', 20.6, 51.6, 88], ['J', 22.3, 50.8, 74],
  ['D', 24.3, 49.6, 105], ['F', 26.4, 47.7, 72],
  ['D', 26.7, 46.8, 100], ['F', 27.8, 45.9, 62], ['D', 25.8, 47.6, 86], ['F', 28.2, 45.3, 58], ['D', 28.9, 44.6, 90],
  ['D', 29.2, 44.5, 104], ['F', 30.4, 43.5, 65],
  ['D', 29.8, 45.0, 84], ['F', 30.5, 44.2, 65],
  ['P', 27.19, 46.01, 86],
  // Dois coqueiros discretos ao fundo da gruta e dos cristais.
  ['B', 28.27, 43.5, 82], ['P', 28.7, 42.5, 76],


  // ---------- Palmeiras do norte do platô (gramado atrás da bancada) ----------
  ['P', 10.8, 37.0, 90], ['P', 11.6, 36.3, 86], ['B', 12.8, 35.4, 88],
  ['P', 14.4, 30.8, 84], ['J', 12.8, 29.8, 74], ['P', 15.6, 29.4, 82],

  // ---------- Duas árvores de copa redonda atrás da tenda (só duas) ----------
  ['C', 23.9, 27.4, 118], ['C', 26.6, 25.2, 112],

  // ---------- Copa fechada à direita do acampamento (pôster 560–700, 100–250) ----------
  ['T', 29.0, 30.2, 176], ['T', 30.8, 28.2, 182], ['B', 28.2, 31.6, 92],
  ['P', 31.9, 26.4, 88], ['J', 29.9, 32.6, 76],

  // ---------- Palmeiras que emolduram a clareira central ----------
  ['B', 26.8, 37.6, 90],
  ['J', 32.8, 32.0, 78],
  ['B', 36.4, 28.2, 92], ['P', 37.6, 27.0, 88],

  // ---------- Palmeiras do jardim cercado / lado leste do monólito ----------
  ['B', 40.4, 31.8, 90],
  ['P', 44.2, 27.4, 86], ['J', 39.4, 33.0, 76],

  // ---------- Mata da encosta leste (pôster 900–1010, 300–430) ----------
  ['T', 43.0, 32.4, 174], ['T', 44.6, 34.0, 168], ['B', 41.9, 34.4, 94],
  ['J', 42.9, 36.0, 76],

  // ---------- Palmeiras da praia sul (entre a praça do espelho e a rede) ----------
  // Faixa livre para a lanterna e o acesso ao cais.

  // ---------- Matinha da praia sudoeste (pôster 100–200, 560–640) ----------
  ['T', 20.9, 52.6, 160], ['T', 23.4, 51.3, 150],
  ['B', 20.6, 53.7, 88], ['P', 23.7, 51.6, 82], ['J', 22.6, 53.7, 72],

  // ---------- Palmeiras e moitas do litoral leste ----------
  ['J', 53.0, 35.4, 74],

  // Palmeiras no promontório, em terra firme, não em ilhas no mar.
  ['P', 48.0, 25.8, 88], ['B', 47.2, 27.0, 82],

  // Canteiro compacto junto à concha menor; a entrada do píer permanece livre.
  ['J', 40.8, 46.6, 55], ['F', 40.55, 46.55, 58],

  // Dois coqueiros sustentam a rede de descanso na areia.
  ['P', 38.28, 49.94, 74], ['B', 44.20, 50.15, 78],

  // ---------- Moitas e arbustos floridos soltos (recheio, não mata) ----------
  ['D', 21.0, 44.2, 100], ['D', 24.8, 41.4, 108], ['D', 31.2, 41.0, 110],
  ['D', 34.4, 39.4, 106], ['D', 38.0, 40.2, 108], ['D', 47.2, 38.6, 110],
  ['F', 20.8, 42.0, 46], ['F', 26.8, 39.2, 44], ['F', 33.2, 37.6, 46],
  ['F', 44.0, 39.8, 44], ['F', 49.2, 36.4, 46], ['F', 37.2, 42.0, 44],
];
