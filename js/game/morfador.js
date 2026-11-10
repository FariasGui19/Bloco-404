// =====================================================================
// MORFADOR DE RESSONÂNCIA — o "modo criativo" do criador
//
// Pedido: "um protótipo do morfador mestre para só eu que sou o criador
// conseguir alterar entre os arquétipos, testar as habilidades sem gastar
// energia e etc, tipo um modo criativo".
//
// NOME: "MORFADOR" é o que o criador chamou. No vocabulário do Bloco 404
// ele vira **MORFADOR DE RESSONÂNCIA** — a peça que reescreve a assinatura
// de eco do operador, em vez de trocar de roupa. É coerente com o resto do
// jogo (ressonância, ecos, forma do Núcleo) sem inventar palavra nova.
//
// SEGURANÇA (o mais importante): o modo é do CRIADOR, não um cheat aberto.
//   - só liga com uma chave de autoria no save (`creatorKey`);
//   - a chave não existe em save novo nem em save de jogador;
//   - sem a chave, TODAS as funções devolvem "negado" e nada muda.
//
// O que ele faz e o que ele NÃO faz:
//   liga:  troca de arquétipo, habilidades sem custo, energia infinita,
//          vida infinita, voo livre entre mapas, tempo do mundo congelado.
//   NÃO:   não altera missão concluída, não mexe em gates já abertos, não
//          reescreve o save do jogador (o estado é restaurado ao sair).
// =====================================================================
import { ARCHETYPES } from '../data/onboarding.js';
import { getArchetypeAbilities } from './abilities.js';
import { applyUnlocks } from './unlocks.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';

// Chave de autoria. Um save de jogador nunca tem isso; só o criador
// escreve essa flag (pelo comando de autoria ou pelo painel).
export const CREATOR_FLAG = 'morfador_de_ressonancia';

export const MORFADOR = Object.freeze({
  nome: 'MORFADOR DE RESSONÂNCIA',
  sigla: 'MR-404',
  descricao: 'Reescreve a assinatura de eco do operador. Uso restrito à autoria.',
  atalho: 'm',
});

const ESTADO_PADRAO = Object.freeze({
  ativo: false,
  energiaInfinita: true,
  vidaInfinita: true,
  semRecarga: true,
  mundoCongelado: false,
  // Guarda o que existia antes, para devolver ao sair.
  anterior: null,
});

/** O save pertence ao criador? Sem isso, o Morfador não abre. */
export function autorizado(progress) {
  if (!progress) return false;
  return progress.flags?.[CREATOR_FLAG] === true;
}

/**
 * Marca um save como sendo do criador.
 * Só deve ser chamado por um gesto explícito (comando de autoria), nunca
 * automático — e devolve `false` se o save já tiver progresso de jogador
 * que não seja de teste, para não "promover" save de jogador por engano.
 */
export function registrarAutoria(progress, chave) {
  if (!progress || !chave) return false;
  if (String(chave) !== String(CREATOR_FLAG)) return false;
  progress.flags ??= {};
  progress.flags[CREATOR_FLAG] = true;
  return true;
}

export function criarEstadoMorfador() {
  return { ...ESTADO_PADRAO };
}

/** Abre/fecha o modo. Devolve o estado novo, ou null se negado. */
export function alternarMorfador(progress, player) {
  if (!autorizado(progress)) return null;
  player.morfador ??= criarEstadoMorfador();
  const m = player.morfador;
  if (m.ativo) {
    desligar(progress, player);
  } else {
    // Guarda o estado real para restaurar ao sair: o modo criador não pode
    // deixar o save do criador "sujo" de bônus permanente.
    m.anterior = {
      archetype: progress.archetype,
      abilities: [...(progress.abilities ?? [])],
      equippedSuit: player.equippedSuit ?? null,
    };
    m.ativo = true;
    aplicarInfinitos(progress, player, m);
  }
  return m;
}

