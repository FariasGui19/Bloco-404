// =====================================================================
// ANIMAÇÃO DE EXECUÇÃO DA ULTIMATE — MOTOR BIO-FORJA
//
// O Bio é o único módulo cujo `F` depende da ferramenta instalada: a Ultimate
// nível 1 substitui a base do módulo. Por isso ele tem CINCO folhas de
// execução, uma por assinatura:
//
//   forja_dome  → PULSO DA FORJA VIVA        (base do módulo)
//   serra       → CORTE DE RECONFIGURAÇÃO    (lâmina_de_forja)
//   martelo     → MARTELO DE FORJA           (punho_de_impacto)
//   cabos       → REDE DE ANCORAGEM          (gancho_magnetico)
//   propulsores → QUEBRA-LIMITE CINÉTICO     (asa_de_impulso)
//
// A escolha é pela ASSINATURA do efeito (definida em data/archetype-tools.js),
// não pelo id: assim uma ferramenta nova que reuse a mesma assinatura já ganha
// a arte certa. As folhas têm 4 quadros de 320 px (1280×320).
//
// A fase vem do estado REAL da Ultimate, como no Núcleo 10X:
//   carga (0,42 s) → quadros 0 e 1
//   soltura        → quadro 2 no impacto, 3 na recuperação
// =====================================================================
const BIO = 'motor_bio_forja';

// Apoio dos pés e escala medidos no script de arte (BASELINE 276 de 320).
// O corpo em jogo desenha 420 px de célula com 0,31 (≈130 px de altura).
// Aqui a arte útil tem ~230 px por célula de 320: 0,57 dá ≈131 px — o corpo
// continua do mesmo tamanho, quem cresce é o gesto da Ultimate.
export const BIO_ULTIMATE_SHEETS = Object.freeze({
  forja_dome: Object.freeze({ sprite: 'player_bio_ult_forja_dome', cell: 320, footY: 276, scale: .57 }),
  serra: Object.freeze({ sprite: 'player_bio_ult_serra', cell: 320, footY: 276, scale: .57, cols: 4 }),
  martelo: Object.freeze({ sprite: 'player_bio_ult_martelo', cell: 320, footY: 276, scale: .57, cols: 4 }),
  cabos: Object.freeze({ sprite: 'player_bio_ult_cabos', cell: 320, footY: 276, scale: .57, cols: 4 }),
  propulsores: Object.freeze({ sprite: 'player_bio_ult_propulsores', cell: 320, footY: 276, scale: .57, cols: 4 }),
});

// Nome do sprite da folha de uma assinatura (usado pelo Códex para mostrar a
// execução real antes de o jogador gastar energia). `null` se não houver arte.
export function getBioUltimateSprite(signature) {
  return BIO_ULTIMATE_SHEETS[signature]?.sprite ?? null;
}

// Caminho do PNG da primeira pose (preparo) de uma assinatura: miniatura do
// Códex. Sai do mesmo mapa — a UI não repete nomes de arquivo.
export function getBioUltimatePosePath(signature) {
  const sprite = getBioUltimateSprite(signature);
  return sprite ? `assets/sprites/player/${sprite.replaceAll('_', '-')}.png` : null;
}

// Em que quadro a execução está. `null` quando não há Ultimate do Bio acontecendo
// (ou quando o corpo está preso em dash/varredura).
export function getBioUltimateFrame(progress, player) {
  if (progress?.archetype !== BIO) return null;
  if (player?.ability?.dash || (player?.ability?.scanning ?? 0) > 0) return null;
  const runtime = player?.ultimate;
  if (!runtime) return null;

  // Durante a carga o efeito ainda não existe: quem manda é a definição que
  // está sendo carregada (`chargeDefinition` só traz id/cor, então usamos a
  // folha base como respiro — o gesto de preparar é o mesmo nas cinco).
  if (runtime.charge > 0) {
    const total = runtime.chargeDuration || .42;
    const k = Math.max(0, Math.min(1, 1 - runtime.charge / total));
    const assinatura = runtime.chargeDefinition?.signature
      ?? runtime.chargeSignature ?? runtime.pendingSignature ?? 'forja_dome';
    const sheet = BIO_ULTIMATE_SHEETS[assinatura] ?? BIO_ULTIMATE_SHEETS.forja_dome;
    return { ...sheet, col: k < .55 ? 0 : 1, phase: 'charge', flash: runtime.chargeDefinition?.color ?? null };
  }

  const effect = runtime.effect;
  if (!effect || !(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const sheet = BIO_ULTIMATE_SHEETS[effect.signature];
  if (!sheet) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  return { ...sheet, col: t < .42 ? 2 : 3, phase: t < .42 ? 'impact' : 'recover', flash: effect.color ?? null };
}
