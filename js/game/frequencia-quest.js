// Prólogo da primeira missão canônica. A cidadela/FPS é trabalho futuro;
// estas transições não fabricam acesso, vitória nem recompensa.
export function reachFirstRoute(progress, mapId) {
  if (!progress?.flags?.metroCalibrado || !isPreludeQuest(progress)) return;
  if (progress.flags.frequencia666Registrada) {
    markSignalStage(progress);
    return;
  }
  if (mapId !== 'ilha_praia_inicial' && mapId !== 'ilha_enseada_ecos') return;
  progress.activeQuest.stage = 'investigar_sinal';
  progress.activeQuest.title = 'FREQUÊNCIA 66.6 MHz';
  progress.activeQuest.description = 'Siga da Praia Inicial à Enseada dos Ecos. Procure o terminal de manutenção e investigue o sinal com [R].';
}

function isPreludeQuest(progress) {
  const quest = progress.activeQuest;
  return quest?.id === 'embarque_dimensional' && quest.status !== 'completed' &&
    (!quest.stage || ['embarcar', 'investigar_sinal', 'sinal_registrado'].includes(quest.stage));
}

function markSignalStage(progress) {
  if (!isPreludeQuest(progress)) return;
  Object.assign(progress.activeQuest, {
    title: 'FREQUÊNCIA 66.6 MHz', stage: 'sinal_registrado',
    description: 'O sinal revelou a Cidadela do Código Queimado. A rota ainda está instável; aguarde sua estabilização. Por enquanto, explore a enseada.',
  });
}

export function recordFrequencySignal(progress) {
  if (!progress?.flags?.metroCalibrado || progress.flags.frequencia666Registrada) return false;
  progress.flags.frequencia666Registrada = true;
  markSignalStage(progress);
  return true;
}
