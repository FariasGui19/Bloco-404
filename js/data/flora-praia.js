// =====================================================================
// FLORA E ROCHEDOS DA PRAIA — catálogo dos dois atlas extras (Praia 11)
//
// As folhas são montadas por `tools/preparar-flora-praia.py` a partir do
// mesmo kit costeiro que gerou a referência (`ilha-panorama.png`):
//
//   vegetacao_tropical_2   8x3 células — rasteiras, árvores, madeira
//   costa_rochosa_2        8x3 células — palmeirais, rochedos, miúdos e mar
//
// Cada entrada diz ONDE a peça está na folha e com que largura ela entra
// em cena (`larguraPx`, em pixels de tela a 100 % de zoom). O mapa nunca
// digita coluna/linha na mão: pede a peça pelo nome.
//
//   tronco: true  -> a peça tem tronco e deve bloquear (hitbox fina)
//   mar: true     -> peça de água (ganha anel de espuma animado)
// =====================================================================

export const VEGETACAO_2 = Object.freeze({
  // linha 0 — rasteiras
  samambaia_clara:   { col: 0, row: 0, larguraPx: 50 },
  bromelia_grande:   { col: 1, row: 0, larguraPx: 50 },
  flores_roxas:      { col: 2, row: 0, larguraPx: 46 },
  flores_vermelhas:  { col: 3, row: 0, larguraPx: 46 },
  monstera:          { col: 4, row: 0, larguraPx: 48 },
  samambaia_alta:    { col: 5, row: 0, larguraPx: 50 },
  bromelia_a:        { col: 6, row: 0, larguraPx: 44 },
  bromelia_b:        { col: 7, row: 0, larguraPx: 44 },
  // linha 1 — árvores e madeira
  palmeira_leque:    { col: 0, row: 1, larguraPx: 104, tronco: true },
  palmeira_bromelia: { col: 1, row: 1, larguraPx: 100, tronco: true },
  arvore_dupla:      { col: 2, row: 1, larguraPx: 110, tronco: true },
  palmeira_tripla:   { col: 3, row: 1, larguraPx: 96, tronco: true },
  rocha_musgo:       { col: 4, row: 1, larguraPx: 78 },
  tronco_musgo:      { col: 5, row: 1, larguraPx: 76 },
  toco:              { col: 6, row: 1, larguraPx: 58 },
  raiz:              { col: 7, row: 1, larguraPx: 70 },
  // linha 2 — miúdos
  flores_roxas_b:    { col: 0, row: 2, larguraPx: 44 },
  flores_azuis:      { col: 1, row: 2, larguraPx: 46 },
  arbusto:           { col: 2, row: 2, larguraPx: 56 },
  cipo:              { col: 3, row: 2, larguraPx: 40 },
  monstera_b:        { col: 4, row: 2, larguraPx: 50 },
});

export const COSTA_2 = Object.freeze({
  // linha 0 — palmeirais (as peças que dão a densidade da referência)
  palmeiral:            { col: 0, row: 0, larguraPx: 150, tronco: true },
  palmeira_samambaias:  { col: 1, row: 0, larguraPx: 104, tronco: true },
  arvore_samambaias:    { col: 2, row: 0, larguraPx: 96, tronco: true },
  palmeira_alta:        { col: 3, row: 0, larguraPx: 84, tronco: true },
  palmeiral_grande:     { col: 4, row: 0, larguraPx: 150, tronco: true },
  palmeirinha_cipo:     { col: 5, row: 0, larguraPx: 70 },
  bromelia_gigante:     { col: 6, row: 0, larguraPx: 46 },
  bromelia:             { col: 7, row: 0, larguraPx: 38 },
  // linha 1 — rochedos
  rochedo_palmeira:     { col: 0, row: 1, larguraPx: 92 },
  rochedo_bloco:        { col: 1, row: 1, larguraPx: 80 },
  rochedo_largo:        { col: 2, row: 1, larguraPx: 100 },
  rochedo_pilar:        { col: 3, row: 1, larguraPx: 66 },
  rochedo_musgo:        { col: 4, row: 1, larguraPx: 90 },
  rochedo_grande:       { col: 5, row: 1, larguraPx: 140 },
  rochedo_palmeirinha:  { col: 6, row: 1, larguraPx: 82 },
  rochedo_selva:        { col: 7, row: 1, larguraPx: 130 },
  // linha 2 — miúdos e mar
  pedras:               { col: 0, row: 2, larguraPx: 44 },
  seixos:               { col: 1, row: 2, larguraPx: 60 },
  tronco:               { col: 2, row: 2, larguraPx: 80 },
  rocha_samambaia:      { col: 3, row: 2, larguraPx: 66 },
  rochas:               { col: 4, row: 2, larguraPx: 62 },
  samambaias:           { col: 5, row: 2, larguraPx: 84 },
  ilhota_musgo:         { col: 6, row: 2, larguraPx: 84, mar: true },
  rochas_espuma:        { col: 7, row: 2, larguraPx: 70, mar: true },
});

const FOLHAS = Object.freeze({
  veg: { sprite: 'vegetacao_tropical_2', catalogo: VEGETACAO_2 },
  costa: { sprite: 'costa_rochosa_2', catalogo: COSTA_2 },
});

// Hitbox de tronco: fina, só o pé — dá para passar rente à copa.
export const HITBOX_TRONCO = Object.freeze({ offsetX: -0.16, offsetY: -0.16, width: 0.32, height: 0.32 });

/**
 * Monta um objeto de mapa a partir do catálogo.
 *   flora('veg', 'bromelia_a', 'id', x, y)            decoração sem colisão
 *   flora('costa', 'palmeiral', 'id', x, y)           bloqueia pelo tronco
 * `x, y` seguem a convenção dos mapas (o carregador soma .5).
 * `escala` multiplica a largura padrão — variar o tamanho quebra o padrão
 * de carimbo sem precisar de arte nova.
 */
export function flora(folha, peca, id, x, y, extra = {}) {
  const f = FOLHAS[folha];
  const def = f?.catalogo[peca];
  if (!def) throw new Error(`flora: peça desconhecida "${folha}/${peca}"`);
  const { escala = 1, ...resto } = extra;
  return {
    id,
    tipo: 'decoracao',
    x, y,
    sprite: f.sprite,
    frame: { col: def.col, row: def.row },
    useCrop: true,
    larguraPx: Math.round(def.larguraPx * escala),
    pivotX: 0.5,
    pivotY: 1,
    ajusteY: 3,
    bloqueia: Boolean(def.tronco),
    ...(def.tronco ? { hitbox: HITBOX_TRONCO } : {}),
    ...(def.mar ? { espuma: Math.round(def.larguraPx * escala * .46), espumaY: -4 } : {}),
    flora: `${folha}/${peca}`,
    ...resto,
  };
}
