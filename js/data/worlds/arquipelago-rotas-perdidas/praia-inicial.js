// js/data/worlds/arquipelago-rotas-perdidas/praia-inicial.js
// =====================================================================
// PRAIA INICIAL — ARQUIPÉLAGO (48x48)
//
// A ilha inicial (onde está o trem) mantém as MESMAS coordenadas de
// terra de antes (x 1..13, y 1..11), então linhaDoTrem(), o portal e os
// spawns não mudam. O arquipélago cresce para leste e sul.
//
// Topologia (cada ponte tem um gate de capacidade no meio):
//
//   [A inicial] --(rocha_rachada: Domínio)-----> [B leste]
//        |                                          |
//   (teleférico: Bio-Forja)              (caverna_alagada: Maré)
//        v                                          v
//   [C sul] ------(fenda_estreita: 10X)-------> [D centro] --(livre)--> [F farol]
//
// D exige (Domínio + Maré) OU (Bio-Forja + 10X).
//
// ÁGUA (nova lógica):
//   - perto da terra: mar RASO (turquesa)
//   - depois: mar FUNDO (azul escuro)
//   - mais longe: NADA é desenhado (aparece só a corFundo) -> bem mais leve
//
// Sheet beach-floor.png  [linha, coluna]:
//   [0,0] areia lisa     [0,1] pegadas       [0,2] conchas     [0,3] rachada
//   [1,0] areia molhada  [1,1] mar fundo     [1,2] costa diag. [1,3] deck
//   [2,0] raso c/ canto  [2,1] deck c/ areia [2,2] raso        [2,3] poça
// =====================================================================
import { buildGround } from '../../ground.js';
import { linhaDoTrem } from '../../shared/linha-trem.js';
import { relevo } from '../../relevo-praia.js';
import { flora } from '../../flora-praia.js';

// ---------------------------------------------------------------------
// TAMANHO — "aumentar um pouco o tamanho" (Praia 10.0, frente 2)
//
// O mapa aprovado tinha 48x48. Ele NÃO foi redesenhado: a área 48x48
// continua sendo exatamente a mesma (o hash dela é travado por teste em
// `praia-maior.mjs`). O que existe agora é uma orla NOVA em volta:
// +8 colunas a leste (mar aberto a leste vira enseada, praia e costão) e
// +8 linhas ao sul (fundo do mapa ganha o Cabo do Eco, com praia longa).
//
// Regra: nenhum objeto, gate, spawn ou caminho do núcleo mudou de lugar.
// O que cresceu cresceu PARA FORA.
// ---------------------------------------------------------------------
const NUCLEO = 48;         // área aprovada da praia 2.0 — intocável
const CRESCIMENTO_LESTE = 18;
const CRESCIMENTO_SUL = 16;
const COLS = NUCLEO + CRESCIMENTO_LESTE;
const ROWS = NUCLEO + CRESCIMENTO_SUL;

// eixo x: [0, NUCLEO) preservado; eixo y: idem.
const ehNucleo = (x, y) => x < NUCLEO && y < NUCLEO;

const TAM_RASO = 2;        // tiles de mar raso em volta da terra
const TAM_FUNDO = 3;       // até aqui desenha mar fundo; além disso, nada

const LEGENDA = {
  // terra
  S: { tiles: [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 1], [0, 2]], walk: true },
  M: { tiles: [[1, 0]], walk: true },          // areia molhada (costa)
  T: { tiles: [[2, 3]], walk: true },          // poça
  P: { tiles: [[2, 1]], walk: true },          // base do trem (andável)
  R: { tiles: [[2, 1]], walk: false },         // base do trem (atrás do trem)

  // pontes de deck. Tábuas correm no sentido da travessia.
  // Se o visual ficar trocado, inverta o flip de B e b.
  B: { tiles: [[1, 3]], walk: true, flip: true }, // ponte no eixo X
  b: { tiles: [[1, 3]], walk: true },             // ponte no eixo Y

  // água (flip só para variar o desenho das ondas)
  Y: { tiles: [[2, 2]], walk: false },
  y: { tiles: [[2, 2]], walk: false, flip: true },
  D: { tiles: [[1, 1]], walk: false },
  d: { tiles: [[1, 1]], walk: false, flip: true },

  // mar aberto: o tile é descartado depois (nada é desenhado)
  X: { tiles: [[1, 1]], walk: false },
};

const ehTerra = (c) => c !== undefined && 'SMTPRBb'.includes(c);

// ---------------------------------------------------------------------
// GRADE-BASE ('W' = água ainda sem tipo definido)
// ---------------------------------------------------------------------

const ILHA_INICIAL = [
  'WWWWWWWWWWWWWWWW',
  'WWRRRRRRRRRRRRWW',
  'WWRRRRRRRRRRRRWW',
  'WWRRRRRRRRRRRRWW',
  'WSPPPPPPPPPPPPWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WSSSSSSSSSSSSSWW',
  'WMSSSSSSSSSSSSWW',
  'WWWWWWWWWWWWWWWW',
  'WWWWWWWWWWWWWWWW',
];

const grid = Array.from({ length: ROWS }, () => Array(COLS).fill('W'));

ILHA_INICIAL.forEach((linha, y) => {
  for (let x = 0; x < linha.length; x++) {
    if ('SMPR'.includes(linha[x])) grid[y][x] = linha[x];
  }
});

// Amplia a faixa de areia da chegada sem remover qualquer célula antiga.
// As cabeceiras das pontes permanecem livres e os gates não são contornados.
for (const [y, spans] of [
  [12, [[2, 6], [9, 13]]],
  [13, [[3, 5], [10, 12]]],
  [14, [[3, 4], [11, 12]]],
]) for (const [x0, x1] of spans) for (let x = x0; x <= x1; x++) {
  if (grid[y][x] === 'W') grid[y][x] = 'S';
}

function hash(x, y, seed = 0) {
  let h = Math.imul(x + seed * 131, 374761393) + Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Ilha orgânica: elipse + ruído.
function pintarIlha(cx, cy, rx, ry, seed) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      const v = d + (hash(x, y, seed) - 0.5) * 0.35;
      if (v < 1.0) grid[y][x] = 'S';
    }
  }
}

// Remove "farelos" de terra (1 tile solto ou pendurado por 1 lado).
function limparFarelos() {
  for (let passo = 0; passo < 2; passo++) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (x < 16 && y < 14) continue;              // ilha inicial é intocável
        if (grid[y][x] !== 'S') continue;
        const viz =
          ehTerra(grid[y - 1]?.[x]) + ehTerra(grid[y + 1]?.[x]) +
          ehTerra(grid[y]?.[x - 1]) + ehTerra(grid[y]?.[x + 1]);
        if (viz < 2) grid[y][x] = 'W';
      }
    }
  }
}

// Ponte: só cobre água (liga as margens sem apagar terra).
function ponte(x0, y0, x1, y1, ch) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (!ehTerra(grid[y][x])) grid[y][x] = ch;
    }
  }
}

// Distância (em tiles, estilo xadrez) até a terra mais próxima.
function distanciaTerra(x, y) {
  let melhor = Infinity;
  for (let dy = -TAM_FUNDO; dy <= TAM_FUNDO; dy++) {
    for (let dx = -TAM_FUNDO; dx <= TAM_FUNDO; dx++) {
      if (ehTerra(grid[y + dy]?.[x + dx])) {
        melhor = Math.min(melhor, Math.max(Math.abs(dx), Math.abs(dy)));
      }
    }
  }
  return melhor;
}

// ---------------------------------------------------------------------
// ILHAS, PONTES E ÁGUA
// ---------------------------------------------------------------------

pintarIlha(30, 9, 9.5, 7.5, 1);   // B — leste
pintarIlha(9, 31, 8, 9.5, 2);     // C — sul
pintarIlha(30, 31, 10, 9, 3);     // D — centro
pintarIlha(30, 44, 6, 3, 4);      // F — farol (final, por enquanto vazia)
limparFarelos();

ponte(14, 7, 23, 8, 'B');         // A -> B
ponte(7, 12, 8, 23, 'b');         // A -> C
ponte(30, 15, 31, 24, 'b');       // B -> D
ponte(15, 31, 23, 32, 'B');       // C -> D
// Rotas alternativas de travessia, separadas das pontes Bio/Domínio.
ponte(14, 11, 23, 12, 'B');
ponte(36, 14, 37, 25, 'b');
ponte(30, 37, 31, 42, 'b');       // D -> F

// ---------------------------------------------------------------------
// ORLA NOVA (Praia 10.0) — "aumentar um pouco o tamanho" da praia
//
// Tudo aqui é TERRA NOVA e vive FORA do núcleo 48x48 aprovado. A ordem
// importa: terra primeiro, água em camadas DEPOIS, para a orla ganhar
// faixas de mar raso e fundo em vez de encostar no mar aberto.
//
//   LESTE  Enseada do Leste: meia-lua de areia com 35 tiles de extensão
//          e costão de rocha ao norte — o "X" que fechava o mapa.
//   SUL    Cabo do Eco: praia larga descendo até a borda, com ponta de
//          pedra a oeste. É o novo fundo do arquipélago.
//   ILHOTA Ilhota satélite na enseada: destino de natação de verdade.
// ---------------------------------------------------------------------

// --- Enseada do Leste: praia em meia-lua, 35 tiles de norte a sul ---
for (let y = 12; y <= 46; y++) {
  const t = (y - 29) / 18;                       // 0 no meio, ±1 nas pontas
  const afina = Math.pow(Math.abs(t), 1.7);
  const larg = Math.round(13 * (1 - afina));     // 13 tiles no meio, 0 nas pontas
  if (larg <= 0) continue;
  for (let k = 0; k < larg; k++) {
    const x = NUCLEO + k;                        // começa na borda do núcleo
    if (!ehTerra(grid[y][x])) grid[y][x] = 'S';
  }
}

