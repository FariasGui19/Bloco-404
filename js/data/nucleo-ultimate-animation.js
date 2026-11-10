// =====================================================================
// ANIMAÇÃO DE EXECUÇÃO DA ULTIMATE — Núcleo 10X (as duas formas)
//
// Até aqui o `F` desenhava só o efeito (assinatura procedural em
// js/engine/ultimate-visuals.js). As duas formas têm agora folha própria de
// execução, do mesmo jeito que a caminhada e o ataque da Quebra:
//
//   FORMA VELOZ      player-10x-veloz-ultimate   224 px × 4  (896×224)
//   QUEBRA SISTEMAS  player-10x-bruta-ultimate   256 px × 4  (1024×256)
//
// A fase da arte vem do estado REAL da Ultimate:
//   carga (0,42 s)  → quadros 0 e 1 (cochicho/impulso);
//   soltura         → quadro 2 no impacto e 3 na recuperação.
// Sem forma ativa, ou com outra ação em curso, não devolve nada: quem desenha
// o corpo é o resto do renderer.
// =====================================================================
import { NUCLEO_BRUTA, NUCLEO_VELOZ } from './nucleo-forms.js';

const NUCLEO = 'nucleo_dez_forma';

// Cada forma aponta a folha, o tamanho da célula e o apoio do pé dentro dela.
// O apoio é medido no script de arte (assets/sprites/player/*-ultimate.png):
// a base da figura fica a ~96% da célula nas duas folhas.
export const ULTIMATE_SHEETS = Object.freeze({
  [NUCLEO_VELOZ]: Object.freeze({
    sprite: 'player_10x_veloz_ultimate',
    cell: 224,
    footY: 216,
    // A criatura é baixa: em 0,95 a silhueta fica levemente MAIOR que a do
    // andar (que usa 0,5 de uma célula de 448×4), sem parecer outro bicho.
    scale: .66,
    cols: 4,
  }),
  [NUCLEO_BRUTA]: Object.freeze({
    sprite: 'player_10x_bruta_ultimate',
    cell: 256,
    footY: 220,
    // Mesma escala do corpo parado da forma (.95). A arte da Ultimate é mais
    // alta (201 px contra os 178 px do corpo parado) porque o golpe levanta a
    // marreta e abre a fenda: o corpo continua do mesmo tamanho, quem cresce é
    // a leitura do golpe.
    scale: .95,
    cols: 4,
  }),
});

// Em que quadro a execução está. Devolve `null` quando a Ultimate não está
// acontecendo em nenhuma das duas janelas.
export function getUltimateFrame(progress, player) {
  if (progress?.archetype !== NUCLEO) return null;
  const sheet = ULTIMATE_SHEETS[player?.nucleoForm];
  if (!sheet) return null;
  if (player.ability?.dash || (player.ability?.scanning ?? 0) > 0) return null;

  const runtime = player.ultimate;
  if (!runtime) return null;

  // 1) Carga: o corpo se prepara. A arte acompanha a fração real da carga.
  if (runtime.charge > 0) {
    const total = runtime.chargeDuration || .42;
    const k = Math.max(0, Math.min(1, 1 - runtime.charge / total));
    return {
      ...sheet,
      col: k < .55 ? 0 : 1,
      phase: 'charge',
      flash: runtime.chargeDefinition?.color ?? null,
    };
  }

  // 2) Soltura: o efeito da Ultimate é o relógio da execução.
  const effect = runtime.effect;
  if (!effect || !(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  // Se o jogador voltar ao operador no meio da soltura, o efeito continua
  // (dano e anel), mas o corpo da forma já não está ali para ser desenhado.
  if (effect.form && effect.form !== player.nucleoForm) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  // Impacto logo na soltura; o resto da janela é a recuperação do corpo.
  return {
    ...sheet,
    col: t < .42 ? 2 : 3,
    phase: t < .42 ? 'impact' : 'recover',
    flash: effect.color ?? null,
  };
}
