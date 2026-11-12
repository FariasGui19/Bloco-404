// Transições de progresso da missão do metrô, independentes de arquétipo e UI.
// As rotas temáticas compartilham apenas as transições de progresso.
// Estas funções não salvam nem abrem diálogos: o chamador controla esses efeitos.
export function recordAirportDiagnosis(progress) {
  progress.flags ??= {};
  progress.flags.airportTerminalDiagnosed = true;
  if (progress.activeQuest?.id === 'calibracao_de_eco') {
    progress.activeQuest.stage = 'find_fragment';
    progress.activeQuest.description = {
      motor_bio_forja: 'O Terminal de Manutenção detectou um Fragmento de Sincronização na Área de Carga Desativada. Reconfigure o painel [R] e cruze a grade de impulso [Q].',
      lamina_dominio_anciao: 'O terminal detectou um Fragmento de Sincronização na Câmara de Frequência. Leia o lacre [R] e rompa-o com a Lâmina [Q].',
      mare_astral: 'O terminal detectou um Fragmento de Sincronização na Câmara de Fluxo. Leia a corrente [R] e atravesse com o Passo de Corrente [Q].',
      nucleo_dez_forma: 'O terminal detectou um Fragmento de Sincronização na Câmara de Eco Cinético. Leia a janela [R] e cruze com o Pulso Veloz [Q].',
    }[progress.archetype] ?? 'O terminal detectou um Fragmento de Sincronização na câmara acessível pela porta da carga do Aeroporto.';
  }
}

export function recordCargoDiagnosis(progress) {
  progress.flags ??= {};
  progress.flags.cargoSecurityDiagnosed = true;
  if (progress.activeQuest?.id === 'calibracao_de_eco') {
    progress.activeQuest.stage = 'collect_fragment';
    progress.activeQuest.description = 'A grade de impulso foi reconfigurada. Use o Propulsor [Q] para cruzar o campo e recolher o Fragmento no berço além da grade.';
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
      description: 'A linha acordou. Acesse a Plataforma Interdimensional pelo Metrô e investigue a primeira rota — algo passou por ali três segundos antes de você.',
      status: 'active',
    };
  }
}
