// js/game/interactions.js
// =====================================================================
// INTERACTIONS
//
// Detecta portais, NPCs, objetos e coletáveis interativos.
// =====================================================================

import { state } from './state.js';
import { usePortal, isPortalLocked } from './portals.js';
import { openDialogue, isDialogueOpen } from '../ui/dialogue.js';
import { startActorTalking, stopActorTalking } from './actors.js';
import { openElevatorMenu } from '../ui/elevator-menu.js';
import { saveGame } from './save.js';
import { startNexoOnboarding } from './onboarding.js';
import { getNearestCollectible, getCollectiblePrompt, collectItem } from './collectibles.js';
import { checkGate, getGateFailureMessage, getGateSuccessMessage, isGateOpen, openGate } from './gates.js';
import { recordQuestEvent } from './quests.js';
import { grantArchetypeXp } from './rpg.js';
import { lerArvore, DEGRAUS } from './nado-arvore.js';

const DEFAULT_INTERACTION_DISTANCE = 1.35;

// =====================================================================
// HELPERS
// =====================================================================

function distanceBetween(aX, aY, bX, bY) {
  return Math.hypot(aX - bX, aY - bY);
}

function getInteractionDistance(item) {
  return item.interacao?.distancia ?? item.interactionDistance ?? DEFAULT_INTERACTION_DISTANCE;
}

function canInteractWith(item, player) {
  const maxDistance = getInteractionDistance(item);
  return distanceBetween(player.x, player.y, item.x, item.y) <= maxDistance;
}

function getPortalRuntimePosition(portal) {
  return {
    ...portal,
    x: portal.x + 0.5,
    y: portal.y + 0.5,
  };
}

// =====================================================================
// PORTAL BLOQUEADO POR PROGRESSO OU GATE
// =====================================================================

function isPortalBlockedByRequirement(portal) {
  if (portal.bloqueado) return true;

  // Compatibilidade com o sistema antigo
  if (portal.requiresFlag && state.progress.flags?.[portal.requiresFlag] !== true) return true;

  // NOVO: Checa o Gate
  if (portal.gate && !checkGate(portal.gate)) return true;

  return false;
}

// =====================================================================
// ENCONTRAR INTERAÇÃO MAIS PRÓXIMA
// =====================================================================

export function findNearestInteraction() {
  const player = state.player;   // PRECISA vir antes de qualquer consider()
  let best = null;

  function consider(kind, data, priority) {
    if (!data) return;
    if (!canInteractWith(data, player)) return;
    const distance = distanceBetween(player.x, player.y, data.x, data.y);
    const candidate = { kind, data, priority, distance };

    if (!best
      || candidate.priority < best.priority
      || (candidate.priority === best.priority && candidate.distance < best.distance)) {
      best = candidate;
    }
  }

  for (const rawPortal of state.portals ?? []) {
    consider('portal', getPortalRuntimePosition(rawPortal), 1);
  }

  const nearestCollectible = getNearestCollectible();
  if (nearestCollectible) consider('collectible', nearestCollectible.item, 2);

  for (const actor of state.actors ?? []) {
    if (!actor.interacao && !actor.dialogue && !actor.fala) continue;
    consider('actor', actor, 3);
  }

  for (const object of state.objects ?? []) {
    if (!object.interacao) continue;
    if (isGateOpen(object)) continue;
    consider('object', object, 4);
  }

  return best;
}

// =====================================================================
// PROMPT DO HUD
// =====================================================================

