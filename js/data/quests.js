// =====================================================================
// MISSÕES — DEFINIÇÕES
//
// Missões novas usam objetivos contáveis e recompensas declaradas.
// As missões antigas (embarque_dimensional, calibracao_de_eco) continuam
// com seu fluxo próprio e não são migradas para cá.
//
// objectives[].type  defeat | collect | reach
// rewards            xp (do arquétipo atual), points, items, flags
// =====================================================================

export const QUESTS = Object.freeze({
  caminho_das_correntes: Object.freeze({
    id: 'caminho_das_correntes', title: 'CAMINHO DAS CORRENTES', giver: 'O MAR', kind: 'secundária',
    description: 'Na Enseada dos Ecos, siga para o Caminho das Correntes. Com Maré Astral, mergulhe junto às três balizas: Recife da Escuta, Jardim das Marés e Farol Submerso.',
    objectives: Object.freeze([
      Object.freeze({type:'reach', target:'corrente_primeira', count:1, label:'Sintonizar o Recife da Escuta'}),
      Object.freeze({type:'reach', target:'corrente_segunda', count:1, label:'Sintonizar o Jardim das Marés'}),
      Object.freeze({type:'reach', target:'corrente_terceira', count:1, label:'Sintonizar o Farol Submerso'}),
    ]),
    rewards: Object.freeze({xp:200, points:2, items:Object.freeze(['mapa_das_correntes']), flags:Object.freeze({caminho_das_correntes_concluido:true})}),
  }),
  calibracao_de_campo: Object.freeze({
    id: 'calibracao_de_campo',
    title: 'CALIBRAÇÃO DE CAMPO',
    giver: 'NEXO-04',
    kind: 'secundária',
    description: 'Disperte três ecos de treino para o Núcleo registrar sua assinatura de combate.',
    objectives: Object.freeze([
      Object.freeze({ type: 'defeat', target: 'training', count: 3, label: 'Ecos de treino dispersos' }),
    ]),
    rewards: Object.freeze({ xp: 60, points: 1, items: Object.freeze(['registro_de_calibracao']), flags: Object.freeze({ calibracao_de_campo_concluida: true }) }),
  }),
  // -------------------------------------------------------------------
  // MARÉ ASTRAL — MARÉ PROFUNDA
  //
  // A missão que dá razão ao mergulho. Objetivos contáveis, sem script
  // novo: `mergulho` e `coleta_marinha` são emitidos pelo nado e pela
  // vida aquática; `reach` usa o mesmo evento que as rotas já usam.
  // Recompensa é XP do arquétipo + uma flag, igual às outras.
  // -------------------------------------------------------------------
  mare_profunda: Object.freeze({
    id: 'mare_profunda',
    title: 'MARÉ PROFUNDA',
    giver: 'MARÉ ASTRAL',
    kind: 'secundária',
    description: 'A maré esconde o que a areia não mostra. Desça na enseada, alcance o fundo e volte com o que o mar guardou.',
    objectives: Object.freeze([
      Object.freeze({ type: 'mergulho', count: 3, label: 'Mergulhos fundos na enseada' }),
      Object.freeze({ type: 'coleta_marinha', count: 4, label: 'Fragmentos de maré recolhidos' }),
      Object.freeze({ type: 'reach', target: 'fundo_enseada', count: 1, label: 'Fundo da Enseada dos Ecos' }),
    ]),
    rewards: Object.freeze({
      xp: 140,
      points: 2,
      items: Object.freeze(['semente_de_mare']),
      flags: Object.freeze({ mare_profunda_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // MARÉ ASTRAL — SALVA-VIDAS
  //
  // Missão de AJUDAR ANIMAIS pedida pelo criador. Não é "colete 5 itens":
  // o objetivo `socorro` só conta quando um bicho ferido volta à vida,
  // e não conta duas vezes para o mesmo animal (o id é gravado no save).
  // -------------------------------------------------------------------
  mare_salva_vidas: Object.freeze({
    id: 'mare_salva_vidas',
    title: 'SALVA-VIDAS',
    giver: 'MARÉ ASTRAL',
    kind: 'secundária',
    description: 'O arquipélago está ferido antes de você chegar. Há bichos presos, encalhados e enredados na areia e na água. Solte o que prende, cure o que respira.',
    objectives: Object.freeze([
      Object.freeze({ type: 'socorro', count: 3, label: 'Animais socorridos' }),
      Object.freeze({ type: 'socorro_terra', count: 1, label: 'Animal socorrido em terra' }),
    ]),
    rewards: Object.freeze({
      xp: 180,
      points: 2,
      items: Object.freeze(['concha_ressonante']),
      flags: Object.freeze({ mare_salva_vidas_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // APRENDER A NADAR — a árvore de nado em cinco degraus
  //
  // Ninguém chega à praia sabendo nadar. Cada objetivo é uma PROVA feita
  // no mundo (`nado-arvore.js` emite `nado_degrau` com o id da prova):
  // um objetivo por prova, contagem 1 — o motor é incremental, mas aqui
  // "prova feita" é absoluto e não pode contar duas vezes.
  // Vale para qualquer módulo (e para quem ainda não tem módulo).
  // -------------------------------------------------------------------
  aprender_a_nadar: Object.freeze({
    id: 'aprender_a_nadar',
    title: 'APRENDER A NADAR',
    giver: 'O MAR',
    kind: 'secundária',
    description: 'O mar assusta quem nunca entrou nele. Comece pela Poça da Cascata, a oeste da estação: boiar, prender o ar, atravessar um canal e, por fim, tocar o fundo.',
    objectives: Object.freeze([
      Object.freeze({ type: 'nado_degrau', target: 'boiar', count: 1, label: 'Boiar parado na Poça da Cascata' }),
      Object.freeze({ type: 'nado_degrau', target: 'respirar', count: 1, label: 'Cabeça submersa por 4 s (segure ESPAÇO)' }),
      Object.freeze({ type: 'nado_degrau', target: 'travessia', count: 1, label: 'Atravessar um canal a nado' }),
      Object.freeze({ type: 'nado_degrau', target: 'fundo', count: 1, label: 'Tocar o fundo do azul-escuro' }),
    ]),
    // Secundária e curta (uns três minutos): rende um pouco mais que a
    // calibração de campo (60), bem menos que uma rota principal (140+).
    // Com 160 ela pulava o operador do nível 1 para o 4 de uma vez.
    rewards: Object.freeze({
      xp: 70,
      points: 1,
      items: Object.freeze(['boia_de_cortica']),
      flags: Object.freeze({ aprendeu_a_nadar: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // MOTOR BIO-FORJA — FORJA DO PROPULSOR (Oficina Inicial · Doca A1)
  // -------------------------------------------------------------------
  forja_do_propulsor: Object.freeze({
    id: 'forja_do_propulsor',
    title: 'FORJA DO PROPULSOR',
    giver: 'BANCO DE RECONSTRUÇÃO',
    kind: 'secundária',
    description: 'Na Oficina Bio-Forja (Doca A1), exponha a falha da Grade de Ímpeto Vivo com [R], rompa o campo com o Propulsor [Q], recolha o Fragmento de Eco no relicário e sincronize-o no Banco de Reconstrução.',
    objectives: Object.freeze([
      Object.freeze({ type: 'diagnose', target: 'bio_placa_diagnostico', count: 1, label: 'Diagnosticar a Grade de Ímpeto Vivo com [R]' }),
      Object.freeze({ type: 'breach_gate', target: 'grade_impeto_vivo', count: 1, label: 'Romper a grade com o Propulsor de Impulso [Q]' }),
      Object.freeze({ type: 'collect', target: 'fragmento_eco_bio', count: 1, label: 'Recolher o Fragmento de Eco no relicário leste' }),
      Object.freeze({ type: 'sync_forge', target: 'maquina_bio', count: 1, label: 'Sincronizar o fragmento no Banco de Reconstrução [E]' }),
    ]),
    rewards: Object.freeze({
      xp: 75,
      points: 1,
      items: Object.freeze(['selo_forja_bio']),
      flags: Object.freeze({ missao_bio_forja_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // LÂMINA DOMÍNIO ANCIÃO — PROVA DA RUPTURA (Santuário do Anel · Doca B2)
  // -------------------------------------------------------------------
  prova_da_ruptura: Object.freeze({
    id: 'prova_da_ruptura',
    title: 'PROVA DA RUPTURA',
    giver: 'ALTAR DA LÂMINA ANCESTRAL',
    kind: 'secundária',
    description: 'No Santuário do Anel (Doca B2), assuma a Postura do Domínio [R] para expor a falha do Lacre de Frequência, parta o selo com o Golpe de Ruptura [Q], recolha o Fragmento de Eco e consagre o juramento no Altar da Lâmina.',
    objectives: Object.freeze([
      Object.freeze({ type: 'diagnose', target: 'scan_lacre_sala', count: 1, label: 'Revelar o ponto frágil do Lacre com Postura do Domínio [R]' }),
      Object.freeze({ type: 'breach_gate', target: 'lacre_frequencia_sala', count: 1, label: 'Partir o Lacre de Frequência com Golpe de Ruptura [Q]' }),
      Object.freeze({ type: 'collect', target: 'fragmento_eco_dominio', count: 1, label: 'Recolher o Fragmento de Eco na Câmara da Coroa' }),
      Object.freeze({ type: 'consecrate_blade', target: 'pedestal_lamina', count: 1, label: 'Consagrar o fragmento no Altar da Lâmina Ancestral [E]' }),
    ]),
    rewards: Object.freeze({
      xp: 75,
      points: 1,
      items: Object.freeze(['insignia_anel_dominio']),
      flags: Object.freeze({ missao_dominio_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // MARÉ ASTRAL — CALIBRAGEM DE CORRENTE (Dársena Abissal · Doca A2)
  // -------------------------------------------------------------------
  calibragem_de_corrente: Object.freeze({
    id: 'calibragem_de_corrente',
    title: 'CALIBRAGEM DE CORRENTE',
    giver: 'NÚCLEO HIDRODIMENSIONAL',
    kind: 'secundária',
    description: 'Na Dársena Abissal (Doca A2), leia a janela laminar do Fluxo Contido com o Senso de Corrente [R], atravesse a cortina d’água com o Passo de Corrente [Q], recolha o Fragmento de Eco e sintonize-o no Núcleo Hidrodimensional.',
    objectives: Object.freeze([
      Object.freeze({ type: 'diagnose', target: 'scan_fluxo_sala', count: 1, label: 'Ler a janela do Fluxo Contido com Senso de Corrente [R]' }),
      Object.freeze({ type: 'breach_gate', target: 'fluxo_contido_sala', count: 1, label: 'Atravessar o Fluxo Contido com Passo de Corrente [Q]' }),
      Object.freeze({ type: 'collect', target: 'fragmento_eco_mare', count: 1, label: 'Recolher o Fragmento de Eco no Relicário de Coral' }),
      Object.freeze({ type: 'sync_tide', target: 'gerador_corrente', count: 1, label: 'Sintonizar o fragmento no Núcleo Hidrodimensional [E]' }),
    ]),
    rewards: Object.freeze({
      xp: 75,
      points: 1,
      items: Object.freeze(['amuleto_corrente_mare']),
      flags: Object.freeze({ missao_mare_concluida: true }),
    }),
  }),
  // -------------------------------------------------------------------
  // NÚCLEO 10X — SINCRONIA DOS VETORES (Base dos Vetores · Doca D4)
  // -------------------------------------------------------------------
  sincronia_dos_vetores: Object.freeze({
    id: 'sincronia_dos_vetores',
    title: 'SINCRONIA DOS VETORES',
    giver: 'EIXO DE ADAPTAÇÃO',
    kind: 'secundária',
    description: 'Na Base dos Vetores (Doca D4), leia a janela da Malha Cinética com Eco Scan [R], atravesse-a com o Pulso Veloz [Q], recolha o Fragmento de Eco no relicário e sincronize-o no Eixo de Adaptação.',
    objectives: Object.freeze([
      Object.freeze({ type: 'diagnose', target: 'scan_malha_sala', count: 1, label: 'Ler a janela da Malha Cinética com Eco Scan [R]' }),
      Object.freeze({ type: 'breach_gate', target: 'malha_cinetica_sala', count: 1, label: 'Atravessar a Malha Cinética com o Pulso Veloz [Q]' }),
      Object.freeze({ type: 'collect', target: 'fragmento_eco_nucleo', count: 1, label: 'Recolher o Fragmento de Eco no Relicário de Vetor' }),
      Object.freeze({ type: 'sync_vectors', target: 'nucleo_adaptacao', count: 1, label: 'Sincronizar o fragmento no Eixo de Adaptação [E]' }),
    ]),
    rewards: Object.freeze({
      xp: 75,
      points: 1,
      items: Object.freeze(['selo_vetor_nucleo']),
      flags: Object.freeze({ missao_nucleo_concluida: true }),
    }),
  }),
});

export function getQuest(id) {
  return QUESTS[id] ?? null;
}

export function listQuests() {
  return Object.values(QUESTS);
}
