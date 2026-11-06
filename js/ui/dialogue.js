// js/ui/dialogue.js
// =====================================================================
// DIALOGUE
//
// Caixa de diálogo reutilizável.
//
// Suporta:
// - falas lineares;
// - escolhas;
// - clique;
// - E / Espaço / Enter;
// - setas / W / S;
// - teclas 1, 2, 3, 4;
// - ESC em diálogos canceláveis.
// =====================================================================

let el = {
  root: null,
  speaker: null,
  text: null,
  hint: null,
  choices: null,
};

let open = false;
let lines = [];
let lineIndex = 0;
let onClose = null;

let choices = [];
let selectedChoiceIndex = 0;
let cancelable = true;

let ignoreInputUntil = 0;
let keyboardListenerAdded = false;

export function initDialogue() {
  el.root = document.getElementById('dialogueBox');
  el.speaker = document.getElementById('dialogueSpeaker');
  el.text = document.getElementById('dialogueText');
  el.hint = document.getElementById('dialogueHint');
  el.choices = document.getElementById('dialogueChoices');

  if (!el.root || !el.speaker || !el.text || !el.hint || !el.choices) {
    console.warn('[DIALOGUE] Elementos HTML de diálogo não encontrados.');
    return false;
  }

  if (!el.root.dataset.listenerAttached) {
    el.root.addEventListener('click', event => {
      if (!open) return;

      // Não avança se o clique foi em um botão de escolha.
      if (event.target.closest('.dialogue-choice')) {
        return;
      }

      if (choices.length > 0) return;

      advanceDialogue();
    });

    el.root.dataset.listenerAttached = 'true';
  }

  if (!keyboardListenerAdded) {
    window.addEventListener('keydown', handleDialogueKeyboard);
    keyboardListenerAdded = true;
  }

  return true;
}

function handleDialogueKeyboard(event) {
  if (!open) return;
  if (performance.now() < ignoreInputUntil) return;

  const key = String(event.key ?? '').toLowerCase();
  const code = String(event.code ?? '').toLowerCase();

  const closeKey =
    key === 'escape' ||
    key === 'esc' ||
    code === 'escape';

  if (closeKey && cancelable) {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeDialogue();
    return;
  }

  // ---------------------------------------------------------------
  // DIÁLOGO COM ESCOLHAS
  // ---------------------------------------------------------------
  if (choices.length > 0) {
    const selectedByNumber = Number.parseInt(key, 10);

    if (
      Number.isInteger(selectedByNumber) &&
      selectedByNumber >= 1 &&
      selectedByNumber <= choices.length
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();

      chooseChoice(selectedByNumber - 1);
      return;
    }

    const previousKey =
      key === 'arrowup' ||
      key === 'w' ||
      code === 'arrowup' ||
      code === 'keyw';

    const nextKey =
      key === 'arrowdown' ||
      key === 's' ||
      code === 'arrowdown' ||
      code === 'keys';

    const confirmKey =
      key === 'e' ||
      key === 'enter' ||
      key === ' ' ||
      key === 'spacebar' ||
      code === 'keye' ||
      code === 'enter' ||
      code === 'space' ||
      code === 'numpadenter';

    if (previousKey) {
      event.preventDefault();
      event.stopImmediatePropagation();

      selectedChoiceIndex =
        (selectedChoiceIndex - 1 + choices.length) % choices.length;

      renderChoices();
      return;
    }

    if (nextKey) {
      event.preventDefault();
      event.stopImmediatePropagation();

      selectedChoiceIndex =
        (selectedChoiceIndex + 1) % choices.length;

      renderChoices();
      return;
    }

    if (confirmKey) {
      event.preventDefault();
      event.stopImmediatePropagation();

      chooseChoice(selectedChoiceIndex);
    }

    return;
  }

  // ---------------------------------------------------------------
  // DIÁLOGO LINEAR
  // ---------------------------------------------------------------
  const advanceKey =
    key === 'e' ||
    key === ' ' ||
    key === 'spacebar' ||
    key === 'enter' ||
    code === 'keye' ||
    code === 'space' ||
    code === 'enter' ||
    code === 'numpadenter';

  if (advanceKey) {
    event.preventDefault();
    event.stopImmediatePropagation();

    advanceDialogue();
  }
}