export function getInteractionPrompt(interaction) {
  if (!interaction) return '';
  const { kind, data } = interaction;

  if (kind === 'portal') {
    if (isPortalBlockedByRequirement(data)) {
      return data.lockedLabel ?? data.label ?? 'ACESSO BLOQUEADO';
    }
    if (data.labelConcluido && state.progress.flags?.[data.missaoFlag ?? 'gate_bio_valvula_estufa']) {
      return data.labelConcluido;
    }
    return data.label ?? 'USAR PORTAL';
  }

  if (kind === 'collectible') return getCollectiblePrompt(data);

  if (kind === 'actor' && data.id === 'recepcionista') {
    if (state.progress.onboardingCompleted) return 'CONSULTAR NEXO-04';
    if (state.progress.onboardingStarted) return 'RETOMAR AVALIAÇÃO';
    return 'FALAR COM NEXO-04';
  }

  // NOVO: Se o objeto tem um gate e você não passa, o prompt muda
  if (kind === 'object' && data.gate && !checkGate(data.gate)) {
    if (data.gate.prerequisiteFlag && !state.progress.flags?.[data.gate.prerequisiteFlag]) {
      return data.gate.promptPrerequisito ?? 'REPARO ANTERIOR PENDENTE';
    }
    if (data.gate.requiresFlag && !state.progress.flags?.[data.gate.requiresFlag] &&
        state.progress.archetype === data.gate.diagnosisArchetype) {
      return 'EXAMINAR • R: DIAGNOSTICAR';
    }
    if (data.gate.requiresFlag && state.progress.flags?.[data.gate.requiresFlag]) {
      return 'PRONTO PARA AGIR • Q';
    }
    return data.gate.promptFalha ?? 'BLOQUEADO';
  }

  if (kind === 'object' && data.id === 'maquina_bio') {
    if (state.progress.flags?.oficina_bio_sincronizada) {
      return 'BANCO DE RECONSTRUÇÃO • ATIVO';
    }
    if (state.progress.flags?.collected_fragmento_eco_bio) {
      return 'SINCRONIZAR FRAGMENTO NA FORJA';
    }
  }

  if (kind === 'object' && data.id === 'pedestal_lamina') {
    if (state.progress.flags?.santuario_dominio_consagrado) {
      return 'ALTAR DA LÂMINA • CONSAGRADO';
    }
    if (state.progress.flags?.collected_fragmento_eco_dominio) {
      return 'CONSAGRAR FRAGMENTO NO ALTAR';
    }
  }

  if (kind === 'object' && data.id === 'gerador_corrente') {
    if (state.progress.flags?.darsena_mare_sincronizada) {
      return 'NÚCLEO HIDRODIMENSIONAL • SINTONIZADO';
    }
    if (state.progress.flags?.collected_fragmento_eco_mare) {
      return 'SINTONIZAR FRAGMENTO NO NÚCLEO';
    }
  }

  if (kind === 'object' && data.id === 'mirante_aquario_mare') {
    return state.progress.flags?.observatorio_aquario_mare
      ? 'RETOMAR FOCO DA DÁRSENA'
      : 'OBSERVATÓRIO PANORÂMICO DO AQUÁRIO';
  }

  if (kind === 'object' && data.id === 'comporta_aquario_mare') {
    const fl = state.progress.flags ?? {};
    const nadoPronto = !!fl.aprendeu_a_nadar || lerArvore(state.progress).nivel >= 4;
    if (fl.darsena_mare_sincronizada && fl.visitou_praia_inicial && nadoPronto) {
      return 'ABRIR COMPORTA DO CONDUTO OCEÂNICO';
    }
    return 'COMPORTA DO AQUÁRIO • REQUISITOS DE MARÉ';
  }

  return data.interacao?.label ?? data.label ?? 'INTERAGIR';
}

// =====================================================================
// EXECUTAR INTERAÇÕES
// =====================================================================

async function interactWithPortal(portal) {
  if (isPortalLocked()) return;

  if (portal.menu === 'elevador') {
    openElevatorMenu();
    return;
  }

  if (isPortalBlockedByRequirement(portal)) {
    // NOVO: Se falhou por causa do Gate, usa a mensagem do Gate
    const mensagens = portal.gate ? getGateFailureMessage(portal.gate) : (portal.mensagemBloqueado ?? ['ACESSO BLOQUEADO.']);

    openDialogue({
      speaker: 'SISTEMA DE ACESSO',
      dialogue: mensagens,
    });
    return;
  }

  await usePortal(portal);
}

