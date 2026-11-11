// =====================================================================
// CLIMA — o tempo no arquipélago
//
// O criador pediu "mais fauna, vida, clima". Clima não existia: a praia
// tinha sol eterno.
//
// Três decisões de projeto, todas para não virar enfeite:
//
// 1. O clima é um ESTADO DE MUNDO com curva suave, não um sorteio por
//    frame. Existe uma única fonte de verdade (`atualizarClima`) e o
//    desenho só LÊ. Isso deixa o clima testável sem canvas e faz a
//    transição entre sol e tempestade durar minutos, não um pisca.
//
// 2. Ele MUDA O JOGO. Chuva escurece o mapa, aumenta o mar (maré alta
//    alaga a faixa de areia molhada), empurra o vento (que dá direção
//    às ondas) e ressaca deixa o mar mais violento — nadar em tempestade
//    é pior, e isso é medido em `ressacaDoClima`.
//
// 3. Custo fixo. Partícula é orçamento, não "quantas couberem": o teto
//    é constante e o sorteio só decide quem nasce, nunca quantos.
// =====================================================================

// O relógio continua no exterior mesmo durante visitas a interiores; apenas
// sua representação visual é restrita a mapas explicitamente a céu aberto.
export function climaVisivelNoMapa(map) {
  return map?.meta?.tipo === 'exterior';
}

/**
 * Estados possíveis. `forca` é a intensidade do fenômeno; `luz` é o
 * multiplicador de luminosidade aplicado ao mapa (1 = pleno sol).
 */
export const CLIMAS = Object.freeze({
  limpo:    { nome: 'CEU LIMPO',       forca: 0.0, luz: 1.00, vento: 0.35, chuva: 0,    mar: 0.15, cor: '#8fd8ff' },
  brisa:    { nome: 'BRISA DE LESTE',  forca: 0.3, luz: 0.97, vento: 0.80, chuva: 0,    mar: 0.35, cor: '#a8e6ff' },
  nublado:  { nome: 'NUBLADO',         forca: 0.5, luz: 0.84, vento: 0.60, chuva: 0,    mar: 0.55, cor: '#9fb0b8' },
  garoa:    { nome: 'GAROA',           forca: 0.6, luz: 0.78, vento: 0.50, chuva: 0.35, mar: 0.65, cor: '#7f9aa8' },
  chuva:    { nome: 'CHUVA',           forca: 0.8, luz: 0.68, vento: 0.85, chuva: 0.80, mar: 0.85, cor: '#5d7a8a' },
  ressaca:  { nome: 'RESSACA',         forca: 1.0, luz: 0.60, vento: 1.00, chuva: 0.95, mar: 1.00, cor: '#3f5b6b' },
  neblina:  { nome: 'NEBLINA',         forca: 0.45, luz: 0.88, vento: 0.15, chuva: 0,   mar: 0.30, cor: '#c3d2d6' },
});

// Ordem de transição: o clima só "anda" um passo por vez entre vizinhos.
// É o que impede sol virar ressaca em dois segundos.
export const CORRENTE = Object.freeze(['limpo', 'brisa', 'nublado', 'garoa', 'chuva', 'ressaca']);

export const CLIMA = Object.freeze({
  // Segundos, em média, para o clima mudar de faixa. Um dia de jogo tem
  // algumas mudanças, não uma por minuto (que viraria ruído visual).
  segundosPorFaixa: 250,
  // Duração da transição entre faixas (segundos).
  transicao: 70,
  // Orçamento de partículas de chuva por frame. Constante.
  particulasChuva: 120,
  // Rajada de vento: nunca muda de direção de um frame para o outro.
  rajadaSegundos: 7,
});

/**
 * Estado inicial do clima para um mundo. Determinístico por seed, para
 * que o mesmo save abra com o mesmo tempo.
 */
