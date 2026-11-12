// Prólogo de 66.6 MHz. A travessia permanece pendente até existir destino FPS.
// Funções puras em relação à UI/save; mantêm missões de outros sistemas intactas.
export const FREQUENCIA_ANCORAS = Object.freeze([
  { id: 'origem', flag: 'freq666_ancora_origem', nome: 'ORIGEM' },
  { id: 'retorno', flag: 'freq666_ancora_retorno', nome: 'RETORNO' },
  { id: 'memoria', flag: 'freq666_ancora_memoria', nome: 'MEMÓRIA' },
]);
const STAGES = ['embarcar', 'investigar_sinal', 'sinal_registrado', 'ancoras_em_andamento', 'calibrar_limiar', 'limiar_estavel', 'limiar_preparado'];
function isPreludeQuest(progress) {
  const q = progress?.activeQuest;
  return q?.id === 'embarque_dimensional' && q.status !== 'completed' && (!q.stage || STAGES.includes(q.stage));
}
export function countFrequencyAnchors(progress) {
  return FREQUENCIA_ANCORAS.filter(a => progress?.flags?.[a.flag]).length;
}
export function syncFrequencyQuest(progress) {
  if (!isPreludeQuest(progress) || !progress.flags?.frequencia666Registrada) return;
  const q = progress.activeQuest;
  q.title = 'FREQUÊNCIA 66.6 MHz';
  const n = countFrequencyAnchors(progress);
  if (progress.flags.freq666_limiar_preparado) {
    q.stage = 'limiar_preparado';
    q.description = 'Limiar preparado. A travessia aguarda a abertura da rota à Cidadela; retorne ou explore enquanto isso.';
  } else if (progress.flags.freq666_limiar_estavel) {
    q.stage = 'limiar_estavel';
    q.description = 'A janela está estável. Aproxime-se do anel na Estação 66.6 e prepare a travessia [E].';
  } else if (n === FREQUENCIA_ANCORAS.length) {
    q.stage = 'calibrar_limiar';
    q.description = 'As três âncoras responderam. Use [R] no console central da Estação 66.6 para estabilizar a janela.';
  } else if (n > 0) {
    q.stage = 'ancoras_em_andamento';
    q.description = `Estação 66.6: examine as âncoras de Origem, Retorno e Memória [E] (${n}/3).`;
  } else {
    q.stage = 'sinal_registrado';
    q.description = 'O sinal apontou para a Estação 66.6. Na Enseada, siga pela porta de manutenção próxima ao terminal.';
  }
}
export function reachFirstRoute(progress, mapId) {
  if (!progress?.flags?.metroCalibrado || !isPreludeQuest(progress)) return;
  if (progress.flags.frequencia666Registrada) {
    syncFrequencyQuest(progress);
    if (mapId === 'estacao_limiar_666' && progress.activeQuest.stage === 'sinal_registrado') {
      progress.activeQuest.description = 'Estação 66.6: examine as âncoras de Origem, Retorno e Memória [E] (0/3).';
    }
    return;
  }
  if (mapId !== 'ilha_praia_inicial' && mapId !== 'ilha_enseada_ecos') return;
  Object.assign(progress.activeQuest, { stage: 'investigar_sinal', title: 'FREQUÊNCIA 66.6 MHz',
    description: 'Siga da Praia Inicial à Enseada dos Ecos. Procure o terminal de manutenção e investigue o sinal com [R].' });
}
export function recordFrequencySignal(progress) {
  if (!progress?.flags?.metroCalibrado || progress.flags.frequencia666Registrada) return false;
  progress.flags.frequencia666Registrada = true;
  syncFrequencyQuest(progress);
  return true;
}
export function recordFrequencyAnchor(progress, id) {
  const anchor = FREQUENCIA_ANCORAS.find(a => a.id === id);
  if (!progress?.flags?.frequencia666Registrada || !anchor || progress.flags[anchor.flag]) return false;
  progress.flags[anchor.flag] = true; syncFrequencyQuest(progress); return true;
}
export function stabilizeFrequencyThreshold(progress) {
  if (!progress?.flags?.frequencia666Registrada || countFrequencyAnchors(progress) !== FREQUENCIA_ANCORAS.length || progress.flags.freq666_limiar_estavel) return false;
  progress.flags.freq666_limiar_estavel = true; syncFrequencyQuest(progress); return true;
}
export function prepareFrequencyCrossing(progress) {
  if (!progress?.flags?.freq666_limiar_estavel || progress.flags.freq666_limiar_preparado) return false;
  progress.flags.freq666_limiar_preparado = true; syncFrequencyQuest(progress); return true;
}