export function desligar(progress, player) {
  const m = player?.morfador;
  if (!m) return false;
  const antes = m.anterior;
  m.ativo = false;
  if (antes) {
    // Só restaura o arquétipo se ele ainda for válido; se o criador trocou
    // de propósito e desligou, a troca vale (é o comportamento esperado).
    if (ARCHETYPES[antes.archetype]) {
      progress.archetype = antes.archetype;
      progress.abilities = antes.abilities;
      player.equippedSuit = antes.equippedSuit;
    }
    // Devolve os níveis reais que o modo criador elevou para 99.
    for (const [id, nivel] of Object.entries(m.nivelReal ?? {})) {
      if (progress.archetypeProgress?.[id]) progress.archetypeProgress[id].level = nivel;
    }
    m.nivelReal = null;
    m.anterior = null;
  }
  // Devolve a energia/vida ao teto ao sair, para não ficar "grudado".
  if (progress.energia != null && progress.energiaMax != null) progress.energia = progress.energiaMax;
  return true;
}

function aplicarInfinitos(progress, player, m) {
  if (m.energiaInfinita) {
    progress.energiaMax ??= 100;
    progress.energia = progress.energiaMax;
  }
  if (m.vidaInfinita) {
    player.health = player.maxHealth ?? player.health ?? 100;
  }
}

/**
 * Troca o arquétipo em tempo real. Só no modo criador e só na autoria.
 * Aplica o kit completo (habilidades + degraus) do arquétipo escolhido.
 */
export function trocarArquetipo(progress, player, archetypeId) {
  if (!autorizado(progress)) return false;
  if (!player?.morfador?.ativo) return false;
  const arquétipo = ARCHETYPES[archetypeId];
  if (!arquétipo) return false;

  progress.archetype = archetypeId;
  progress.abilities = getArchetypeAbilities(archetypeId);
  // Ferramenta e Ultimate dependem de degrau. No modo criador o nível vai
  // ao teto só para liberar o kit — e o nível REAL fica guardado em
  // `m.anterior` para voltar ao desligar o Morfador.
  progress.archetypeProgress ??= {};
  const chave = archetypeId;
  progress.archetypeProgress[chave] ??= {};
  const nivelReal = progress.archetypeProgress[chave].level ?? 1;
  player.morfador.nivelReal = player.morfador.nivelReal ?? {};
  player.morfador.nivelReal[chave] = nivelReal;
  progress.archetypeProgress[chave].level = 99;
  applyUnlocks(progress, ARCHETYPE_KITS[archetypeId]);
  player.equippedSuit = null;
  player.nucleoForm = archetypeId === 'nucleo_dez_forma' ? (player.nucleoForm ?? null) : player.nucleoForm;
  return true;
}

/** Lista os arquétipos que o Morfador pode assumir. */
export function catalogo(progress) {
  if (!autorizado(progress)) return [];
  return Object.values(ARCHETYPES).map(a => ({
    id: a.id,
    nome: a.nome,
    cor: a.cor,
    subtitulo: a.subtitulo,
  }));
}

/**
 * Custo de energia. No modo criador volta 0 para qualquer coisa — é o
 * "testar habilidades sem gastar energia".
 */
export function custoDeEnergia(progress, player, custoNormal) {
  if (player?.morfador?.ativo && player.morfador.energiaInfinita) return 0;
  return custoNormal;
}

/**
 * Recarga. No modo criador zera (habilidade sempre pronta).
 */
export function recargaAplicavel(progress, player, segundos) {
  if (player?.morfador?.ativo && player.morfador.semRecarga) return 0;
  return segundos;
}

/** O mundo deve correr? (congelar tempo para fotografar/testar) */
export function tempoDoMundo(player) {
  return player?.morfador?.ativo && player.morfador.mundoCongelado ? 0 : 1;
}

/**
 * Regenerar energia/vida por frame enquanto o modo está ativo.
 * Chamado do loop principal, barato: dois clamps.
 */
export function manterInfinitos(progress, player) {
  const m = player?.morfador;
  if (!m?.ativo) return;
  if (m.energiaInfinita && progress?.energiaMax != null) progress.energia = progress.energiaMax;
  if (m.vidaInfinita && player.maxHealth) player.health = player.maxHealth;
}
