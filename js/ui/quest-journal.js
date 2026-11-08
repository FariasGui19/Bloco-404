import { activateCompanion } from '../game/companion-progress.js';
import { saveGame } from '../game/save.js';
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
      <h3>ESTAÇÃO BIO · PRIMEIRA MISSÃO</h3><strong id="journalBioTitle"></strong><p id="journalBioDescription"></p>
      <h3>COMPANHEIROS · PRÉVIA LOCAL</h3><p id="petInfo"></p><button type="button" id="petBolt">TESTAR BOLT NESTE SAVE</button><button type="button" id="petLumeo">ACOMPANHAR COM LÚMEO</button><p class="journal-note">Outras dimensões, atividades e modos serão adicionados futuramente.</p>
      <button type="button" id="journalClose">FECHAR · J / ESC</button></section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#journalClose').addEventListener('click', closeQuestJournal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeQuestJournal(); });
  }
  const updatePets = () => {
    const pets = progress.companions ?? { active: progress.flags?.companheiro_lumeo ? 'lumeo' : null, pets: {} };
    const active = pets.active, pet = pets.pets[active];
    overlay.querySelector('#petInfo').textContent = active ? `${active === 'bolt' ? 'Bolt' : 'Lúmeo'} · nível ${pet?.level ?? 1} · XP ${pet?.xp ?? 0} · inventário ${(pet?.inventory ?? []).length} itens. Árvore em preparação.` : 'Nenhum companheiro ativo.';
    overlay.querySelector('#petLumeo').disabled = !progress.flags?.companheiro_lumeo;
  };
  overlay.querySelector('#petBolt').onclick = () => { activateCompanion(progress, 'bolt'); saveGame(); updatePets(); };
  overlay.querySelector('#petLumeo').onclick = () => { activateCompanion(progress, 'lumeo'); saveGame(); updatePets(); };
  updatePets();
  const quest = progress?.activeQuest;
  overlay.querySelector('#journalMainTitle').textContent = quest?.title ?? 'NENHUMA MISSÃO ATIVA';
  overlay.querySelector('#journalMainDescription').textContent = quest?.description ?? 'Continue explorando o Bloco 404.';
  const flags = progress?.flags ?? {};
  const found = ['mar','pedra','mata'].filter(id => flags[`collected_enseada_rastro_${id}`]).length;
  // Progresso da primeira missão da Estação Bio. Não substitui a missão
  // principal, não concede recompensa e não declara o sistema geral completo.
  const etapasBio = [
    ['CONDUTOR', !!flags.gate_bio_reparo_condutor],
    ['REGULADOR', !!flags.gate_bio_reparo_regulador],
    ['DIAGNÓSTICO DA VÁLVULA', !!flags.bio_valvula_estufa_diagnostico],
    ['FLUXO PARCIAL', !!flags.gate_bio_valvula_estufa],
  ];
  const feitasBio = etapasBio.filter(([, ok]) => ok).length;
  overlay.querySelector('#journalBioTitle').textContent = feitasBio === 4
    ? 'SETOR INICIAL · LEITURA REGISTRADA'
    : `RECONSTRUÇÃO TÁTICA · ${feitasBio}/4`;
  overlay.querySelector('#journalBioDescription').textContent =
    etapasBio.map(([nome, ok]) => `${ok ? '✓' : '○'} ${nome}`).join('  ·  ') +
    (feitasBio === 4
      ? '  —  Primeira missão do setor concluída. O núcleo profundo pertence a uma missão futura; nenhuma recompensa foi concedida.'
      : '  —  Diagnóstico R e reconstrução E com Bio-Forja; a rota está marcada no piso.');
  overlay.querySelector('#journalSideDescription').textContent = map?.id === 'ilha_enseada_ecos' || found > 0
    ? (found === 3 ? (flags.companheiro_lumeo ? 'Concluída: três vestígios registrados. Lúmeo é seu companheiro.' : (flags.collected_lumeo_ressonancia ? 'Siga a luz até a mata e escolha se deseja oferecer companhia a Lúmeo.' : flags.collected_lumeo_encontro ? 'Investigue e acalme a ressonância nas ruínas a leste.' : 'Concluída: três vestígios registrados. Ouça o eco perto da trilha de retorno.')) : `Investigue os vestígios da Enseada: ${found}/3.`)
    : 'Descubra a Enseada dos Ecos para investigar seus vestígios.';
  opened = true; overlay.classList.add('visible');
  overlay.querySelector('#journalClose').focus();
}
