// =====================================================================
// ÁRVORE DE NADO — aprender a nadar em 5 degraus
//
// O pedido do criador: ninguém chega à praia sabendo nadar. O operador
// tem MEDO DA ÁGUA e conquista o mar em degraus, cada um ganho com uma
// PROVA feita dentro do jogo (não em menu):
//
//   0  MEDO DA ÁGUA   o mar empurra de volta; só a poça é segura
//   1  BOIAR          prova: boiar parado na Poça da Cascata
//   2  FÔLEGO         prova: cabeça debaixo d'água sem engolir água
//   3  TRAVESSIA      prova: atravessar um canal a nado
//   4  MARÉ PLENA     prova: tocar o fundo do azul-escuro
//
// Cada degrau tem um LIMITE que vale o tempo todo (e é testado):
//   alcance   até que distância da AREIA dá para ir (tiles);
//   mergulho  até que profundidade o corpo desce (no degrau 1 é só a
//             cabeça: o corpo continua na superfície);
//   ar        quanto fôlego cabe no peito (segundos);
//   velocidade fração da braçada plena.
//
// Decisões que evitam os becos sem saída já vividos neste projeto:
//
//   - O alcance mede distância da AREIA DE VERDADE. A ponte não conta:
//     senão quem só sabe boiar atravessaria o canal "segurando no deque"
//     e as pontes trancadas deixariam de significar alguma coisa.
//   - POÇA é exceção de tudo: é rasa, fica em cima de areia e é onde se
//     treina. Vale no degrau 0, ignora alcance e nunca tem correnteza.
//   - Mergulhar é um GESTO (segurar ESPAÇO), não consequência do fundo.
//     Na poça não existe fundo para "cair": sem o gesto, a prova de
//     respirar seria inalcançável.
//   - O andamento da prova mora em `progress.nado.andamento` (no save),
//     não no jogador: trocar de jogador/quadro não zera a prova.
//   - A árvore é OPT-IN: `atualizarNado` sem `arvore` continua sendo o
//     mergulho livre de antes (é o que os testes antigos exercitam).
// =====================================================================
import { pocaEm } from '../engine/pocas.js';
import { createCoastField } from '../engine/coast-field.js';
import { recordQuestEvent, startQuest, ensureQuestLog } from './quests.js';

export const MISSAO_NADO = 'aprender_a_nadar';

/** Profundidade do corpo na SUPERFÍCIE: abaixo de 1.25 ninguém está submerso. */
export const SUPERFICIE = .9;

export const DEGRAUS = Object.freeze([
  Object.freeze({
    nivel: 0, id: 'medo', nome: 'MEDO DA ÁGUA',
    alcance: .9, mergulho: 0, ar: 0, velocidade: .5, arrancada: false,
    resumo: 'O mar assusta. Só a poça é segura.',
  }),
  Object.freeze({
    nivel: 1, id: 'boiar', nome: 'BOIAR',
    alcance: 1.45, mergulho: SUPERFICIE, ar: 5, velocidade: .62, arrancada: false,
    resumo: 'Entra no raso, até onde dá pé.',
  }),
  Object.freeze({
    nivel: 2, id: 'respirar', nome: 'FÔLEGO',
    alcance: 4.5, mergulho: 1.2, ar: 9, velocidade: .8, arrancada: true,
    resumo: 'Nada entre as ilhas e prende o ar.',
  }),
  Object.freeze({
    nivel: 3, id: 'travessia', nome: 'TRAVESSIA',
    alcance: Infinity, mergulho: 2, ar: 13, velocidade: .92, arrancada: true,
    resumo: 'Mar aberto. Mergulhos curtos.',
  }),
  Object.freeze({
    nivel: 4, id: 'mare', nome: 'MARÉ PLENA',
    alcance: Infinity, mergulho: 2, ar: 22, velocidade: 1, arrancada: true,
    resumo: 'Mergulho livre até o fundo.',
  }),
]);

export const NIVEL_MAXIMO = DEGRAUS.length - 1;