function interactWithActor(actor) {
  state.interaction.talkingTo = actor;

  if (actor.id === 'recepcionista') {
    state.progress.talkedToNexo = true;
    saveGame();
    startActorTalking(actor);
    startNexoOnboarding(actor);
    return;
  }

  const dialogue = actor.interacao?.dialogue ?? actor.dialogue ?? (actor.fala ? [actor.fala] : ['...']);
  startActorTalking(actor);
  openDialogue({
    speaker: actor.interacao?.speaker ?? actor.nome ?? 'NPC',
    dialogue,
    onFinish: () => stopActorTalking(actor),
  });
}

function interactWithObject(object) {
  const interaction = object.interacao;
  if (!interaction) return;

  if (object.id === 'maquina_bio') {
    const flags = state.progress.flags ??= {};
    if (flags.oficina_bio_sincronizada) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      openDialogue({
        speaker: 'BANCO DE RECONSTRUÇÃO',
        dialogue: [
          'CUBA DE SÍNTESE ESTABILIZADA EM RESSONÂNCIA MÁXIMA.',
          'MÓDULOS CALIBRADOS: PROPULSOR ATIVO • LÂMINA, ESCUDO E ASA EM EXPANSÃO.',
          'TRAJE REVITALIZADO. SIGA PELA ECLUSA DOCA A1 RUMO AO TERMINAL DO AEROPORTO.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_bio) {
      openDialogue({
        speaker: 'BANCO DE RECONSTRUÇÃO',
        dialogue: [
          'FRAGMENTO DE ECO DETECTADO — A CUBA DE SÍNTESE PODE GRAVAR SUA RESSONÂNCIA NO PROPULSOR.',
        ],
        choices: [
          {
            text: 'SINCRONIZAR FRAGMENTO NO BANCO DE RECONSTRUÇÃO',
            onSelect: () => {
              flags.oficina_bio_sincronizada = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
              }
              recordQuestEvent(state.progress, { type: 'sync_forge', target: 'maquina_bio' });
              saveGame();
              openDialogue({
                speaker: 'BANCO DE RECONSTRUÇÃO',
                dialogue: [
                  'SINCRONIA BIO-FORJA CONCLUÍDA.',
                  'TODA A REDE DA OFICINA ENTROU EM REGIME ESTÁVEL.',
                  'SELO DE IMPULSO REGISTRADO NO CÓDEX [J].',
                  'PRÓXIMO PASSO: RETORNE PELA DOCA A1 E DIAGNOSTIQUE O TERMINAL DO AEROPORTO.',
                ],
              });
            },
          },
          {
            text: 'MANTER EM AGUARDO',
            onSelect: () => {
              openDialogue({
                speaker: 'BANCO DE RECONSTRUÇÃO',
                dialogue: ['CUBA EM ESPERA. VOCÊ PODE SINCRONIZAR A QUALQUER MOMENTO.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'pedestal_lamina') {
    const flags = state.progress.flags ??= {};
    if (flags.santuario_dominio_consagrado) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      openDialogue({
        speaker: 'ALTAR DA LÂMINA ANCESTRAL',
        dialogue: [
          'A LÂMINA RESSOA EM UNÍSSONO COM O ANEL DE RUPTURA.',
          'FERRAMENTAS DE DOMÍNIO: ESPADA • ESCUDO • POSTURA • INVESTIDA.',
          'TRAJE E LÂMINA REVIGORADOS. RETORNE PELA DOCA B2 AO AEROPORTO.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_dominio) {
      openDialogue({
        speaker: 'ALTAR DA LÂMINA ANCESTRAL',
        dialogue: [
          'O FRAGMENTO DE ECO VIBRA DIANTE DA BIGORNA DE OBSIDIANA — PRONTO PARA SELAR O JURAMENTO DA COROA ANTIGA.',
        ],
        choices: [
          {
            text: 'CONSAGRAR FRAGMENTO NO ALTAR DA LÂMINA',
            onSelect: () => {
              flags.santuario_dominio_consagrado = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
                state.player.ultimate ??= {};
                state.player.ultimate.shake = { timeLeft: 0.35, duration: 0.35, power: 8 };
              }
              recordQuestEvent(state.progress, { type: 'consecrate_blade', target: 'pedestal_lamina' });
              saveGame();
              openDialogue({
                speaker: 'ALTAR DA LÂMINA ANCESTRAL',
                dialogue: [
                  'JURAMENTO SELADO — O ANEL DE RUPTURA ACENDEU EM OURO SOLAR.',
                  'INSÍGNIA DO ANEL ANCIÃO REGISTRADA NO CÓDEX [J].',
                  'ARMA, POSTURA E COROA: LEVE SUA LÂMINA DE VOLTA PELA DOCA B2.',
                ],
              });
            },
          },
          {
            text: 'GUARDAR PARA DEPOIS',
            onSelect: () => {
              openDialogue({
                speaker: 'ALTAR DA LÂMINA ANCESTRAL',
                dialogue: ['A LÂMINA AGUARDA EM SILÊNCIO SOBRE A BIGORNA PARTIDA.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'gerador_corrente') {
    const flags = state.progress.flags ??= {};
    if (flags.darsena_mare_sincronizada) {
      if (state.player) {
        state.player.health = state.player.maxHealth ?? state.player.health;
        state.player.energy = state.player.maxEnergy ?? state.player.energy;
      }
      const nadoPronto = !!flags.aprendeu_a_nadar || lerArvore(state.progress).nivel >= 4;
      openDialogue({
        speaker: 'NÚCLEO HIDRODIMENSIONAL',
        dialogue: [
          'CORRENTES DA DÁRSENA EM RESSONÂNCIA LAMINAR.',
          'TRAJE HIDRODIMENSIONAL E RESERVAS RESTAURADOS.',
          nadoPronto && flags.visitou_praia_inicial
            ? 'SINAL OCEÂNICO VERDE: A COMPORTA A LESTE PODE ABRIR A ROTA DE NADO LIVRE ATÉ A ENSEADA DOS ECOS.'
            : 'ROTA SUBMERSA DETECTADA A LESTE: VÁ À PRAIA INICIAL PELO TREM, CONCLUA "APRENDER A NADAR" E RETORNE PARA DESTRAVAR O CONDUTO DA ENSEADA.',
        ],
      });
      return;
    }
    if (flags.collected_fragmento_eco_mare) {
      openDialogue({
        speaker: 'NÚCLEO HIDRODIMENSIONAL',
        dialogue: [
          'A PÉROLA DE MARÉ ENTRA EM FASE COM A ESFERA DE VÓRTICE — PRONTA PARA ESTABILIZAR A DÁRSENA E SONDAR O CONDUTO OCEÂNICO.',
        ],
        choices: [
          {
            text: 'SINTONIZAR FRAGMENTO NO NÚCLEO HIDRODIMENSIONAL',
            onSelect: () => {
              flags.darsena_mare_sincronizada = true;
              if (state.player) {
                state.player.health = state.player.maxHealth ?? state.player.health;
                state.player.energy = state.player.maxEnergy ?? state.player.energy;
                state.player.ability ??= { cooldowns: {} };
                state.player.ability.tideFlash = { x: object.x, y: object.y, timeLeft: 0.75, duration: 0.75 };
              }
              recordQuestEvent(state.progress, { type: 'sync_tide', target: 'gerador_corrente' });
              saveGame();
              openDialogue({
                speaker: 'NÚCLEO HIDRODIMENSIONAL',
                dialogue: [
                  'CALIBRAGEM CONCLUÍDA — OS CANAIS SUBMERSOS E O GRANDE AQUÁRIO ENTRARAM EM FASE.',
                  'AMULETO DA CORRENTE ABISSAL REGISTRADO NO CÓDEX [J].',
                  'APÓS VISITAR A PRAIA INICIAL E DOMINAR O NADO LIVRE, RETORNE À COMPORTA LESTE PARA NADAR DIRETAMENTE ATÉ A ENSEADA DOS ECOS.',
                ],
              });
            },
          },
          {
            text: 'MANTER EM AGUARDO',
            onSelect: () => {
              openDialogue({
                speaker: 'NÚCLEO HIDRODIMENSIONAL',
                dialogue: ['A ESFERA DE ÁGUA SEGUE GIRANDO EM COMPASSO CALMO.'],
              });
            },
          },
        ],
        cancelable: true,
      });
      return;
    }
  }

  if (object.id === 'valvula_pressao_mare') {
    const flags = state.progress.flags ??= {};
    if (flags.valvula_pressao_mare_equalizada) {
      openDialogue({
        speaker: 'VÁLVULA DE EQUALIZAÇÃO ABISSAL',
        dialogue: [
          'MANÔMETRO ESTÁVEL EM 4.2 ATM — OS CANAIS DE GRADE SOB A DÁRSENA FLUEM EM CORRENTE CONTÍNUA.',
        ],
      });
      return;
    }
    flags.valvula_pressao_mare_equalizada = true;
    object.sprite = 'mare_sala_valvula_ativa';
    if (state.progress.archetype) grantArchetypeXp(state.progress, 25);
    saveGame();
    openDialogue({
      speaker: 'VÁLVULA DE EQUALIZAÇÃO ABISSAL',
      dialogue: [
        'VOLANTE DE BRONZE GIRADO — A ÁGUA BIOLUMINESCENTE CORRE COM BRILHO PLENO SOB AS GRELHAS.',
        'EXPERIÊNCIA DE CAMPO REGISTRADA (+25 XP).',
      ],
    });
    return;
  }

  if (object.id === 'mirante_aquario_mare') {
    const flags = state.progress.flags ??= {};
    flags.observatorio_aquario_mare = !flags.observatorio_aquario_mare;
    saveGame();
    openDialogue({
      speaker: 'MIRANTE DO AQUÁRIO ABISSAL',
      dialogue: flags.observatorio_aquario_mare
        ? [
            'LENTE PANORÂMICA ATIVADA — A CÂMERA ABRE O QUADRO ENTRE OS JANELÕES DE ÁGUAS-VIVAS E O GRANDE AQUÁRIO OCEÂNICO A LESTE.',
            'CAMINHE PARA O SUL OU INTERAJA NOVAMENTE PARA RETOMAR O ENQUADRAMENTO PRÓXIMO.',
          ]
        : [
            'ENQUADRAMENTO TÁTICO RESTAURADO NA DÁRSENA.',
          ],
    });
    return;
  }

  if (object.id === 'comporta_aquario_mare') {
    const flags = state.progress.flags ??= {};
    const arvore = lerArvore(state.progress);
    const nadoPronto = !!flags.aprendeu_a_nadar || arvore.nivel >= 4;
    if (!flags.darsena_mare_sincronizada) {
      openDialogue({
        speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
        dialogue: [
          'ECLUSA HIDRÁULICA SELADA ENTRE A DÁRSENA E O GRANDE AQUÁRIO LIGADO AO MAR ABERTO.',
          'ETAPA 1 PENDENTE: ATRAVESSE O FLUXO CONTIDO [R -> Q], RECOLHA O FRAGMENTO DE ECO E SINTONIZE-O NO NÚCLEO HIDRODIMENSIONAL.',
        ],
      });
      return;
    }
    if (!flags.visitou_praia_inicial || !nadoPronto) {
      const grauAtual = DEGRAUS[arvore.nivel]?.titulo ?? 'MEDO D’ÁGUA';
      openDialogue({
        speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
        dialogue: [
          'ALÉM DESTA ECLUSA CORRE ÁGUA OCEÂNICA FUNDA COM LIGAÇÃO DIRETA À ENSEADA DOS ECOS.',
          !flags.visitou_praia_inicial
            ? 'REQUISITO DE TRAVESSIA: EMBARQUE NO TREM DIMENSIONAL RUMO À PRAIA INICIAL E TREINE O NADO EM MAR ABERTO.'
            : `NÍVEL DE NADO ATUAL: ${grauAtual.toUpperCase()} (${arvore.nivel}/4). CONCLUA O TREINO "APRENDER A NADAR" NA PRAIA INICIAL PARA LIBERAR A ROTA DE NADO LIVRE.`,
        ],
      });
      return;
    }
    openDialogue({
      speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
      dialogue: [
        'TODOS OS SELOS VERDES: DÁRSENA SINTONIZADA + TREINO DE NADO CONCLUÍDO NA PRAIA INICIAL. DESEJA INUNDAR A RAMPA E ABRIR A ROTA DE NADO LIVRE ATÉ A ENSEADA DOS ECOS?',
      ],
      choices: [
        {
          text: 'ABRIR COMPORTA E LIBERAR O AQUÁRIO OCEÂNICO',
          onSelect: () => {
            openGate(object);
            flags.rota_livre_enseada_aberta = true;
            if (state.progress.archetype) grantArchetypeXp(state.progress, 40);
            if (state.player) {
              state.player.ability ??= { cooldowns: {} };
              state.player.ability.tideFlash = { x: object.x, y: object.y, timeLeft: 0.85, duration: 0.85 };
            }
            saveGame();
            openDialogue({
              speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
              dialogue: [
                'COMPORTA RECOLHIDA — A RAMPA LESTE AGORA DESÁGUA NO GRANDE AQUÁRIO OCEÂNICO!',
                'NADE LIVREMENTE ATÉ O ARCO ABISSAL (OU MERGULHE COM ESPAÇO / [Z] PARA ENTRAR EM PERSPECTIVA 3D SUBMERSA) E ALCANCE A ENSEADA DOS ECOS.',
              ],
            });
          },
        },
        {
          text: 'MANTER COMPORTA FECHADA POR AGORA',
          onSelect: () => {
            openDialogue({
              speaker: 'COMPORTA DO CONDUTO OCEÂNICO',
              dialogue: ['PRESSÃO MANTIDA EM ESPERA.'],
            });
          },
        },
      ],
      cancelable: true,
    });
    return;
  }

  if (object.gate) {
    if (!checkGate(object.gate)) {
      openDialogue({
        speaker: object.nome ?? 'OBSTÁCULO',
        dialogue: getGateFailureMessage(object.gate),
      });
      return;
    }
    if (object.gate.requiredAction) {
      openDialogue({
        speaker: object.nome ?? 'OBSTÁCULO',
        dialogue: [object.gate.actionMessage ?? 'APONTE PARA O OBSTÁCULO E USE [Q] PARA ROMPÊ-LO.'],
      });
      return;
    }
    openGate(object);
    if (object.gate.xpReward) grantArchetypeXp(state.progress, object.gate.xpReward);
    recordQuestEvent(state.progress, { type: 'repair_gate', target: object.id });
    saveGame();
    openDialogue({
      speaker: object.nome ?? 'SISTEMA',
      dialogue: getGateSuccessMessage(object.gate),
    });
    return;
  }

  openDialogue({
    speaker: interaction.speaker ?? object.nome ?? 'SISTEMA',
    dialogue: interaction.dialogue ?? interaction.mensagem ?? ['...'],
  });
}

// =====================================================================
// UPDATE PRINCIPAL
// =====================================================================

export async function checkInteractions(pressedE) {
  if (isDialogueOpen()) {
    state.interaction.active = null;
    state.onElevator = false;
    return;
  }

  const nearest = findNearestInteraction();
  state.interaction.active = nearest;
  state.onElevator = nearest?.kind === 'portal';

  if (!nearest || !pressedE) return;

  if (nearest.kind === 'portal') { await interactWithPortal(nearest.data); return; }
  if (nearest.kind === 'collectible') { collectItem(nearest.data); return; }
  if (nearest.kind === 'actor') { interactWithActor(nearest.data); return; }
  if (nearest.kind === 'object') { interactWithObject(nearest.data); }
} 