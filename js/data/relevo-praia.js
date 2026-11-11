// =====================================================================
// RELEVO DA PRAIA — falésias, pilares, cascatas, arco e ilhota (Praia 11)
//
// A referência (`assets/source-art/coastal/ilha-panorama.png`) não é uma
// praia chapada: tem PAREDÃO no fundo, queda-d'água, palmeira em cima da
// pedra, arco natural. Estas peças são esse relevo.
//
// Como ler uma peça
// -----------------
//   relevo('id', 'falesia-selva', x, y, larguraPx, { ... })
//
//   x, y        coordenadas de MUNDO (tile com fração) do ponto de base que
//               a ferramenta de arte mediu: nas paredes em faixa, o MEIO do
//               pé da parede; nos pilares e rochas, o CANTO DA FRENTE.
//               (o carregador de mapas soma .5 em todo objeto; aqui isso já
//               vem descontado — o número que você escreve é onde a pedra
//               encosta de verdade.)
//   larguraPx   largura em tela a 100 % de zoom. Nunca `scale`.
//
// Orientação das artes (todas vêm da mesma câmera):
//   paredes ("falesia-*")  correm em "/" e olham para +x  -> borda OESTE
//                          com `espelhar` correm em "\"   -> borda NORTE
//   pilares                olham para +y                   -> borda NORTE
//                          com `espelhar` olham para +x   -> borda OESTE
//
// Por que borda norte/oeste: são as bordas de TRÁS na vista isométrica.
// Uma pedra alta ali só cobre mar aberto. Na borda sul/leste ela cobriria a
// própria areia onde o jogador anda.
//
// Opções
// ------
//   espelhar    vira a peça (ver tabela acima)
//   caixa       [x0, y0, x1, y1] em MUNDO: área sólida (ninguém anda nem
//               nada através da pedra). Sem `caixa`, a peça é só cenário.
//   caixas      várias caixas (pé em diagonal não cabe num retângulo só).
//   atras       valor de x+y do ponto mais ao FUNDO da face. A peça é
//               ordenada por ele, então quem anda em frente a qualquer
//               trecho da parede é sempre desenhado depois dela.
//               As PAREDES não precisam disto: elas são desenhadas em tiras
//               (`colunas`), cada uma com a profundidade do próprio pé.
//   fundo       número negativo: a peça vai para a camada de fundo e é
//               desenhada antes da fachada do túnel e do trem.
// =====================================================================
import { RELEVO_MEDIDAS } from './relevo-praia-medidas.js';
import { CONFIG } from '../config.js';

const MOLDURA = 4; // margem transparente que a ferramenta deixa em volta
const MEIO_TILE = CONFIG.TILE_W / 2;
// Largura em tela de cada tira de parede (px a 100 % de zoom).
const TIRA_PX = 22;

export function spriteDoRelevo(peca) {
  return `relevo_${peca.replaceAll('-', '_')}`;
}

export function relevo(id, peca, x, y, larguraPx, opcoes = {}) {
  const m = RELEVO_MEDIDAS[peca];
  if (!m) throw new Error(`relevo: peça desconhecida "${peca}"`);
  const { espelhar = false, caixa = null, caixas = null, atras = null, fundo = null, ...resto } = opcoes;

  const objeto = {
    id,
    tipo: 'relevo',
    relevo: peca,
    x: x - .5,
    y: y - .5,
    sprite: spriteDoRelevo(peca),
    frame: { col: 0, row: 0 },
    useCrop: true,
    larguraPx,
    pivotX: m.pivotX,
    pivotY: m.pivotY,
    bloqueia: false,
    ...(espelhar ? { espelhar: true } : {}),
  };

  // Altura em tela, para quem precisa medir enquadramento (testes).
  const visW = m.w - MOLDURA * 2, visH = m.h - MOLDURA * 2;
  objeto.alturaPx = Math.round(larguraPx * visH / visW);

  const todas = [...(caixa ? [caixa] : []), ...(caixas ?? [])];
  if (todas.length) {
    // `collision.js` troca X<->Y da hitbox de objetos espelhados (o desenho
    // espelhado troca os eixos do mundo). Aqui a caixa é dada em MUNDO, então
    // desfazemos a troca para o resultado final ser exatamente a caixa pedida.
    const hitboxes = todas.map(([x0, y0, x1, y1]) => {
      const ox = x0 - x, oy = y0 - y, w = x1 - x0, h = y1 - y0;
      return espelhar
        ? { offsetX: oy, offsetY: ox, width: h, height: w }
        : { offsetX: ox, offsetY: oy, width: w, height: h };
    });
    objeto.bloqueia = true;
    if (hitboxes.length === 1) objeto.hitbox = hitboxes[0]; else objeto.hitboxes = hitboxes;
    objeto.caixasMundo = todas;
  }

  if (fundo != null) { objeto.camada = 'fundo'; objeto.ordem = fundo; }
  else if (atras != null) objeto.depthOffset = atras - (x + y) - .25;
  else if (m.inclinacao != null) {
    // PAREDE: profundidade varia ao longo do comprimento. Na arte sem
    // espelho, base subindo para a direita ("/") = lado esquerdo mais perto
    // da câmera; base descendo ("\") = lado esquerdo mais longe. O espelho
    // não muda a conta, porque as tiras são contadas na própria imagem.
    const comprimento = larguraPx / MEIO_TILE;       // em tiles, ao longo da borda
    const sinal = m.inclinacao < 0 ? 1 : -1;
    objeto.colunas = {
      count: Math.max(2, Math.round(larguraPx / TIRA_PX)),
      esq: sinal * m.pivotX * comprimento - .3,
      dir: -sinal * (1 - m.pivotX) * comprimento - .3,
    };
  }

  // Queda-d'água: a máscara e o ponto onde a água bate vêm das medidas.
  if (m.agua) {
    const [ax0, , ax1, ay1] = m.agua;
    const alturaTela = larguraPx * visH / visW;
    objeto.cascata = `${spriteDoRelevo(peca)}_agua`;
    objeto.respingo = {
      x: ((ax0 + ax1) / 2 - m.pivotX) * larguraPx,
      y: (ay1 - m.pivotY) * alturaTela - 2,
      largura: Math.max(14, (ax1 - ax0) * larguraPx * .62),
    };
  }

  return { ...objeto, ...resto };
}