export const PROVAS = Object.freeze([
  Object.freeze({
    id: 'boiar', de: 0, nome: 'BOIAR', meta: 3, unidade: 's',
    instrucao: 'Entre na Poça da Cascata e solte os controles: boie parado.',
    curta: 'BOIE PARADO NA POÇA',
  }),
  Object.freeze({
    id: 'respirar', de: 1, nome: 'RESPIRAR', meta: 4, unidade: 's',
    instrucao: 'Na água, segure ESPAÇO e fique com a cabeça submersa.',
    curta: 'SEGURE ESPAÇO: CABEÇA NA ÁGUA',
  }),
  Object.freeze({
    id: 'travessia', de: 2, nome: 'TRAVESSIA', meta: 6, unidade: 'm',
    instrucao: 'Atravesse um canal a nado e saia em outra ilha, sem pisar na ponte.',
    curta: 'NADE ATÉ OUTRA ILHA',
  }),
  Object.freeze({
    id: 'fundo', de: 3, nome: 'TOCAR O FUNDO', meta: 1.2, unidade: 's',
    instrucao: 'No azul-escuro, segure ESPAÇO até tocar o fundo.',
    curta: 'SEGURE ESPAÇO NO AZUL-ESCURO',
  }),
]);

/** Fundo mínimo que conta como "o fundo" na última prova. */
export const FUNDO_DA_PROVA = 1.9;

const limitar = (v, a, b) => Math.max(a, Math.min(b, v));
const nivelValido = n => (Number.isInteger(n) ? limitar(n, 0, NIVEL_MAXIMO) : 0);

// ---------------------------------------------------------------------
// ESTADO (mora em `progress.nado`, vai no save por inteiro)
// ---------------------------------------------------------------------
export function criarArvore(nivel = 0) {
  return { nivel: nivelValido(nivel), provas: {}, andamento: null, respeito: 0 };
}

/**
 * Save antigo que JÁ nadava não pode acordar com medo da água: quem tem
 * fragmento de maré, missão de mergulho andada ou bicho socorrido herda
 * o degrau pleno.
 */
export function jaNadava(progress) {
  if (!progress) return false;
  const f = progress.flags ?? {};
  if (Array.isArray(f.mareFragSupridos) && f.mareFragSupridos.length > 0) return true;
  if (f.mare_profunda_concluida || f.mare_salva_vidas_concluida) return true;
  const mare = progress.questLog?.mare_profunda;
  if (mare && Array.isArray(mare.counters) && mare.counters.some(c => c > 0)) return true;
  const curada = progress.faunaCurada;
  if (curada && typeof curada === 'object' && Object.keys(curada).length > 0) return true;
  return false;
}

function valida(arvore) {
  return arvore && typeof arvore === 'object' && !Array.isArray(arvore) && Number.isInteger(arvore.nivel);
}

/** Leitura (HUD, diário, renderer): nunca escreve no save. */
export function lerArvore(progress) {
  if (valida(progress?.nado)) return progress.nado;
  return criarArvore(jaNadava(progress) ? NIVEL_MAXIMO : 0);
}

/** Escrita (laço do jogo): cria a árvore e migra save antigo. */
export function garantirArvore(progress) {
  if (!progress) return criarArvore(NIVEL_MAXIMO);
  if (!valida(progress.nado)) {
    const herdou = jaNadava(progress);
    progress.nado = criarArvore(herdou ? NIVEL_MAXIMO : 0);
    if (herdou) {
      progress.nado.herdado = true;
      for (const p of PROVAS) progress.nado.provas[p.id] = true;
    }
  }
  const a = progress.nado;
  a.nivel = nivelValido(a.nivel);
  if (!a.provas || typeof a.provas !== 'object') a.provas = {};
  if (!Number.isFinite(a.respeito)) a.respeito = 0;
  return a;
}

export const degrauDe = arvore => DEGRAUS[nivelValido(arvore?.nivel)];
export const provaDe = arvore => PROVAS.find(p => p.de === nivelValido(arvore?.nivel)) ?? null;

/** Nome do último degrau depende de quem nada: o Maré Astral é a maré. */
export function nomeDoDegrau(arvore, arquetipo) {
  const d = degrauDe(arvore);
  return d.nivel === NIVEL_MAXIMO && arquetipo === 'mare_astral' ? 'MARÉ ASTRAL' : d.nome;
}

