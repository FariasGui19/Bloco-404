// =====================================================================
// NATAÇÃO — mergulho livre na praia
//
// O criador pediu "mergulho livre e fluido, vida aquática". Até aqui a água
// da praia era só pintura: `walkMask` bloqueia tudo que não é areia, então
// encostar no mar travava o personagem na beira.
//
// A regra nova, sem tocar em colisão:
//
//   - TERRA continua decidida por `walkMask` (nada muda no que já funciona);
//   - ÁGUA (`YyDdX` em `aguaPraia`) passa a ser superfície nadável;
//   - PROFUNDIDADE é a distância até a costa (do campo de costa já existente):
//     raso = pé no chão, fundo = mergulho.
//   - RESPIRAÇÃO só cai quando o personagem está submerso (fora do raso).
//
// Este módulo é puro: recebe map/posição/estado e devolve números. Assim dá
// para testar em Node, sem canvas, e o `player.js` só consulta o resultado.
// =====================================================================

// Caracteres de água nadável (espelham `beach-water.js`).
export const AGUA = 'YyDdX';
// Caracteres de água FUNDA (não dá pé).
export const AGUA_FUNDA = 'DdX';
// Passarela: nunca é água, mesmo cercada de mar.
const DECK = 'Bb';

export const isAgua = c => c != null && AGUA.includes(c);
export const isAguaFunda = c => c != null && AGUA_FUNDA.includes(c);
export const isDeck = c => c != null && DECK.includes(c);

// ---------------------------------------------------------------------
// CONSTANTES DE JOGO
// ---------------------------------------------------------------------
export const NADO = {
  // Velocidade relativa ao andar. Nadar é mais lento, mas não arrastado:
  // .82 mantém a sensação "livre e fluido" que foi pedida.
  velocidade: 0.82,
  // Mergulho profundo acelera um pouco (você desliza), como em jogo de
  // exploração aquática.
  velocidadeFundo: 0.92,
  // Ar máximo (segundos) fora do raso.
  arMaximo: 22,
  // Recuperação por segundo ao voltar para a superfície/raso.
  recuperacao: 9,
  // Consumo por segundo submerso.
  consumo: 1,
  // Abaixo disso o personagem começa a perder vida (por segundo).
  arCritico: 4,
  danoAfogamento: 6,
  // Suavização da profundidade visual (metros por segundo).
  suavidade: 6,
};

// ---------------------------------------------------------------------
// LEITURA DO MAPA
// ---------------------------------------------------------------------
export function tileAtWorld(map, x, y) {
  return map?.aguaPraia?.[Math.floor(y)]?.[Math.floor(x)];
}

/** A célula é nadável? (água e não passarela) */
export function podeNadar(map, x, y) {
  const c = tileAtWorld(map, x, y);
  return isAgua(c) && !isDeck(c);
}

/**
 * Profundidade em "metros" (0 = seco, 1 = raso, 2 = fundo).
 * Usa `coastField` quando existe (contínuo, combina com o visual) e cai
 * para o caractere da célula quando não existe (testes, mapas antigos).
 */
export function profundidadeEm(map, x, y, field) {
  if (!podeNadar(map, x, y)) return 0;
  if (field?.distLand) {
    const px = Math.min(field.width - 1, Math.floor(x * field.scale));
    const py = Math.min(field.height - 1, Math.floor(y * field.scale));
    const d = field.distLand[py * field.width + px];
    // d = distância até o CENTRO da célula de terra mais próxima.
    // 1,2 tile = ainda dá pé; acima de ~2,6 tile = fundo (nadar/mergulhar).
    // É a mesma distância que o mar assado usa para escurecer, então o que
    // se vê é exatamente o que se nada.
    return Math.max(0, Math.min(2, (d - .55) / 1.05));
  }
  return isAguaFunda(tileAtWorld(map, x, y)) ? 2 : 1;
}

/** O personagem está com a cabeça fora d'água? */
export const estaNaSuperficie = (profundidade) => profundidade < 1.25;

