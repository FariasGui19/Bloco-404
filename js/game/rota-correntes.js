import { startQuest, recordQuestEvent } from './quests.js';

// Cada baliza é registrada uma única vez no save, mesmo após recarregar ou
// atravessar a área novamente. A missão permanece ativa para saves antigos.
export function atualizarRotaCorrentes(map, player, progress) {
  if (map?.id !== 'mar_caminho_das_correntes' || !player || !progress) return null;
  const nova = !progress.questLog?.caminho_das_correntes;
  startQuest(progress, 'caminho_das_correntes');
  if (nova) return 'CAMINHO DAS CORRENTES • MARÉ ASTRAL: MERGULHE NAS TRÊS BALIZAS';
  if (!player.nado?.ativo || !player.nado.mareAstral || player.nado.profundidade <= 1.25) return null;
  progress.flags ??= {};
  for (const ponto of map.pontosCorrente ?? []) {
    const flag = `corrente_sintonizada_${ponto.id}`;
    if (progress.flags[flag] || Math.hypot(player.x - ponto.x, player.y - ponto.y) > 1.25) continue;
    progress.flags[flag] = true;
    const completas = recordQuestEvent(progress, {type:'reach', target:`corrente_${ponto.id}`});
    return completas.some(q => q.id === 'caminho_das_correntes')
      ? 'CAMINHO DAS CORRENTES MAPEADO • MAPA DAS CORRENTES RECEBIDO'
      : `${ponto.nome} • BALIZA SINTONIZADA`;
  }
  return null;
}