// --- Costão de rocha no norte da enseada ---
//
// Rocha é PAREDE (`walk: false`), então o miolo precisa ser SÓLIDO: um
// costão com veios de água vira um labirinto de pedras que não se
// atravessa nem se contorna — foi o que aconteceu na primeira versão,
// que deixou 69 tiles de rocha presos entre canais.
//
// A borda mais externa fica irregular (é o desenho); o miolo é cheio.
for (let y = 4; y <= 13; y++) {
  for (let x = NUCLEO + 2; x <= NUCLEO + 11; x++) {
    if (ehNucleo(x, y)) continue;
    const d = Math.hypot((x - (NUCLEO + 6)) / 6.4, (y - 8.5) / 4.2);
    if (d < .78) grid[y][x] = 'R';                    // núcleo sólido
    else if (d < 1 && hash(x, y, 41) < .45) grid[y][x] = 'R'; // borda esfarrapada
    else if (d < 1) grid[y][x] = 'W';                 // resto do anel: NADA caminhável
  }
}

// --- Cabo do Eco: praia larga no sul ---
for (let y = NUCLEO - 5; y < ROWS; y++) {
  const t = (y - (NUCLEO - 5)) / (CRESCIMENTO_SUL + 5);
  const esq = 5 + Math.round(t * 12);
  const dir = 47 - Math.round(t * 12);
  for (let x = esq; x <= dir; x++) {
    if (ehNucleo(x, y)) continue;
    if (!ehTerra(grid[y][x])) grid[y][x] = 'S';
  }
}

// --- Ponta de pedra a oeste, fechando a leitura do cabo ---
for (let y = 52; y < ROWS; y++) {
  for (let x = 0; x <= 14; x++) {
    if (ehNucleo(x, y)) continue;
    const d = Math.hypot((x - 5) / 10, (y - 59) / 4.2);
    if (d < 1 && hash(x, y, 53) < .78) grid[y][x] = 'R';
  }
}

// --- Ilhota satélite na enseada: destino de natação, não decoração ---
pintarIlha(61, 33, 2.4, 2.4, 61);

// Canal obrigatório: a ilhota é ILHA, tem que haver água em volta dela.
// Sem isto ela cola no Cabo do Eco e deixa de ser destino de natação.
for (let y = 26; y <= 41; y++) {
  for (let x = 56; x < COLS; x++) {
    const d = Math.hypot((x - 61) / 3.2, (y - 33) / 3.2);
    if (d > .82 && d < 1.45 && hash(x, y, 67) < .92) grid[y][x] = 'W';
  }
}

// --- Pontes para as beiradas novas (nunca dentro do núcleo) ---
ponte(56, 33, 60, 33, 'B');       // enseada -> ilhota satélite (canal de 3 tiles)

// Passarelas de acesso às beiradas novas.
//
// Sem elas a enseada e o cabo eram massa de terra DESCONECTADA — o
// jogador via praia nova e não conseguia chegar. Cada passarela é
// curta e pousa em água/areia; o núcleo continua intacto (a restauração
// abaixo anula qualquer toque nas células aprovadas).
ponte(30, 47, 31, 52, 'b');       // D/F -> Cabo do Eco

// ---------------------------------------------------------------------
// CINTURA — a passagem de água entre o núcleo e as beiradas
//
// Quando a orla nova nasce, ela deixa a franja de mar-aberto do núcleo a
// leste e a sul em contato com a terra nova. Sem esta cintura, as duas
// coisinhas colam e o mapa perde a leitura de ilhas separadas.
//
// Aqui a franja recebe água RASO/FUNDA de verdade (era `X`: nada
// desenhado). Isso APARECE na área 48x48, e é positivo — a borda deixa
// de ser um recorte duro. Mesmo assim o núcleo é restaurado logo abaixo,
// célula por célula; ver `restaurarNucleo()`.
// ---------------------------------------------------------------------

// Água em camadas.
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== 'W') continue;
    const d = distanciaTerra(x, y);
    const r = hash(x, y, 11) < 0.5;
    if (d <= TAM_RASO) grid[y][x] = r ? 'Y' : 'y';
    else if (d <= TAM_FUNDO) grid[y][x] = r ? 'D' : 'd';
    else grid[y][x] = 'X';
  }
}

// Costa: areia molhada onde a areia encosta na água. Poças raras no interior.
const copia = grid.map(l => [...l]);
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (copia[y][x] !== 'S') continue;

    let encostaNaAgua = false;
    for (let dy = -1; dy <= 1 && !encostaNaAgua; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const c = copia[y + dy]?.[x + dx];
        if (c !== undefined && !ehTerra(c)) { encostaNaAgua = true; break; }
      }
    }

    if (encostaNaAgua) {
      if (hash(x, y, 21) < 0.85) grid[y][x] = 'M';
    } else if (!(x < 16 && y < 14) && hash(x, y, 31) < 0.02) {
      grid[y][x] = 'T';
    }
  }
}

// ---------------------------------------------------------------------
// O NÚCLEO APROVADO, RESTAURADO CÉLULA POR CÉLULA
//
// O mapa da praia 2.0 tinha uma franja de `X` (mar aberto, tile não
// desenhado) na borda leste e sul. Ao crescer, essa franja ficou em
// contato com terra nova e agora recebe água desenhada — o que é MELHOR
// (a borda deixa de ser um recorte seco) e por isso é PERMITIDO.
//
// O resto do núcleo é obrigatório: terra, areia molhada, ponte, poça,
// água rasa e água funda voltam exatamente ao valor aprovado. Assim
// nenhum ajuste nas beiradas pode, por acidente, mover uma ponte,
// alagar uma praia ou abrir um caminho novo no miolo.
// ---------------------------------------------------------------------
const NUCLEO_APROVADO = [
  'yyYyyYyyyYyyyyyydXXXXXXdDddyYyyYyyDDDddXXXXXXXXX',
  'YYRRRRRRRRRRRRyYDXXXDDDdyyYYyyyyyYYYyyDdXXXXXXXX',
  'yYRRRRRRRRRRRRYYDXXDdYYYYyyYYSMMYYyYYYYdddXXXXXX',
  'YyRRRRRRRRRRRRyydXXdyyYYyYMSMMSMMMMMyyYYYDXXXXXX',
  'yMPPPPPPPPPPPPyyddDdyYYMMMMSSSSSSSSSMyYyydDXXXXX',
  'YMSSSSSSSSSSSMyYYYYYyYMMSSSSSSSSSSSSSSSyyYdXXXXX',
  'yMSSSSSSSSSSSMyYyYyyyyMSSSSSSSSSSSSSSSSYYYdXXXXX',
  'YMSSSSSSSSSSSMBBBBBBBBMSSSSSSSSSSSSSSSMSyYdXXXXX',
  'yMSSSSSSSSSSSMBBBBBBBBMSSSSSSSSSSSSSTSSMyYDXXXXX',
  'yMSSSSSSSSSSSMyYyYyyYYMSSSSSSSSSSSSSSSSMYYdXXXXX',
  'YSSSSSSSSSSSSMYYYyyYyYMSSSSSSSSSSSSSSSMMYYdXXXXX',
  'yMSSSSSSSSSSSMBBBBBBBBMSSSSSTSSTSSSSSSMYYYdXXXXX',
  'YyMMSMMbbMMSMMBBBBBBBBMSSSSSSSSSSTTSSSMyYYdXXXXX',
  'YYyMMMybbyMMMYYyyyyYyYMMMSSSSSSSSSSSSSSyYddXXXXX',
  'yYYSMYybbYYMMYyYYyYYyyyyMMSSSSSSSSSSSbYyyDXXXXXX',
  'DYyyyyybbyYyyyyddDDdYYyyyyMSSSSSSMMMMbyYyDXXXXXX',
  'DYYyYYYbbyYyYYyDXXXDDDyyYYMSMSMMMyYYbbyYDDXXXXXX',
  'DdDdDYYbbYyddddDXXXXXDddyYYyYybbYYyYbbyyDXXXXXXX',
  'XXXXdYYbbYYDXXXXXXXXXXXDYYyyYYbbyYyybbyYdXXXXXXX',
  'XXXXDyYbbYyddddXXXXXXXXdDDDDyYbbYyYybbYYDXXXXXXX',
  'XXDDdYybbYYyyYddXXXXXXXXXdDDYybbYyyybbYYDXXXXXXX',
  'XXDyyYybbyYYYyYDDXXXXXDdddyyYYbbyyyYbbyyDXXXXXXX',
  'DdDyYyYbbMMMyYYYdDXXdDdYYyYYyybbyYyYbbyydXXXXXXX',
  'dYYYYMMMSSSMMYyYYDDdDyyyYYYYMMMMMMYYbbYYDXXXXXXX',
  'DYYYYMSSSSSSMSYyYyDDyYyyYMMMSSSSSSMMMbYyDdXXXXXX',
  'yYYMMSSSSSSTSMMyYYdDyyYMSMSSSSSSSSSSSMYyyDdXXXXX',
  'YYySSSSSSSSSSSMMyYYyyYMMSSSSSSSSSSSSSMYyYyDXXXXX',
  'yyMMSSSSSSSSSSSMYyyyYySSSSSTSSSSSSSSSMMYYydXXXXX',
  'yYMSSSSSSSSSSSSMMYYyySMSSSSSSSSSSSSSSSMMYYDXXXXX',
  'YYMSSSSSSSSSSSSSMYyYYMSSSSSTSSSSSSSSSSSMYYdXXXXX',
  'yyMSSSSSSSSSSSSSMyYYYMSSSSSSSSSSSSSSSSSMyydXXXXX',
  'YSMSSSSSSSSSSSSSMMBBBMSSSSSSSSSSSSSSSSSMyYDXXXXX',
  'yMSSSSSSSSSSSSSTMMBBBMSSSSSTSSSSSSSSSTSMyYDXXXXX',
  'ySSSSSSSSSSSSSSSMyYyyMMSSSSSSSSSSSSSSSSSyyDXXXXX',
  'YMMSSSSSSSSSSSSSMyyYYyMSSSSSSSSSSSSSSSMMYYDXXXXX',
  'YyMSSSSSSSSSSSSMMYyyyySMSSSSSSSSSSSSSSMyyydXXXXX',
  'YySMSSSSSSTSSSMMYYYDyyySSSSSSSSSSSSSSSMYYYdXXXXX',
  'YYYMMSSSSSSSSMMyyyYdyYYMMMTSSSSSSSSSMMMYyDdXXXXX',
  'yyyyMMMSSSSTMMyYyYDDDYyyYMMMSSSSSSMMMYyyydXXXXXX',
  'DYyYYYMMSMMMMyyYYdDXDYyyyYyMMSMSSMMYYyyyydXXXXXX',
  'ddYyYYYMMyyYyYYYddXXDdDyYYYYYYbbMYyyYYydDDXXXXXX',
  'XDDDYyYyyYYYyyydDXXXXdDyYYYYyybbMyYYYYDDXXXXXXXX',
  'XXXddyYyyyYDdDdDXXXXXdYyyYMMMSMSMMMyYYydXXXXXXXX',
  'XXXXDDDdddDdXXXXXXXXXDYYyMMSSSSSSSMMYyydXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXDYYSMSSSSSSSSSSMyydXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXDyyMMMSSSSSSSMMMYyDXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXdYyyYMMSMMMSMMYyyyDXXXXXXXX',
  'XXXXXXXXXXXXXXXXXXXXXdYYyYYyyYyYYYYyyyYDXXXXXXXX',
];

