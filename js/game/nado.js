// =====================================================================
// NATAÇÃO — locomoção aquática (o "Aquaman" do Maré Astral)
//
// O criador quer que o Maré Astral se locomova COMO UM NADADOR DE
// VERDADE: arrancada, planeio, curva, correnteza — não "andar devagar
// dentro da água". E que isso PROGRIDA: no começo é só nadar, depois
// vira deslocamento imponente conforme se ganha respeito do mar.
//
// Modelo (tudo aditivo sobre o deslocamento normal):
//
//   - TERRA continua sendo `walkMask` (nada muda no que já funciona);
//   - ÁGUA é superfície nadável, com profundidade vinda do campo de costa;
//   - MOVIMENTO tem INÉRCIA: a velocidade persegue a direção desejada em
//     vez de trocar instantaneamente. É isso que dá a sensação de "fluido".
//   - ARRANCADA (dash aquático): impulso curto e forte na direção apontada.
//   - PLANEIO: quando você solta a direção, o corpo CONTINUA deslizando e
//     vai perdendo velocidade — de novo, sensação de natação.
//   - CORRENTEZA: o mar empurra. Existe um campo de corrente suave que
//     varia com o tempo; nadar contra ela é mais lento, a favor é mais
//     rápido. É o que torna o deslocamento "um lugar", não um piso pintado.
//   - PROGRESSÃO: `respeito` (0..1) sobe com mergulhos, coleta e tempo de
//     nado; aumenta velocidade, ar e força da arrancada. É a curva que
//     transforma "nadar" em "dominar a maré".
//
// Nada aqui altera colisão: o módulo só devolve números. Quem aplica o
// deslocamento continua sendo `player.js` + `moveWithCollision`.
// =====================================================================

export const AGUA = 'YyDdX';
export const AGUA_FUNDA = 'DdX';
const DECK = 'Bb';

export const isAgua = c => c != null && AGUA.includes(c);
export const isAguaFunda = c => c != null && AGUA_FUNDA.includes(c);
export const isDeck = c => c != null && DECK.includes(c);

// ---------------------------------------------------------------------
// CONSTANTES
// ---------------------------------------------------------------------
export const NADO = {
  // Velocidades relativas ao andar. Nadar continua mais lento que andar
  // (a água não vira atalho), mas o TETO sobe com o respeito do mar.
  velocidade: 0.82,
  velocidadeFundo: 0.92,
  // Teto de maestria: o melhor nadador do arquipélago ainda é um pouco
  // mais lento que correr a seco — coerência de rotas.
  bonusRespeito: 0.52,

  // --- inércia ---
  // Quanto da velocidade atual sobrevive por segundo (planeio).
  // 0.999 = planeia muito; aqui escolhemos algo com atrito perceptível.
  atrito: 1.15,
  // Quão rápido a aceleração vira velocidade (menor = mais "pesado").
  aceleracao: 7.5,
  // Velocidade mínima considerada parada, para não tremer.
  epsilon: 0.02,

  // --- arrancada ---
  arrancadaForca: 4.2,
  arrancadaDuracao: 0.42,
  arrancadaRecarga: 1.5,
  // Bônus da arrancada com Maré Astral equipado.
  arrancadaMare: 1.45,
  arrancadaRecargaMare: 1.1,

  // --- ar ---
  arMaximo: 22,
  recuperacao: 9,
  consumo: 1,
  arCritico: 4,
  danoAfogamento: 6,
  // O respeito do mar aumenta o fôlego (até +80%).
  arBonusMax: 0.8,

  // --- correnteza ---
  correnteForca: 0.55,
  // Escala espacial da corrente (tiles por ciclo): largo, não "piscina".
  correnteEscala: 0.09,
  correnteVelocidade: 0.22,

  suavidade: 6,
  // Ganho de respeito por segundo nadando fundo / por mergulho novo.
  respeitoPorSegundo: 0.012,
  respeitoPorMergulho: 0.05,
  respeitoMax: 1,
};

// ---------------------------------------------------------------------
// MAPA
// ---------------------------------------------------------------------
export function tileAtWorld(map, x, y) {
  return map?.aguaPraia?.[Math.floor(y)]?.[Math.floor(x)];
}

