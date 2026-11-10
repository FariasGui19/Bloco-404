// js/ui/save-menu.js
// =====================================================================
// SAVE MENU
//
// Tela visual de seleção de perfis.
// Mostra o Módulo de Eco caso o operador já tenha sido calibrado.
// =====================================================================

import {
  listSaves,
  startNewSave,
  loadSaveIntoState,
  deleteSave,
} from '../game/save.js';

import { ARCHETYPES } from '../data/onboarding.js';
import { arquetiposEmUso, PERSONAS_MAX } from '../game/personas.js';

let root;
let slotsContainer;
let titleEl;
let onSelectCallback = null;

export function initSaveMenu() {
  root = document.getElementById('saveMenu');
  slotsContainer = document.getElementById('saveSlots');
  titleEl = document.getElementById('saveMenuTitle');

  if (!root || !slotsContainer || !titleEl) {
    console.warn('[SAVE MENU] Elementos HTML não encontrados.');
    return false;
  }

  document
    .getElementById('saveMenuBackBtn')
    ?.addEventListener('click', closeSaveMenu);

  return true;
}

export function openSaveMenu(onSelect) {
  if (!root) initSaveMenu();

  if (!root || !slotsContainer) {
    console.error('[SAVE MENU] Não foi possível abrir menu.');
    return;
  }

  onSelectCallback = onSelect;

  renderSlots();
  root.classList.add('visible');
}

export function closeSaveMenu() {
  root?.classList.remove('visible');
}

function renderSlots() {
  const saves = listSaves().slice(0, PERSONAS_MAX);
  const uso = arquetiposEmUso();

  slotsContainer.innerHTML = '';

  // Cabeçalho: deixa claro que são 4 operadores e que cada módulo é único.
  const nota = document.createElement('p');
  nota.className = 'save-slots-note';
  nota.textContent = `${saves.filter(s => s.save).length}/${PERSONAS_MAX} OPERADORES • UM MÓDULO DE CADA`;
  slotsContainer.appendChild(nota);

  for (const { slot, save } of saves) {
    const card = document.createElement('article');
    card.className = 'save-slot';

    if (save) {
      renderExistingSave(card, slot, save);
    } else {
      renderEmptySave(card, slot);
    }

    slotsContainer.appendChild(card);
  }
}

function renderExistingSave(card, slot, save) {
  card.classList.add('occupied');

  const date = save.meta.updatedAt
    ? new Date(save.meta.updatedAt).toLocaleString('pt-BR')
    : 'DESCONHECIDO';

  const archetypeId = save.progress.archetype;
  const archetype = ARCHETYPES[archetypeId] ?? null;

  const mapName = formatMapName(save.world.lastMapId);

  const moduleVisual = archetype
    ? `
      <div class="save-module-row">
        <div class="save-module-art archetype-art archetype-art-${archetype.id}"></div>

        <div>
          <dt>MÓDULO</dt>
          <dd style="color: ${archetype.cor}">
            ${archetype.nome}
          </dd>
        </div>
      </div>
    `
    : `
      <div>
        <dt>MÓDULO</dt>
        <dd>NÃO CALIBRADO</dd>
      </div>
    `;

  card.innerHTML = `
    <div class="save-slot-header">
      <span class="save-slot-number">
        ARQUIVO ${String(slot).padStart(2, '0')}
      </span>

      <span class="save-status online">● ATIVO</span>
    </div>

    <h3>${escapeHtml(save.meta.profileName)}</h3>

    <dl class="save-data">
      <div>
        <dt>LOCAL</dt>
        <dd>${mapName}</dd>
      </div>

      ${moduleVisual}

      <div>
        <dt>ATUALIZADO</dt>
        <dd>${date}</dd>
      </div>
    </dl>

    <div class="save-actions">
      <button class="save-btn continue-btn" type="button">
        ▶ CONTINUAR
      </button>

      <button class="save-btn delete-btn" type="button">
        APAGAR
      </button>
    </div>
  `;

  card
    .querySelector('.continue-btn')
    .addEventListener('click', async () => {
      const loaded = loadSaveIntoState(slot);

      if (!loaded) return;

      closeSaveMenu();

      await onSelectCallback?.({
        mapId: loaded.world.lastMapId,
        spawnId: loaded.world.lastSpawnId,
      });
    });

  card
    .querySelector('.delete-btn')
    .addEventListener('click', () => {
      const confirmDelete = window.confirm(
        `Apagar o ARQUIVO ${String(slot).padStart(2, '0')}?\n\nEssa ação remove o progresso salvo deste operador.`
      );

      if (!confirmDelete) return;

      deleteSave(slot);
      renderSlots();
    });
}

function renderEmptySave(card, slot) {
  card.classList.add('empty');

  card.innerHTML = `
    <div class="save-slot-header">
      <span class="save-slot-number">
        ARQUIVO ${String(slot).padStart(2, '0')}
      </span>

      <span class="save-status empty-status">○ VAZIO</span>
    </div>

    <h3>NOVO OPERADOR</h3>

    <p class="save-empty-text">
      Nenhuma assinatura dimensional registrada.
    </p>

    <button class="save-btn new-btn" type="button">
      + INICIAR NOVA OPERAÇÃO
    </button>
  `;

  card
    .querySelector('.new-btn')
    .addEventListener('click', async () => {
      const suggestedName =
        `OPERADOR ${String(slot).padStart(2, '0')}`;

      const name = window.prompt(
        'IDENTIFICAÇÃO DO OPERADOR:',
        suggestedName
      );

      if (name === null) return;

      const profileName =
        name.trim().slice(0, 24) ||
        suggestedName;

      const save = startNewSave(slot, profileName);

      closeSaveMenu();

      await onSelectCallback?.({
        mapId: save.world.lastMapId,
        spawnId: save.world.lastSpawnId,
      });
    });
}

function formatMapName(id) {
  const names = {
    hub_saguao: 'SAGUÃO CENTRAL',
    hub_aeroporto: 'AEROPORTO CENTRAL',
    hub_elevadores: 'HALL DOS ELEVADORES',
    hub_setor_anime: 'SETOR ANIME',
  };

  return names[id] ?? id?.toUpperCase() ?? 'DESCONHECIDO';
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
} 