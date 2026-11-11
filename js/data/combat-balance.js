// =====================================================================
// COMBATE — BALANCEAMENTO POR ARQUÉTIPO
//
// Fonte única dos números do ataque básico. HUD, dano, árvore de
// progressão e testes leem daqui; nenhum módulo replica valores.
//
// damage      dano base por golpe no nível 1, sem nós de árvore
// hits        golpes por ataque (Maré acerta duas vezes no mesmo gesto)
// cooldown    segundos até o próximo ataque
// range       alcance em tiles
// crit        chance de crítico (0–1)
// critMult    multiplicador do crítico
// perLevel    ganho de dano por nível do arquétipo
// formMult    multiplicador quando o Núcleo está em Forma Veloz
// strain      ao encadear N golpes o ataque entra em recuperação
// =====================================================================

export const COMBAT_BALANCE = Object.freeze({
  motor_bio_forja: Object.freeze({
    label: 'IMPULSO',
    color: '#ffb45c',
    damage: 9,
    hits: 1,
    cooldown: .54,
    range: 1.8,
    crit: .07,
    critMult: 1.6,
    perLevel: .06,
    strain: Object.freeze({ hits: 4, extra: .5, label: 'SOBRECARGA BIO' }),
  }),
  lamina_dominio_anciao: Object.freeze({
    label: 'LÂMINA',
    color: '#ffd465',
    damage: 13,
    hits: 1,
    cooldown: .68,
    range: 2.0,
    crit: .12,
    critMult: 1.85,
    perLevel: .07,
    strain: Object.freeze({ hits: 3, extra: .65, label: 'ABERTURA DA LÂMINA' }),
  }),
  mare_astral: Object.freeze({
    label: 'MARÉ',
    color: '#73e9fa',
    damage: 5,
    hits: 2,
    cooldown: .52,
    range: 1.9,
    crit: .09,
    critMult: 1.55,
    perLevel: .07,
    strain: Object.freeze({ hits: 4, extra: .45, label: 'DISPERSÃO DA MARÉ' }),
  }),
  nucleo_dez_forma: Object.freeze({
    label: 'PULSO',
    color: '#8cff9e',
    damage: 5,
    hits: 1,
    cooldown: .32,
    range: 1.7,
    crit: .11,
    critMult: 1.7,
    perLevel: .08,
    formMult: 1.35,
    strain: Object.freeze({ hits: 5, extra: .55, label: 'INSTABILIDADE DO NÚCLEO' }),
  }),
});

// Dano das habilidades Q relativo ao ataque básico do arquétipo. Só as
// habilidades de impacto entram aqui; varreduras e utilidades não causam dano.
export const ABILITY_DAMAGE = Object.freeze({
  bio_dash: 1.2,
  golpe_ruptura: 2.4,
  passo_corrente: 1.9,
  forma_veloz: 1.6,
});

// FORMAS DO NÚCLEO — o mesmo arquétipo, dois corpos.
// O perfil acima é do operador; cada forma sustentada tem o próprio gesto.
// A Quebra Sistemas bate devagar e pesado: preparação longa, alcance curto e
// strain mais agressivo (3 golpes e o braço hidráulico entra em recuperação).
export const NUCLEO_FORM_BALANCE = Object.freeze({
  forma_bruta: Object.freeze({
    label: 'MARRETA',
    color: '#ffc94a',
    damageMult: 1.9,
    cooldown: .92,
    range: 1.6,
    windup: .55,
    formMult: 1,
    strain: Object.freeze({ hits: 3, extra: .7, label: 'PISTÃO SUPERAQUECIDO' }),
  }),
});

export function getFormCombatProfile(formId) {
  return NUCLEO_FORM_BALANCE[formId] ?? null;
}

// Vida de referência do operador por arquétipo. Ainda não há fonte de dano
// ao jogador: inimigos continuam pendentes (ver docs/roteiro).
export const ARCHETYPE_VITALS = Object.freeze({
  motor_bio_forja: Object.freeze({ health: 130 }),
  lamina_dominio_anciao: Object.freeze({ health: 150 }),
  mare_astral: Object.freeze({ health: 110 }),
  nucleo_dez_forma: Object.freeze({ health: 120 }),
});

// Regras de vida do operador. Sem punição permanente: morrer devolve o
// jogador ao ponto seguro do mapa com parte da vida e invulnerabilidade curta.
export const VITALS_RULES = Object.freeze({
  regenDelay: 5,        // segundos sem levar dano antes de regenerar
  regenRate: 4,         // vida por segundo regenerada
  invulnerability: 1.6, // janela após levar dano
  respawnRatio: .6,     // fração da vida ao voltar
  respawnInvulnerability: 2.4,
  deathDelay: 1.2,      // tempo caído antes de retornar
});

// XP do treino vale até este nível; depois só inimigos de verdade rendem.
export const TRAINING_XP_LEVEL_CAP = 5;
export const TRAINING_TARGET_XP = 25;

export function getCombatProfile(archetype) {
  return COMBAT_BALANCE[archetype] ?? null;
}
