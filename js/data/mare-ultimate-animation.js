// =====================================================================
// ANIMAÇÃO DE EXECUÇÃO DA ULTIMATE — MARÉ ASTRAL
//
// O Maré é, como o Bio-Forja, um módulo em que o `F` vem da CORRENTE
// instalada: a nível 1 a corrente substitui a Ultimate do módulo. Até aqui o
// corpo continuava andando e só o efeito procedural (js/engine/ultimate-
// visuals.js) aparecia. As cinco assinaturas têm agora folha de quatro
// quadros, no mesmo padrão de Bio e Núcleo 10X:
//
//   cupula_agua → CÚPULA DE PRESSÃO    (escudo_liquido)
//   vortice     → CORRENTE ABISSAL     (passo_abissal)
//   chicote     → ONDA CORTANTE        (chicote_de_mare)
//   sonar       → CHAMADO DA MARÉ      (senso_de_corrente)
//   estuario    → SINFONIA DO ESTUÁRIO (base do módulo, sem corrente)
//
// A fase vem do estado real da Ultimate:
//   carga (0,42 s) → quadros 0 e 1
//   soltura        → quadro 2 no impacto, 3 na recuperação
//
// Tamanho: a caminhada do Maré desenha 383 px de célula em escala .37 = 142 px
// em jogo. O preparador fixa o CORPO em 249 px de arte dentro da célula de
// 320; com .57 o jogo devolve 142 px — o mesmo corpo, sem encolher durante o F.
// =====================================================================
const MARE = 'mare_astral';

const FOOT_Y = 276;
const SCALE = .57;

export const MARE_ULTIMATE_SHEETS = Object.freeze({
  cupula_agua: Object.freeze({ sprite: 'player_mare_ult_cupula', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  vortice: Object.freeze({ sprite: 'player_mare_ult_vortice', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  chicote: Object.freeze({ sprite: 'player_mare_ult_chicote', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  sonar: Object.freeze({ sprite: 'player_mare_ult_sonar', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  estuario: Object.freeze({ sprite: 'player_mare_ult_estuario', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
});

// Nome do sprite de uma assinatura (o Códex usa para mostrar a execução).
export function getMareUltimateSprite(signature) {
  return MARE_ULTIMATE_SHEETS[signature]?.sprite ?? null;
}

export function getMareUltimatePosePath(signature) {
  const sprite = getMareUltimateSprite(signature);
  return sprite ? `assets/sprites/player/${sprite.replaceAll('_', '-')}.png` : null;
}

// Em que quadro a execução está. `null` quando não há Ultimate do Maré
// acontecendo, ou quando varredura/dash estão no comando do corpo.
export function getMareUltimateFrame(progress, player) {
  if (progress?.archetype !== MARE) return null;
  if (player?.equippedSuit !== 'mare') return null;
  // O dash da própria Ultimate não invalida a folha; o dash de habilidade (Q)
  // sim. Antes a CORRENTE ABISSAL nunca desenhava: ela É um dash.
  if ((player?.ability?.dash?.mode && player.ability.dash.mode !== 'ultimate')
      || (player?.ability?.scanning ?? 0) > 0) return null;
  const runtime = player?.ultimate;
  if (!runtime) return null;

  // 1) Carga: o corpo se prepara. A assinatura vem da definição carregada —
  // sem isso a preparação cairia sempre na arte da cúpula.
  if (runtime.charge > 0) {
    const total = runtime.chargeDuration || .42;
    const k = Math.max(0, Math.min(1, 1 - runtime.charge / total));
    const assinatura = runtime.chargeDefinition?.signature ?? 'estuario';
    const sheet = MARE_ULTIMATE_SHEETS[assinatura] ?? MARE_ULTIMATE_SHEETS.estuario;
    return { ...sheet, col: k < .55 ? 0 : 1, phase: 'charge', flash: runtime.chargeDefinition?.color ?? null };
  }

  // 2) Soltura: o efeito é o relógio. A assinatura decide a folha.
  const effect = runtime.effect;
  if (!effect || !(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const sheet = MARE_ULTIMATE_SHEETS[effect.signature];
  if (!sheet) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  return {
    ...sheet,
    col: t < .42 ? 2 : 3,
    phase: t < .42 ? 'impact' : 'recover',
    flash: effect.color ?? null,
  };
}
