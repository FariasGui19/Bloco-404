// =====================================================================
// MISSÕES — DEFINIÇÕES
//
// Missões novas usam objetivos contáveis e recompensas declaradas.
// As missões antigas (embarque_dimensional, calibracao_de_eco) continuam
// com seu fluxo próprio e não são migradas para cá.
//
// objectives[].type  defeat | collect | reach
// rewards            xp (do arquétipo atual), points, items, flags
// =====================================================================

export const QUESTS = Object.freeze({
  calibracao_de_campo: Object.freeze({
    id: 'calibracao_de_campo',
    title: 'CALIBRAÇÃO DE CAMPO',
    giver: 'NEXO-04',
    kind: 'secundária',
    description: 'Disperte três ecos de treino para o Núcleo registrar sua assinatura de combate.',
    objectives: Object.freeze([
      Object.freeze({ type: 'defeat', target: 'training', count: 3, label: 'Ecos de treino dispersos' }),
    ]),
    rewards: Object.freeze({ xp: 60, points: 1, items: Object.freeze(['registro_de_calibracao']), flags: Object.freeze({ calibracao_de_campo_concluida: true }) }),
  }),
  // -------------------------------------------------------------------
  // MARÉ ASTRAL — MARÉ PROFUNDA
  //
  // A missão que dá razão ao mergulho. Objetivos contáveis, sem script
  // novo: `mergulho` e `coleta_marinha` são emitidos pelo nado e pela
  // vida aquática; `reach` usa o mesmo evento que as rotas já usam.
  // Recompensa é XP do arquétipo + uma flag, igual às outras.
  // -------------------------------------------------------------------
  mare_profunda: Object.freeze({
    id: 'mare_profunda',
    title: 'MARÉ PROFUNDA',
    giver: 'MARÉ ASTRAL',
    kind: 'secundária',
    description: 'A maré esconde o que a areia não mostra. Desça na enseada, alcance o fundo e volte com o que o mar guardou.',
    objectives: Object.freeze([
      Object.freeze({ type: 'mergulho', count: 3, label: 'Mergulhos fundos na enseada' }),
      Object.freeze({ type: 'coleta_marinha', count: 4, label: 'Fragmentos de maré recolhidos' }),
      Object.freeze({ type: 'reach', target: 'fundo_enseada', count: 1, label: 'Fundo da Enseada dos Ecos' }),
    ]),
    rewards: Object.freeze({
      xp: 140,
      points: 2,
      items: Object.freeze(['semente_de_mare']),
      flags: Object.freeze({ mare_profunda_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // MARÉ ASTRAL — SALVA-VIDAS
  //
  // Missão de AJUDAR ANIMAIS pedida pelo criador. Não é "colete 5 itens":
  // o objetivo `socorro` só conta quando um bicho ferido volta à vida,
  // e não conta duas vezes para o mesmo animal (o id é gravado no save).
  // -------------------------------------------------------------------
  mare_salva_vidas: Object.freeze({
    id: 'mare_salva_vidas',
    title: 'SALVA-VIDAS',
    giver: 'MARÉ ASTRAL',
    kind: 'secundária',
    description: 'O arquipélago está ferido antes de você chegar. Há bichos presos, encalhados e enredados na areia e na água. Solte o que prende, cure o que respira.',
    objectives: Object.freeze([
      Object.freeze({ type: 'socorro', count: 3, label: 'Animais socorridos' }),
      Object.freeze({ type: 'socorro_terra', count: 1, label: 'Animal socorrido em terra' }),
    ]),
    rewards: Object.freeze({
      xp: 180,
      points: 2,
      items: Object.freeze(['concha_ressonante']),
      flags: Object.freeze({ mare_salva_vidas_concluida: true }),
    }),
  }),
});

export function getQuest(id) {
  return QUESTS[id] ?? null;
}

export function listQuests() {
  return Object.values(QUESTS);
}