// ---------------------------------------------------------------------
// ALCANCE — distância da areia de verdade (ponte não é chão)
// ---------------------------------------------------------------------
const ESCALA_AREIA = 4;
const camposDeAreia = new WeakMap();

export function campoDeAreia(map) {
  if (!map?.aguaPraia) return null;
  let campo = camposDeAreia.get(map);
  if (!campo) {
    const semPonte = map.aguaPraia.map(linha => linha.replace(/[Bb]/g, 'Y'));
    const f = createCoastField(semPonte, ESCALA_AREIA);
    campo = { width: f.width, height: f.height, scale: f.scale, dist: f.distLand };
    camposDeAreia.set(map, campo);
  }
  return campo;
}

/**
 * Tiles até o CENTRO da célula de terra mais próxima: vale .5 na linha
 * d'água, 1 no meio da primeira célula de mar, 2 na segunda...
 */
export function distanciaDaAreia(map, x, y) {
  const campo = campoDeAreia(map);
  if (!campo) return Infinity;
  const fx = limitar(x * campo.scale - .5, 0, campo.width - 1.001);
  const fy = limitar(y * campo.scale - .5, 0, campo.height - 1.001);
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const bx = fx - x0, by = fy - y0;
  const i = y0 * campo.width + x0;
  const d = campo.dist;
  return (d[i] * (1 - bx) + d[i + 1] * bx) * (1 - by)
    + (d[i + campo.width] * (1 - bx) + d[i + campo.width + 1] * bx) * by;
}

/** Direção unitária que leva de volta à areia (contra o gradiente). */
export function direcaoDaAreia(map, x, y) {
  const e = .3;
  const gx = distanciaDaAreia(map, x + e, y) - distanciaDaAreia(map, x - e, y);
  const gy = distanciaDaAreia(map, x, y + e) - distanciaDaAreia(map, x, y - e);
  const m = Math.hypot(gx, gy);
  if (!(m > 1e-4)) return { x: 0, y: 0 };
  return { x: -gx / m, y: -gy / m };
}

/** O degrau `nivel` pode estar neste ponto de água? Poça vale sempre. */
export function dentroDoAlcance(map, x, y, nivel) {
  if (pocaEm(map, x, y)) return true;
  const grau = DEGRAUS[nivelValido(nivel)];
  if (grau.alcance === Infinity) return true;
  return distanciaDaAreia(map, x, y) <= grau.alcance;
}

// ---------------------------------------------------------------------
// ILHAS — para a prova de travessia saber que se chegou a OUTRA margem
// ---------------------------------------------------------------------
const TERRA = 'SMTPR';
const AGUA = 'YyDdX';
const rotulos = new WeakMap();

function rotularIlhas(map) {
  const g = map.aguaPraia, linhas = g.length, cols = g[0].length;
  const rot = new Int16Array(cols * linhas);
  let proximo = 0;
  const pilha = [];
  for (let y = 0; y < linhas; y++) {
    for (let x = 0; x < cols; x++) {
      if (rot[y * cols + x] || !TERRA.includes(g[y][x])) continue;
      proximo++;
      rot[y * cols + x] = proximo;
      pilha.push(x, y);
      while (pilha.length) {
        const cy = pilha.pop(), cx = pilha.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= linhas) continue;
          const i = ny * cols + nx;
          if (rot[i] || !TERRA.includes(g[ny][nx])) continue;
          rot[i] = proximo;
          pilha.push(nx, ny);
        }
      }
    }
  }
  return { rot, cols, linhas, total: proximo };
}

/** Número da ilha (1..n) sob o ponto; 0 em água e em ponte. */
export function ilhaEm(map, x, y) {
  if (!map?.aguaPraia) return 0;
  let r = rotulos.get(map);
  if (!r) { r = rotularIlhas(map); rotulos.set(map, r); }
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= r.cols || cy >= r.linhas) return 0;
  return r.rot[cy * r.cols + cx];
}

// ---------------------------------------------------------------------
// BOIAS — o limite do degrau desenhado no mar
//
// Parede invisível é o pior tipo de limite. Para os degraus com alcance
// (1 e 2) o contorno `distância da areia = alcance` vira um cordão de
// boias. Calculado uma vez por (mapa, degrau): marching squares sobre a
// grade de tiles, amostrado a cada ~.7 tile.
// ---------------------------------------------------------------------
const boiasCache = new WeakMap();