// ---------------------------------------------------------------------
// ESTADO DE NADO
// ---------------------------------------------------------------------
export function criarEstadoNado() {
  return {
    ativo: false,
    profundidade: 0,   // suavizada, para o renderer
    ar: NADO.arMaximo, // segundos restantes
    submerso: false,
    afogando: false,
    // Propulsão do Maré Astral: impulso curto, com recarga.
    propulsao: 0,      // segundos restantes de impulso
    recargaPropulsao: 0,
  };
}

/**
 * Atualiza o estado de nado. Devolve um "efeito" para quem chamou aplicar
 * (dano, mensagem), sem mexer em `player` diretamente.
 *
 * @param {object} nado estado mutável (vem de criarEstadoNado)
 * @param {object} ctx { map, x, y, field, dt, entrouNaAgua, querSubir }
 */
export function atualizarNado(nado, ctx) {
  const { map, x, y, field, dt = 0 } = ctx;
  const antes = nado.ativo;

  const prof = profundidadeEm(map, x, y, field);
  nado.ativo = prof > 0;

  // Profundidade visual suavizada: entrar/sair da água não "pula".
  nado.profundidade += (prof - nado.profundidade) * Math.min(1, NADO.suavidade * dt);
  nado.submerso = nado.ativo && prof > 1.25;

  // ---- Ar ----
  if (!nado.ativo || !nado.submerso) {
    nado.ar = Math.min(NADO.arMaximo, nado.ar + NADO.recuperacao * dt);
    nado.afogando = false;
  } else {
    nado.ar = Math.max(0, nado.ar - NADO.consumo * dt);
    nado.afogando = nado.ar <= 0;
  }

  // ---- Propulsão do Maré (recarga sempre corre) ----
  if (nado.recargaPropulsao > 0) nado.recargaPropulsao = Math.max(0, nado.recargaPropulsao - dt);
  if (nado.propulsao > 0) nado.propulsao = Math.max(0, nado.propulsao - dt);

  const efeitos = { entrou: nado.ativo && !antes, saiu: !nado.ativo && antes, dano: 0, semAr: false };

  if (nado.afogando) {
    efeitos.dano = NADO.danoAfogamento * dt;
    efeitos.semAr = true;
  }

  return efeitos;
}

/**
 * Tenta disparar a propulsão do Maré Astral.
 * Devolve `true` se disparou (e já consome a recarga).
 */
export function dispararPropulsao(nado, alinhadoAoMare) {
  if (!nado.ativo || nado.propulsao > 0 || nado.recargaPropulsao > 0) return false;
  // Maré Astral alinhado dá impulso maior e recarga menor — é a "forma
  // aquática" pedida, sem precisar de outra habilidade.
  nado.propulsao = alinhadoAoMare ? 1.15 : 0.75;
  nado.recargaPropulsao = alinhadoAoMare ? 1.6 : 2.6;
  return true;
}

/** Multiplicador de velocidade a aplicar no deslocamento. */
export function multiplicadorVelocidade(nado, velocidadeBase) {
  if (!nado.ativo) return velocidadeBase;
  const base = NADO.velocidade + (nado.submerso ? NADO.velocidadeFundo - NADO.velocidade : 0);
  const impulso = nado.propulsao > 0 ? 1.55 : 1;
  return velocidadeBase * base * impulso;
}

/**
 * Filtro de movimento: `walkMask` decide em terra; na água qualquer célula
 * nadável é válida. Isso é aplicado ANTES de `moveWithCollision`, trocando
 * a checagem de colisão apenas quando o destino é água.
 */
export function destinoValido(map, x, y) {
  if (podeNadar(map, x, y)) return true;
  // Terra: a máscara continua sendo a única fonte da verdade.
  if (!map?.walkMask) return false;
  const row = map.walkMask[Math.floor(y)];
  if (!row) return false;
  return row[Math.floor(x)] === '.';
}

/**
 * Custo do nado em "esforço" (para o HUD e para a missão): 0 em terra,
 * cresce com a profundidade. Serve para a missão do Maré medir mergulho.
 */
export function esforcoDeNado(profundidade) {
  if (profundidade <= 0) return 0;
  return profundidade >= 1.25 ? 2 : 1;
}
