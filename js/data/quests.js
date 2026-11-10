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
});

export function getQuest(id) {
  return QUESTS[id] ?? null;
}

export function listQuests() {
  return Object.values(QUESTS);
}