export function podeNadar(map, x, y) {
  const c = tileAtWorld(map, x, y);
  return isAgua(c) && !isDeck(c);
}

/**
 * Profundidade em 0..2. Usa o campo de costa (contínuo) quando existe,
 * porque é o MESMO dado que escurece o mar assado: o que se vê é o que
 * se nada.
 */
export function profundidadeEm(map, x, y, field) {
  if (!podeNadar(map, x, y)) return 0;
  if (field?.distLand) {
    const px = Math.min(field.width - 1, Math.max(0, Math.floor(x * field.scale)));
    const py = Math.min(field.height - 1, Math.max(0, Math.floor(y * field.scale)));
    const d = field.distLand[py * field.width + px];
    return Math.max(0, Math.min(2, (d - .55) / 1.05));
  }
  return isAguaFunda(tileAtWorld(map, x, y)) ? 2 : 1;
}

export const estaNaSuperficie = (profundidade) => profundidade < 1.25;

// ---------------------------------------------------------------------
// CORRENTEZA
//
// Campo suave e determinístico no tempo: duas senoides em coordenadas de
// mundo. Não precisa de textura nem de memória: é uma função.
// Devolve vetor em tiles/segundo, já com magnitude de corrente.
// ---------------------------------------------------------------------
export function correnteEm(wx, wy, tempo) {
  const s = NADO.correnteEscala;
  const t = tempo * NADO.correnteVelocidade;
  const vx = Math.sin(wy * s * 3.1 + t) * Math.cos(wx * s * 1.7 - t * .7);
  const vy = Math.cos(wx * s * 2.6 - t * 1.1) * Math.sin(wy * s * 1.9 + t * .6);
  return {
    x: vx * NADO.correnteForca,
    y: vy * NADO.correnteForca,
    // Velocidade local: 0 = remanso, 1 = corrente forte. Serve para HUD.
    forca: Math.min(1, Math.hypot(vx, vy) * .85),
  };
}

/** Quanto a corrente ajuda/atrapalha o movimento desejado. */
export function fatorCorrente(corrente, dirX, dirY) {
  const mag = Math.hypot(dirX, dirY);
  if (mag < NADO.epsilon) return 1;
  const nx = dirX / mag, ny = dirY / mag;
  // Projeção do vetor da corrente sobre a direção desejada, em -1..1.
  const proj = (corrente.x * nx + corrente.y * ny) / NADO.correnteForca;
  // Nadar a favor até +45%, contra até -40%.
  return 1 + proj * .45;
}

// ---------------------------------------------------------------------
// RESPEITO DO MAR — a curva de progressão
//
// O criador: "a interação com a vida marítima ir progredindo, conforme
// fica mais forte e conquista o respeito". Respeito sobe nadando fundo,
// mergulhando e coletando; nunca cai. É o eixo que faz o nado evoluir.
// ---------------------------------------------------------------------
export function criarRespeito() {
  return { valor: 0, mergulhos: 0, distanteNadada: 0 };
}

/** Sobe o respeito (nunca passa de 1, nunca desce). */
export function ganharRespeito(respeito, quantidade) {
  if (!respeito) return 0;
  const q = Number.isFinite(quantidade) && quantidade > 0 ? quantidade : 0;
  respeitO(respeito).valor = Math.min(NADO.respeitoMax, respeitO(respeito).valor + q);
  return respeitO(respeito).valor;
}

function respeitO(r) { return r; }

/** Multiplicadores derivados do respeito. */
export function derivadosDoRespeito(respeito) {
  const bruto = respeitO(respeito)?.valor ?? 0;
  const v = Math.max(0, Math.min(NADO.respeitoMax, bruto));
  return {
    valor: v,
    velocidade: 1 + v * NADO.bonusRespeito,
    ar: 1 + v * NADO.arBonusMax,
    arrancada: 1 + v * .6,
  };
}

