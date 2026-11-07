// js/ui/hud.js
// =====================================================================
// HUD
//
// Mostra mapa, coordenadas, FPS, interação e Módulo de Eco ativo.
// =====================================================================

import { CONFIG } from '../config.js';
import { camera } from '../engine/camera.js';

import { getInteractionPrompt } from '../game/interactions.js';
import { isDialogueOpen } from './dialogue.js';

import { ARCHETYPES } from '../data/onboarding.js';
import { getModuleInteractionPrompt } from '../game/module-interactions.js';
import {
  isBackgroundCalibrationEnabled,
  getBackgroundCalibrationText,
} from '../game/background-calibration.js';
import { ARCHETYPE_ABILITIES, getAbilityLabel } from '../game/abilities.js';
import { IMPLEMENTED_ABILITIES } from '../data/archetype-kits.js';
import { getBioDashProfile } from '../game/ability-context.js';

const el = {};
const cache = {};

let promptVisible = false;
let moduleVisible = false;

let fps = 0;
let frames = 0;
let fpsTime = performance.now();

export function initHud() {
  for (const id of [
    'questHud',
    'questHudTitle',
    'questHudDescription',
    'floorName',
    'coords',
    'stats',
    'version',
    'elevatorPrompt',
    'moduleHud',
    'moduleHudName',
    'moduleHudSubtitle',
    'abilityHud',
    'abilityEnergyText',
    'abilityEnergyFill',
    'abilityPrimary',
    'abilityMessage',
    'abilitySecondary',
    'backgroundCalibrationHud',
  ]) {
    el[id] = document.getElementById(id);
  }

  if (el.version) {
    el.version.textContent =
      `${CONFIG.GAME_NAME} - BASE V${CONFIG.VERSION}`;
  }
}

function setText(key, value) {
  if (cache[key] === value) return;

  cache[key] = value;

  if (el[key]) {
    el[key].textContent = value;
  }
}