let __celulasPreservadas = 0;
let __franjaConvertida = 0;
let __iguais = 0;
let __franja = 0;

for (let y = 0; y < NUCLEO; y++) {
  for (let x = 0; x < NUCLEO; x++) {
    const aprovado = NUCLEO_APROVADO[y][x];
    const atual = grid[y][x];
    if (atual === aprovado) { __celulasPreservadas++; __iguais++; continue; }
    // Única troca autorizada: mar aberto aprovado -> água desenhada.
    if (aprovado === 'X' && 'YyDd'.includes(atual)) { __franjaConvertida++; __franja++; continue; }
    grid[y][x] = aprovado;
    __celulasPreservadas++;
  }
}
const PRESERVADAS = __celulasPreservadas;
const FRANJA = __franjaConvertida;

// ---------------------------------------------------------------------
// COSTÃO DO NORTE: PAREDE, NÃO LABIRINTO
//
// `R` (rocha) é `walk: false`, mas rocha cercada de água ainda deixa
// "ilhas de pedra" que o jogador vê e não alcança — 62 tiles presos na
// primeira medição. O costão do norte é, por definição, um paredão: ele
// é o limite da enseada pelo lado de cima. Aqui todo ele vira `W`
// (mar aberto, sem desenho e PAREDE no layout), o que é mais barato de
// desenhar e mais honesto de ler.
//
// A pedra continua visível na ponta oeste do Cabo do Eco, que é onde ela
// tem função (fechar a leitura da costa).
// ---------------------------------------------------------------------
for (let y = 3; y <= 14; y++) {
  for (let x = NUCLEO + 2; x <= NUCLEO + 12; x++) {
    if (ehNucleo(x, y)) continue;
    if (grid[y][x] === 'R') grid[y][x] = 'X';
  }
}

// Células aprovadas que viram ponte de acesso (a única alteração de
// conteúdo permitida no miolo). Usada tanto para construir quanto para
// o teste conferir.
const PASSARELAS_DECLARADAS = [
  [38, 16], [39, 16], [40, 16], [41, 16], [42, 16], [43, 16], [44, 16],
  [45, 16], [46, 16], [47, 16], [30, 47],
];

// ---------------------------------------------------------------------
// PASSARELAS DE ACESSO ÀS BEIRADAS NOVAS
//
// Ficam DEPOIS da restauração do núcleo de propósito: se ficassem antes,
// a restauração apagaria a ponte que pisa na borda aprovada. Aqui elas
// são o último gesto do mapa — mas só tocam células de ÁGUA do núcleo,
// nunca terra, ponte existente ou poça. A checagem é o próprio `ponte()`.
// ---------------------------------------------------------------------
// Núcleo leste -> Enseada do Leste.
//
// Em y=8 a areia aprovada chega até x=47 e a enseada nova começa em
// x=50..51, mas x=48 e 49 são `R` (rocha) na própria orla: não há água
// para ancorar ponte. Abro um CANAL de 2 tiles ali — é água nova, fora
// do núcleo, e é o que dá leitura de "enseada separada por mar".
// A franja leste do núcleo (x 41..44) é mar aberto sem desenho. A
// passarela atravessa ela e o canal até a primeira areia da enseada.
for (const x of [48, 49]) grid[16][x] = 'Y';
ponte(38, 16, 49, 16, 'B');
// Núcleo sul (terra em y=46) -> Cabo do Eco (areia em y=49).
// O vão é de UM tile de água (y=47) em x entre 24 e 36.
ponte(30, 47, 30, 47, 'b');

// Nenhuma passarela pode ter caído sobre célula aprovada de TERRA:
// seria caminho novo no miolo. Água do núcleo pode virar ponte (é o
// único jeito de sair dele), mas terra aprovada não.
const aguaAprovada = (x, y) => 'YyDdXW'.includes(NUCLEO_APROVADO[y]?.[x] ?? 'Y');
for (const [px, py] of [[48, 7], [49, 7], [30, 47]]) {
  const aprovado = NUCLEO_APROVADO[py]?.[px];
  if (aprovado !== undefined && 'SMTPbR'.includes(aprovado)) {
    throw new Error(`passarela em ${px},${py} caiu sobre terra aprovada (${aprovado})`);
  }
}

const ground = buildGround({
  sheet: 'BEACH_FLOOR_SPRITE',
  legend: LEGENDA,
  rows: grid.map(linha => linha.join('')),
});

// Mar aberto: remove o tile (nada desenhado) e marca como parede no layout.
const layout = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
for (let y = 0; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) {
    if (grid[y][x] === 'X') {
      delete ground.pisos[`${x},${y}`];
      layout[y][x] = 1;
    }
  }
}

// ---------------------------------------------------------------------
// PROPS
// ---------------------------------------------------------------------

const prop = (id, x, y, col, row, larguraPx, extra = {}) => ({
  id,
  tipo: 'decoracao',
  x, y,
  sprite: 'beach_props',
  frame: { col, row },
  useCrop: true,
  larguraPx,
  pivotX: 0.5,
  pivotY: 1.0,
  ajusteY: 4,
  ...extra,
});

const TRONCO = { offsetX: -0.15, offsetY: -0.15, width: 0.3, height: 0.3 };

// Hitboxes largas de propósito: cobrem a ponte inteira (2 tiles), então
// não dá para contornar o gate.
const HIT_PONTE_H = { offsetX: -0.6, offsetY: -1.5, width: 1.2, height: 3.0 }; // ponte no eixo X
const HIT_PONTE_V = { offsetX: -1.5, offsetY: -0.6, width: 3.0, height: 1.2 }; // ponte no eixo Y

// Gate = obstáculo bloqueante + `interacao` (necessária para o [E] enxergá-lo).
const gate = (id, x, y, col, row, larguraPx, cfg) =>
  prop(id, x, y, col, row, larguraPx, {
    tipo: 'obstaculo',
    nome: cfg.nome,
    bloqueia: true,
    hitbox: cfg.hitbox,
    // renderer.js e collision.js já respeitam hideWhenFlag.
    ...(cfg.phaseActions ? { phaseActions: cfg.phaseActions, phaseAxis: cfg.phaseAxis, phaseLane: 0.8 } : { hideWhenFlag: `gate_${id}` }),
    interacao: { label: cfg.label, distancia: 2.6 },
    ...(cfg.moduleSystem ? { moduleSystem: cfg.moduleSystem } : {}),
    gate: {
      anyOf: cfg.anyOf,
      requiredAction: cfg.requiredAction,
      actionMessage: cfg.actionMessage,
      requiresFlag: cfg.requiresFlag,
      diagnosisArchetype: cfg.diagnosisArchetype,
      falhaDiagnostico: cfg.falhaDiagnostico,
      falha: cfg.falha,
      sucesso: cfg.sucesso,
      promptFalha: 'EXAMINAR',
    },
  });

