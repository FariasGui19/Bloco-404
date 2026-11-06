// Transições de progresso da missão do metrô, independentes de arquétipo e UI.
// As rotas temáticas compartilham apenas as transições de progresso.
// Estas funções não salvam nem abrem diálogos: o chamador controla esses efeitos.
export function recordAirportDiagnosis(progress) {
  progress.flags ??= {};
  progress.flags.airportTerminalDiagnosed = true;
  if (progress.activeQuest?.id === 'calibracao_de_eco') {
    progress.activeQuest.stage = 'find_fragment';
    progress.activeQuest.description = progress.archetype === 'motor_bio_forja'
      ? 'O Terminal de Manutenção detectou um Fragmento de Sincronização na Área de Carga Desativada do Aeroporto.'
      : 'O terminal detectou um Fragmento de Sincronização na câmara acessível pela porta da carga do Aeroporto.';
  }
}

export function recordCargoDiagnosis(progress) {
  progress.flags ??= {};
  progress.flags.cargoSecurityDiagnosed = true;
  if (progress.activeQuest?.id === 'calibracao_de_eco') {
    progress.activeQuest.stage = 'collect_fragment';
    progress.activeQuest.description = 'A Grade de Impulso foi reconfigurada. Use o Propulsor de Impulso para atravessar o campo e coletar o Fragmento de Sincronização.';
  }
}

export function installMetroFragment(progress) {
  progress.flags ??= {};
  progress.flags.metroCalibrado = true;
  progress.flags.metroUnlocked = true;
  progress.inventory = (progress.inventory ?? []).filter(item => item !== 'fragmento_sincronizacao');
  if (progress.activeQuest?.id === 'calibracao_de_eco') {
    progress.activeQuest.status = 'completed';
    progress.completedQuests ??= [];
    if (!progress.completedQuests.includes('calibracao_de_eco')) {
      progress.completedQuests.push('calibracao_de_eco');
    }
    progress.activeQuest = {
      id: 'embarque_dimensional',
      title: 'EMBARQUE DIMENSIONAL',
      description: 'Acesse a Plataforma Interdimensional pelo Metrô e investigue a primeira rota disponível.',
      status: 'active',
    };
  }
}
