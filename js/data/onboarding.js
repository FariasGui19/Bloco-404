// js/data/onboarding.js
// =====================================================================
// AVALIAÇÃO DE RESSONÂNCIA DE ECO
//
// Dados dos Arquétipos/Módulos de Eco e das perguntas de onboarding.
//
// artIndex representa a posição horizontal na concept sheet:
//
// 0 = Núcleo 10X
// 1 = Domínio Ancião
// 2 = Motor Bio-Forja
// 3 = Maré Astral
// =====================================================================

export const ARCHETYPES = {
  // -------------------------------------------------------------------
  // 0 — NÚCLEO 10X
  // -------------------------------------------------------------------
  nucleo_dez_forma: {
    id: 'nucleo_dez_forma',
    artIndex: 0,

    nome: 'NÚCLEO 10X',
    subtitulo: 'SISTEMA DE ADAPTAÇÃO INSTÁVEL',
    cor: '#74ff8a',

    descricao:
      'Um bracelete de Eco capaz de ativar Formas de Adaptação temporárias. Flexível, imprevisível e ligeiramente preocupante.',

    habilidadeInicial:
      'FORMA VELOZ — mobilidade e adaptação futura.',

    risco:
      'Possibilidade estatística de ativar uma forma inadequada no momento menos conveniente.',
  },

  // -------------------------------------------------------------------
  // 1 — DOMÍNIO ANCIÃO
  // -------------------------------------------------------------------
  lamina_dominio_anciao: {
    id: 'lamina_dominio_anciao',
    artIndex: 1,

    nome: 'DOMÍNIO ANCIÃO',
    subtitulo: 'PROTOCOLO DE FORÇA E RUPTURA',
    cor: '#ffd54f',

    descricao:
      'Uma lâmina de Frequência Antiga transforma o operador em uma força de impacto capaz de quebrar barreiras e proteger aliados.',

    habilidadeInicial:
      'GOLPE DE RUPTURA — força e quebra de obstáculos futura.',

    risco:
      'Probabilidade elevada de danos materiais em ambientes delicados.',
  },

  // -------------------------------------------------------------------
  // 2 — MOTOR BIO-FORJA
  // -------------------------------------------------------------------
  motor_bio_forja: {
    id: 'motor_bio_forja',
    artIndex: 2,

    nome: 'MOTOR BIO-FORJA',
    subtitulo: 'RECONSTRUÇÃO TÁTICA MODULAR',
    cor: '#35e6d3',

    descricao:
      'Um núcleo biomecânico capaz de reorganizar ferramentas, lâminas, propulsores e sistemas de mobilidade diretamente no traje.',

    habilidadeInicial:
      'PROPULSOR DE IMPULSO — dash e mobilidade futura.',

    risco:
      'Tendência a desmontar mecanismos que não pediram para ser desmontados.',
  },

  // -------------------------------------------------------------------
  // 3 — MARÉ ASTRAL
  // -------------------------------------------------------------------
  mare_astral: {
    id: 'mare_astral',
    artIndex: 3,

    nome: 'MARÉ ASTRAL',
    subtitulo: 'NAVEGAÇÃO HIDRODIMENSIONAL',
    cor: '#4caeff',

    descricao:
      'Um regulador de fluxo capaz de manipular pressão, correntes e energia aquática em ambientes normais ou submersos.',

    habilidadeInicial:
      'PASSO DE CORRENTE — mobilidade fluida e acesso aquático futuro.',

    risco:
      'Excesso de confiança em ambientes com pressão suficiente para esmagar aço.',
  },
};

// =====================================================================
// PERGUNTAS DA AVALIAÇÃO DE RESSONÂNCIA
// =====================================================================

export const ONBOARDING_QUESTIONS = [
  {
    id: 'crise_dimensional',

    text:
      'Uma passagem dimensional entra em colapso. Qual é sua prioridade?',

    choices: [
      {
        text: 'Adaptar meu corpo ao risco.',
        score: { nucleo_dez_forma: 1 },
      },
      {
        text: 'Segurar a linha e abrir caminho.',
        score: { lamina_dominio_anciao: 1 },
      },
      {
        text: 'Construir uma solução no meio do caos.',
        score: { motor_bio_forja: 1 },
      },
      {
        text: 'Estabilizar o fluxo antes que ele engula tudo.',
        score: { mare_astral: 1 },
      },
    ],
  },

  {
    id: 'porta_selada',

    text:
      'Você encontra uma porta selada por tecnologia desconhecida.',

    choices: [
      {
        text: 'Procuro outra forma de atravessar.',
        score: { nucleo_dez_forma: 1 },
      },
      {
        text: 'Quebro a barreira.',
        score: { lamina_dominio_anciao: 1 },
      },
      {
        text: 'Desmonto e reconecto o mecanismo.',
        score: { motor_bio_forja: 1 },
      },
      {
        text: 'Procuro uma rota pelo ambiente.',
        score: { mare_astral: 1 },
      },
    ],
  },

  {
    id: 'destino_inicial',

    text:
      'Qual dimensão parece mais interessante para uma primeira expedição?',

    choices: [
      {
        text: 'Um ecossistema cheio de espécies imprevisíveis.',
        score: { nucleo_dez_forma: 1 },
      },
      {
        text: 'Uma fortaleza esquecida em guerra.',
        score: { lamina_dominio_anciao: 1 },
      },
      {
        text: 'Uma cidade-máquina abandonada.',
        score: { motor_bio_forja: 1 },
      },
      {
        text: 'Uma cidade afundada sob um oceano impossível.',
        score: { mare_astral: 1 },
      },
    ],
  },

  {
    id: 'risco_operacional',

    text:
      'Qual risco operacional você aceitaria com mais facilidade?',

    choices: [
      {
        text: 'Não saber qual forma meu corpo terá por alguns minutos.',
        score: { nucleo_dez_forma: 1 },
      },
      {
        text: 'Carregar uma arma que pesa mais do que eu.',
        score: { lamina_dominio_anciao: 1 },
      },
      {
        text: 'Deixar uma máquina reorganizar parte do meu equipamento.',
        score: { motor_bio_forja: 1 },
      },
      {
        text: 'Descer onde a pressão pode esmagar aço.',
        score: { mare_astral: 1 },
      },
    ],
  },
]; 