// =====================================================================
// LIBERAÇÃO POR NÍVEL — o caminho do arquétipo destravando o kit
//
// O jogador não recebe tudo de uma vez: o nível do arquétipo (XP de combate,
// missões e maestria) abre os degraus. Cada passo diz o que libera:
//
//   nível 1 · kit básico (Q + R)
//   nível 2 · especialização de ferramenta (escolha no Códex)
//   nível 3 · Ultimate (F) — base ou sobrecarga da ferramenta
//   nível 5 · modo avançado            (planejado, ainda não entrega poder)
//   nível 8 · Ultimate de arquétipo    (planejado, ainda não entrega poder)
//
// Passos "planejados" aparecem no Códex e no HUD como próximo objetivo, mas
// não concedem nada: o jogo não finge progressão que não existe.
// =====================================================================

export const UNLOCK_STEPS = Object.freeze([
  Object.freeze({
    id: 'kit',
    step: 1,
    level: 1,
    label: 'KIT BÁSICO',
    features: Object.freeze(['q', 'r']),
    note: 'Q e R do módulo instalado.',
  }),
  Object.freeze({
    id: 'ferramenta',
    step: 2,
    level: 2,
    label: 'FERRAMENTA',
    features: Object.freeze(['tool']),
    note: 'Escolha a ferramenta/corrente/forma no Códex.',
  }),
  Object.freeze({
    id: 'ultimate',
    step: 3,
    level: 3,
    label: 'ULTIMATE',
    features: Object.freeze(['ultimate']),
    note: 'A tecla F acorda: sobrecarga da ferramenta ou Ultimate de arquétipo.',
  }),
  Object.freeze({
    id: 'modo_avancado',
    step: 4,
    level: 5,
    label: 'MODO AVANÇADO',
    features: Object.freeze([]),
    planned: true,
    note: 'Combinação de ferramentas — ainda em projeto.',
  }),
  Object.freeze({
    id: 'ultimate_arquetipo',
    step: 5,
    level: 8,
    label: 'ULTIMATE DE ARQUÉTIPO',
    features: Object.freeze([]),
    planned: true,
    note: 'A forma final de cada módulo — ainda em projeto.',
  }),
]);

export const UNLOCK_FEATURES = Object.freeze(['q', 'r', 'tool', 'ultimate']);

export const FEATURE_LABELS = Object.freeze({
  q: 'Q', r: 'R', tool: 'FERRAMENTA', ultimate: 'ULTIMATE',
});

export function getStepForLevel(level) {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  let atual = UNLOCK_STEPS[0];
  for (const step of UNLOCK_STEPS) {
    if (safe >= step.level) atual = step;
  }
  return atual;
}

export function getStepById(id) {
  return UNLOCK_STEPS.find(step => step.id === id) ?? null;
}

// Próximo degrau ainda não alcançado (null quando o jogador está no topo).
export function getNextStep(level) {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return UNLOCK_STEPS.find(step => safe < step.level) ?? null;
}

export function isFeatureUnlocked(level, feature) {
  const safe = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return UNLOCK_STEPS.some(step => safe >= step.level && step.features.includes(feature));
}

// Nível mínimo em que uma funcionalidade aparece (0 quando não há).
export function getFeatureLevel(feature) {
  return UNLOCK_STEPS.find(step => step.features.includes(feature))?.level ?? 0;
}
