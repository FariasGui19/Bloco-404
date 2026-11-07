// Estado apenas de sessão: não concede módulos nem muda o esquema do save.
export const NUCLEO_FORM_DURATION = 30;
export const NUCLEO_FORM_RECHARGE = 8;

function changeForm(player, activating) {
  player.ability ??= { cooldowns: {} };
  player.nucleoRuntime ??= { remaining: 0, recharge: 0 };
  player.nucleoForm = activating ? 'forma_veloz' : null;
  player.nucleoRuntime.remaining = activating ? NUCLEO_FORM_DURATION : 0;
  player.nucleoRuntime.recharge = activating ? 0 : NUCLEO_FORM_RECHARGE;
  player.moving = false;
  player.target = null;
  player.ability.effect = { id: 'transformacao_10x', color: '#6bff92', duration: 1.05, timeLeft: 1.05, activating };
  player.ability.lastMessage = activating ? 'FORMA VELOZ ATIVADA • 30s' : 'RETORNO AO OPERADOR • RECARGA 8s';
  player.ability.messageTimer = 2;
}

export function toggleNucleoForm(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma' || !progress.abilities?.includes('forma_veloz') || !player || player.ability?.dash || player.ability?.effect?.id === 'transformacao_10x') return false;
  const activating = player.nucleoForm !== 'forma_veloz';
  if (activating && (player.nucleoRuntime?.recharge ?? 0) > 0) return false;
  changeForm(player, activating);
  return true;
}

// Chamado somente durante a exploração (menus/diálogos pausam o relógio).
// Não interrompe um dash, scan ou outra ação, nem transforma dentro de um sólido.
export function updateNucleoForm(progress, player, dt, safeToReturn = true) {
  if (progress?.archetype !== 'nucleo_dez_forma' || !player?.nucleoRuntime) return;
  const runtime = player.nucleoRuntime;
  const elapsed = Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (player.ability?.effect?.id === 'transformacao_10x') return;
  if (player.nucleoForm !== 'forma_veloz') {
    runtime.recharge = Math.max(0, runtime.recharge - elapsed);
    return;
  }
  runtime.remaining = Math.max(0, runtime.remaining - elapsed);
  if (runtime.remaining > 0) return;
  if (player.ability?.dash || player.ability?.scanning > 0 || player.ability?.effect?.timeLeft > 0 || !safeToReturn) return;
  changeForm(player, false);
}
