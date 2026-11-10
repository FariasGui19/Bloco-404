import assert from 'node:assert/strict';
const elements = new Map();
const item = () => ({ textContent: '', innerHTML: '', focus() {}, addEventListener() {}, querySelectorAll: () => [] });
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

// Com arquétipo escolhido, o diário também mostra nível e árvore, sem investir sozinho.
const ranked = {
  activeQuest: null,
  flags: {},
  archetype: 'nucleo_dez_forma',
  archetypeProgress: { nucleo_dez_forma: { level: 3, xp: 12, points: 2, nodes: {} } },
};
const rankedBefore = JSON.stringify(ranked);
openQuestJournal(ranked, { id: 'hub_saguao' });
assert.match(elements.get('#journalProgress').innerHTML, /NÍVEL 3/);
assert.match(elements.get('#journalProgress').innerHTML, /PULSO SINTONIZADO/);
assert.match(elements.get('#journalProgress').innerHTML, /2 PONTOS/);
assert.equal(JSON.stringify(ranked), rankedBefore, 'abrir a árvore não gasta pontos');
closeQuestJournal();
console.log('Diário: principal, vestígios, nível e árvore sem mutação de progresso OK.');
