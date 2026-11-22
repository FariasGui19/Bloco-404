// Estado de sessão das formas do Núcleo 10X. Não concede módulos nem muda o
// esquema do save: forma, duração e recarga vivem só no player.
//
// Duas formas jogáveis (data/nucleo-forms.js):
//   FORMA VELOZ      → corrida e dash, 1,8× de velocidade
//   QUEBRA SISTEMAS  → ferro denso, 40% mais lento, cada golpe consome a barra
//
// A duração base cresce com a maestria CINÉTICA (ver data/mastery.js).
import { getDerivedStats } from './rpg.js';
import { recordMastery } from './mastery.js';
import { getTool } from '../data/archetype-tools.js';
import { isToolAvailable } from './tools.js';
import {
  NUCLEO_BRUTA,
  NUCLEO_FORMS,
  NUCLEO_VELOZ,
  getFormDuration,
  getFormHitCost,
  getFormRecharge,
  getSelectedNucleoForm,
  isNucleoFormId,
} from '../data/nucleo-forms.js';

// Compatibilidade: testes e HUD antigos leem estes nomes. Eles descrevem a
// forma padrão (Veloz); cada forma tem os próprios valores em nucleo-forms e
// um teste garante que estes dois números não saiam de sincronia.
// (Não dá para derivar de NUCLEO_FORMS no topo do módulo: data/nucleo-forms
// importa game/tools, que importa de volta este arquivo.)
export const NUCLEO_FORM_DURATION = 30;
export const NUCLEO_FORM_RECHARGE = 8;

function velozConfig() {
  return NUCLEO_FORMS[NUCLEO_VELOZ]?.form ?? { duration: NUCLEO_FORM_DURATION, recharge: NUCLEO_FORM_RECHARGE };
}

export function getDefaultFormDuration() { return velozConfig().duration; }
export function getDefaultFormRecharge() { return velozConfig().recharge; }

// Efeito de transformação: o id continua 'transformacao_10x' para o resto do
// jogo (travas, renderer) e o `form` diz QUAL forma está entrando ou saindo.
export const TRANSFORM_EFFECT_ID = 'transformacao_10x';

function changeForm(player, activating, form, duration) {
  player.ability ??= { cooldowns: {} };
  player.nucleoRuntime ??= { remaining: 0, recharge: 0 };
  const id = form?.id ?? NUCLEO_VELOZ;
  player.nucleoForm = activating ? id : null;
  player.nucleoFormSuit = activating ? (form?.toolId ?? null) : null;
  player.ability.cast = null;
  player.ability.queuedSmash = null;
  player.nucleoRuntime.remaining = activating ? duration : 0;
  player.nucleoRuntime.recharge = activating ? 0 : getFormRecharge(form);
  player.nucleoRuntime.form = activating ? id : (player.nucleoRuntime.form ?? null);
  player.moving = false;
  player.target = null;
  player.ability.effect = {
    id: TRANSFORM_EFFECT_ID,
    form: id,
    color: form?.form?.color ?? '#6bff92',
    duration: 1.05,
    timeLeft: 1.05,
    activating,
  };
  const nome = form?.name ?? 'FORMA VELOZ';
  player.ability.lastMessage = activating
    ? `${nome} ATIVADA • ${Math.round(duration)}s`
    : `RETORNO AO OPERADOR • RECARGA ${getFormRecharge(form)}s`;
  player.ability.messageTimer = 2;
}

// A transformação só pede a habilidade base do arquétipo (o Pulso Veloz):
// as formas são galhos do mesmo Núcleo, não módulos diferentes.
export function canToggleNucleoForm(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma') return false;
  if (!progress.abilities?.includes(NUCLEO_VELOZ)) return false;
  if (!player || player.ability?.dash) return false;
  if (player.ability?.effect?.id === TRANSFORM_EFFECT_ID) return false;
  return true;
}

