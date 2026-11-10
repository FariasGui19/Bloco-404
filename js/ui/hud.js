// js/ui/hud.js
// =====================================================================
// HUD
//
// Mostra mapa, coordenadas, FPS, interação e Módulo de Eco ativo.
// =====================================================================

import { CONFIG } from '../config.js';
import { BASIC_ATTACKS } from '../game/combat.js';
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
import { getArchetypeLevel, getArchetypeXp, getDerivedStats, xpToNext } from '../game/rpg.js';
import { getFormDuration } from '../data/nucleo-forms.js';
import { getMasterySummary } from '../game/mastery.js';
import { getUltimateStatus } from '../game/ultimate.js';
import { NUCLEO_FORMS } from '../data/nucleo-forms.js';
import { TOOL_LABELS } from '../data/archetype-tools.js';
import { describeNextUnlock, getUnlockState } from '../game/unlocks.js';

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
    'nucleoTimer',
    'nucleoClock',
    'nucleoBar',
    'attackStrain',
    'abilityEnergyText',
    'abilityEnergyFill',
    'abilityLevel',
    'abilityTreePoints',
    'abilityHealthText',
    'abilityHealthFill',
    'abilityUltimate',
    'ultimateIcon',
    'ultimateName',
    'ultimateTool',
    'ultimateState',
    'ultimateBuff',
    'ultimateFill',
    'abilityXpFill',
    'abilityXpText',
    'abilityUnlockHint',
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

