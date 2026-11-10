import { activateCompanion } from '../game/companion-progress.js';
import { saveGame } from '../game/save.js';
import { ARCHETYPES } from '../data/onboarding.js';
import { getProgressionTree, TREE_BRANCHES } from '../data/progression-tree.js';
import { canRankNode, getArchetypeLevel, getDerivedStats, getNodeRank, getTreePoints, rankNode, xpToNext } from '../game/rpg.js';
import { listTrackedQuests } from '../game/quests.js';
// Diário somente de leitura para o progresso antigo; nível e árvore só mudam por botão explícito.
let overlay = null;
let opened = false;
export function isQuestJournalOpen() { return opened; }
export function closeQuestJournal() { opened = false; overlay?.classList.remove('visible'); }

function renderProgress(progress) {
  const archetypeId = progress?.archetype;
  const box = overlay.querySelector('#journalProgress');
  if (!box) return;
  if (!archetypeId || !ARCHETYPES[archetypeId]) {
    box.innerHTML = '<p class="journal-note">Escolha um Módulo de Eco com o NEXO para abrir a árvore.</p>';
    return;
  }
  const archetype = ARCHETYPES[archetypeId];
  const level = getArchetypeLevel(progress, archetypeId);
  const xp = Number.isFinite(progress.archetypeProgress?.[archetypeId]?.xp) ? progress.archetypeProgress[archetypeId].xp : 0;
  const next = xpToNext(level);
  const points = getTreePoints(progress, archetypeId);
  const stats = getDerivedStats(progress, null, archetypeId);
  const nodes = getProgressionTree(archetypeId).map(node => {
    const rank = getNodeRank(progress, archetypeId, node.id);
    const check = canRankNode(progress, node.id, archetypeId);
    const cost = node.cost[rank] ?? node.cost[node.cost.length - 1];
    const status = rank >= node.maxRank ? 'MÁX' : check.ok ? `+1 · ${cost} PONTO${cost > 1 ? 'S' : ''}` : check.reason.toUpperCase();
    return `<button type="button" class="tree-node${rank >= node.maxRank ? ' maxed' : ''}${check.ok ? '' : ' locked'}" data-node="${node.id}" ${check.ok ? '' : 'disabled'} style="--branch:${TREE_BRANCHES[node.branch].color}">
      <span class="tree-node-branch">${TREE_BRANCHES[node.branch].label}</span>
      <strong>${node.name}</strong>
      <span class="tree-node-rank">${rank}/${node.maxRank}</span>
      <span class="tree-node-status">${status}</span>
      <small>${node.description}</small>
    </button>`;
  }).join('');
  box.innerHTML = `
    <div class="journal-progress-head">
      <strong>${archetype.nome} · NÍVEL ${level}</strong>
      <span>${Number.isFinite(next) ? `${xp} / ${next} XP` : 'NÍVEL MÁXIMO'} · ${points} PONTO${points === 1 ? '' : 'S'} DISPONÍVE${points === 1 ? 'L' : 'IS'}</span>
      <span class="journal-progress-stats">DANO BASE ${stats.basicDamage.toFixed(1)} · CRÍTICO ${Math.round(stats.critChance * 100)}% · RECARGA ${stats.cooldown.toFixed(2)}s</span>
    </div>
    <div class="journal-tree">${nodes}</div>`;
  box.querySelectorAll('.tree-node').forEach(button => {
    button.addEventListener('click', () => {
      if (!rankNode(progress, button.dataset.node, archetypeId).ranked) return;
      saveGame();
      renderProgress(progress);
      renderQuests(progress);
    });
  });
}

function renderQuests(progress) {
  const box = overlay.querySelector('#journalTracked');
  if (!box) return;
  const tracked = listTrackedQuests(progress);
  if (!tracked.length) {
    box.innerHTML = '<p class="journal-note">Nenhuma missão contável ativa. Fale com o NEXO-04.</p>';
    return;
  }
  box.innerHTML = tracked.map(quest => {
    const objectives = quest.objectives.map(objective => `<li class="${objective.done ? 'done' : ''}">${objective.label}: ${objective.current}/${objective.count}</li>`).join('');
    return `<article class="journal-quest ${quest.status}"><strong>${quest.status === 'completed' ? 'CONCLUÍDA' : 'ATIVA'}</strong><ul>${objectives}</ul></article>`;
  }).join('');
}

export function openQuestJournal(progress, map) {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'questJournal';
    overlay.innerHTML = `<section class="journal-panel" role="dialog" aria-modal="true" aria-labelledby="journalTitle">
      <h2 id="journalTitle">DIÁRIO DE ROTAS</h2><p class="journal-caption">MISSÕES E DESCOBERTAS</p>
      <h3>PRINCIPAL</h3><strong id="journalMainTitle"></strong><p id="journalMainDescription"></p>
      <h3>MISSÕES CONTÁVEIS</h3><div id="journalTracked"></div>
      <h3>NÍVEL E ÁRVORE DE PROGRESSÃO</h3><div id="journalProgress"></div>
      <h3>EXPLORAÇÃO OPCIONAL</h3><strong id="journalSideTitle">ENSEADA DOS ECOS</strong><p id="journalSideDescription"></p>
      <h3>ESTAÇÃO QUE RESPIRA</h3><p id="journalBioDescription"></p>
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
  overlay.querySelector('#journalBioDescription').textContent = flags.gate_bio_controle_central
    ? 'Controle sincronizado. O fluxo parcial é monitorado; a reconstrução continua.'
    : flags.gate_bio_pulso_interior ? 'Impulso registrado: ative o painel central na sala de controle.'
    : flags.bio_pulso_diagnostico ? 'Na sala de controle, atravesse a placa com Q.'
    : flags.gate_bio_valvula_estufa ? 'Fluxo parcial aberto. Entre no terminal e diagnostique a placa com R.'
    : flags.gate_bio_reparo_regulador ? 'Diagnostique e abra a válvula junto à estufa.'
    : flags.gate_bio_reparo_condutor ? 'Diagnostique e reconstrua o regulador no pátio.'
    : map?.id === 'ilha_estacao_bio' || map?.id === 'bio_sala_controle' ? 'Diagnostique e reconstrua o condutor na chegada; consulte o terminal para o protocolo.'
    : 'Repare o teleférico e explore a Estação Bio-Forja.';
  const found = ['mar','pedra','mata'].filter(id => flags[`collected_enseada_rastro_${id}`]).length;
  overlay.querySelector('#journalSideDescription').textContent = map?.id === 'ilha_enseada_ecos' || found > 0
    ? (found === 3 ? (flags.companheiro_lumeo ? 'Concluída: três vestígios registrados. Lúmeo é seu companheiro.' : (flags.collected_lumeo_ressonancia ? 'Siga a luz até a mata e escolha se deseja oferecer companhia a Lúmeo.' : flags.collected_lumeo_encontro ? 'Investigue e acalme a ressonância nas ruínas a leste.' : 'Concluída: três vestígios registrados. Ouça o eco perto da trilha de retorno.')) : `Investigue os vestígios da Enseada: ${found}/3.`)
    : 'Descubra a Enseada dos Ecos para investigar seus vestígios.';
  renderProgress(progress);
  renderQuests(progress);
  opened = true; overlay.classList.add('visible');
  overlay.querySelector('#journalClose').focus();
}
