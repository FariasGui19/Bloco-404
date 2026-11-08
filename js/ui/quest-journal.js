// Diário somente de leitura: não altera nem substitui missões ou saves.
let overlay = null;
let opened = false;
export function isQuestJournalOpen() { return opened; }
export function closeQuestJournal() { opened = false; overlay?.classList.remove('visible'); }
export function openQuestJournal(progress, map) {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'questJournal';
    overlay.innerHTML = `<section class="journal-panel" role="dialog" aria-modal="true" aria-labelledby="journalTitle">
      <h2 id="journalTitle">DIÁRIO DE ROTAS</h2><p class="journal-caption">MISSÕES E DESCOBERTAS</p>
      <h3>PRINCIPAL</h3><strong id="journalMainTitle"></strong><p id="journalMainDescription"></p>
      <h3>EXPLORAÇÃO OPCIONAL</h3><strong id="journalSideTitle">ENSEADA DOS ECOS</strong><p id="journalSideDescription"></p>
      <p class="journal-note">Outras dimensões, atividades e modos serão adicionados futuramente.</p>
      <button type="button" id="journalClose">FECHAR · J / ESC</button></section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#journalClose').addEventListener('click', closeQuestJournal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeQuestJournal(); });
  }
  const quest = progress?.activeQuest;
  overlay.querySelector('#journalMainTitle').textContent = quest?.title ?? 'NENHUMA MISSÃO ATIVA';
  overlay.querySelector('#journalMainDescription').textContent = quest?.description ?? 'Continue explorando o Bloco 404.';
  const flags = progress?.flags ?? {};
  const found = ['mar','pedra','mata'].filter(id => flags[`collected_enseada_rastro_${id}`]).length;
  overlay.querySelector('#journalSideDescription').textContent = map?.id === 'ilha_enseada_ecos' || found > 0
    ? (found === 3 ? (flags.companheiro_lumeo ? 'Concluída: três vestígios registrados. Lúmeo é seu companheiro.' : 'Concluída: três vestígios registrados. Procure Lúmeo perto da trilha de retorno e escolha se deseja acolhê-lo.') : `Investigue os vestígios da Enseada: ${found}/3.`)
    : 'Descubra a Enseada dos Ecos para investigar seus vestígios.';
  opened = true; overlay.classList.add('visible');
  overlay.querySelector('#journalClose').focus();
}
