import assert from 'node:assert/strict';
const elements = new Map();
const item = () => ({ textContent: '', focus() {}, addEventListener() {} });
const classes = new Set();
const overlay = {
  innerHTML: '',
  classList: { add: s => classes.add(s), remove: s => classes.delete(s) },
  querySelector(selector) { if (!elements.has(selector)) elements.set(selector, item()); return elements.get(selector); },
  addEventListener() {},
};
globalThis.document = { createElement: () => overlay, body: { appendChild() {} } };
const { openQuestJournal, closeQuestJournal, isQuestJournalOpen } = await import('../js/ui/quest-journal.js');
const progress = { activeQuest: { title: 'Missão principal', description: 'Descrição' }, flags: { collected_enseada_rastro_mar: true } };
const before = JSON.stringify(progress);
openQuestJournal(progress, { id: 'ilha_enseada_ecos' });
assert(isQuestJournalOpen()); assert(classes.has('visible'));
assert.equal(elements.get('#journalMainTitle').textContent, 'Missão principal');
assert.match(elements.get('#journalSideDescription').textContent, /1\/3/);
assert.equal(JSON.stringify(progress), before, 'consulta não altera save');
closeQuestJournal(); assert(!isQuestJournalOpen()); assert(!classes.has('visible'));
progress.flags.collected_enseada_rastro_pedra = true; progress.flags.collected_enseada_rastro_mata = true;
openQuestJournal(progress, { id: 'hub_saguao' });
assert.match(elements.get('#journalSideDescription').textContent, /Concluída/);
console.log('Diário: consulta de principal e vestígios, sem mutação de progresso OK.');