// Props espalhados (a ilha inicial mantém os props manuais).
function espalharProps() {
  const lista = [];
  const palmeiras = [[0, 82], [1, 82], [2, 100]];

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x < 16 && y < 14) continue;

      const c = grid[y][x];
      const terra = c === 'S' || c === 'M';
      const raso = c === 'Y' || c === 'y';
      if (!terra && !raso) continue;

      // Não obstrui cabeceiras de ponte.
      let perto = false;
      for (let dy = -2; dy <= 2 && !perto; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = grid[y + dy]?.[x + dx];
          if (v === 'B' || v === 'b') { perto = true; break; }
        }
      }
      if (perto) continue;

      const r = hash(x, y, 99);
      const id = (nome) => `${nome}_${x}_${y}`;

      if (raso) {
        if (r < 0.018) lista.push(prop(id('coral'), x, y, 0, 3, 48));
        else if (r < 0.031) lista.push(prop(id('rochedos_costeiros'), x, y, 0, 0, 52, {
          sprite: 'vegetacao_tropical', frame: { col: 7, row: 0 }, bloqueia: false,
        }));
        continue;
      }

      if (r < 0.035) {
        const [col, larg] = palmeiras[Math.floor(hash(x, y, 5) * palmeiras.length)];
        const tropical = hash(x, y, 83) < .60;
        const foliage = [2, 3, 4, 5][Math.floor(hash(x, y, 61) * 4)];
        lista.push(prop(id('palmeira'), x, y, col, 0, tropical ? 98 : larg, {
          ...(tropical ? { sprite: 'vegetacao_tropical', frame: { col: foliage, row: 0 } } : {}),
          bloqueia: true, hitbox: TRONCO,
        }));
      } else if (r < 0.055) {
        lista.push(prop(id('arbusto'), x, y, 3, 0, 50, hash(x, y, 29) < .65
          ? { sprite: 'vegetacao_tropical', frame: { col: hash(x, y, 19) < .5 ? 0 : 1, row: 0 } } : {}));
      } else if (r < 0.068) {
        lista.push(prop(id('pedras'), x, y, 2, 1, 60));
      } else if (r < 0.078) {
        lista.push(prop(id('concha'), x, y, 1, 3, 40));
      } else if (r < 0.084) {
        lista.push(prop(id('tronco'), x, y, 3, 1, 70));
      } else if (r < 0.092 && c === 'S') {
        lista.push(prop(id('rocha'), x, y, 1, 1, 56, {
          bloqueia: true,
          hitbox: { offsetX: -0.3, offsetY: -0.3, width: 0.6, height: 0.6 },
        }));
      } else if (r >= .11 && r < .14 && c === 'S') {
        // Detalhes de vegetação sem colisão, longe dos acessos às pontes.
        lista.push(prop(id('folhagem_costeira'), x, y, 0, 0, 35 + hash(x, y, 64) * 15, {
          sprite: 'vegetacao_tropical', frame: { col: hash(x, y, 12) < .5 ? 0 : 1, row: 0 }, bloqueia: false,
        }));
      }
    }
  }
  return lista;
}

// Quantas das passarelas declaradas realmente viraram ponte. Contado no
// fim, quando `grid` já está fechado — não durante a restauração.
function __contarPassarelas() {
  return PASSARELAS_DECLARADAS.filter(([x, y]) => 'Bb'.includes(grid[y][x])).length;
}

// Contagem final do que a franja virou: percorre o núcleo comparando a
// grade fechada com a aprovada. Fazer isso no fim evita contar estados
// intermediários (o costão, por exemplo, passa por 'X' -> 'W' -> 'X').
function __contarFranja() {
  let n = 0;
  for (let y = 0; y < NUCLEO; y++) {
    for (let x = 0; x < NUCLEO; x++) {
      const a = NUCLEO_APROVADO[y][x];
      if (a !== 'X') continue;
      if ('YyDd'.includes(grid[y][x])) n++;
    }
  }
  return n;
}

// Quantas células do núcleo continuam idênticas ao aprovado (contando
// as passarelas como "mudaram" e a franja como "mudou").
function __contarIguais() {
  let n = 0;
  for (let y = 0; y < NUCLEO; y++) {
    for (let x = 0; x < NUCLEO; x++) {
      if (grid[y][x] === NUCLEO_APROVADO[y][x]) n++;
    }
  }
  return n;
}

// =====================================================================
// RELEVO E FLORA (Praia 11) — a praia deixa de ser chapada
//
// A referência (`assets/source-art/coastal/ilha-panorama.png`) tem paredão
// ao fundo, queda-d'água com poça, palmeira em cima da pedra e mato denso
// no pé da rocha. Tudo isso entra aqui como OBJETO: a grade do núcleo
// 48x48 continua intocada (o hash de `praia-maior.mjs` não muda).
//
// Regra de posição: pedra alta só nas bordas de TRÁS de cada ilha (norte e
// oeste). Ali ela cobre mar aberto; na frente ela cobriria a areia onde se
// anda. As coordenadas abaixo são de MUNDO (ver `relevo-praia.js`).
// =====================================================================

// Flora em coordenadas de MUNDO (o helper de catálogo usa a convenção do
// carregador, que soma .5; aqui o número é onde o pé da planta encosta).
const F = (folha, peca, id, wx, wy, extra) => flora(folha, peca, id, wx - .5, wy - .5, extra);

// ---------------------------------------------------------------------
// ILHA A — a chegada
//
// O trem sai de um túnel NA ROCHA: paredão alto atrás da fachada e uma
// mureta baixa correndo atrás da plataforma (as duas na camada de fundo,
// desenhadas antes do pórtico e do trem). Depois o paredão desce a borda
// oeste em três blocos — palmeiras, a CASCATA e mais palmeiras — e a
// cascata cai na Poça da Cascata, onde se aprende a nadar.
// ---------------------------------------------------------------------
const RELEVO_ILHA_A = [
  // Atrás da estação (camada de fundo: ordem negativa = antes do túnel).
  relevo('mureta_estacao', 'falesia-muro', 8.3, 0.95, 292, { espelhar: true, fundo: -3, caixa: [3.6, 0, 12.8, .95] }),
  relevo('paredao_tunel', 'falesia-alta', 2.0, 1.25, 232, { fundo: -2, caixa: [.4, 0, 2.0, 4.5] }),
  relevo('pilar_estacao_leste', 'pilar-samambaias', 15.0, 1.3, 112, { fundo: -1, caixa: [12.4, .3, 15.0, 1.3] }),

  // Borda oeste: os três blocos do paredão (face olhando para a praia).
  relevo('paredao_palmeiras_norte', 'pilar-palmeiras-a', 1.15, 7.5, 140, {
    espelhar: true, atras: 1.15 + 4.5, caixa: [-.3, 4.5, 1.2, 7.5],
  }),
  relevo('cascata_da_chegada', 'pilar-cascata', 1.15, 8.92, 130, {
    atras: 1.15 + 7.4, caixa: [-1.5, 7.4, 1.2, 8.95],
  }),
  relevo('paredao_palmeiras_sul', 'pilar-palmeiras-b', 1.15, 12.3, 135, {
    espelhar: true, atras: 1.15 + 8.9, caixa: [.2, 8.9, 1.2, 12.35],
  }),
  // O paredão termina em pedra caída dentro d'água, não num corte reto.
  relevo('pedras_fim_paredao', 'rochedo-pe', 1.55, 13.5, 74, { espuma: 30, espumaY: -3 }),
];

const FLORA_ILHA_A = [
  // Pé do paredão, ao norte da poça.
  F('veg', 'samambaia_alta', 'a_pe_samambaia_1', 1.8, 5.35),
  F('veg', 'bromelia_a', 'a_pe_bromelia_1', 2.25, 6.05, { escala: .9 }),
  F('veg', 'palmeira_leque', 'a_pe_palmeira_1', 1.95, 6.9),
  F('veg', 'samambaia_clara', 'a_pe_samambaia_2', 2.6, 7.15, { escala: .85 }),
  // Em volta da poça.
  F('costa', 'rochas', 'a_poca_pedras', 3.8, 7.7, { escala: .8 }),
  F('veg', 'flores_vermelhas', 'a_poca_flores', 3.95, 9.75, { escala: .9 }),
  F('costa', 'seixos', 'a_poca_seixos', 4.35, 8.95, { escala: .8 }),
  // Pé do paredão, ao sul da poça.
  F('veg', 'bromelia_grande', 'a_pe_bromelia_2', 2.0, 10.45),
  F('costa', 'palmeira_samambaias', 'a_pe_palmeira_2', 1.95, 11.45),
  F('veg', 'samambaia_alta', 'a_pe_samambaia_3', 2.7, 12.25, { escala: .9 }),
  F('veg', 'monstera', 'a_pe_monstera', 3.55, 13.2, { escala: .9 }),
  // Praia sul e leste: mais sombra, sem fechar as cabeceiras das pontes.
  F('veg', 'palmeira_tripla', 'a_sul_palmeira', 4.4, 13.75, { escala: .95 }),
  F('veg', 'flores_roxas', 'a_sul_flores', 6.0, 11.9, { escala: .9 }),
  F('costa', 'palmeiral', 'a_sul_palmeiral', 11.45, 13.6, { escala: .92 }),
  F('veg', 'bromelia_b', 'a_leste_bromelia', 12.55, 9.85, { escala: .9 }),
  F('costa', 'palmeira_alta', 'a_leste_palmeira', 12.7, 6.25),
  F('veg', 'samambaia_clara', 'a_leste_samambaia', 11.6, 5.75, { escala: .8 }),
  F('veg', 'flores_azuis', 'a_estacao_flores', 2.85, 4.75, { escala: .85 }),
];