export function boiasDoLimite(map, nivel) {
  const grau = DEGRAUS[nivelValido(nivel)];
  if (!map?.aguaPraia || grau.alcance === Infinity || grau.nivel === 0) return [];
  let porNivel = boiasCache.get(map);
  if (!porNivel) { porNivel = {}; boiasCache.set(map, porNivel); }
  if (porNivel[grau.nivel]) return porNivel[grau.nivel];

  const g = map.aguaPraia, linhas = g.length, cols = g[0].length;
  const PASSO = .5, alvo = grau.alcance;
  const nx = Math.floor(cols / PASSO), ny = Math.floor(linhas / PASSO);
  const v = new Float32Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) v[j * (nx + 1) + i] = distanciaDaAreia(map, i * PASSO, j * PASSO) - alvo;

  const pontos = [];
  const cruzar = (xa, ya, va, xb, yb, vb) => {
    const t = va / (va - vb);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  };
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = v[j * (nx + 1) + i], b = v[j * (nx + 1) + i + 1];
      const c = v[(j + 1) * (nx + 1) + i + 1], d = v[(j + 1) * (nx + 1) + i];
      const cortes = [];
      const x0 = i * PASSO, y0 = j * PASSO, x1 = x0 + PASSO, y1 = y0 + PASSO;
      if ((a < 0) !== (b < 0)) cortes.push(cruzar(x0, y0, a, x1, y0, b));
      if ((b < 0) !== (c < 0)) cortes.push(cruzar(x1, y0, b, x1, y1, c));
      if ((c < 0) !== (d < 0)) cortes.push(cruzar(x1, y1, c, x0, y1, d));
      if ((d < 0) !== (a < 0)) cortes.push(cruzar(x0, y1, d, x0, y0, a));
      if (cortes.length < 2) continue;
      const mx = (cortes[0][0] + cortes[1][0]) / 2, my = (cortes[0][1] + cortes[1][1]) / 2;
      // Só em água de verdade, e sem amontoar.
      const cel = g[Math.floor(my)]?.[Math.floor(mx)];
      if (!cel || !'YyDdX'.includes(cel)) continue;
      if (pontos.some(p => Math.abs(p.x - mx) < .62 && Math.abs(p.y - my) < .62 && Math.hypot(p.x - mx, p.y - my) < .62)) continue;
      pontos.push({ x: mx, y: my, fase: (mx * 1.7 + my * 2.3) % (Math.PI * 2) });
    }
  }
  porNivel[grau.nivel] = pontos;
  return pontos;
}

// ---------------------------------------------------------------------
// PROVAS
// ---------------------------------------------------------------------
function andamentoDe(arvore, prova, mapa) {
  const a = arvore.andamento;
  if (a && a.id === prova.id && a.mapa === mapa) return a;
  arvore.andamento = { id: prova.id, mapa, valor: 0 };
  return arvore.andamento;
}

function concluir(progress, arvore, prova) {
  arvore.provas[prova.id] = true;
  arvore.nivel = nivelValido(prova.de + 1);
  arvore.andamento = null;
  const missoes = recordQuestEvent(progress, { type: 'nado_degrau', target: prova.id });
  return { degrau: DEGRAUS[arvore.nivel], prova, missoes };
}

/**
 * Avança a prova do degrau atual. Chamado uma vez por quadro, DEPOIS do
 * movimento. `ctx`: { map, player, nado, progress, dt, parado }
 *   parado = nenhum comando de direção neste quadro.
 * Devolve `{ subiu }` — o degrau recém-conquistado, ou null.
 */
