// js/game/onboarding.js
// =====================================================================
// ONBOARDING
//
// Avaliação de Ressonância de Eco conduzida por NEXO-04.
// =====================================================================

import { state } from './state.js';
import { saveGame } from './save.js';

import {
  ARCHETYPES,
  ONBOARDING_QUESTIONS,
} from '../data/onboarding.js';

import { openDialogue } from '../ui/dialogue.js';

import {
  openArchetypeResult,
  openArchetypeCatalog,
  openArchetypePreview,
} from '../ui/archetype-cards.js';

import {
  stopActorTalking,
} from './actors.js';
import { getArchetypeAbilities } from './abilities.js';
import { ARCHETYPE_KITS } from '../data/archetype-kits.js';
import { applyUnlocks } from './unlocks.js';
import { ensureArchetypeProgress } from './progression.js';
import { startQuest } from './quests.js';
import { podeEscolherArquetipo, arquetiposEmUso } from './personas.js';

function createEmptyScores() {
  return {
    nucleo_dez_forma: 0,
    lamina_dominio_anciao: 0,
    motor_bio_forja: 0,
    mare_astral: 0,
  };
}

function ensureOnboardingState() {
  state.progress.onboardingScores ??= createEmptyScores();
  state.progress.onboardingQuestionIndex ??= 0;
}

function getRecommendedArchetype() {
  const scores = state.progress.onboardingScores ?? createEmptyScores();

  // Ordem em caso de empate.
  const priority = [
    'motor_bio_forja',
    'nucleo_dez_forma',
    'lamina_dominio_anciao',
    'mare_astral',
  ];

  return [...priority].sort(
    (a, b) => (scores[b] ?? 0) - (scores[a] ?? 0)
  )[0];
}

function addScore(score = {}) {
  ensureOnboardingState();

  for (const [archetypeId, points] of Object.entries(score)) {
    state.progress.onboardingScores[archetypeId] ??= 0;
    state.progress.onboardingScores[archetypeId] += points;
  }
}

function getCompatibilityPercent(archetypeId) {
  const score = state.progress.onboardingScores?.[archetypeId] ?? 0;

  return Math.min(
    99,
    68 + score * 8 + Math.floor(Math.random() * 5)
  );
}

// =====================================================================
// PERGUNTAS
// =====================================================================

function openQuestion(actor, index) {
  ensureOnboardingState();

  const question = ONBOARDING_QUESTIONS[index];

  if (!question) {
    openResult(actor);
    return;
  }

  state.progress.onboardingQuestionIndex = index;
  saveGame();

  openDialogue({
    speaker: 'NEXO-04',
    speakerId: actor.id,

    dialogue: [
      `AVALIAÇÃO DE RESSONÂNCIA // ${index + 1}/${ONBOARDING_QUESTIONS.length}`,
      question.text,
    ],

    choices: question.choices.map(choice => ({
      text: choice.text,

      onSelect: () => {
        addScore(choice.score);

        const nextIndex = index + 1;

        state.progress.onboardingQuestionIndex = nextIndex;
        saveGame();

        openQuestion(actor, nextIndex);
      },
    })),

    cancelable: false,
  });
}

// =====================================================================
// RESULTADO
// =====================================================================

function openResult(actor) {
  const recommendedId = getRecommendedArchetype();
  const archetype = ARCHETYPES[recommendedId];

  state.progress.onboardingQuestionIndex =
    ONBOARDING_QUESTIONS.length;

  saveGame();

  openDialogue({
    speaker: 'NEXO-04',
    speakerId: actor.id,

    dialogue: [
      'ANÁLISE DE RESSONÂNCIA CONCLUÍDA.',
      `MÓDULO RECOMENDADO: ${archetype.nome}.`,
      `COMPATIBILIDADE DIMENSIONAL: ${getCompatibilityPercent(recommendedId)}%.`,
      'Abrindo visualização do Arquivo de Ecos.',
    ],

    onFinish: () => {
      openVisualResult(actor, recommendedId);
    },
  });
}

function openVisualResult(actor, recommendedId) {
  openArchetypeResult({
    recommendedId,
    compatibility: getCompatibilityPercent(recommendedId),

    onAccept: archetypeId => {
      finalizeArchetype(actor, archetypeId);
    },

    onBrowse: () => {
      openVisualCatalog(actor, recommendedId);
    },
  });
}

function openVisualCatalog(actor, recommendedId) {
  openArchetypeCatalog({
    recommendedId,

    onSelect: archetypeId => {
      openVisualPreview(actor, archetypeId, recommendedId);
    },

    onBack: () => {
      openVisualResult(actor, recommendedId);
    },
  });
}

function openVisualPreview(actor, archetypeId, recommendedId) {
  openArchetypePreview({
    archetypeId,

    onInstall: selectedId => {
      finalizeArchetype(actor, selectedId);
    },

    onBack: () => {
      openVisualCatalog(actor, recommendedId);
    },
  });
}

// =====================================================================
// FINALIZAÇÃO
// =====================================================================

