// Estado de forma é temporário por sessão; não concede módulos nem altera o save.
export function toggleNucleoForm(progress, player) {
  if (progress?.archetype !== 'nucleo_dez_forma' || !progress.abilities?.includes('forma_veloz') || !player || player.ability?.dash || player.ability?.effect?.id === 'transformacao_10x') return false;
  player.ability ??= { cooldowns: {} };
  const activating = player.nucleoForm !== 'forma_veloz';
  player.nucleoForm = activating ? 'forma_veloz' : null;
  player.moving = false;
  player.target = null;
  player.ability.effect = { id: 'transformacao_10x', color: '#6bff92', duration: 1.05, timeLeft: 1.05, activating };
  player.ability.lastMessage = activating ? 'FORMA VELOZ ATIVADA' : 'RETORNO AO OPERADOR';
  player.ability.messageTimer = 1.5;
  return true;
}
