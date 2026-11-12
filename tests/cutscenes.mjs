// node --experimental-default-type=module tests/cutscenes.mjs
import assert from 'node:assert/strict';
import { playCutscene, isCutsceneOpen, BOOT_SCENES } from '../js/ui/cutscene.js';
import { input } from '../js/engine/input.js';
import { openDialogue, advanceDialogue, hasDialogueChoices, closeDialogue } from '../js/ui/dialogue.js';

const listeners = new Map();
const node = () => ({
  style: {}, dataset: {}, textContent: '', innerHTML: '', children: [],
  classList: { add() {}, remove() {} }, setAttribute() {}, focus() {}, remove() { this.removed = true; },
  addEventListener(type, fn) { this[type] = fn; }, appendChild(child) { this.children.push(child); },
});
let modal;
const documentNodes = Object.fromEntries(['dialogueBox', 'dialogueSpeaker', 'dialogueText', 'dialogueHint', 'dialogueChoices'].map(id => [id, node()]));
globalThis.document = {
  activeElement: node(),
  body: { appendChild(el) { modal = el; } },
  getElementById: id => documentNodes[id],
  createElement: tag => {
    const el = node();
    if (tag === 'section') {
      const parts = Object.fromEntries(['art', 'eyebrow', 'title', 'text', 'note', 'count', 'next', 'skip'].map(name => [`.cutscene-${name}`, node()]));
      el.querySelector = name => parts[name]; el.parts = parts;
    }
    return el;
  },
};
globalThis.window = { addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
input.keys.w = true; input.pressed.add('e');
const ended = playCutscene(BOOT_SCENES);
assert(isCutsceneOpen());
assert.equal(modal.parts['.cutscene-count'].textContent, '01 / 04');
modal.parts['.cutscene-next'].click();
assert.equal(modal.parts['.cutscene-title'].textContent, 'CRITICAL_ERROR');
modal.parts['.cutscene-skip'].click();
await ended;
assert(!isCutsceneOpen());
assert.equal(input.keys.w, false);
assert.equal(input.pressed.size, 0);
assert(modal.removed);

// Escolhas de onboarding/metrô só aparecem após todas as falas, enquanto
// outros diálogos mantêm o comportamento legado.
openDialogue({ dialogue: ['primeira', 'segunda'], choicesAfterDialogue: true, choices: [{ text: 'OK' }] });
assert(!hasDialogueChoices());
assert.equal(documentNodes.dialogueText.textContent, 'primeira');
advanceDialogue();
assert.equal(documentNodes.dialogueText.textContent, 'segunda');
assert(hasDialogueChoices());
advanceDialogue();
assert(hasDialogueChoices());
closeDialogue();
openDialogue({ dialogue: ['antiga', 'continuação'], choices: [{ text: 'OK' }] });
assert(hasDialogueChoices(), 'diálogos legados não mudam');
closeDialogue();
console.log('Cutscenes e diálogos: avanço, pular, limpeza do input e escolhas após as falas OK.');
