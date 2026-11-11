// =====================================================================
// PERSONAS — 4 operadores criáveis, um arquétipo de cada
//
// Pedido do criador: "quero que tenha 4 personagens criáveis lá no menu
// pra dar pra criar 1 de cada no máximo".
//
// Regra: entre os 4 saves, cada arquétipo pode aparecer no máximo UMA vez.
// Isso protege a fantasia (quatro operadores diferentes, não quatro cópias
// do mesmo) e mantém o arquipélago coerente: as rotas de cada módulo
// existem porque existe alguém de cada módulo.
//
// A checagem é sempre feita contra o que está GRAVADO, nunca contra o que
// o menu acha que existe — save apagado no localStorage libera o módulo.
// =====================================================================
import { ARCHETYPES } from '../data/onboarding.js';
import { listSaves } from './save.js';

export const PERSONAS_MAX = 4;

/** Arquétipos já usados, com o slot de cada um. */
export function arquetiposEmUso(excetoSlot = null) {
  const uso = new Map();
  for (const { slot, save } of listSaves()) {
    if (excetoSlot != null && slot === excetoSlot) continue;
    const id = save?.progress?.archetype;
    if (id && ARCHETYPES[id]) uso.set(id, slot);
  }
  return uso;
}

/** Sobrou algum arquétipo livre? */
export function arquetiposDisponiveis(excetoSlot = null) {
  const uso = arquetiposEmUso(excetoSlot);
  return Object.values(ARCHETYPES).filter(a => !uso.has(a.id));
}

/**
 * O arquétipo pode ser usado neste slot?
 * `true` quando ninguém mais usa, ou quando é o próprio save do slot
 * (reabrir a ficha de um operador que já existe não deve ser bloqueado).
 */
export function podeEscolherArquetipo(archetypeId, slot) {
  if (!ARCHETYPES[archetypeId]) return false;
  const uso = arquetiposEmUso(slot);
  return !uso.has(archetypeId);
}

/** Quantas personas existem de fato (slots com save). */
export function totalPersonas() {
  return listSaves().filter(({ save }) => save).length;
}

/** Resumo para o menu: quem ocupa cada módulo. */
export function resumoPersonas() {
  const uso = arquetiposEmUso();
  return Object.values(ARCHETYPES).map(a => ({
    id: a.id,
    nome: a.nome,
    cor: a.cor,
    slot: uso.get(a.id) ?? null,
    usado: uso.has(a.id),
  }));
}