function updateModuleHud(state) {
  const archetypeId = state.progress?.archetype;
  const archetype = ARCHETYPES[archetypeId];

  const shouldShow = Boolean(archetype);

  if (shouldShow) {
    setText('moduleHudName', archetype.nome);
    setText('moduleHudSubtitle', archetype.subtitulo);

    el.moduleHud?.style.setProperty(
      '--module-color',
      archetype.cor
    );
  }

  if (moduleVisible !== shouldShow) {
    moduleVisible = shouldShow;

    el.moduleHud?.classList.toggle(
      'visible',
      moduleVisible
    );
  }
}
function updateAbilityHud(state) {
  const archetypeId = state.progress?.archetype;
  const shouldShow = Boolean(archetypeId);

  el.abilityHud?.classList.toggle('visible', shouldShow);
  if (!shouldShow) return;

  const energy = Math.round(state.player.energy ?? 0);
  const maxEnergy = Math.round(state.player.maxEnergy ?? 100);
  const percent = Math.max(0, Math.min(100, (energy / Math.max(1, maxEnergy)) * 100));

  setText('abilityEnergyText', `${energy} / ${maxEnergy}`);
  if (el.abilityEnergyFill) el.abilityEnergyFill.style.width = `${percent}%`;

  const primaryId = ARCHETYPE_ABILITIES[archetypeId]?.[0];
  const secondaryId = ARCHETYPE_ABILITIES[archetypeId]?.[1];

  if (primaryId && el.abilityPrimary) {
    const cooldown = state.player.ability?.cooldowns?.[primaryId] ?? 0;
    const isCoolingDown = cooldown > 0;
    const label = getAbilityLabel(primaryId);
    const bioProfile = primaryId === 'bio_dash' ? getBioDashProfile(state.progress, state.player) : null;
    const readyText = bioProfile
      ? `${bioProfile.mode === 'equipped' ? 'TRAJE ATIVO' : 'MODO RÁPIDO'} • ${bioProfile.energyCost} ENERGIA`
      : (state.progress.archetype === 'nucleo_dez_forma' && state.player.nucleoForm === 'forma_veloz' ? 'FORMA VELOZ ATIVA' : ['dominio', 'mare'].includes(state.player.equippedSuit) ? 'TRAJE ATIVO' : 'PRONTO');

    el.abilityPrimary.innerHTML = `
      <kbd>Q</kbd>
      <div>
        <strong>${label}</strong>
        <span>${!IMPLEMENTED_ABILITIES.includes(primaryId) ? 'EM DESENVOLVIMENTO' : isCoolingDown ? `RECARREGANDO ${cooldown.toFixed(1)}s` : readyText}</span>
      </div>
    `;
    el.abilityPrimary.classList.toggle('cooldown', isCoolingDown);
  }

  if (secondaryId && el.abilitySecondary) {
    const label = getAbilityLabel(secondaryId);
    const prompt = getModuleInteractionPrompt();
    const cooldown = state.player.ability?.cooldowns?.[secondaryId] ?? 0;
    const scanStatus = cooldown > 0 ? `RECARREGANDO ${cooldown.toFixed(1)}s` : 'VARREDURA DISPONÍVEL';

    el.abilitySecondary.innerHTML = `
      <kbd>R</kbd>
      <div>
        <strong>${label}</strong>
        <span>${!IMPLEMENTED_ABILITIES.includes(secondaryId) ? 'EM DESENVOLVIMENTO' : secondaryId !== 'bio_diagnostic' ? scanStatus : prompt ? prompt : 'PROCURE SISTEMAS COMPATÍVEIS'}</span>
      </div>
    `;
    el.abilitySecondary.classList.toggle('ready', Boolean(prompt));
  }

  const message = state.player.ability?.lastMessage ?? '';
  setText('abilityMessage', message);
}
function updateQuestHud(state) {
  const quest = state.progress?.activeQuest;
  const shouldShow = Boolean(quest && quest.status === 'active');

  el.questHud?.classList.toggle('visible', shouldShow);

  if (!shouldShow) return;

  setText('questHudTitle', quest.title ?? 'MISSÃO');
  setText(
    'questHudDescription',
    quest.description ?? 'Sem descrição.'
  );
}
function updateBackgroundCalibrationHud() {
  const text = getBackgroundCalibrationText();
  const shouldShow = isBackgroundCalibrationEnabled() && Boolean(text);

  el.backgroundCalibrationHud?.classList.toggle(
    'visible',
    shouldShow
  );

  if (shouldShow && el.backgroundCalibrationHud) {
    el.backgroundCalibrationHud.textContent = text.join('\n');
  }
}
export function updateHud(map, state) {
  if (!map) return;

  frames++;

  const now = performance.now();

  if (now - fpsTime >= 500) {
    fps = Math.round(
      (frames * 1000) / (now - fpsTime)
    );

    frames = 0;
    fpsTime = now;
  }

  const player = state.player;

  const mapTitle =
    map.meta?.nome ??
    map.nome ??
    'LOCAL DESCONHECIDO';

  setText('floorName', mapTitle);

  setText(
    'coords',
    `X: ${player.x.toFixed(1)} Y: ${player.y.toFixed(1)} | ZOOM: ${Math.round(camera.zoom * 100)}%`
  );

  setText(
    'stats',
    `● ${fps} FPS | ATORES: ${state.actors.length} | OBJETOS: ${state.objects.length}`
  );

  updateModuleHud(state);
  updateAbilityHud(state);
  updateQuestHud(state);
  updateBackgroundCalibrationHud();

  const active = state.interaction.active;

  const shouldShowPrompt =
    Boolean(active) &&
    !isDialogueOpen();

  if (shouldShowPrompt) {
    const label = getInteractionPrompt(active);

    setText(
      'elevatorPrompt',
      `[E] ${label}`
    );
  }

  if (promptVisible !== shouldShowPrompt) {
    promptVisible = shouldShowPrompt;

    el.elevatorPrompt?.classList.toggle(
      'visible',
      promptVisible
    );
  }
}  