function finalizeArchetype(actor, archetypeId) {
  const archetype = ARCHETYPES[archetypeId];

  // UM MÓDULO DE CADA entre os 4 operadores. Se outro save já usa este
  // arquétipo, o Núcleo recusa a instalação em vez de duplicar.
  const slot = state.save?.activeSlot;
  if (!podeEscolherArquetipo(archetypeId, slot)) {
    const dono = arquetiposEmUso(slot).get(archetypeId);
    openDialogue({
      speaker: 'NEXO-04',
      speakerId: actor?.id,
      dialogue: [
        'INSTALAÇÃO RECUSADA.',
        `O MÓDULO ${archetype.nome} JÁ ESTÁ EM USO PELO OPERADOR ${String(dono).padStart(2, '0')}.`,
        'CADA UM DOS QUATRO OPERADORES CARREGA UM MÓDULO DIFERENTE.',
        'ESCOLHA OUTRO ARQUÉTIPO.',
      ],
      onFinish: () => {},
    });
    return;
  }

  state.progress.archetype = archetypeId;
  // Libera o kit inicial de habilidades do módulo escolhido. 
  state.progress.abilities = getArchetypeAbilities(archetypeId);
  // Confirma o degrau 1 (Q/R). Ferramenta e Ultimate dependem do nível.
  applyUnlocks(state.progress, ARCHETYPE_KITS[archetypeId]);
  ensureArchetypeProgress(state.progress);
  state.progress.onboardingCompleted = true;
  state.progress.onboardingStarted = true;

  state.progress.activeQuest = {
    id: 'calibracao_de_eco',
    title: 'CALIBRAÇÃO DE ECO',
    description:
      'Localize um terminal de manutenção e estabilize um Fragmento de Sincronização.',
    status: 'active',
  };

  state.progress.flags ??= {};
  state.progress.flags.nexoEvaluationCompleted = true;
  // Primeira missão contável: apresenta o motor de objetivos e recompensas.
  startQuest(state.progress, 'calibracao_de_campo');
  // O Maré Astral já nasce com a missão da maré aberta: é o arquétipo que
  // respira embaixo d'água e o que mais ganha com a praia nova.
  if (archetypeId === 'mare_astral') startQuest(state.progress, 'mare_profunda');
  if (archetypeId === 'motor_bio_forja') startQuest(state.progress, 'forja_do_propulsor');
  if (archetypeId === 'lamina_dominio_anciao') startQuest(state.progress, 'prova_da_ruptura');

  saveGame();

  openDialogue({
    speaker: 'NEXO-04',
    speakerId: actor.id,

    dialogue: [
      `MÓDULO INSTALADO: ${archetype.nome}.`,
      'Sua assinatura dimensional foi registrada no Arquivo Central.',
      'NOVA MISSÃO ATIVA: CALIBRAÇÃO DE ECO.',
      'Quando estiver pronto, procure uma rota de manutenção ou um terminal instável.',
      'E tente não explodir nada importante. O orçamento do Bloco 404 não cobre realidades paralelas.',
    ],

    onFinish: () => {
      actor.pose = 'idle';

      state.interaction.talkingTo = null;
      stopActorTalking(actor);
    },
  });
}

// =====================================================================
// ENTRADA DO NEXO
// =====================================================================

export function startNexoOnboarding(actor) {
  if (state.progress.onboardingCompleted) {
    const archetype = ARCHETYPES[state.progress.archetype];

    openDialogue({
      speaker: 'NEXO-04',
      speakerId: actor.id,

      dialogue: [
        'Sua assinatura dimensional continua estável.',
        `MÓDULO ATUAL: ${archetype?.nome ?? 'NÃO IDENTIFICADO'}.`,
        state.progress.activeQuest
          ? `MISSÃO ATIVA: ${state.progress.activeQuest.title}.`
          : 'Nenhuma missão prioritária detectada.',
      ],

      onFinish: () => {
        state.interaction.talkingTo = null;
        stopActorTalking(actor);
      },
    });

    return;
  }

  if (!state.progress.onboardingStarted) {
    openIntroduction(actor);
    return;
  }

  resumeOnboarding(actor);
}

function openIntroduction(actor) {
  openDialogue({
    speaker: 'NEXO-04',
    speakerId: actor.id,

    dialogue: [
      'Operador identificado.',
      'Seu perfil dimensional ainda não foi calibrado.',
      'Antes de liberar permissões avançadas, elevadores especiais e rotas externas, preciso executar uma Avaliação de Ressonância de Eco.',
      'Não se preocupe. Seus dados serão tratados com a menor irresponsabilidade possível.',
    ],

    choices: [
      {
        text: 'INICIAR AVALIAÇÃO',

        onSelect: () => {
          state.progress.onboardingStarted = true;
          state.progress.onboardingScores = createEmptyScores();
          state.progress.onboardingQuestionIndex = 0;

          saveGame();

          openQuestion(actor, 0);
        },
      },
      {
        text: 'DEIXAR PARA DEPOIS',

        onSelect: () => {
          openDialogue({
            speaker: 'NEXO-04',
            speakerId: actor.id,

            dialogue: [
              'Compreensível.',
              'A burocracia dimensional continuará aguardando sua coragem administrativa.',
            ],

            onFinish: () => {
              state.interaction.talkingTo = null;
              stopActorTalking(actor);
            },
          });
        },
      },
    ],

    cancelable: true,
  });
}

function resumeOnboarding(actor) {
  const questionIndex =
    state.progress.onboardingQuestionIndex ?? 0;

  if (questionIndex >= ONBOARDING_QUESTIONS.length) {
    openResult(actor);
    return;
  }

  openDialogue({
    speaker: 'NEXO-04',
    speakerId: actor.id,

    dialogue: [
      'Avaliação de Ressonância detectada como incompleta.',
      'Deseja retomar o protocolo?',
    ],

    choices: [
      {
        text: 'RETOMAR AVALIAÇÃO',
        onSelect: () => openQuestion(actor, questionIndex),
      },
      {
        text: 'DEIXAR PARA DEPOIS',

        onSelect: () => {
          openDialogue({
            speaker: 'NEXO-04',
            speakerId: actor.id,

            dialogue: [
              'Protocolo pausado.',
              'A instabilidade dimensional agradece sua colaboração.',
            ],

            onFinish: () => {
              state.interaction.talkingTo = null;
              stopActorTalking(actor);
            },
          });
        },
      },
    ],

    cancelable: true,
  });
} 