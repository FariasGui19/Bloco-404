// =====================================================================
// FORMAS DO NÚCLEO 10X — quem está vestido e o que isso muda
//
// Duas formas jogáveis hoje:
//   FORMA VELOZ      → nucleo_veloz  · corrida, dash, velocidade
//   QUEBRA SISTEMAS  → nucleo_bruto  · ferro denso, impacto, inércia
//
// A forma escolhida no Códex decide QUAL transformação o T ativa. A
// identidade em jogo continua sendo `player.nucleoForm` — antes um booleano
// disfarçado ('forma_veloz'), agora o id da forma. Para não quebrar saves,
// testes e telas antigas, o id da Veloz continua sendo exatamente
// 'forma_veloz'.
//
// Regras da Quebra Sistemas:
//   - 40% mais lenta que o operador (inércia extrema);
//   - cada golpe carregado consome a barra de transformação;
//   - parar de andar solta exaustão nos pistões;
//   - a Ultimate só existe com a forma ativa (regra do Núcleo).
// =====================================================================
import { getTool, getTools } from './archetype-tools.js';
import { getSelectedToolId } from '../game/tools.js';

export const NUCLEO_VELOZ = 'forma_veloz';
// Id da forma do Quebra Sistemas dentro do runtime do jogador. Curto de
// propósito: ele viagem em efeitos, sprites e textos da HUD.
export const NUCLEO_BRUTA = 'forma_bruta';

export const NUCLEO_FORM_IDS = Object.freeze([NUCLEO_VELOZ, NUCLEO_BRUTA]);

// Ferramenta (forma) → id de runtime. Só o que tem transformação de verdade.
const RUNTIME_BY_TOOL = Object.freeze({
  nucleo_veloz: NUCLEO_VELOZ,
  nucleo_bruto: NUCLEO_BRUTA,
});

// Configuração de cada forma, lida da mesma fonte do Códex (`archetype-tools`).
// Assim o número que o jogador lê no cartão é o número que o jogo usa.
export function getNucleoFormConfig(archetype = 'nucleo_dez_forma') {
  const configs = {};
  for (const tool of getTools(archetype)) {
    const runtimeId = RUNTIME_BY_TOOL[tool.id];
    if (!runtimeId) continue;
    configs[runtimeId] = {
      id: runtimeId,
      toolId: tool.id,
      name: tool.name,
      short: tool.short,
      color: tool.color,
      playable: tool.playable !== false,
      form: tool.form ?? null,
      ultimate: tool.ultimate ?? null,
    };
  }
  return configs;
}

export const NUCLEO_FORMS = Object.freeze(getNucleoFormConfig());

// Forma que o T vai ativar agora: a escolhida no Códex, ou a Veloz como
// padrão (save antigo sem escolha continua jogável).
export function getSelectedNucleoForm(progress, archetype = progress?.archetype) {
  const toolId = getSelectedToolId(progress, archetype);
  const tool = getTool(archetype, toolId);
  const runtimeId = tool && tool.playable !== false ? RUNTIME_BY_TOOL[tool.id] : null;
  return runtimeId ? NUCLEO_FORMS[runtimeId] : NUCLEO_FORMS[NUCLEO_VELOZ];
}

export function isNucleoFormId(value) {
  return NUCLEO_FORM_IDS.includes(value);
}

// Vida útil da forma: base + maestria de locomoção do arquétipo.
export function getFormDuration(form, formDurationBonus = 0) {
  const base = form?.form?.duration ?? 30;
  return base + (Number.isFinite(formDurationBonus) ? Math.max(0, formDurationBonus) : 0);
}

export function getFormRecharge(form) {
  return form?.form?.recharge ?? 10;
}

// Multiplicador de locomoção. A Veloz usa VELOZ_SPEED_MULTIPLIER (em
// player.js); a Quebra tem o próprio valor, abaixo de 1.
export function getFormSpeedMultiplier(form) {
  return form?.form?.speedMult ?? 1;
}

// Custo em segundos de barra por golpe carregado (0 = forma não gasta com golpe).
export function getFormHitCost(form) {
  return form?.form?.hitCost ?? 0;
}