export function criarClima(seed = 1) {
  return {
    indice: 0,          // posição em CORRENTE (alvo)
    fracao: 0,          // 0..1 progresso da transição para o vizinho
    atual: 'limpo',
    proximo: 'brisa',
    // Força/vetor interpolados — é isto que o desenho lê.
    forca: 0,
    luz: 1,
    chuva: 0,
    mar: 0.15,
    vento: 0.35,
    // Direção do vento (radianos) com rajada suave.
    direcao: 0.6,
    rajada: 0,
    t: 0,
    seed,
    // Contador de transições: o teste usa para provar que o clima muda.
    mudancas: 0,
  };
}

function hashClima(n) {
  const h = Math.imul(n ^ 0x9e3779b9, 2246822507) ^ Math.imul(n >>> 13, 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function mistura(a, b, f) {
  return a + (b - a) * f;
}

function curva(f) {
  // smoothstep: a transição começa e termina devagar. Linear aparecia
  // como "luz piscando" na borda entre dois climas.
  return f * f * (3 - 2 * f);
}

/**
 * Um passo de clima. `dt` em segundos. Devolve o estado (mutado).
 *
 * Regra de ouro: `dt` nunca é usado para SALTAR faixas. O avanço é
 * sempre por fração, então um frame longo não teleporta o tempo.
 */
export function atualizarClima(clima, dt) {
  if (!clima) return clima;
  dt = Math.max(0, Math.min(dt, 0.1));
  clima.t += dt;

  // Rajada: senoide lenta mais um pulso curto. Nunca aleatória por frame.
  clima.rajada = Math.sin(clima.t * 0.37 + clima.seed) * 0.5
    + Math.sin(clima.t * 1.13 + clima.seed * 2) * 0.25;

  const passo = dt / CLIMA.transicao;
  clima.fracao += passo;
  if (clima.fracao >= 1) {
    clima.fracao = 0;
    clima.indice = (clima.indice + 1) % CORRENTE.length;
    clima.atual = CORRENTE[clima.indice];
    clima.proximo = CORRENTE[(clima.indice + 1) % CORRENTE.length];
    clima.mudancas++;
  }

  const a = CLIMAS[clima.atual];
  const b = CLIMAS[clima.proximo];
  const f = curva(clima.fracao);

  clima.forca = mistura(a.forca, b.forca, f);
  clima.luz = mistura(a.luz, b.luz, f);
  clima.chuva = mistura(a.chuva, b.chuva, f);
  clima.mar = mistura(a.mar, b.mar, f);
  clima.vento = mistura(a.vento, b.vento, f);
  // Direção do vento gira devagar e sempre na mesma volta: o mar não
  // "troca de lado" de repente.
  clima.direcao = 0.6 + Math.sin(clima.t * 0.05 + clima.seed) * 0.55 + clima.rajada * 0.12;

  return clima;
}

/** Nome legível para o HUD. */
export function nomeDoClima(clima) {
  if (!clima) return CLIMAS.limpo.nome;
  if (clima.fracao > 0.75) return CLIMAS[clima.proximo].nome;
  return CLIMAS[clima.atual].nome;
}

/** Cor de tinta para o HUD (sol = claro, ressaca = escuro). */
export function corDoClima(clima) {
  if (!clima) return CLIMAS.limpo.cor;
  const a = CLIMAS[clima.atual], b = CLIMAS[clima.proximo];
  return clima.fracao > 0.5 ? b.cor : a.cor;
}

/**
 * Efeito do clima no MERGULHO — o pedido "clima" precisa mexer no jogo.
 * Ressaca deixa o mar mais violento: mais correnteza e menos fôlego.
 * Devolve multiplicadores prontos para `nado.js`.
 */
export function ressacaDoClima(clima) {
  const mar = clima?.mar ?? 0.15;
  return {
    correnteza: 1 + mar * 0.55,   // corrente mais forte
    folego: 1 - mar * 0.25,       // menos tempo embaixo
    velocidade: 1 - mar * 0.08,   // água mais pesada
  };
}

/**
 * Quanto da faixa de areia molhada a maré está cobrindo (0..1).
 * É o que faz a praia "respirar" entre maré baixa e alta sem mudar o mapa.
 */
export function mareDoClima(clima) {
  const mar = clima?.mar ?? 0.15;
  return {
    altura: mar,
    // Tiles de areia molhada que ficam submersos visualmente.
    faixa: 0.25 + mar * 0.95,
    // Velocidade das ondas (a espuma avança mais rápido em ressaca).
    velocidadeDasOndas: 0.55 + mar * 0.9,
  };
}

// ---------------------------------------------------------------------
// PARTÍCULAS — orçamento fixo, nascimento por hash
// ---------------------------------------------------------------------
export const MAX_PARTICULAS = CLIMA.particulasChuva;

/**
 * Cria (uma vez) o buffer de partículas. Nunca cresce: nascer uma
 * partícula é reescrever uma das 120 posições.
 */
export function criarParticulas(seed = 7) {
  const lista = [];
  for (let i = 0; i < MAX_PARTICULAS; i++) {
    lista.push({
      x: hashClima(i * 13 + seed) * 1.4 - 0.2,   // 0..1 na tela
      y: hashClima(i * 29 + seed) * 1.2 - 0.1,
      vel: 0.5 + hashClima(i * 17 + seed) * 0.7,
      comprimento: 0.02 + hashClima(i * 31 + seed) * 0.035,
      fase: hashClima(i * 7 + seed) * Math.PI * 2,
    });
  }
  return lista;
}

/**
 * Atualiza as partículas. `visiveis` é quantas devem estar ativas
 * (proporcional à chuva), e é SEMPRE <= MAX_PARTICULAS.
 */
export function atualizarParticulas(lista, clima, dt, visiveis) {
  if (!lista) return 0;
  dt = Math.max(0, Math.min(dt, 0.1));
  const n = Math.max(0, Math.min(lista.length, Math.round(visiveis)));
  const queda = 0.9 + clima.forca * 1.9;
  const derivaX = Math.cos(clima.direcao) * clima.vento * 0.10;
  const derivaY = Math.sin(clima.direcao) * clima.vento * 0.05;

  for (let i = 0; i < n; i++) {
    const p = lista[i];
    p.y += queda * p.vel * dt;
    p.x += derivaX * p.vel * dt;
    p.y += derivaY * 0.2 * dt;
    // Saiu da tela: renasce em cima, deslocada (nunca "teleporta" no meio).
    if (p.y > 1.1) {
      p.y = -0.1 - hashClima(Math.floor(clima.t * 60) + i) * 0.04;
      p.x = hashClima(Math.floor(clima.t * 37) + i * 3) * 1.4 - 0.2;
    }
    if (p.x > 1.25) p.x -= 1.5;
    if (p.x < -0.25) p.x += 1.5;
  }
  return n;
}

/**
 * Multiplicador de luz para a camada de cor do mapa. Em ressaca a praia
 * fica claramente mais escura — é o efeito mais barato e mais legível.
 */
export function tintaDoClima(clima) {
  const luz = clima?.luz ?? 1;
  // Escurece e esfria: o azul sobe um pouco enquanto o vermelho cai.
  const r = Math.round(255 * (0.62 + luz * 0.38));
  const g = Math.round(255 * (0.66 + luz * 0.34));
  const b = Math.round(255 * (0.74 + luz * 0.26));
  const a = Math.max(0, Math.min(0.42, (1 - luz) * 1.05));
  return { r, g, b, a };
}

/** Resumo para o painel/HUD e para o teste. */
export function resumoClima(clima) {
  return {
    clima: nomeDoClima(clima),
    forca: +clima.forca.toFixed(2),
    luz: +clima.luz.toFixed(2),
    chuva: +clima.chuva.toFixed(2),
    mar: +clima.mar.toFixed(2),
    vento: +clima.vento.toFixed(2),
    mudancas: clima.mudancas,
  };
}
