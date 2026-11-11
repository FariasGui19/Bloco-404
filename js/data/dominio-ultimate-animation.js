// =====================================================================
// ANIMAÇÃO DE EXECUÇÃO DA ULTIMATE — DOMÍNIO ANCIÃO
//
// O Domínio fecha a série: como o Bio-Forja e o Maré, o `F` de nível 1 vem
// da FERRAMENTA instalada, e a Ultimate do módulo (`coroa_da_falha`) é o que
// existe antes da escolha. São cinco folhas de quatro quadros:
//
//   coroa      → COROA DA FALHA          (base do módulo, sem ferramenta)
//   lamina_vertical → CORTE DE RUPTURA   (espada_de_dominio)
//   muralha_hex     → MURALHA DE FREQUÊNCIA (escudo_de_dominio)
//   tita            → CORPO DE TITÂNIO   (postura_de_dominio)
//   trono           → IMPACTO DO TRONO ANTIGO (investida_de_dominio)
//
// A escolha é pela ASSINATURA do efeito (data/archetype-tools.js), não pelo
// id: ferramenta nova com a mesma assinatura já entra com arte.
//
// A fase vem do estado REAL da Ultimate, como nos outros três módulos:
//   carga (0,42 s) → quadros 0 e 1
//   soltura         → quadro 2 no impacto, 3 na recuperação
//
// Tamanho: a caminhada lateral do Domínio desenha 680 px de arte em célula de
// 440 com escala .245 → 141 px em jogo. Aqui o CORPO foi fixado em 247 px
// dentro da célula de 320; com .57 o jogo devolve 141 px — o mesmo operador,
// sem pular de tamanho no F.
// =====================================================================
const DOMINIO = 'lamina_dominio_anciao';

const FOOT_Y = 276;
const SCALE = .57;

export const DOMINIO_ULTIMATE_SHEETS = Object.freeze({
  coroa: Object.freeze({ sprite: 'player_dominio_ult_coroa', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  lamina_vertical: Object.freeze({ sprite: 'player_dominio_ult_lamina', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  muralha_hex: Object.freeze({ sprite: 'player_dominio_ult_muralha', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  tita: Object.freeze({ sprite: 'player_dominio_ult_tita', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
  trono: Object.freeze({ sprite: 'player_dominio_ult_trono', cell: 320, footY: FOOT_Y, scale: SCALE, cols: 4 }),
});

// Nome do sprite de uma assinatura (o Códex usa para mostrar a execução).
export function getDominioUltimateSprite(signature) {
  return DOMINIO_ULTIMATE_SHEETS[signature]?.sprite ?? null;
}

export function getDominioUltimatePosePath(signature) {
  const sprite = getDominioUltimateSprite(signature);
  return sprite ? `assets/sprites/player/${sprite.replaceAll('_', '-')}.png` : null;
}

// Em que quadro a execução está. `null` quando não há Ultimate do Domínio
// acontecendo, ou quando o corpo está preso em dash/varredura de habilidade.
export function getDominioUltimateFrame(progress, player) {
  if (progress?.archetype !== DOMINIO) return null;
  if (player?.equippedSuit !== 'dominio') return null;
  // A INVESTIDA é um dash: o avanço da PRÓPRIA Ultimate não invalida a folha
  // (mesmo bug que matou a CORRENTE ABISSAL do Maré). Só o dash de
  // habilidade (Q) e a varredura mandam no corpo.
  if ((player?.ability?.dash?.mode && player.ability.dash.mode !== 'ultimate')
      || (player?.ability?.scanning ?? 0) > 0) return null;
  const runtime = player?.ultimate;
  if (!runtime) return null;

  // 1) Carga: o corpo se prepara. A assinatura vem da definição carregada —
  // sem isso a preparação cairia sempre na arte da coroa do módulo.
  if (runtime.charge > 0) {
    const total = runtime.chargeDuration || .42;
    const k = Math.max(0, Math.min(1, 1 - runtime.charge / total));
    const assinatura = runtime.chargeDefinition?.signature ?? 'coroa';
    const sheet = DOMINIO_ULTIMATE_SHEETS[assinatura] ?? DOMINIO_ULTIMATE_SHEETS.coroa;
    return { ...sheet, col: k < .55 ? 0 : 1, phase: 'charge', flash: runtime.chargeDefinition?.color ?? null };
  }

  // 2) Soltura: o efeito é o relógio e a assinatura decide a folha.
  const effect = runtime.effect;
  if (!effect || !(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const sheet = DOMINIO_ULTIMATE_SHEETS[effect.signature];
  if (!sheet) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  return {
    ...sheet,
    col: t < .42 ? 2 : 3,
    phase: t < .42 ? 'impact' : 'recover',
    flash: effect.color ?? null,
  };
}