// ---------------------------------------------------------------------
// O RESTO DO ARQUIPÉLAGO
//
// Cada ilha ganha pedra alta só nas bordas de trás (norte e oeste). As
// caixas bloqueiam apenas células de MARGEM: nenhuma rota, cabeceira de
// ponte, portal ou spawn fica atrás de pedra (conferido por
// `tests/praia-relevo.mjs`).
//
//   B  o MACIÇO DA CASCATA no canto noroeste, paredão ao norte e o ARCO
//      de pedra saindo para o mar a leste — a composição da referência.
//   C  paredão de selva na borda oeste.
//   D  pilares com palmeira guardando a chegada das pontes.
//   Enseada do Leste  dois paredões na borda oeste (tapam o canal fundo).
//   Cabo do Eco       paredões ao norte e o COSTÃO na ponta oeste.
// ---------------------------------------------------------------------
const RELEVO_ARQUIPELAGO = [
  // ---- Ilha B ----
  relevo('macico_da_cascata', 'macico-cascata', 27.1, 4.4, 304, {
    caixas: [[26, 3, 28, 4], [23, 4, 27, 5], [23, 5, 26, 6], [24, 6, 25, 7]],
  }),
  relevo('paredao_norte_b', 'falesia-alta', 32.0, 3.95, 230, { espelhar: true, caixa: [28.4, 2, 35.6, 3.95] }),
  relevo('pilar_leste_b', 'pilar-samambaias', 37.0, 4.95, 100, { caixa: [35.7, 3.9, 37.0, 4.95] }),
  relevo('arco_do_norte', 'arco-pedra', 40.3, 4.75, 204, {
    caixas: [[37.1, 4.1, 38.2, 4.95], [42.3, 4.1, 43.5, 4.95]],
  }),
  relevo('arco_pedra_pe', 'rochas-mar', 43.6, 5.2, 58, { espuma: 26, espumaY: -3 }),

  // ---- Ilha C ----
  relevo('paredao_oeste_c', 'falesia-selva', 2.95, 31.5, 288, { caixa: [1, 27, 2.95, 36] }),
  relevo('pilar_noroeste_c', 'pilar-palmeiras-b', 4.6, 25.95, 120, {
    espelhar: true, atras: 3 + 24.6, caixa: [3, 24.6, 4.6, 25.95],
  }),

  // ---- Ilha D ----
  relevo('pilar_oeste_d_norte', 'pilar-palmeiras-a', 22.95, 29.95, 125, {
    espelhar: true, atras: 21 + 28.2, caixa: [21, 28.2, 22.95, 29.95],
  }),
  relevo('pilar_oeste_d_sul', 'pilar-samambaias', 22.95, 34.95, 105, {
    espelhar: true, atras: 21 + 33.3, caixa: [21, 33.3, 22.95, 34.95],
  }),
  relevo('pilar_norte_d', 'pilar-palmeiras-b', 26.95, 25.6, 120, { atras: 25 + 24, caixa: [25, 24, 26.95, 25.6] }),

  // ---- Ilha F ----
  relevo('pilar_oeste_f', 'pilar-samambaias', 25.95, 44.95, 95, {
    espelhar: true, atras: 24 + 44, caixa: [24, 44, 25.95, 44.95],
  }),

  // ---- Enseada do Leste ----
  relevo('pilar_norte_enseada', 'pilar-palmeiras-a', 49.95, 14.95, 125, { atras: 48 + 12, caixa: [48, 12, 49.95, 14.95] }),
  relevo('paredao_enseada_norte', 'falesia-muro', 48.95, 22.2, 288, { caixa: [48, 17.7, 48.95, 26.7] }),
  relevo('paredao_enseada_sul', 'falesia-selva', 48.95, 33.2, 288, { caixa: [48, 28.7, 48.95, 37.7] }),
  relevo('pedras_vao_enseada', 'rochedo-pe', 48.6, 28.3, 70),

  // ---- Cabo do Eco ----
  relevo('paredao_cabo_oeste', 'falesia-selva', 13.5, 48.95, 288, { espelhar: true, caixa: [9, 48, 18, 48.95] }),
  relevo('paredao_cabo_leste', 'falesia-alta', 38.5, 48.95, 240, { espelhar: true, caixa: [34.75, 48, 42.25, 48.95] }),
  // O costão (ponta oeste): pedra alta em cima da laje. Ali ninguém anda —
  // as células são parede — então estas peças não precisam de caixa.
  relevo('costao_paredao', 'falesia-alta', 4.6, 59.4, 250, {}),
  relevo('costao_pilar_a', 'pilar-palmeiras-a', 10.4, 58.4, 120, { atras: 9 + 57 }),
  relevo('costao_pilar_b', 'pilar-palmeiras-b', 8.0, 62.2, 112, { espelhar: true, atras: 6.5 + 61 }),
  relevo('costao_pedras', 'rochedo-pe', 12.3, 60.6, 80),

  // ---- Ilhotas no meio das lagoas (mar fundo: ninguém chega, é paisagem) ----
  relevo('ilhota_da_lagoa', 'ilhota-palmeiras', 19.3, 19.4, 150, { caixa: [18.3, 18.4, 19.5, 19.6] }),
  relevo('ilhota_do_canal', 'ilhota-palmeiras', 44.2, 28.6, 132, { espelhar: true, caixa: [43.3, 27.7, 44.4, 28.8] }),
];

// Pedras soltas no mar raso, com anel de espuma. Só em célula de ÁGUA.
const ROCHAS_DO_MAR = [
  [20.5, 14.6], [5.4, 19.6], [13.6, 20.4], [40.6, 9.4], [34.4, 20.6],
  [18.4, 36.6], [22.6, 46.4], [45.5, 50.5], [62.5, 28.6], [11.45, 56.55],
].map(([x, y], i) => relevo(`rochas_do_mar_${i + 1}`, 'rochas-mar', x, y, 52 + (i % 3) * 8, {
  espelhar: i % 2 === 1, espuma: 24 + (i % 3) * 3, espumaY: -3,
  caixa: [x - .42, y - .42, x + .1, y + .1],
}));

// ---------------------------------------------------------------------
// POÇAS — água em cima de areia caminhável
//
// A grade aprovada não muda: a poça é uma ZONA (elipse em tiles) desenhada
// sobre a areia. Quem entra nela está "na água" para o nado, com a
// profundidade indicada — é aqui que o operador que tem medo do mar
// aprende a boiar (ver js/game/nado-arvore.js).
// ---------------------------------------------------------------------
const POCAS = [
  {
    id: 'poca_da_cascata',
    nome: 'POÇA DA CASCATA',
    x: 2.5, y: 8.72, rx: 1.42, ry: 1.2,
    profundidade: .45,
    treino: true,
    // Onde a queda bate (para as ondas concêntricas nascerem dali).
    fonte: { x: 1.3, y: 8.85 },
  },
  {
    // A cascata grande da ilha B cai nesta: rasa também, boa para treinar.
    id: 'poco_do_macico',
    nome: 'POÇO DO MACIÇO',
    x: 27.7, y: 5.45, rx: 1.1, ry: .88,
    profundidade: .45,
    fonte: { x: 27.2, y: 4.7 },
  },
];

// ---------------------------------------------------------------------
// O QUE NÃO PODE TER ENFEITE EM CIMA
//
// Um prop sorteado não pode nascer dentro de pedra, dentro de poça nem em
// cima do costão. `foraDoRelevo` é a pergunta única para isso.
// ---------------------------------------------------------------------
const ZONAS_DE_PEDRA = [...RELEVO_ILHA_A, ...RELEVO_ARQUIPELAGO, ...ROCHAS_DO_MAR].flatMap(o => o.caixasMundo ?? []);
function foraDoRelevo(wx, wy, folga = .4) {
  for (const [x0, y0, x1, y1] of ZONAS_DE_PEDRA) {
    if (wx > x0 - folga && wx < x1 + folga && wy > y0 - folga && wy < y1 + folga) return false;
  }
  for (const p of POCAS) {
    const dx = (wx - p.x) / (p.rx + folga), dy = (wy - p.y) / (p.ry + folga);
    if (dx * dx + dy * dy < 1) return false;
  }
  return true;
}

// ---------------------------------------------------------------------
// COSTÃO — a ponta de pedra do Cabo do Eco
//
// Na grade ela é `R` (parede). `R` também é a base do trem, e o costão
// saía com o ladrilho da plataforma — uma jangada de tábuas no mar. Aqui
// as células de `R` FORA da estação são marcadas como costão: o renderer
// as desenha como laje de basalto (ver `drawCostao`).
// ---------------------------------------------------------------------
const COSTAO = {};
for (let y = NUCLEO; y < ROWS; y++) {
  for (let x = 0; x < COLS; x++) if (grid[y][x] === 'R') COSTAO[`${x},${y}`] = true;
}

// ---------------------------------------------------------------------
// FLORA ESPALHADA — a densidade da referência
//
// `espalharProps` (acima) é o sorteio antigo, com o kit pequeno. Este
// segundo passe usa os dois atlas novos e só ocupa célula que ficou vazia:
//   areia  -> palmeirais (bloqueiam só pelo tronco), samambaias, bromélias,
//             monsteras, flores, madeira e pedra com musgo;
//   margem -> bromélias e pedras miúdas (nada que bloqueie a orla);
//   raso   -> ilhotas de musgo e pedras com espuma, sempre cercadas de água.
// Nada nasce perto de ponte, portal, spawn, gate ou objeto colocado à mão.
// ---------------------------------------------------------------------
const FLORA_ARVORES = [
  ['costa', 'palmeiral'], ['costa', 'palmeira_samambaias'], ['costa', 'arvore_samambaias'],
  ['costa', 'palmeira_alta'], ['costa', 'palmeiral_grande'], ['veg', 'palmeira_leque'],
  ['veg', 'palmeira_bromelia'], ['veg', 'arvore_dupla'], ['veg', 'palmeira_tripla'],
];
const FLORA_RASTEIRAS = [
  ['veg', 'samambaia_clara'], ['veg', 'bromelia_grande'], ['veg', 'flores_roxas'], ['veg', 'flores_vermelhas'],
  ['veg', 'monstera'], ['veg', 'samambaia_alta'], ['veg', 'bromelia_a'], ['veg', 'bromelia_b'],
  ['veg', 'flores_azuis'], ['veg', 'arbusto'], ['veg', 'monstera_b'], ['veg', 'flores_roxas_b'],
  ['costa', 'bromelia'], ['costa', 'bromelia_gigante'], ['costa', 'samambaias'], ['costa', 'palmeirinha_cipo'],
];
const FLORA_PEDRAS = [
  ['costa', 'rochedo_bloco'], ['costa', 'rochedo_musgo'], ['costa', 'rocha_samambaia'], ['costa', 'rochas'],
  ['costa', 'seixos'], ['costa', 'pedras'], ['veg', 'rocha_musgo'], ['veg', 'tronco_musgo'],
  ['veg', 'toco'], ['veg', 'raiz'], ['costa', 'tronco'], ['costa', 'rochedo_palmeirinha'],
];
const FLORA_ORLA = [
  ['costa', 'bromelia'], ['veg', 'bromelia_a'], ['veg', 'bromelia_b'], ['costa', 'pedras'],
  ['costa', 'seixos'], ['veg', 'samambaia_clara'], ['costa', 'rochas'],
];
const FLORA_MAR = [['costa', 'ilhota_musgo'], ['costa', 'rochas_espuma']];