const getToolLabel = archetypeId => TOOL_LABELS[archetypeId] ?? 'FERRAMENTA';

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

  const runtime = state.player.nucleoRuntime;
  // A forma ativa pode ser a Veloz ou a Quebra Sistemas: o nome vem do dado,
  // nunca de um texto fixo (era o que fazia a segunda forma se apresentar
  // como "Forma Veloz" na HUD).
  const form = NUCLEO_FORMS[state.player.nucleoForm] ?? null;
  const active = archetypeId === 'nucleo_dez_forma' && Boolean(form);
  const recharge = archetypeId === 'nucleo_dez_forma' && !active ? runtime?.recharge ?? 0 : 0;
  const rotulo = form?.name ?? 'FORMA';
  const timerText = active
    ? (runtime?.remaining <= 0 ? `${rotulo} • RETORNO ASSIM QUE SEGURO` : `${rotulo} • ${Math.ceil(runtime?.remaining ?? 0)}s`)
    : recharge > 0 ? `NÚCLEO RECARREGANDO • ${Math.ceil(recharge)}s` : '';
  setText('nucleoTimer', timerText);
  el.nucleoTimer?.classList.toggle('visible', Boolean(timerText));
  // Cor própria por forma: âmbar na Quebra, verde na Veloz.
  el.nucleoTimer?.style.setProperty('--form-color', form?.color ?? '#a7ffbb');
  el.nucleoTimer?.classList.toggle('bruta', state.player.nucleoForm === 'forma_bruta');

  // BARRA DA FORMA: quanto tempo ainda dá para ser a forma, em porcentagem da
  // duração dela — não em segundos soltos. A Quebra gasta 3 s por marretada,
  // então a barra é o medidor honesto de quantos golpes ainda cabem.
  el.nucleoClock?.classList.toggle('visible', Boolean(timerText));
  el.nucleoClock?.style.setProperty('--form-color', form?.color ?? '#a7ffbb');
  el.nucleoClock?.classList.toggle('bruta', state.player.nucleoForm === 'forma_bruta');
  if (el.nucleoBar) {
    const total = form ? getFormDuration(form, runtime?.formDuration ?? getDerivedStats(state.progress)?.formDuration ?? 0) : 0;
    const restantePct = active && total > 0 ? Math.max(0, Math.min(100, (runtime.remaining / total) * 100)) : 0;
    const preenchimento = el.nucleoBar.querySelector?.('b');
    if (preenchimento) preenchimento.style.width = `${restantePct}%`;
    el.nucleoBar.setAttribute?.('aria-valuenow', String(Math.round(restantePct)));
    // Golpe caro (Quebra) mostra quantos cabem; a Veloz não cobra nada.
    const custo = form?.form?.hitCost ?? 0;
    el.nucleoBar.classList.toggle('hit-cost', custo > 0 && active);
    el.nucleoBar.title = custo > 0 ? `Cada golpe carregado gasta ${custo}s da forma` : 'Duração da forma';
  }

  // Nível, XP e maestria do arquétipo atual.
  const level = getArchetypeLevel(state.progress, archetypeId);
  const xp = getArchetypeXp(state.progress, archetypeId);
  const next = xpToNext(level);
  const mastery = getMasterySummary(state.progress, archetypeId);
  setText('abilityLevel', `NÍVEL ${level} • ${BASIC_ATTACKS[archetypeId]?.label ?? ''}`.trim());
  setText('abilityTreePoints', mastery.total > 0 ? `MAESTRIA · ${mastery.label}` : 'MAESTRIA · J');
  setText('abilityXpText', Number.isFinite(next) ? `${Math.floor(xp)} / ${next} XP` : 'NÍVEL MÁXIMO');
  // Próximo degrau do caminho: a HUD avisa o que o próximo nível libera.
  const unlock = getUnlockState(state.progress, archetypeId);
  setText('abilityUnlockHint', unlock.next ? describeNextUnlock(state.progress, archetypeId) : '');
  el.abilityUnlockHint?.classList.toggle('proximo', Boolean(unlock.next));

  // Vida: barra própria, com aviso pulsante em estado crítico.
  const player = state.player;
  const health = Math.round(player.health ?? player.maxHealth ?? 0);
  const maxHealth = Math.round(player.maxHealth ?? 0);
  setText('abilityHealthText', `${health} / ${maxHealth}`);
  if (el.abilityHealthFill) {
    const ratio = maxHealth ? Math.max(0, Math.min(100, (health / maxHealth) * 100)) : 0;
    el.abilityHealthFill.style.width = `${ratio}%`;
    el.abilityHud?.classList.toggle('danger', ratio <= 30);
  }
  if (el.abilityXpFill) {
    const xpPercent = Number.isFinite(next) ? Math.max(0, Math.min(100, (xp / next) * 100)) : 100;
    el.abilityXpFill.style.width = `${xpPercent}%`;
  }

  const strain = BASIC_ATTACKS[archetypeId]?.strain;
  const chain = state.player.combat?.style === archetypeId ? state.player.combat.chain ?? 0 : 0;
  setText('attackStrain', strain ? `ATAQUE ${chain}/${strain.hits} • ${strain.label} ao encadear` : '');

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
      : (state.progress.archetype === 'nucleo_dez_forma' && NUCLEO_FORMS[state.player.nucleoForm]
        ? `${NUCLEO_FORMS[state.player.nucleoForm].name} ATIVA`
        : ['dominio', 'mare'].includes(state.player.equippedSuit) ? 'TRAJE ATIVO' : 'PRONTO');

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

  // Ultimate: ícone do arquétipo, recarga e bônus ativo.
  const ultimate = getUltimateStatus(state.player, state.progress);
  if (el.abilityUltimate) {
    el.abilityUltimate.classList.toggle('visible', Boolean(ultimate));
    if (ultimate) {
      el.ultimateIcon.src = `assets/sprites/ui/codex/ultimate-${archetypeId}.png`;
      setText('ultimateName', ultimate.definition.name);
      el.abilityUltimate.style.setProperty('--ultimate-color', ultimate.definition.color);
      const faltando = ultimate.definition.cost - ultimate.energy;
      if (ultimate.locked) {
        // Bloqueada por nível: mostra o requisito, não a recarga.
        setText('ultimateTool', 'BLOQUEADA');
        setText('ultimateState', `NÍVEL ${ultimate.requiredLevel}`);
        setText('ultimateBuff', '');
        if (el.ultimateFill) el.ultimateFill.style.width = '0%';
      } else if (ultimate.needsForm) {
        // Núcleo 10X: a Ultimate é da FORMA, não do operador base.
        setText('ultimateTool', `${getToolLabel(archetypeId)} · ${ultimate.tool?.short ?? 'NÚCLEO'}`);
        setText('ultimateState', 'TRANSFORME-SE · T');
        setText('ultimateBuff', '');
        if (el.ultimateFill) el.ultimateFill.style.width = '0%';
      } else if (ultimate.charging) {
        setText('ultimateTool', ultimate.tool ? `${getToolLabel(archetypeId)} · ${ultimate.tool.short}` : 'ULTIMATE DE ARQUITETURA');
        setText('ultimateState', 'CARREGANDO');
        setText('ultimateBuff', '');
        if (el.ultimateFill) el.ultimateFill.style.width = `${Math.round(ultimate.windup * 100)}%`;
      } else {
        setText('ultimateTool', ultimate.tool
          ? `${getToolLabel(archetypeId)} · ${ultimate.tool.short}`
          : 'ULTIMATE DE ARQUÉTIPO');
        setText('ultimateState', ultimate.cooldown > 0
          ? `RECARREGANDO ${ultimate.cooldown.toFixed(1)}s`
          : !ultimate.energyOk ? `FALTA ${Math.max(0, faltando)} ENERGIA` : `F · ${ultimate.definition.cost} ENERGIA`);
        setText('ultimateBuff', ultimate.buff ? `${ultimate.buff.label} · ${Math.ceil(ultimate.buff.timeLeft)}s` : '');
        if (el.ultimateFill) el.ultimateFill.style.width = `${Math.round(ultimate.charge * 100)}%`;
      }
      el.abilityUltimate.classList.toggle('ready', ultimate.ready);
      el.abilityUltimate.classList.toggle('locked', ultimate.locked);
      el.abilityUltimate.classList.toggle('needs-form', Boolean(ultimate.needsForm));
      el.abilityUltimate.classList.toggle('charging', ultimate.charging);
      el.abilityUltimate.classList.toggle('unaffordable', !ultimate.locked && ultimate.cooldown <= 0 && !ultimate.energyOk);
      el.abilityUltimate.classList.toggle('buffed', Boolean(ultimate.buff));
      el.abilityUltimate.classList.toggle('toolbound', Boolean(ultimate.tool));
    }
  }

  const message = state.player.ability?.lastMessage ?? '';
  setText('abilityMessage', message);
}
function updateQuestHud(state, map) {
  if (map.id === 'ilha_enseada_ecos') {
    const flags = state.progress?.flags ?? {};
    const count = ['mar', 'pedra', 'mata'].filter(id => flags[`collected_enseada_rastro_${id}`]).length;
    el.questHud?.classList.toggle('visible', true);
    setText('questHudTitle', 'EXPLORAÇÃO • ENSEADA DOS ECOS');
    setText('questHudDescription', count === 3 ? 'Três vestígios registrados. Enseada mapeada.' : `Investigue os vestígios da enseada: ${count}/3. Use E perto de cada eco.`);
    return;
  }
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
  updateQuestHud(state, map);
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