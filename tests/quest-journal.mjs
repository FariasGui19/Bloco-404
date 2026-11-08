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
assert.match(elements.get('#journalBioTitle').textContent, /0\/4/);
assert.match(elements.get('#journalBioDescription').textContent, /○ CONDUTOR/);
closeQuestJournal();
// A primeira missão da Estação Bio fecha no diário sem conceder recompensa.
Object.assign(progress.flags, {
  gate_bio_reparo_condutor: true, gate_bio_reparo_regulador: true,
  bio_valvula_estufa_diagnostico: true, gate_bio_valvula_estufa: true,
});
const antesBio = JSON.stringify(progress);
openQuestJournal(progress, { id: 'ilha_estacao_bio' });
assert.match(elements.get('#journalBioTitle').textContent, /LEITURA REGISTRADA/);
assert.match(elements.get('#journalBioDescription').textContent, /✓ FLUXO PARCIAL/);
assert.match(elements.get('#journalBioDescription').textContent, /nenhuma recompensa/i);
assert.equal(JSON.stringify(progress), antesBio, 'diário não altera save');
console.log('Diário: principal, vestígios e primeira missão Bio, sem mutação de progresso OK.');