export function atualizarProvas(ctx) {
  const { map, player, nado, progress, dt = 0, parado = false } = ctx;
  const out = { subiu: null, prova: null, valor: 0, meta: 0 };
  if (!map?.aguaPraia || !player || !nado || !progress) return out;
  const arvore = garantirArvore(progress);
  const prova = provaDe(arvore);
  if (!prova) return out;
  const and = andamentoDe(arvore, prova, map.id);
  out.prova = prova; out.meta = prova.meta;

  const poca = pocaEm(map, player.x, player.y);

  if (prova.id === 'boiar') {
    // Boiar é NÃO fazer: na poça, sem comando e sem embalo.
    const quieto = parado && Math.hypot(nado.vx ?? 0, nado.vy ?? 0) < .5;
    if (poca && nado.ativo && quieto) and.valor += dt;
    else and.valor = Math.max(0, and.valor - dt * 1.5);
  } else if (prova.id === 'respirar') {
    // Contínuo: subir para respirar recomeça a contagem.
    if (nado.ativo && nado.submerso) and.valor += dt;
    else and.valor = 0;
  } else if (prova.id === 'travessia') {
    // Pela CÉLULA (não por `nado.ativo`): na franja da praia a água ainda
    // tem profundidade 0 e já não é ilha.
    const cel = map.aguaPraia[Math.floor(player.y)]?.[Math.floor(player.x)];
    const naAgua = !poca && cel != null && AGUA.includes(cel);
    const ilha = naAgua ? 0 : ilhaEm(map, player.x, player.y);
    const salto = and.px == null ? 0 : Math.hypot(player.x - and.px, player.y - and.py);
    and.px = player.x; and.py = player.y;
    if (salto > 1.5) { and.origem = null; and.valor = 0; }          // teleporte não é nado
    else if (naAgua) {
      if (and.origem) and.valor += salto;
    } else if (ilha > 0) {
      if (and.origem && and.origem !== ilha && and.valor >= prova.meta) {
        out.subiu = concluir(progress, arvore, prova);
        return out;
      }
      and.origem = ilha;
      and.valor = 0;
    } else {
      // Ponte: cada passo no deque DESCONTA do que foi nadado. Esbarrar
      // na ponte no meio do canal quase não custa; atravessar andando
      // zera a prova.
      and.valor = Math.max(0, and.valor - salto);
    }
  } else if (prova.id === 'fundo') {
    const noFundo = nado.ativo && nado.submerso
      && (nado.fundo ?? 0) >= FUNDO_DA_PROVA && nado.profundidade >= FUNDO_DA_PROVA - .12;
    if (noFundo) and.valor += dt;
    else and.valor = Math.max(0, and.valor - dt * 2);
  }

  out.valor = and.valor;
  if (prova.id !== 'travessia' && and.valor >= prova.meta) out.subiu = concluir(progress, arvore, prova);
  return out;
}

// ---------------------------------------------------------------------
// MISSÃO
// ---------------------------------------------------------------------
/**
 * Abre APRENDER A NADAR na primeira vez que o operador pisa numa praia
 * e alinha a missão com as provas já feitas (os contadores do motor são
 * incrementais; aqui o valor é absoluto: prova feita = objetivo feito).
 * Quem herdou o nado de um save antigo não recebe aula.
 */
export function garantirMissaoDeNado(progress) {
  const arvore = garantirArvore(progress);
  if (arvore.herdado) return null;
  const log = ensureQuestLog(progress, true);
  const nova = !log[MISSAO_NADO];
  if (nova) startQuest(progress, MISSAO_NADO);
  if (nova || log[MISSAO_NADO]?.status !== 'completed') {
    for (const p of PROVAS) {
      if (arvore.provas[p.id] || arvore.nivel > p.de) recordQuestEvent(progress, { type: 'nado_degrau', target: p.id });
    }
  }
  return nova ? MISSAO_NADO : null;
}

/** Resumo pronto para HUD e diário (não escreve nada). */
export function resumoDaArvore(progress, arquetipo = progress?.archetype) {
  const arvore = lerArvore(progress);
  const prova = provaDe(arvore);
  const and = prova && arvore.andamento?.id === prova.id ? arvore.andamento : null;
  return {
    nivel: arvore.nivel,
    maximo: NIVEL_MAXIMO,
    nome: nomeDoDegrau(arvore, arquetipo),
    degrau: degrauDe(arvore),
    prova,
    valor: and?.valor ?? 0,
    fracao: prova ? limitar((and?.valor ?? 0) / prova.meta, 0, 1) : 1,
    herdado: !!arvore.herdado,
  };
}