// ---------------------------------------------------------------------
// ESTADO
// ---------------------------------------------------------------------
export function criarEstadoNado() {
  return {
    ativo: false,
    profundidade: 0,
    submerso: false,
    afogando: false,
    ar: NADO.arMaximo,

    // inércia
    vx: 0,
    vy: 0,
    // última direção de fato nadada (para a arrancada e o desenho)
    dirX: 0,
    dirY: 1,

    // arrancada
    arrancada: 0,          // segundos restantes de impulso
    recargaArrancada: 0,

    // correnteza no ponto atual (para HUD e para o movimento)
    corrente: { x: 0, y: 0, forca: 0 },

    // progressão
    respeito: criarRespeito(),
    // compatibilidade com a fase anterior
    propulsao: 0,
    recargaPropulsao: 0,
  };
}

/**
 * Atualiza nado. `ctx`: { map, x, y, field, dt, dirX, dirY, tempo }
 * Devolve efeitos para quem chamou aplicar (dano, eventos).
 */
export function atualizarNado(nado, ctx) {
  const { map, x, y, field, dt = 0, tempo = 0, clima = null } = ctx;
  const antes = nado.ativo;

  // Ressaca: o clima entra no nado como fator de mar. Fica guardado no
  // próprio estado para `moverNaAgua` e o HUD lerem sem recalcular.
  nado.climaMar = clima?.mar ?? 0;
  nado.climaCorrenteza = 1 + (clima?.mar ?? 0) * 0.55;
  nado.climaFolego = 1 - (clima?.mar ?? 0) * 0.25;

  const prof = profundidadeEm(map, x, y, field);
  nado.ativo = prof > 0;

  // Suavização visual da profundidade: entrar na água não "pula".
  nado.profundidade += (prof - nado.profundidade) * Math.min(1, NADO.suavidade * dt);
  nado.submerso = nado.ativo && prof > 1.25;

  // ---- correnteza local ----
  if (nado.ativo) {
    const c = correnteEm(x, y, tempo);
    // A correnteza do mar local é amplificada pela ressaca.
    nado.corrente = { x: c.x * nado.climaCorrenteza, y: c.y * nado.climaCorrenteza, forca: c.forca * nado.climaCorrenteza };
  } else {
    nado.corrente = { x: 0, y: 0, forca: 0 };
  }

  // ---- respeito sobe nadando fundo ----
  if (nado.submerso) {
    const antesValor = nado.respeito.valor;
    nado.respeito.valor = Math.min(
      NADO.respeitoMax,
      nado.respeito.valor + NADO.respeitoPorSegundo * dt
    );
    nado.respeito.distanteNadada += Math.hypot(nado.vx, nado.vy) * dt;
    void antesValor;
  }
  const derivados = derivadosDoRespeito(nado.respeito);

  // ---- ar ----
  const arMax = NADO.arMaximo * derivados.ar * nado.climaFolego;
  if (!nado.ativo || !nado.submerso) {
    nado.ar = Math.min(arMax, nado.ar + NADO.recuperacao * dt);
    nado.afogando = false;
  } else {
    nado.ar = Math.max(0, nado.ar - NADO.consumo * dt);
    nado.afogando = nado.ar <= 0;
  }

  // ---- timers ----
  nado.recargaArrancada = Math.max(0, nado.recargaArrancada - dt);
  nado.arrancada = Math.max(0, nado.arrancada - dt);
  nado.recargaPropulsao = Math.max(0, nado.recargaPropulsao - dt);
  nado.propulsao = Math.max(0, nado.propulsao - dt);

  const efeitos = {
    entrou: nado.ativo && !antes,
    saiu: !nado.ativo && antes,
    dano: 0,
    semAr: false,
  };
  if (nado.afogando) {
    efeitos.dano = NADO.danoAfogamento * dt;
    efeitos.semAr = true;
  }
  return efeitos;
}

// ---------------------------------------------------------------------
// MOVIMENTO
// ---------------------------------------------------------------------
/**
 * Integra a velocidade com INÉRCIA e correnteza.
 *
 * `baseSpeed` está em TILES POR SEGUNDO (CONFIG.PLAYER_SPEED = 4.0).
 * Devolve { dx, dy } em TILES para este quadro — quem aplica é o player.
 *
 * Este é o coração da sensação "Aquaman": a velocidade não teleporta na
 * direção desejada, ela persegue a direção e mantém o planeio.
 */