export function isDialogueOpen() {
  return open;
}

export function hasDialogueChoices() {
  return choices.length > 0;
}

export function openDialogue({
  speaker = 'SISTEMA',
  speakerId = null,
  dialogue = [],
  choices: newChoices = [],
  onFinish = null,
  cancelable: canCancel = true,
} = {}) {
  if (!el.root || !el.speaker || !el.text || !el.hint || !el.choices) {
    initDialogue();
  }

  if (!el.root || !el.speaker || !el.text || !el.hint || !el.choices) {
    console.error('[DIALOGUE] Interface de diálogo não foi inicializada.');
    return;
  }

  lines = Array.isArray(dialogue)
    ? dialogue.map(line => String(line))
    : [String(dialogue)];

  lines = lines.filter(line => line.trim().length > 0);

  if (lines.length === 0) {
    lines = ['...'];
  }

  lineIndex = 0;
  onClose = onFinish;

  choices = Array.isArray(newChoices)
    ? newChoices.filter(choice => choice?.text)
    : [];

  selectedChoiceIndex = 0;
  cancelable = canCancel;

  open = true;

  el.speaker.textContent = String(speaker).toUpperCase();
  el.root.classList.add('visible');

  renderLine();
  renderChoices();

  ignoreInputUntil = performance.now() + 180;

  console.log(`[DIALOGUE] Aberto: ${speaker}`, { speakerId });
}

export function closeDialogue() {
  if (!open) return;

  open = false;

  choices = [];
  selectedChoiceIndex = 0;

  el.root?.classList.remove('visible');

  if (el.choices) {
    el.choices.innerHTML = '';
  }

  const callback = onClose;
  onClose = null;

  if (typeof callback === 'function') {
    callback();
  }
}

export function advanceDialogue() {
  if (!open) return;
  if (choices.length > 0) return;

  if (lineIndex < lines.length - 1) {
    lineIndex++;
    renderLine();
    return;
  }

  closeDialogue();
}

function chooseChoice(index) {
  const choice = choices[index];

  if (!choice) return;

  const callback = choice.onSelect;

  // Fecha visualmente antes de executar o próximo nó.
  open = false;
  el.root?.classList.remove('visible');
  el.choices.innerHTML = '';

  choices = [];
  selectedChoiceIndex = 0;

  onClose = null;

  if (typeof callback === 'function') {
    callback();
  }
}

function renderLine() {
  if (!el.text || !el.hint) return;

  const isLastLine = lineIndex >= lines.length - 1;

  el.text.textContent = lines[lineIndex];

  if (choices.length > 0) {
    el.hint.textContent =
      '[↑ ↓ / W S] NAVEGAR  [E / ENTER] CONFIRMAR';
    return;
  }

  el.hint.textContent = isLastLine
    ? '[E / ESPAÇO / ENTER / CLIQUE] FECHAR'
    : '[E / ESPAÇO / ENTER / CLIQUE] CONTINUAR';
}

function renderChoices() {
  if (!el.choices) return;

  el.choices.innerHTML = '';

  if (choices.length === 0) {
    return;
  }

  choices.forEach((choice, index) => {
    const button = document.createElement('button');

    button.type = 'button';
    button.className = 'dialogue-choice';

    if (index === selectedChoiceIndex) {
      button.classList.add('selected');
    }

    button.innerHTML = `
      <span class="dialogue-choice-key">[${index + 1}]</span>
      <span class="dialogue-choice-text">${escapeHtml(choice.text)}</span>
    `;

    button.addEventListener('mouseenter', () => {
      selectedChoiceIndex = index;
      renderChoices();
    });

    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();

      chooseChoice(index);
    });

    el.choices.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function updateDialogue() {
  // Mantido por compatibilidade.
  // O teclado é tratado diretamente via window.keydown.
}