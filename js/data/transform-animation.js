// =====================================================================
// TRANSFORMAÇÃO DO T — os quatro módulos com a mesma leitura
//
// O `T` já existia e funcionava (veste/solta o traje, ou transforma no
// Núcleo), mas era INSTANTÂNEO: o corpo trocava de folha no mesmo quadro, sem
// nenhuma sequência desenhada. Este módulo dá ao T o mesmo tratamento que as
// Ultimates ganharam:
//
//   forja        → o exo se monta (vapor, placas fechando)
//   mare         → a água sobe e substitui o traje
//   dominio      → anéis de frequência e placas de ouro
//   nucleo       → o BRACELETE do operador projetando a Forma de Eco
//
// A arte tem 4 quadros (tools/preparar-transformacao.py). Entrar corre 0→3;
// sair corre a MESMA folha ao contrário (3→0), que é como o jogo já desenha a
// transformação da Quebra Sistemas.
//
// Regras que este arquivo garante:
//   - o efeito é só visual: nenhum estado de jogo (dano, collisão, energia)
//     depende dele;
//   - dura o mesmo nos quatro módulos (mesma sensação de peso);
//   - não empilha: pedir T durante uma transformação não recria o efeito;
//   - a costura do Núcleo (que já tinha efeito próprio) é respeitada: quando
//     ele termina, este módulo só observa o relógio para desenhar a folha nova.
// =====================================================================
export const TRANSFORM_EFFECT_ID = 'transformacao_t';

// Tempo da sequência. A folha da Quebra já usava 1,05 s; os quatro módulos
// passam a compartilhar o mesmo relógio para não haver um "mais rápido".
export const TRANSFORM_DURATION = 1.05;

// Um perfil por arquétipo: a folha, de onde ela sai e a cor do clarão.
export const TRANSFORM_SHEETS = Object.freeze({
  motor_bio_forja: Object.freeze({
    sprite: 'player_t_bio', color: '#3fd0ff', suit: 'bio_forja', label: 'EXO MONTADO',
  }),
  mare_astral: Object.freeze({
    sprite: 'player_t_mare', color: '#53d9f4', suit: 'mare', label: 'CORRENTE VESTIDA',
  }),
  lamina_dominio_anciao: Object.freeze({
    sprite: 'player_t_dominio', color: '#ffd465', suit: 'dominio', label: 'ARMADURA DE FREQUÊNCIA',
  }),
  nucleo_dez_forma: Object.freeze({
    sprite: 'player_t_nucleo', color: '#6bff92', suit: null, label: 'BRACELETE DE ECO',
  }),
});

export function getTransformSheet(archetype) {
  return TRANSFORM_SHEETS[archetype] ?? null;
}

// Abre o efeito visual da transformação. `activating` decide o sentido da
// leitura da folha (entrando cresce, saindo desmonta).
export function startTransformEffect(player, archetype, activating) {
  const perfil = getTransformSheet(archetype);
  if (!player || !perfil) return false;
  player.ability ??= { cooldowns: {} };
  // Já existe uma transformação rodando: não reinicia (evita tremor/pisca).
  if (player.ability.effect?.id === TRANSFORM_EFFECT_ID) return false;
  player.ability.effect = {
    id: TRANSFORM_EFFECT_ID,
    archetype,
    color: perfil.color,
    duration: TRANSFORM_DURATION,
    timeLeft: TRANSFORM_DURATION,
    activating,
  };
  player.moving = false;
  player.target = null;
  return true;
}

// Quadro + folha para o renderer. `null` quando não há transformação do T
// rodando ou quando o arquétipo não tem folha (Domínio/Maré/Bio antigos).
export function getTransformFrame(progress, player) {
  const effect = player?.ability?.effect;
  if (!effect || effect.id !== TRANSFORM_EFFECT_ID) return null;
  const arquetipo = effect.archetype ?? progress?.archetype;
  const perfil = getTransformSheet(arquetipo);
  if (!perfil) return null;
  if (!(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  const passo = Math.min(3, Math.floor(t * 4));
  // Saindo, a montagem desmonta: os mesmos quadros na ordem inversa.
  const col = effect.activating === false ? 3 - passo : passo;
  return {
    sprite: perfil.sprite,
    col,
    color: perfil.color,
    phase: passo === 3 ? 'done' : passo === 0 ? 'start' : 'build',
  };
}

// O Núcleo continuou com o efeito próprio dele (`transformacao_10x`), que já
// escolhe entre a criatura e as placas da Quebra. Para a arte nova do
// bracelete entrar no meio, a leitura é: enquanto o corpo humano está sendo
// digitalizado, quem desenha é o bracelete; a criatura entra no último terço.
export function getNucleoBraceletFrame(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma') return null;
  const effect = player?.ability?.effect;
  if (!effect || effect.id !== 'transformacao_10x' || effect.activating === false) return null;
  if (!(effect.timeLeft > 0) || !(effect.duration > 0)) return null;
  const t = Math.max(0, Math.min(.9999, 1 - effect.timeLeft / effect.duration));
  // 0 → 0,7 do tempo: o operador com o bracelete (4 quadros). O resto é a
  // criatura, que já tem folha própria.
  if (t >= .7) return null;
  const perfil = TRANSFORM_SHEETS.nucleo_dez_forma;
  const col = Math.min(3, Math.floor((t / .7) * 4));
  return { sprite: perfil.sprite, col, color: perfil.color, phase: 'bracelet' };
}