function espalharFlora(existentes, pontos) {
  const lista = [];
  const ocupada = new Set(existentes.map(o => `${Math.floor(o.x + .5)},${Math.floor(o.y + .5)}`));
  // Objetos colocados à mão que pedem respiro (gates, marcos, naufrágios…).
  const reservados = [
    ...pontos,
    ...existentes.filter(o => o.gate || o.interacao || o.routeMarker || o.cableStation || o.camada === 'fundo')
      .map(o => ({ x: o.x + .5, y: o.y + .5 })),
  ];
  const livre = (wx, wy) => foraDoRelevo(wx, wy) && !reservados.some(r => Math.hypot(r.x - wx, r.y - wy) < 2.1);
  const sortear = (opcoes, x, y, seed) => opcoes[Math.floor(hash(x, y, seed) * opcoes.length) % opcoes.length];
  const agua = (x, y) => 'YyDd'.includes(grid[y]?.[x] ?? 'S');

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (x < 16 && y < 15) continue;                 // ilha A é desenhada à mão
      const c = grid[y][x];
      if (c !== 'S' && c !== 'M' && c !== 'Y' && c !== 'y') continue;
      if (ocupada.has(`${x},${y}`)) continue;

      let pertoDePonte = false;
      for (let dy = -2; dy <= 2 && !pertoDePonte; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const v = grid[y + dy]?.[x + dx];
          if (v === 'B' || v === 'b') { pertoDePonte = true; break; }
        }
      }
      if (pertoDePonte) continue;

      // Posição dentro da célula: sorteada, para a flora não ficar em grade.
      const wx = x + .5 + (hash(x, y, 301) - .5) * .5;
      const wy = y + .5 + (hash(x, y, 302) - .5) * .5;
      if (!livre(wx, wy)) continue;

      const r = hash(x, y, 211);
      const escala = .82 + hash(x, y, 303) * .3;
      const id = (nome) => `flora_${nome}_${x}_${y}`;
      let escolha = null;

      if (c === 'S') {
        if (r < .016) escolha = ['arvore', sortear(FLORA_ARVORES, x, y, 304)];
        else if (r < .066) escolha = ['rasteira', sortear(FLORA_RASTEIRAS, x, y, 305)];
        else if (r < .080) escolha = ['pedra', sortear(FLORA_PEDRAS, x, y, 306)];
      } else if (c === 'M') {
        if (r < .05) escolha = ['orla', sortear(FLORA_ORLA, x, y, 307)];
      } else if (r < .012) {
        // Pedra de mar: só com água em toda a volta (nunca encostada na areia).
        let cercada = true;
        for (let dy = -1; dy <= 1 && cercada; dy++) for (let dx = -1; dx <= 1; dx++) if (!agua(x + dx, y + dy)) { cercada = false; break; }
        if (cercada) escolha = ['mar', sortear(FLORA_MAR, x, y, 308)];
      }
      if (!escolha) continue;

      const [tipo, [folha, peca]] = escolha;
      lista.push(F(folha, peca, id(tipo), wx, wy, { escala: tipo === 'arvore' ? Math.min(1.05, escala) : escala }));
      ocupada.add(`${x},${y}`);
    }
  }
  return lista;
}

