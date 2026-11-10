// =====================================================================
// AÇÕES DO MARÉ ASTRAL — o PASSO DE CORRENTE (Q) de costas
//
// O Q do Maré desenha `player_mare_q` (4 quadros de 299 px), mas essa folha é
// uma POSE LATERAL. De costas e de frente o corpo aparecia de perfil, virando
// de lado sozinho no meio do avanço.
//
// A folha nova (`player-mare-propulsor-costas.png`, 4 × 320) cobre a vista de
// trás: anel de água → onda que empurra → correnteza do avanço → pouso. Ela é
// usada só quando o jogador avança para CIMA; as demais direções continuam com
// a folha lateral aprovada, que já é a leitura certa.
// =====================================================================
const MARE = 'mare_astral';

export const MARE_PROPULSOR_SHEET = Object.freeze({
  sprite: 'player_mare_propulsor_costas', cell: 320, footY: 276, scale: .57, frames: 4,
});

// Quadro do Q de costas. Só vale para o traje equipado: o modo rápido usa o
// corpo civil, que tem as próprias folhas.
export function getMarePropulsorFrame(progress, player) {
  if (progress?.archetype !== MARE) return null;
  if (player?.equippedSuit !== 'mare') return null;
  if (player?.facing !== 'up') return null;
  if ((player?.ability?.scanning ?? 0) > 0) return null;
  const effect = player?.ability?.effect;
  if (effect?.id !== 'passo_corrente' || !(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  const col = t < .2 ? 0 : t < .45 ? 1 : t < .8 ? 2 : 3;
  return { ...MARE_PROPULSOR_SHEET, col, phase: t < .45 ? 'launch' : 'dash' };
}