export function moverNaAgua(nado, dt, dirX, dirY, baseSpeed) {
  const d = derivadosDoRespeito(nado.respeito);
  const temDirecao = Math.hypot(dirX, dirY) > NADO.epsilon;

  if (temDirecao) {
    const mag = Math.hypot(dirX, dirY);
    nado.dirX = dirX / mag;
    nado.dirY = dirY / mag;
  }

  // Velocidade alvo: a direção desejada × velocidade base de nado.
  const fatorBase = (NADO.velocidade + (nado.submerso ? NADO.velocidadeFundo - NADO.velocidade : 0))
    * d.velocidade;
  let alvoX = 0, alvoY = 0;
  if (temDirecao) {
    const fator = fatorCorrente(nado.corrente, dirX, dirY);
    alvoX = nado.dirX * baseSpeed * fatorBase * fator;
    alvoY = nado.dirY * baseSpeed * fatorBase * fator;
  } else if (nado.arrancada > 0) {
    // Soltar a direção durante a arrancada mantém o embalo na última
    // direção: é o "deslize" de quem está nadando.
    alvoX = nado.dirX * baseSpeed * fatorBase * 1.25;
    alvoY = nado.dirY * baseSpeed * fatorBase * 1.25;
  }

  // Arrancada soma impulso forte na direção atual.
  if (nado.arrancada > 0 && temDirecao) {
    const impulso = NADO.arrancadaForca * (d.arrancada);
    alvoX += nado.dirX * baseSpeed * impulso;
    alvoY += nado.dirY * baseSpeed * impulso;
  }

  if (temDirecao || nado.arrancada > 0) {
    // Com direção: persegue o alvo sem saltar para ele (é a "pegada" da
    // braçada).
    const k = Math.min(1, NADO.aceleracao * dt);
    nado.vx += (alvoX - nado.vx) * k;
    nado.vy += (alvoY - nado.vy) * k;
  } else {
    // Sem direção: PLANEIO. A velocidade NÃO persegue zero — ela decai
    // devagar, como corpo deslizando na água. Perseguir zero dava um freio
    // instantâneo e matava a sensação de natação.
    const atrito = Math.exp(-NADO.atrito * dt);
    nado.vx *= atrito;
    nado.vy *= atrito;
    if (Math.hypot(nado.vx, nado.vy) < NADO.epsilon) { nado.vx = 0; nado.vy = 0; }
  }

  // Correnteza empurra sempre, mesmo parado.
  const dx = (nado.vx + nado.corrente.x) * dt;
  const dy = (nado.vy + nado.corrente.y) * dt;
  return { dx, dy };
}

/** Dispara a arrancada. Maré Astral tem versão melhor. */
export function dispararArrancada(nado, mareAstral) {
  if (!nado?.ativo) return false;
  if (nado.recargaArrancada > 0) return false;
  nado.arrancada = NADO.arrancadaDuracao * (mareAstral ? 1.15 : .85);
  nado.recargaArrancada = mareAstral ? NADO.arrancadaRecargaMare : NADO.arrancadaRecarga;
  return true;
}

// ---------------------------------------------------------------------
// COMPATIBILIDADE (API da fase anterior)
// ---------------------------------------------------------------------
export function dispararPropulsao(nado, alinhadoAoMare) {
  return dispararArrancada(nado, alinhadoAoMare);
}

export function multiplicadorVelocidade(nado, velocidadeBase) {
  if (!nado.ativo) return velocidadeBase;
  const d = derivadosDoRespeito(nado.respeito);
  const base = NADO.velocidade + (nado.submerso ? NADO.velocidadeFundo - NADO.velocidade : 0);
  const impulso = nado.arrancada > 0 ? 1.35 : 1;
  return velocidadeBase * base * d.velocidade * impulso;
}

export function destinoValido(map, x, y) {
  if (podeNadar(map, x, y)) return true;
  if (!map?.walkMask) return false;
  const row = map.walkMask[Math.floor(y)];
  if (!row) return false;
  return row[Math.floor(x)] === '.';
}

export function esforcoDeNado(profundidade) {
  if (profundidade <= 0) return 0;
  return profundidade >= 1.25 ? 2 : 1;
}