export const map = {
  id: 'ilha_praia_inicial',
  aguaSobPontes: true,
  // Estacas de sustentação no fundo: pequenas, nas bordas dos dois canais.
  // Coordenadas de mundo, independentes do gate da superfície.
  pilaresSubmersos: [
    { x: 18.5, y: 7.12, raio: .16 }, { x: 18.5, y: 8.88, raio: .16 },
    { x: 7.12, y: 18.5, raio: .16 }, { x: 8.88, y: 18.5, raio: .16 },
  ],

  meta: {
    nome: 'PRAIA INICIAL — ARQUIPÉLAGO',
    tipo: 'exterior',
    dimensao: 'arquipelago',
    // Aproximação da cor do tile de mar fundo. Ajuste se aparecer emenda.
    corFundo: '#025074',
    ambiente: { poeira: 15, cor: '#FFD54F' },
    estiloPiso: 'livre',
    // Células 'X' (mar aberto) são parede no layout mas NÃO devem desenhar parede.
    useBackgroundWalls: true,
  },

  spawnPoints: {
    inicio: { x: 8.0, y: 7.5 },
    vindo_do_trem: { x: 8.0, y: 5.5 },
    vindo_da_enseada: { x: 11.5, y: 10.5 },
    vindo_da_estacao: { x: 8.5, y: 23.5 },
  },

  corChao: '#e6c280',

  layout,
  walkMask: ground.walkMask,
  pisos: ground.pisos,
  // Dados visuais separados da máscara de colisão.
  aguaPraia: grid.map(linha => linha.join('')),
  // Poças de treino: zonas de água sobre areia (não mexem na grade).
  pocas: POCAS,
  // Células de rocha desenhadas como laje de costão (só visual).
  costao: COSTAO,

  // -------------------------------------------------------------------
  // PROVA DO CRESCIMENTO (Praia 10.0)
  //
  // `NUCLEO_APROVADO` é a grade 48x48 da praia 2.0, congelada. O teste
  // `praia-maior.mjs` hasheia o CONTEÚDO dela (tudo menos o mar aberto
  // 'X', que é borda e pode ganhar desenho) e compara com o hash da
  // versão aprovada. Assim ninguém "cresce" o mapa mexendo no miolo.
  // -------------------------------------------------------------------
  nucleo: {
    tamanho: NUCLEO,
    grade: NUCLEO_APROVADO,
    // Células aprovadas que viraram PONTE para dar acesso às beiradas
    // novas. É a única alteração de conteúdo permitida no miolo, e está
    // declarada aqui de propósito: qualquer outra acusa no teste.
    passarelas: PASSARELAS_DECLARADAS,
    preservadas: __contarIguais(),
    franjaConvertida: __contarFranja(),
    passarelasAplicadas: __contarPassarelas(),
  },

  fauna: [
    { id: 'praia_caranguejo_1', species: 'caranguejo', x: 3.5, y: 10.5 },
    { id: 'praia_caranguejo_2', species: 'caranguejo', x: 26.5, y: 14.5 },
    { id: 'praia_gaivota', species: 'gaivota', x: 11.5, y: 6.5 },
    { id: 'praia_peixes', species: 'peixes', x: 17.5, y: 16.5 },
    // Grupos pequenos distribuídos entre as ilhas, sem colisão ou progresso.
    { id: 'praia_gaivota_leste', species: 'gaivota', x: 35.5, y: 13.5 },
    { id: 'praia_caranguejo_leste', species: 'caranguejo', x: 39.5, y: 9.5 },
    { id: 'praia_caranguejo_sul', species: 'caranguejo', x: 3.5, y: 31.5 },
    { id: 'praia_gaivota_sul', species: 'gaivota', x: 13.5, y: 36.5 },
    { id: 'praia_peixes_sul', species: 'peixes', x: 19.5, y: 34.5 },
    { id: 'praia_peixes_leste', species: 'peixes', x: 41.5, y: 30.5 },
    { id: 'praia_caranguejo_centro', species: 'caranguejo', x: 36.5, y: 34.5 },
    { id: 'praia_capivara_centro', species: 'capivara', x: 27.5, y: 26.5 },
    { id: 'praia_gaivota_farol', species: 'gaivota', x: 32.5, y: 44.5 },
    { id: 'praia_peixes_farol', species: 'peixes', x: 37.5, y: 42.5 },
    // Movido 1 tile ao sul na Praia 10.0: a franja de mar aberto em
    // (42,17) deixou de ser navegável quando a orla cresceu, e cardume
    // em célula `X` era filtrado por `habitatAllows` — o animal sumia.
    { id: 'praia_peixes_largo', species: 'peixes', x: 42.5, y: 18.5 },
    { id: 'praia_peixes_sul_largo', species: 'peixes', x: 17.5, y: 38.5 },
    // ---- FAUNA 10.0 (folha fauna-nova-1010) ----
    // Golfinho: água funda, longe das pontes. Ele salta — é o animal que
    // faz o mapa parecer vivo de longe.
    { id: 'praia_golfinho_enseada', species: 'golfinho', x: 42.5, y: 32.5 },
    { id: 'praia_golfinho_cabo', species: 'golfinho', x: 41.5, y: 60.5 },
    { id: 'praia_golfinho_largo', species: 'golfinho', x: 15.5, y: 16.5 },
    // Tartaruga: água funda, perto dos recifes (onde ela pasta).
    { id: 'praia_tartaruga_norte', species: 'tartaruga', x: 39.5, y: 2.5 },
    { id: 'praia_tartaruga_oeste', species: 'tartaruga', x: 2.5, y: 22.5 },
    { id: 'praia_tartaruga_sul', species: 'tartaruga', x: 19.5, y: 36.5 },
    // Trinta-réis: areia molhada da costa — bando pequeno, não gaivota solta.
    { id: 'praia_trinta_reis_1', species: 'trinta_reis', x: 48.5, y: 12.5 },
    { id: 'praia_trinta_reis_2', species: 'trinta_reis', x: 26.5, y: 16.5 },
    { id: 'praia_trinta_reis_3', species: 'trinta_reis', x: 57.5, y: 23.5 },
    { id: 'praia_trinta_reis_4', species: 'trinta_reis', x: 8.5, y: 48.5 },
    { id: 'praia_trinta_reis_5', species: 'trinta_reis', x: 31.5, y: 60.5 },
    // Graxaim: areia seca, mais para dentro — o bicho que anda na praia.
    { id: 'praia_graxaim_1', species: 'graxaim', x: 9.5, y: 22.5 },
    { id: 'praia_graxaim_2', species: 'graxaim', x: 37.5, y: 25.5 },
    { id: 'praia_graxaim_3', species: 'graxaim', x: 22.5, y: 49.5 },
    { id: 'praia_graxaim_4', species: 'graxaim', x: 41.5, y: 50.5 },
  ],
  objects: [
    // Marcos costeiros em água, não bloqueantes; não são terreno jogável.
    // A cascata de verdade agora é a do paredão (`cascata_da_chegada`). Estas
    // duas pedras antigas viram rochedo baixo, mais ao sul, dentro d'água.
    { id: 'cascata_costeira_chegada', tipo: 'decoracao', x: 3, y: 16, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 70, pivotY: 1, bloqueia: false, espuma: 30, espumaY: -4 },
    { id: 'rocha_costeira_chegada', tipo: 'decoracao', x: 1, y: 17, sprite: 'costa_rochosa', frame: { col: 3, row: 0 }, useCrop: true, larguraPx: 76, pivotY: 1, bloqueia: false, espuma: 32, espumaY: -4 },
    { id: 'recife_largo_leste', tipo: 'decoracao', x: 43, y: 23, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 68, pivotY: 1, bloqueia: false },
    { id: 'recife_largo_sul', tipo: 'decoracao', x: 18, y: 42, sprite: 'costa_rochosa', frame: { col: 3, row: 0 }, useCrop: true, larguraPx: 64, pivotY: 1, bloqueia: false },
    { id: 'rochedos_praia_leste', tipo: 'decoracao', x: 40, y: 12, sprite: 'costa_rochosa', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 104, pivotY: 1, bloqueia: false },
    { id: 'rochedos_praia_sul', tipo: 'decoracao', x: 1, y: 27, sprite: 'costa_rochosa', frame: { col: 3, row: 0 }, useCrop: true, larguraPx: 79, pivotY: 1, bloqueia: false },
    { id: 'rochedos_praia_centro', tipo: 'decoracao', x: 40, y: 35, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 72, pivotY: 1, bloqueia: false },
    // ---- MARCOS DA ILHA GRANDE ----
    // O kit `costa_rochosa` da referência (falésia com palmeiras, montinho e
    // pilar) entra na BEIRA da areia, não na água: dá relevo e faz a ilha
    // parecer grande em vez de um monte de losango chapado. Tudo decorativo
    // e não bloqueante — nada de rota muda.
    // O contrato da praia exige `costa_rochosa` SEMPRE em água: então as
    // falésias ficam na orla submersa, emoldurando a ilha vista do mar.
    { id: 'falésia_oeste', tipo: 'decoracao', x: 13, y: 16, sprite: 'costa_rochosa', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 170, pivotY: 1, bloqueia: false },
    { id: 'pilar_palmeiras_leste', tipo: 'decoracao', x: 45, y: 2, sprite: 'costa_rochosa', frame: { col: 3, row: 0 }, useCrop: true, larguraPx: 78, pivotY: 1, bloqueia: false },
    { id: 'pilar_palmeiras_sul', tipo: 'decoracao', x: 24, y: 47, sprite: 'costa_rochosa', frame: { col: 3, row: 0 }, useCrop: true, larguraPx: 74, pivotY: 1, bloqueia: false },
    { id: 'montinho_orla_leste', tipo: 'decoracao', x: 43, y: 15, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 62, pivotY: 1, bloqueia: false },
    { id: 'montinho_orla_sul', tipo: 'decoracao', x: 22, y: 41, sprite: 'costa_rochosa', frame: { col: 2, row: 0 }, useCrop: true, larguraPx: 58, pivotY: 1, bloqueia: false },
    { id: 'folha_costeira_a', tipo: 'decoracao', x: 3.15, y: 9.85, sprite: 'vegetacao_tropical', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 45, pivotY: 1, bloqueia: false },
    { id: 'folha_costeira_b', tipo: 'decoracao', x: 12, y: 10, sprite: 'vegetacao_tropical', frame: { col: 0, row: 0 }, useCrop: true, larguraPx: 45, pivotY: 1, bloqueia: false },
    // Pequenos agrupamentos costeiros, exclusivamente visuais e fora da plataforma.
    { id: 'vegetacao_chegada_a', tipo: 'decoracao', x: 3, y: 10, sprite: 'vegetacao_tropical', frame: { col: 0, row: 0 }, useCrop: true, larguraPx: 32, pivotY: 1, bloqueia: false },
    { id: 'vegetacao_chegada_b', tipo: 'decoracao', x: 4, y: 10, sprite: 'vegetacao_tropical', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 26, pivotY: 1, bloqueia: false },
    { id: 'vegetacao_chegada_c', tipo: 'decoracao', x: 12, y: 9, sprite: 'vegetacao_tropical', frame: { col: 1, row: 0 }, useCrop: true, larguraPx: 30, pivotY: 1, bloqueia: false },
    { id: 'marco_enseada', tipo: 'decoracao', x: 12, y: 11, routeMarker: 'ENSEADA', bloqueia: false },
    ...linhaDoTrem({
      // O trem padrão desenha 622x359 px (9,7 x 11,2 tiles): com o topo em
      // y=-110 ele saía CORTADO pela borda da tela, e o trilho atravessava
      // a cena. Reduzir só a largura deixaria as rodas altas demais, então
      // `escalaY` encolhe a altura junto e o ajusteY desce o conjunto para
      // assentar as rodas no chão.
      // O trem sai de cima da areia andável: ele fica na ORLA NORTE, sobre
      // a borda do mar, com as rodas encostando na areia. Assim o jogador
      // nunca "entra na imagem" — a água é que fica embaixo dele.
      global: { y: -1.1 },
      // O totem fica na AREIA, à frente do trem: o embarque tem que ser
      // alcançável a pé (ele é o ponto de interação do trem).
      totem: { x: 7.2, y: 5.0, ajusteY: 12 },
      // O leito é mais comprido que o trem e ambos compartilham o eixo.
      // A frente e a traseira do trilho permanecem visíveis sob as rodas.
      trilho: { larguraPx: 332, ajusteX: 0, ajusteY: 25 },
      trem: { larguraPx: 270, ajusteX: 0, escalaY: .60, ajusteY: 34 },
    }),

    // ---- ESTAÇÃO DO TREM ----
    // Antes eram dois pilares soltos a 6 tiles do trem, e o trem ficava
    // plantado no meio da areia. A estação agora é construída EM VOLTA dele
    // (que fica em 7.1, 2.0, camada 'fundo'): plataforma atrás, dossel
    // acima, pilares na frente, escada descendo para a praia.
    // Tudo `bloqueia: false` — a estação é cenário, as rotas e o save não
    // mudam. O totem de embarque continua sendo o único bloqueio.
    { id: 'estacao_plataforma', tipo: 'decoracao', x: 7.1, y: 2.0, camada: 'fundo', ordem: -0.1,
      sprite: 'praia_plataforma_kit', frame: { col: 1, row: 0 }, useCrop: true,
      larguraPx: 180, pivotX: .5, pivotY: 1, ajusteX: 24, ajusteY: 5, escalaY: .50, bloqueia: false },
    { id: 'estacao_dossel', tipo: 'decoracao', x: 7.1, y: 2.0, camada: 'fundo', ordem: 0.3,
      sprite: 'praia_plataforma_kit', frame: { col: 2, row: 0 }, useCrop: true,
      larguraPx: 92, pivotX: .5, pivotY: 1, ajusteX: -66, ajusteY: 14, escalaY: .65, bloqueia: false },
    // Sapatas visuais sob as extremidades da plataforma, sem alterar rotas.
    { id: 'estacao_sapata_oeste', tipo: 'decoracao', x: 4.4, y: 2.0, camada: 'fundo', ordem: -1,
      sprite: 'praia_plataforma_kit', frame: { col: 0, row: 1 }, useCrop: true, larguraPx: 35, pivotY: 1, ajusteY: 50, escalaY: 1.05, bloqueia: false },
    { id: 'estacao_sapata_leste', tipo: 'decoracao', x: 10.0, y: 2.0, camada: 'fundo', ordem: -1,
      sprite: 'praia_plataforma_kit', frame: { col: 0, row: 1 }, useCrop: true, larguraPx: 35, pivotY: 1, ajusteY: 50, escalaY: 1.05, bloqueia: false },
    // Os dois pilares do contrato 0314: mesmo id, mesmo y=5, em chão firme.
    { id: 'plataforma_pilar_oeste', tipo: 'decoracao', x: 2, y: 5, sprite: 'praia_plataforma_kit', frame: { col: 0, row: 1 }, useCrop: true, larguraPx: 30, pivotY: 1, escalaY: .86, bloqueia: false },
    { id: 'plataforma_pilar_leste', tipo: 'decoracao', x: 13, y: 5, sprite: 'praia_plataforma_kit', frame: { col: 0, row: 1 }, useCrop: true, larguraPx: 30, pivotY: 1, escalaY: .86, bloqueia: false },
    { id: 'praia_placa_estacao', tipo: 'decoracao', x: 9.6, y: 3.4,
      sprite: 'praia_plataforma_kit', frame: { col: 1, row: 1 }, useCrop: true,
      larguraPx: 82, pivotY: 1, escalaY: .82, bloqueia: false, routeMarker: 'ESTAÇÃO' },
    { id: 'estacao_luminaria', tipo: 'decoracao', x: 12.0, y: 1.5,
      sprite: 'praia_plataforma_kit', frame: { col: 2, row: 1 }, useCrop: true,
      larguraPx: 44, pivotY: 1, escalaY: .80, bloqueia: false },
    { id: 'estacao_escada', tipo: 'decoracao', x: 4.6, y: 4.1,
      sprite: 'praia_plataforma_kit', frame: { col: 3, row: 0 }, useCrop: true,
      larguraPx: 86, pivotY: 1, escalaY: .72, bloqueia: false },
    { id: 'estacao_guarda_corpo', tipo: 'decoracao', x: 10.4, y: 4.5,
      sprite: 'praia_plataforma_kit', frame: { col: 3, row: 1 }, useCrop: true,
      larguraPx: 104, pivotY: 1, escalaY: .74, bloqueia: false },
    { id: 'praia_caixa_estacao', tipo: 'decoracao', x: 12.4, y: 5.4, sprite: 'bio_caixa', useCrop: true, larguraPx: 42, pivotY: 1, bloqueia: false },

    // ---- Ilha A (props originais, inalterados) ----
    // (a palmeira 1 saiu de dentro da poça da cascata: um tile a nordeste)
    prop('palmeira_1', 3.35, 5.9, 0, 0, 82, { bloqueia: true, hitbox: TRONCO }),
    prop('palmeira_2', 13, 8, 1, 0, 82, { bloqueia: true, hitbox: TRONCO }),
    prop('palmeira_3', 5, 11, 2, 0, 100, { bloqueia: true, hitbox: TRONCO }),
    prop('arbusto_1', 5, 6, 3, 0, 50),
    prop('arbusto_2', 4, 8, 3, 0, 50),
    prop('pedras', 9, 6, 2, 1, 60),
    prop('tronco', 10, 9, 3, 1, 70),
    prop('concha', 7, 7, 1, 3, 40),
    prop('naufragio', 8, 11, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),

    // ---- Landmarks nas ilhas novas ----
    prop('naufragio_c', 6, 34, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),
    prop('ancora_c', 8, 35, 2, 3, 46),
    prop('naufragio_d', 28, 29, 3, 2, 90, {
      bloqueia: true,
      hitbox: { offsetX: -0.6, offsetY: -0.4, width: 1.2, height: 0.8 },
    }),
    prop('ancora_d', 30, 30, 2, 3, 46),

    // Sorteio antigo, menos o que cairia dentro de pedra ou de poça.
    ...espalharProps().filter(o => foraDoRelevo(o.x + .5, o.y + .5)),

    // ---- Praia 11: relevo e flora desenhados à mão ----
    ...RELEVO_ILHA_A,
    ...FLORA_ILHA_A,
    ...RELEVO_ARQUIPELAGO,
    ...ROCHAS_DO_MAR,

    // ---- GATES (um por ponte) ----
    // A -> B (ponte no eixo X, linhas 7-8)
    gate('rocha_rachada', 18, 7.5, 0, 1, 110, {
      nome: 'ROCHA RACHADA',
      label: 'EXAMINAR • Q: ROMPER',
      requiredAction: 'golpe_ruptura',
      hitbox: HIT_PONTE_H,
      anyOf: [{ habilidade: 'golpe_ruptura' }, { arquetipo: 'lamina_dominio_anciao' }],
      falha: ['A ROCHA É MUITO DENSA.', 'FALTA FORÇA BRUTA PARA QUEBRÁ-LA.'],
      sucesso: ['A ROCHA SE PARTE EM PEDAÇOS.', 'CAMINHO LIBERADO.'],
    }),

    // Alternativas para Maré e 10X, acessíveis sem abrir a rocha ou o teleférico.
    gate('travessia_mare_eco', 18, 11.5, 0, 2, 85, {
      nome: 'CORRENTE DE ECO', label: 'ATRAVESSAR COM Q', hitbox: HIT_PONTE_H,
      phaseActions: ['passo_corrente', 'forma_veloz'], phaseAxis: 'x', requiredAction: 'travessia',
      actionMessage: 'APONTE PARA A CORRENTE E USE [Q] PARA ATRAVESSAR.',
      anyOf: [{ arquetipo: 'mare_astral' }, { arquetipo: 'nucleo_dez_forma' }],
      falha: ['A CORRENTE EXIGE UM MOVIMENTO FLUIDO OU UMA FORMA VELOZ.'],
      sucesso: ['TRAVESSIA REGISTRADA.'],
    }),
    gate('passagem_mare_eco', 36.5, 19, 2, 2, 85, {
      nome: 'PASSAGEM DE ECO', label: 'ATRAVESSAR COM Q', hitbox: HIT_PONTE_V,
      phaseActions: ['passo_corrente', 'forma_veloz'], phaseAxis: 'y', requiredAction: 'travessia',
      actionMessage: 'APONTE PARA A PASSAGEM E USE [Q] PARA ATRAVESSAR.',
      anyOf: [{ arquetipo: 'mare_astral' }, { arquetipo: 'nucleo_dez_forma' }],
      falha: ['A PASSAGEM EXIGE UM MOVIMENTO FLUIDO OU UMA FORMA VELOZ.'],
      sucesso: ['TRAVESSIA REGISTRADA.'],
    }),

    { id: 'estacao_cabo_praia', tipo: 'decoracao', x: 8, y: 23, cableStation: 'ESTAÇÃO BIO', bloqueia: false },

    // A -> C (ponte no eixo Y, colunas 7-8)
    gate('teleferico_quebrado', 7.5, 18, 1, 2, 130, {
      nome: 'TELEFÉRICO QUEBRADO',
      moduleSystem: {
        id: 'beach_cable_car',
        diagnosisFlag: 'teleferico_diagnosticado',
        allowedArchetypes: ['motor_bio_forja'],
        distance: 2.6,
        label: 'DIAGNOSTICAR CONDUTOR',
        speaker: 'LINK BIO-FORJA',
        dialogue: ['CONDUTOR DO TELEFÉRICO ROMPIDO.', 'RECONSTRUÇÃO DISPONÍVEL: APROXIME-SE E PRESSIONE E.'],
      },
      label: 'RECONSTRUIR CONDUTOR',
      hitbox: HIT_PONTE_V,
      anyOf: [{ arquetipo: 'motor_bio_forja' }],
      requiresFlag: 'teleferico_diagnosticado',
      diagnosisArchetype: 'motor_bio_forja',
      falhaDiagnostico: ['CONDUTOR ROMPIDO.', 'USE [R] PARA DIAGNOSTICAR ANTES DE RECONSTRUIR.'],
      falha: ['O CONDUTOR ESTÁ ROMPIDO.', 'UM OPERADOR DE RECONSTRUÇÃO PODERIA REPARAR.'],
      sucesso: ['CONDUTOR RECONSTRUÍDO.', 'SIGA PELA TRAVESSIA ATÉ A ESTAÇÃO DE EMBARQUE PARA A BIO-FORJA.'],
    }),

    // B -> D (ponte no eixo Y, colunas 30-31)
    gate('caverna_alagada', 30.5, 19, 0, 2, 92, {
      nome: 'CAVERNA ALAGADA',
      label: 'DOMAR CORRENTEZA',
      hitbox: HIT_PONTE_V,
      anyOf: [{ habilidade: 'passo_corrente' }, { arquetipo: 'mare_astral' }],
      falha: ['A ÁGUA PARECE MUITO FUNDA.', 'FALTA CONTROLE DE CORRENTEZA.'],
      sucesso: ['A CORRENTE SE ABRE.', 'PASSAGEM LIBERADA.'],
    }),

    // C -> D (ponte no eixo X, linhas 31-32)
    gate('fenda_estreita', 19, 31.5, 2, 2, 80, {
      nome: 'FENDA ESTREITA',
      label: 'ATRAVESSAR FENDA',
      hitbox: HIT_PONTE_H,
      anyOf: [{ arquetipo: 'nucleo_dez_forma' }],
      falha: ['A FENDA É ESTREITA DEMAIS PARA UM OPERADOR.', 'OUTRA FORMA PODERIA PASSAR.'],
      sucesso: ['A FORMA SE ADAPTA À FENDA.', 'PASSAGEM LIBERADA.'],
    }),
  ],

  portals: [
    { id: 'trilha_estacao_bio', tipo: 'door', x: 8, y: 23, label: 'EMBARCAR PARA ESTAÇÃO BIO', lockedLabel: 'TELEFÉRICO SEM ENERGIA', mensagemBloqueado: ['O TELEFÉRICO ESTÁ PARADO. DIAGNOSTIQUE E REPARE O CONDUTOR NA TRAVESSIA.'], requiresFlag: 'gate_teleferico_quebrado', interactionDistance: 1.4, destino: { mapId: 'ilha_estacao_bio', spawnId: 'inicio' }, transition: 'fade' },
    { id: 'trilha_enseada', tipo: 'door', x: 12, y: 11, label: 'EXPLORAR ENSEADA DOS ECOS', interactionDistance: 1.4, destino: { mapId: 'ilha_enseada_ecos', spawnId: 'vindo_da_praia' }, transition: 'fade' },
    {
      id: 'voltar_trem',
      tipo: 'train',
      x: 8, y: 4,
      label: 'VOLTAR PARA O METRÔ',
      destino: { mapId: 'hub_metro', spawnId: 'vindo_da_ilha' },
      transition: 'fade',
    },
  ],
};

// A flora espalhada entra por último: ela precisa conhecer TUDO que já foi
// colocado (à mão ou sorteado) para não nascer em cima de nada.
map.objects.push(...espalharFlora(map.objects, [
  ...Object.values(map.spawnPoints),
  ...map.portals.map(p => ({ x: p.x + .5, y: p.y + .5 })),
]));