export function toggleNucleoForm(progress, player, formId = null) {
  if (!canToggleNucleoForm(progress, player)) return false;
  const activating = !isNucleoFormId(player.nucleoForm);
  const escolhida = getSelectedNucleoForm(progress);
  const forma = formId && NUCLEO_FORMS[formId]
    ? NUCLEO_FORMS[formId]
    : (activating ? escolhida : NUCLEO_FORMS[player.nucleoForm] ?? escolhida);
  if (!forma) return false;
  if (activating && !isToolAvailable(progress, getTool(progress.archetype, forma.toolId))) return false;
  if (activating && (player.nucleoRuntime?.recharge ?? 0) > 0) return false;
  const stats = getDerivedStats(progress, player);
  changeForm(player, activating, forma, getFormDuration(forma, stats?.formDuration ?? 0));
  if (activating) {
    const rankUps = recordMastery(progress, 'ability_use');
    if (rankUps.length) player.ability.lastMessage = `MAESTRIA • ${rankUps.map(up => up.label).join(' + ')}`;
  }
  return true;
}

// Cada golpe carregado da Quebra Sistemas começa a comer a barra: o jogador
// sente o custo do impacto. Sem forma ativa, ou em forma que não cobra,
// devolve 0 e nada muda.
export function spendNucleoFormTime(player, seconds) {
  const runtime = player?.nucleoRuntime;
  if (!runtime || !isNucleoFormId(player?.nucleoForm) || !(seconds > 0)) return 0;
  const before = runtime.remaining ?? 0;
  if (!(before > 0)) return 0;
  runtime.remaining = Math.max(0, before - seconds);
  runtime.spent = Math.min(before, seconds);
  return runtime.spent;
}

// Quanto UM golpe custa para a forma ativa (segundos de barra).
export function getActiveFormHitCost(player) {
  const form = NUCLEO_FORMS[player?.nucleoForm];
  if (!form) return 0;
  return getFormHitCost(form);
}

// Chamado no ataque básico. Só a Quebra consome a barra; devolve o que gastou
// para a HUD poder avisar sem inventar número.
export function chargeFormHit(player) {
  const custo = getActiveFormHitCost(player);
  if (!custo) return 0;
  return spendNucleoFormTime(player, custo);
}

// Exaustão ao parar: os pistões das costas soltam vapor. É só visual, mas o
// estado existe de verdade para o renderer ler (sem pose falsa).
function ventSteam(player, form) {
  player.nucleoRuntime.exhaustion = { timeLeft: .9, duration: .9, form: form?.id ?? null };
}

// Chamado somente durante a exploração (menus/diálogos pausam o relógio).
// Não interrompe um dash, scan ou outra ação, nem transforma dentro de sólido.
export function updateNucleoForm(progress, player, dt, safeToReturn = true) {
  if (progress?.archetype !== 'nucleo_dez_forma' || !player?.nucleoRuntime) return;
  const runtime = player.nucleoRuntime;
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);

  if (runtime.exhaustion) {
    runtime.exhaustion.timeLeft = Math.max(0, runtime.exhaustion.timeLeft - elapsed);
    if (runtime.exhaustion.timeLeft === 0) runtime.exhaustion = null;
  }

  if (player.ability?.effect?.id === TRANSFORM_EFFECT_ID) return;

  if (!isNucleoFormId(player.nucleoForm)) {
    runtime.recharge = Math.max(0, runtime.recharge - elapsed);
    return;
  }

  // Exaustão da Quebra: parar de andar solta uma rajada de vapor.
  if (player.nucleoForm === NUCLEO_BRUTA && !player.moving && !runtime.exhaustion && !player.ability?.dash) {
    ventSteam(player, NUCLEO_FORMS[NUCLEO_BRUTA]);
  }

  runtime.remaining = Math.max(0, runtime.remaining - elapsed);
  if (runtime.remaining > 0) return;
  if (player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 || !safeToReturn) return;
  changeForm(player, false, NUCLEO_FORMS[player.nucleoForm], 0);
}
