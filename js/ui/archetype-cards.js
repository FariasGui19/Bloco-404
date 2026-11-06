// js/ui/archetype-cards.js
// =====================================================================
// ARCHETYPE CARDS
//
// Interface visual dos Módulos de Eco.
// Usa a concept sheet com os quatro arquétipos.
// =====================================================================

import { ARCHETYPES } from '../data/onboarding.js';

let root = null;
let titleEl = null;
let contentEl = null;
let isOpen = false;

function ensureElements() {
  root = document.getElementById('archetypeCards');
  titleEl = document.getElementById('archetypeCardsTitle');
  contentEl = document.getElementById('archetypeCardsContent');

  return Boolean(root && titleEl && contentEl);
}

export function initArchetypeCards() {
  if (!ensureElements()) {
    console.warn('[ARCHETYPE CARDS] Elementos HTML não encontrados.');
    return false;
  }

  return true;
}

export function isArchetypeCardsOpen() {
  return isOpen;
}

export function closeArchetypeCards() {
  isOpen = false;
  root?.classList.remove('visible');

  if (contentEl) {
    contentEl.innerHTML = '';
  }
}

function openPanel(title) {
  if (!ensureElements()) {
    return false;
  }

  isOpen = true;
  titleEl.textContent = title;
  root.classList.add('visible');

  return true;
}

function getArtClass(archetypeId) {
  return `archetype-art archetype-art-${archetypeId}`;
}

function createButton(text, className = '') {
  const button = document.createElement('button');

  button.type = 'button';
  button.className = `archetype-action ${className}`.trim();
  button.textContent = text;

  return button;
}

// =====================================================================
// RESULTADO RECOMENDADO
// =====================================================================

export function openArchetypeResult({
  recommendedId,
  compatibility = 80,
  onAccept = null,
  onBrowse = null,
} = {}) {
  const archetype = ARCHETYPES[recommendedId];

  if (!archetype || !openPanel('RESSONÂNCIA IDENTIFICADA')) {
    return;
  }

  contentEl.innerHTML = '';

  const result = document.createElement('section');
  result.className = 'archetype-result';

  result.innerHTML = `
    <div class="${getArtClass(archetype.id)} archetype-result-art"></div>

    <div class="archetype-result-data">
      <p class="archetype-system-label">MÓDULO RECOMENDADO</p>

      <h3 style="--module-color: ${archetype.cor}">
        ${archetype.nome}
      </h3>

      <p class="archetype-subtitle">${archetype.subtitulo}</p>

      <div class="archetype-compatibility">
        <span>COMPATIBILIDADE DIMENSIONAL</span>
        <strong>${compatibility}%</strong>

        <div class="compatibility-track">
          <div
            class="compatibility-fill"
            style="width: ${compatibility}%; background: ${archetype.cor}"
          ></div>
        </div>
      </div>

      <p class="archetype-description">
        ${archetype.descricao}
      </p>

      <div class="archetype-info-box">
        <span>HABILIDADE INICIAL PREVISTA</span>
        <strong>${archetype.habilidadeInicial}</strong>
      </div>

      <div class="archetype-risk-box">
        <span>RISCO OPERACIONAL</span>
        <p>${archetype.risco}</p>
      </div>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'archetype-actions';

  const accept = createButton(
    `INSTALAR ${archetype.nome}`,
    'primary'
  );

  const browse = createButton(
    'ANALISAR OUTROS MÓDULOS',
    'secondary'
  );

  accept.addEventListener('click', () => {
    closeArchetypeCards();
    onAccept?.(archetype.id);
  });

  browse.addEventListener('click', () => {
    onBrowse?.();
  });

  actions.append(accept, browse);

  contentEl.append(result, actions);
}

// =====================================================================
// CATÁLOGO VISUAL
// =====================================================================

export function openArchetypeCatalog({
  recommendedId = null,
  onSelect = null,
  onBack = null,
} = {}) {
  if (!openPanel('CATÁLOGO DE MÓDULOS DE ECO')) {
    return;
  }

  contentEl.innerHTML = '';

  const intro = document.createElement('p');
  intro.className = 'archetype-catalog-intro';
  intro.textContent =
    'A recomendação do sistema é estatística. A decisão continua sendo sua.';

  const grid = document.createElement('div');
  grid.className = 'archetype-grid';

  for (const archetype of Object.values(ARCHETYPES)) {
    const card = document.createElement('button');

    card.type = 'button';
    card.className = 'archetype-card';

    if (archetype.id === recommendedId) {
      card.classList.add('recommended');
    }

    card.style.setProperty('--module-color', archetype.cor);

    card.innerHTML = `
      <div class="${getArtClass(archetype.id)} archetype-card-art"></div>

      <div class="archetype-card-content">
        ${archetype.id === recommendedId
          ? '<span class="archetype-recommended-tag">RECOMENDADO</span>'
          : ''
        }

        <h3>${archetype.nome}</h3>
        <p>${archetype.subtitulo}</p>

        <span class="archetype-card-action">
          ANALISAR MÓDULO →
        </span>
      </div>
    `;

    card.addEventListener('click', () => {
      onSelect?.(archetype.id);
    });

    grid.appendChild(card);
  }

  const actions = document.createElement('div');
  actions.className = 'archetype-actions';

  const back = createButton(
    'VOLTAR AO RESULTADO',
    'secondary'
  );

  back.addEventListener('click', () => {
    onBack?.();
  });

  actions.appendChild(back);

  contentEl.append(intro, grid, actions);
}

// =====================================================================
// PRÉVIA INDIVIDUAL
// =====================================================================

export function openArchetypePreview({
  archetypeId,
  onInstall = null,
  onBack = null,
} = {}) {
  const archetype = ARCHETYPES[archetypeId];

  if (!archetype || !openPanel('ANÁLISE DE MÓDULO')) {
    return;
  }

  contentEl.innerHTML = '';

  const preview = document.createElement('section');
  preview.className = 'archetype-result';

  preview.innerHTML = `
    <div class="${getArtClass(archetype.id)} archetype-result-art"></div>

    <div class="archetype-result-data">
      <p class="archetype-system-label">MÓDULO DE ECO DISPONÍVEL</p>

      <h3 style="--module-color: ${archetype.cor}">
        ${archetype.nome}
      </h3>

      <p class="archetype-subtitle">${archetype.subtitulo}</p>

      <p class="archetype-description">
        ${archetype.descricao}
      </p>

      <div class="archetype-info-box">
        <span>HABILIDADE INICIAL PREVISTA</span>
        <strong>${archetype.habilidadeInicial}</strong>
      </div>

      <div class="archetype-risk-box">
        <span>RISCO OPERACIONAL</span>
        <p>${archetype.risco}</p>
      </div>
    </div>
  `;

  const actions = document.createElement('div');
  actions.className = 'archetype-actions';

  const install = createButton(
    `INSTALAR ${archetype.nome}`,
    'primary'
  );

  const back = createButton(
    'VOLTAR AO CATÁLOGO',
    'secondary'
  );

  install.addEventListener('click', () => {
    closeArchetypeCards();  
    onInstall?.(archetype.id);
  });

  back.addEventListener('click', () => {
    onBack?.();
  });

  actions.append(install, back);

  contentEl.append(preview, actions);
}