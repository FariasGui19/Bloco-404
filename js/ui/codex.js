// =====================================================================
// CÓDEX DE ROTAS
//
// Substitui o antigo diário monolítico por quatro abas independentes:
// MISSÕES · PROGRESSÃO · INVENTÁRIO · ATRIBUTOS.
//
// Abrir o Códex nunca altera o progresso: leitura é pura. As únicas ações
// são as que já existiam (testar companheiros) e elas salvam de propósito.
// =====================================================================
import { saveGame } from '../game/save.js';
import { activateCompanion } from '../game/companion-progress.js';
import { ARCHETYPES } from '../data/onboarding.js';
import { getArchetypeLevel, getArchetypeXp, getDerivedStats, xpToNext } from '../game/rpg.js';
import { getMasteryState, getMasterySummary } from '../game/mastery.js';
import { getUltimateStatus } from '../game/ultimate.js';
import { getBioUltimatePosePath } from '../data/bio-ultimate-animation.js';
import { getMareUltimatePosePath } from '../data/mare-ultimate-animation.js';
import { getDominioUltimatePosePath } from '../data/dominio-ultimate-animation.js';
import { listTools, selectTool } from '../game/tools.js';
import { describeNextUnlock, getUnlockState, getUnlockStepFor } from '../game/unlocks.js';
import { getPath, LEVEL_TITLES, PATH_STATES } from '../data/archetype-progression.js';
import { getTree, getTreeSummary, TREE_STATE_LABELS } from '../data/archetype-trees.js';
import { TOOL_LABELS } from '../data/archetype-tools.js';
import { NUCLEO_FORMS } from '../data/nucleo-forms.js';
import { listTrackedQuests } from '../game/quests.js';
import { getQuest } from '../data/quests.js';
import { DEGRAUS, PROVAS, resumoDaArvore } from '../game/nado-arvore.js';
import { ARQUIPELAGO_REGIONS } from '../data/arquipelago-regioes.js';
import { getItem, listInventory } from '../data/items.js';

const ICONS = 'assets/sprites/ui/codex/icone-';
const ULTIMATE_ICONS = 'assets/sprites/ui/codex/ultimate-';

// Cada trilha tem sua cor, igual ao ícone que a representa no Códex.
export const TRACK_COLORS = Object.freeze({
  ataque: '#ffd86b', fluxo: '#54ccff', eco: '#ffc861', locomocao: '#b78cff',
});

const TABS = Object.freeze([
  { id: 'missoes', label: 'MISSÕES', icon: 'missoes' },
  { id: 'progressao', label: 'PROGRESSÃO', icon: 'progressao' },
  { id: 'inventario', label: 'INVENTÁRIO', icon: 'inventario' },
  { id: 'atributos', label: 'ATRIBUTOS', icon: 'vitais' },
]);

let overlay = null;
let opened = false;
let currentTab = 'missoes';
let currentSelection = null; // item selecionado no inventário
let context = { progress: null, map: null, player: null };

const icon = (name, className = 'codex-icon') =>
  `<img class="${className}" src="${ICONS}${name}.png" alt="" aria-hidden="true" draggable="false">`;

const pct = value => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

// ---------------------------------------------------------------------
// ABAS
// ---------------------------------------------------------------------
function renderTabs() {
  return `<nav class="codex-tabs" role="tablist" aria-label="Seções do Códex">
    ${TABS.map((tab, index) => `<button type="button" role="tab" class="codex-tab${tab.id === currentTab ? ' active' : ''}"
      id="codexTab-${tab.id}" aria-selected="${tab.id === currentTab}" aria-controls="codexPanel" data-tab="${tab.id}">
      ${icon(tab.icon, 'codex-tab-icon')}
      <span>${tab.label}</span>
      <kbd>${index + 1}</kbd>
    </button>`).join('')}
  </nav>`;
}

// Rotas marítimas da Maré Astral: mapa do arquipélago com o que já navega e o
// que ainda é projeto. Nada aqui move o jogador — é leitura de mapa.
function mareRoutes(progress, map) {
  if (progress?.archetype !== 'mare_astral') return '';
  const atual = ARQUIPELAGO_REGIONS.find(region => region.mapId && region.mapId === map?.id)
    ?? ARQUIPELAGO_REGIONS.find(region => region.id === 'praia_inicial');
  const vizinhas = ARQUIPELAGO_REGIONS.filter(region => atual.neighbours.includes(region.id));
  const rota = region => {
    const aberta = region.status === 'jogavel' && (!region.requiresFlag || progress?.flags?.[region.requiresFlag]);
    const estado = aberta ? 'ROTA ABERTA' : region.status === 'jogavel' ? 'COMPORTA SELADA' : 'EM PROJETO';
    return `<li class="codex-route ${aberta ? 'pronto' : 'projeto'}">
      <span class="codex-route-pin" aria-hidden="true">${aberta ? '◆' : '◇'}</span>
      <strong>${escapeHtml(region.nome)}</strong>
      <em>${estado}</em>
      <small>${escapeHtml(region.biome)}</small>
    </li>`;
  };
  const lista = vizinhas.length ? vizinhas.map(rota).join('') : '<li class="codex-route projeto"><strong>Nenhuma vizinha mapeada</strong></li>';
  return `<aside class="codex-mare" aria-label="Rotas de maré">
      <span class="codex-tag">ROTAS DE MARÉ</span>
      <strong>${escapeHtml(atual.nome)}</strong>
      <ul>${lista}</ul>
      <div class="codex-mare-modes">
        <span class="codex-mare-mode pronto"><b>NADO LIVRE</b><em>ATIVO</em><small>braçada com inércia, arrancada e mergulho (ESPAÇO; Z na Travessia do Maré)</small></span>
        <span class="codex-mare-mode projeto"><b>NAVEGAÇÃO</b><em>EM PROJETO</em><small>correntes levam a ilhas e portos</small></span>
        <span class="codex-mare-mode projeto"><b>MISSÕES DE TRAVESSIA</b><em>EM PROJETO</em><small>rotas com carga e pouso</small></span>
      </div>
      <p class="codex-note">A Rota das Marés liga a Enseada à Dársena após abrir a comporta; outras rotas permanecem em projeto.</p>
    </aside>`;
}

// ÁRVORE DE NADO: os cinco degraus, o atual e a prova que abre o próximo.
// Leitura pura (`resumoDaArvore` não cria nada no save).
function nadoTree(progress) {
  const r = resumoDaArvore(progress);
  const degraus = DEGRAUS.map(d => {
    const estado = d.nivel < r.nivel ? 'feito' : d.nivel === r.nivel ? 'atual' : 'futuro';
    const nome = d.nivel === r.maximo && progress?.archetype === 'mare_astral' ? 'MARÉ ASTRAL' : d.nome;
    const prova = PROVAS.find(p => p.de === d.nivel - 1);
    return `<li class="codex-nado-degrau ${estado}">
        <span class="codex-nado-pin" aria-hidden="true">${estado === 'feito' ? '◆' : estado === 'atual' ? '◈' : '◇'}</span>
        <strong>${d.nivel} · ${escapeHtml(nome)}</strong>
        <small>${escapeHtml(estado === 'futuro' && prova ? `Prova: ${prova.instrucao}` : d.resumo)}</small>
      </li>`;
  }).join('');
  const rodape = r.prova?.id === 'fundo' && progress?.archetype !== 'mare_astral'
    ? 'TOCAR O FUNDO requer afinidade aquática; equipamentos e formas de mergulho ainda estão em projeto.'
    : r.prova
    ? `PRÓXIMA PROVA — ${escapeHtml(r.prova.nome)}: ${escapeHtml(r.prova.instrucao)}`
    : 'ESPAÇO mergulha, SHIFT arranca; no Maré, Z mantém o mergulho ou sobe.';
  return `<aside class="codex-mare codex-nado" aria-label="Árvore de nado">
      <span class="codex-tag">ÁRVORE DE NADO</span>
      <strong>DEGRAU ${r.nivel}/${r.maximo} · ${escapeHtml(r.nome)}</strong>
      <ul>${degraus}</ul>
      <p class="codex-note">${rodape}</p>
    </aside>`;
}

function renderMissions(progress, map) {
  const quest = progress?.activeQuest;
  const main = quest
    ? `<article class="codex-quest codex-quest-main">
         <header><span class="codex-tag">PRINCIPAL</span><strong>${escapeHtml(quest.title ?? 'MISSÃO')}</strong></header>
         <p>${escapeHtml(quest.description ?? 'Sem descrição.')}</p>
       </article>`
    : `<article class="codex-quest codex-quest-empty"><strong>NENHUMA MISSÃO PRINCIPAL</strong><p>Fale com o NEXO-04 no saguão para receber sua primeira rota.</p></article>`;

  const tracked = listTrackedQuests(progress);
  const cards = tracked.length
    ? tracked.map(entry => {
      const objectives = entry.objectives.map(objective => {
        const ratio = objective.count ? objective.current / objective.count : 0;
        return `<li class="${objective.done ? 'done' : ''}">
          <span>${escapeHtml(objective.label)}</span>
          <span class="codex-quest-count">${objective.current}/${objective.count}</span>
          <i class="codex-quest-bar"><b style="width:${pct(ratio)}"></b></i>
        </li>`;
      }).join('');
      return `<article class="codex-quest ${entry.status}">
        <header><span class="codex-tag">${entry.status === 'completed' ? 'CONCLUÍDA' : 'ATIVA'}</span><strong>${escapeHtml(getQuest(entry.id)?.title ?? '')}</strong></header>
        <ul>${objectives}</ul>
      </article>`;
    }).join('')
    : `<article class="codex-quest codex-quest-empty"><strong>SEM MISSÕES CONTÁVEIS</strong><p>As rotas paralelas aparecem aqui conforme você as encontra.</p></article>`;

  const flags = progress?.flags ?? {};
  const found = ['mar', 'pedra', 'mata'].filter(id => flags[`collected_enseada_rastro_${id}`]).length;
  const exploration = `<article class="codex-quest codex-quest-side">
      <header><span class="codex-tag">EXPLORAÇÃO</span><strong>ENSEADA DOS ECOS</strong></header>
      <p>${map?.id === 'ilha_enseada_ecos' || found > 0
        ? `Vestígios registrados: ${found}/3.`
        : 'A Enseada ainda não foi mapeada.'}</p>
      ${flags.companheiro_lumeo ? '<p class="codex-note">LÚMEO ACOMPANHA VOCÊ.</p>' : ''}
    </article>`;

  return `<section class="codex-section" aria-label="Missões">
    <div class="codex-columns">
      <div class="codex-column">${main}${cards}</div>
      <aside class="codex-column codex-column-side">${nadoTree(progress)}${exploration}${mareRoutes(progress, map)}</aside>
    </div>
  </section>`;
}

function masteryPips(rank, maxRank) {
  return `<span class="codex-pips" aria-hidden="true">${Array.from({ length: maxRank }, (_, index) => `<i class="${index < rank ? 'filled' : ''}"></i>`).join('')}</span>`;
}

// De onde sai a arte de execução de uma escolha: cada arquétipo que já tem
// folhas de Ultimate própria aponta seu resolvedor. Quem ainda não tem cai em
// null e o cartão fica só com o texto (sem ícone inventado).
const POSE_RESOLVERS = {
  motor_bio_forja: getBioUltimatePosePath,
  mare_astral: getMareUltimatePosePath,
  lamina_dominio_anciao: getDominioUltimatePosePath,
};

function poseDaFerramenta(arquetipo, signature) {
  const resolver = POSE_RESOLVERS[arquetipo];
  return resolver && signature ? resolver(signature) : null;
}

// Ultimate: nome, custo e estado atual, com o sigilo do arquétipo.
function ultimateCard(progress) {
  const status = getUltimateStatus(context.player, progress);
  if (!status) return '';
  const { definition, tool } = status;
  const estado = status.locked ? `BLOQUEADA · NÍVEL ${status.requiredLevel}`
    : status.cooldown > 0 ? `RECARREGANDO ${status.cooldown.toFixed(0)}s`
    : !status.energyOk ? `FALTA ${Math.max(0, definition.cost - status.energy)} ENERGIA`
    : 'PRONTA';
  const camada = tool ? `SOBRECARGA · ${tool.short}` : 'ULTIMATE DE ARQUÉTIPO · BASE';
  const avisoForma = status.needsForm
    ? '<p class="codex-form-warning">SÓ COM A FORMA ATIVA · TRANSFORME-SE COM <kbd>T</kbd> ANTES DE SOLTAR.</p>'
    : '';
  return `<article class="codex-ultimate${status.ready ? ' ready' : ''}${status.locked ? ' locked' : ''}" style="--ultimate:${definition.color}">
    <img class="codex-ultimate-icon" src="${ULTIMATE_ICONS}${progress.archetype}.png" alt="" aria-hidden="true" draggable="false">
    <div>
      <header><span class="codex-tag">F · ${camada}</span><strong>${escapeHtml(definition.name)}</strong><em>${estado}</em></header>
      <p>${escapeHtml(definition.description)}</p>
      ${avisoForma}
      <footer>${definition.cost} ENERGIA · RECARGA ${definition.cooldown}s · ${escapeHtml(definition.effectText)}</footer>
    </div>
  </article>`;
}

// Escolha de ferramenta/corrente/forma: é ela que define a Ultimate nível 1.
function toolPicker(progress) {
  const tools = listTools(progress);
  if (!tools.length) return '';
  const label = TOOL_LABELS[progress.archetype] ?? 'FERRAMENTA';
  const acesso = getUnlockState(progress);
  const hint = acesso.features.tool
    ? (progress.archetype === 'nucleo_dez_forma' ? 'Forma Veloz e Q no início; Ultimate no nível 3; Quebra Sistemas no nível 4.' : getPath(progress.archetype)?.levels?.find(entry => entry.level === 2)?.note ?? 'A escolha vale para todo o perfil.')
    : `Instalar ${label.toLowerCase()} abre no nível ${getUnlockStepFor(2)?.level ?? 2}. Suba de nível com combate e missões.`;
  const titulo = !acesso.features.tool
    ? `${escapeHtml(label)} BLOQUEADA`
    : tools.some(tool => tool.selected) ? 'TROQUE A SOBRECARGA' : `ESCOLHA UMA ${escapeHtml(label)}`;
  const cards = tools.map(tool => {
    // A execução da Ultimate é arte de verdade: o cartão mostra a primeira pose
    // da folha da ferramenta/corrente (preparo), não um ícone genérico.
    // A busca é por arquétipo — a corrente `escudo_liquido` desenha o próprio
    // gesto, não o do Bio.
    const pose = poseDaFerramenta(progress.archetype, tool.ultimate?.signature);
    // `src` é a folha inteira; o CSS recorta o quadro do preparo. Assim a
    // mesma arte serve de miniatura e de referência do golpe, sem gerar PNG
    // só para o menu.
    const execucao = pose
      ? `<img class="codex-tool-pose" src="${pose}" alt="" aria-hidden="true" draggable="false"
          style="--pose-sheet:url('${pose}')">`
      : '';
    return `<button type="button" class="codex-tool${tool.selected ? ' selected' : ''}${tool.locked ? ' locked' : ''}"
      data-tool="${escapeHtml(tool.id)}" style="--tool:${tool.color};--poses:4;--pose:0"
      aria-pressed="${tool.selected}" ${tool.locked ? 'disabled aria-disabled="true"' : ''}>
      ${execucao}
      <span class="codex-tool-tag">${escapeHtml(tool.short)}</span>
      <strong>${escapeHtml(tool.name)}</strong>
      <small>${tool.playable ? 'NÍVEL 1' : 'EM PROJETO'} · ${escapeHtml(tool.ultimate.name)}</small>
      <em>${escapeHtml(tool.tagline)}</em>
      <i class="codex-tool-cost">${!tool.playable ? 'FORMA EM PROJETO' : tool.locked ? `BLOQUEADA · NÍVEL ${tool.requiredLevel}` : `${tool.ultimate.cost} EN · ${tool.ultimate.cooldown}s`}</i>
    </button>`;
  }).join('');
  return `<section class="codex-tools" aria-label="Escolha de ${escapeHtml(label)}">
    <header>
      <span class="codex-tag">ESPECIALIZAÇÃO · ${escapeHtml(label)}</span>
      <strong>${titulo}</strong>
      <p>${escapeHtml(hint)}</p>
    </header>
    <div class="codex-tool-grid">${cards}</div>
  </section>`;
}

// Caminho 0–5 do arquétipo: o que já dá para jogar e o que ainda é plano.
function pathLadder(progress) {
  const path = getPath(progress?.archetype);
  if (!path) return '';
  const unlockState = getUnlockState(progress);
  const steps = path.levels.map(entry => {
    const items = entry.items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    const unlockStep = getUnlockStepFor(entry.level);
    const estado = entry.state === 'futuro' || unlockStep?.planned
      ? PATH_STATES[entry.state] ?? 'PLANEJADO'
      : unlockState.level >= (unlockStep?.level ?? unlockState.level) ? 'DISPONÍVEL' : `NÍVEL ${unlockStep.level} · FALTAM ${unlockStep.level - unlockState.level}`;
    const classe = estado === 'DISPONÍVEL' ? 'pronto' : estado.startsWith('NÍVEL') ? 'travado' : entry.state;
    return `<li class="codex-step ${classe}">
      <span class="codex-step-level">${entry.level}</span>
      <div class="codex-step-body">
        <header><strong>${escapeHtml(entry.title)}</strong><em>${escapeHtml(estado)}</em></header>
        <ul>${items}</ul>
        ${entry.note ? `<small>${escapeHtml(entry.note)}</small>` : ''}
      </div>
    </li>`;
  }).join('');
  return `<section class="codex-path" aria-label="Caminho do arquétipo">
    <header><span class="codex-tag">CAMINHO · NÍVEIS 0–5</span><p>${escapeHtml(path.tagline)}</p></header>
    <ol class="codex-steps">${steps}</ol>
  </section>`;
}

// Árvore do arquétipo: o horizonte de cada galho, sem prometer o que não existe.
function treePanel(progress) {
  const tree = getTree(progress?.archetype);
  if (!tree) return '';
  const resumo = getTreeSummary(progress.archetype);
  const galhos = tree.branches.map(branch => {
    const estado = TREE_STATE_LABELS[branch.state] ?? 'PLANEJADO';
    const nos = branch.nodes.map(node => {
      const rotulo = TREE_STATE_LABELS[node.state] ?? 'PLANEJADO';
      return `<li class="codex-node ${node.state}">
        <strong>${escapeHtml(node.name)}</strong>
        <em>${escapeHtml(rotulo)}</em>
        ${node.note ? `<small>${escapeHtml(node.note)}</small>` : ''}
      </li>`;
    }).join('');
    return `<article class="codex-branch ${branch.state}">
      <header><strong>${escapeHtml(branch.name)}</strong><em>${escapeHtml(estado)}</em></header>
      <ul>${nos}</ul>
    </article>`;
  }).join('');
  return `<section class="codex-tree" aria-label="Árvore do arquétipo">
    <header>
      <span class="codex-tag">ÁRVORE · ${resumo.prontos}/${resumo.branches} GALHOS PRONTOS</span>
      <strong>${escapeHtml(tree.title)}</strong>
      <p>${escapeHtml(tree.tagline)}</p>
    </header>
    <div class="codex-branches">${galhos}</div>
    <p class="codex-note">${resumo.nodesProntos} de ${resumo.nodes} nós já existem em jogo. Nós <em>EM PROJETO</em> aparecem para mostrar o horizonte — não dão poder nenhum ainda.</p>
  </section>`;
}

function renderProgress(progress) {
  const archetypeId = progress?.archetype;
  const archetype = ARCHETYPES[archetypeId];
  if (!archetypeId || !archetype) {
    return `<section class="codex-section" aria-label="Progressão"><p class="codex-empty">Escolha um Módulo de Eco com o NEXO-04 para abrir a maestria.</p></section>`;
  }
  const level = getArchetypeLevel(progress, archetypeId);
  const xp = getArchetypeXp(progress, archetypeId);
  const next = xpToNext(level);
  const stats = getDerivedStats(progress, context.player, archetypeId);
  const summary = getMasterySummary(progress, archetypeId);
  const tracks = getMasteryState(progress, archetypeId);

  const rows = tracks.map(track => `<article class="codex-track" style="--track:${track.rank > 0 ? TRACK_COLORS[track.id] ?? '#9af9c8' : '#4d6b64'}">
      ${icon(track.icon, 'codex-track-icon')}
      <div class="codex-track-body">
        <header>
          <strong>${escapeHtml(track.name)}</strong>
          ${masteryPips(track.rank, track.maxRank)}
          <span class="codex-track-rank">${track.rank > 0 ? track.rankLabel : '—'}</span>
        </header>
        <p>${escapeHtml(track.description)}</p>
        <i class="codex-track-bar"><b style="width:${pct(track.progress)}"></b></i>
        <footer>
          <span>${track.nextAt === null ? 'RANK MÁXIMO' : `${Math.floor(track.counter)} / ${track.nextAt} · ${escapeHtml(track.hint)}`}</span>
          <span class="codex-track-effect">${escapeHtml(track.effectText)}</span>
        </footer>
      </div>
    </article>`).join('');

  return `<section class="codex-section" aria-label="Progressão">
    <header class="codex-level">
      ${icon('xp', 'codex-level-icon')}
      <div>
        <strong>${escapeHtml(archetype.nome)} · NÍVEL ${level}</strong>
        <span>${Number.isFinite(next) ? `${Math.floor(xp)} / ${next} XP` : 'NÍVEL MÁXIMO'} · MAESTRIA ${summary.total}</span>
        <span class="codex-unlock-next">${escapeHtml(describeNextUnlock(progress))}</span>
      </div>
      <div class="codex-level-bars">
        <i class="codex-xp-bar"><b style="width:${Number.isFinite(next) ? pct(xp / next) : '100%'}"></b></i>
        <span>DANO ${stats.basicDamage.toFixed(1)} · CRÍTICO ${Math.round(stats.critChance * 100)}% · RECARGA ${stats.cooldown.toFixed(2)}s</span>
      </div>
    </header>
    <p class="codex-note">A maestria sobe com o uso: golpes, habilidades, missões e distância percorrida. Não há pontos para gastar.</p>
    ${toolPicker(progress)}
    ${ultimateCard(progress)}
    <div class="codex-tracks">${rows}</div>
    ${treePanel(progress)}
    ${pathLadder(progress)}
  </section>`;
}

function companionBlock(progress) {
  const pets = progress?.companions ?? { active: progress?.flags?.companheiro_lumeo ? 'lumeo' : null, pets: {} };
  const active = pets.active;
  const pet = pets.pets?.[active];
  const label = active ? `${active === 'bolt' ? 'BOLT' : 'LÚMEO'} · NÍVEL ${pet?.level ?? 1} · ${(pet?.inventory ?? []).length} ITENS` : 'NENHUM COMPANHEIRO ATIVO';
  return `<aside class="codex-companions">
      <span class="codex-tag">COMPANHEIROS</span>
      <strong>${label}</strong>
      <div class="codex-companion-actions">
        <button type="button" data-companion="bolt">${pets.active === 'bolt' ? 'BOLT ATIVO' : 'TESTAR BOLT'}</button>
        <button type="button" data-companion="lumeo" ${progress?.flags?.companheiro_lumeo ? '' : 'disabled'}>${pets.active === 'lumeo' ? 'LÚMEO ATIVO' : 'CHAMAR LÚMEO'}</button>
      </div>
      <p class="codex-note">Companheiros ainda não entram em combate.</p>
    </aside>`;
}

function renderInventory(progress) {
  const ids = listInventory(progress);
  if (currentSelection && !ids.includes(currentSelection)) currentSelection = null;
  const selected = currentSelection ?? ids[0] ?? null;
  currentSelection = selected;
  const slots = Array.from({ length: 8 }, (_, index) => {
    const id = ids[index];
    if (!id) return '<div class="codex-slot empty" aria-hidden="true"></div>';
    const item = getItem(id);
    return `<button type="button" class="codex-slot${id === selected ? ' selected' : ''}" data-item="${escapeHtml(id)}" aria-label="${escapeHtml(item.name)}">
      ${icon(item.icon, 'codex-slot-icon')}
      <span>${escapeHtml(item.name)}</span>
    </button>`;
  }).join('');
  const item = selected ? getItem(selected) : null;
  const detail = item
    ? `<article class="codex-item-detail">
        ${icon(item.icon, 'codex-item-icon')}
        <div><span class="codex-tag">${escapeHtml(item.kind)}</span><strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.description)}</p></div>
      </article>`
    : `<article class="codex-item-detail empty"><p>Inventário vazio. Recolha vestígios e registros pelo arquipélago.</p></article>`;
  return `<section class="codex-section" aria-label="Inventário">
    <div class="codex-columns">
      <div class="codex-column">
        <div class="codex-inventory">${slots}</div>
        ${detail}
      </div>
      ${companionBlock(progress)}
    </div>
  </section>`;
}

// Linha da forma do Núcleo 10X: mesma informação da HUD, mas com a barra
// desenhada — o jogador vê quanto ainda cabe de forma e quantos golpes da
// Quebra ainda dá para pagar (3 s cada).
function formRow(progress, player, stats) {
  if (progress?.archetype !== 'nucleo_dez_forma') return '';
  const runtime = player?.nucleoRuntime;
  const ativa = NUCLEO_FORMS[player?.nucleoForm] ?? null;
  const base = ativa ?? NUCLEO_FORMS[stats?.formId] ?? null;
  if (!base) return '';
  const duracao = base.form?.duration ?? 20;
  const restante = ativa ? Math.max(0, runtime?.remaining ?? 0) : 0;
  const fracao = ativa ? Math.max(0, Math.min(1, restante / duracao)) : 0;
  const custo = ativa?.form?.hitCost ?? 0;
  // Quantos golpes carregados ainda cabem na barra.
  const golpes = custo > 0 ? Math.floor(restante / custo) : null;
  const detalhe = ativa
    ? `${restante.toFixed(1)}s de ${duracao}s${golpes !== null ? ` · ${golpes} marretada(s) ainda cabem` : ''}`
    : `aguardando o T (${base.form?.recharge ?? 8}s de recarga)`;
  return `<li class="codex-form-row">
    <span>FORMA</span>
    <strong style="color:${base.color}">${escapeHtml(base.name)}</strong>
    <i class="codex-form-bar" aria-hidden="true"><b style="width:${Math.round(fracao * 100)}%;background:${base.color}"></b></i>
    <small>${escapeHtml(detalhe)}</small>
  </li>`;
}

function statRow(label, value, hint = '') {
  return `<li><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${hint ? `<small>${escapeHtml(hint)}</small>` : ''}</li>`;
}

function renderAttributes(progress, player) {
  const archetypeId = progress?.archetype;
  const stats = getDerivedStats(progress, player, archetypeId);
  if (!stats) return `<section class="codex-section"><p class="codex-empty">Sem módulo ativo.</p></section>`;
  const health = Math.round(player?.health ?? stats.maxHealth);
  const maxHealth = Math.round(player?.maxHealth ?? stats.maxHealth);
  const healthRatio = maxHealth ? health / maxHealth : 1;
  const energy = Math.round(player?.energy ?? 0);
  const maxEnergy = Math.round(player?.maxEnergy ?? 100);
  const speed = Math.round(100 * (1 + stats.moveSpeedPct));
  const formSpeed = Math.round(100 * (1 + stats.moveSpeedPct + stats.formSpeedPct));
  return `<section class="codex-section" aria-label="Atributos">
    <div class="codex-columns">
      <div class="codex-column">
        <article class="codex-vitals">
          <div class="codex-vital">
            ${icon('vida', 'codex-vital-icon')}
            <div><span>VIDA</span><strong>${health} / ${maxHealth}</strong></div>
            <i class="codex-vital-bar health"><b style="width:${pct(healthRatio)}"></b></i>
          </div>
          <div class="codex-vital">
            ${icon('energia', 'codex-vital-icon')}
            <div><span>ENERGIA</span><strong>${energy} / ${maxEnergy}</strong></div>
            <i class="codex-vital-bar energy"><b style="width:${pct(energy / Math.max(1, maxEnergy))}"></b></i>
          </div>
          <p class="codex-note">${player?.invulnerable > 0 ? 'INVULNERÁVEL POR ' + player.invulnerable.toFixed(1) + 's' : 'Vida regenera 5s depois do último dano.'}</p>
        </article>
        <ul class="codex-stats">
          ${statRow('DANO BÁSICO', stats.basicDamage.toFixed(1), `${stats.hits} golpe(s) por gesto`)}
          ${statRow('CRÍTICO', `${Math.round(stats.critChance * 100)}%`, `×${stats.critMult.toFixed(2)} de dano`)}
          ${statRow('RECARGA', `${stats.cooldown.toFixed(2)}s`)}
          ${statRow('ALCANCE', `${stats.range.toFixed(1)} tiles`)}
        </ul>
      </div>
      <div class="codex-column">
        <ul class="codex-stats">
          ${statRow('DANO DE HABILIDADE', `+${Math.round(stats.abilityDamagePct * 100)}%`)}
          ${statRow('XP RECEBIDO', `+${Math.round(stats.xpBonusPct * 100)}%`)}
          ${statRow('VELOCIDADE', `${speed}%`)}
          ${statRow(stats.formId ? 'FORMA ATIVA' : 'FORMA VELOZ', stats.formId
            ? `${NUCLEO_FORMS[stats.formId]?.short ?? 'FORMA'} · ${Math.round(100 * (stats.cooldown))}% de recarga`
            : `${formSpeed}%`, stats.formId
            ? `${stats.range.toFixed(1)} tiles · preparo ${stats.windup.toFixed(2)}s`
            : `+${stats.formDuration.toFixed(1)}s de duração`)}
          ${formRow(progress, player, stats)}
        </ul>
        <p class="codex-note">Morrer devolve você ao ponto seguro do mapa com parte da vida. Nenhum XP, item ou missão é perdido.</p>
      </div>
    </div>
  </section>`;
}

function renderPanel() {
  const { progress, map, player } = context;
  if (!progress) return '';
  if (currentTab === 'missoes') return renderMissions(progress, map);
  if (currentTab === 'progressao') return renderProgress(progress);
  if (currentTab === 'inventario') return renderInventory(progress);
  return renderAttributes(progress, player);
}

function render() {
  if (!overlay) return;
  const { progress } = context;
  const archetype = progress?.archetype ? ARCHETYPES[progress.archetype] : null;
  if (overlay) overlay.dataset.tab = currentTab;
  overlay.querySelector('.codex-tabs').outerHTML = renderTabs();
  const panel = overlay.querySelector('#codexPanel');
  panel.innerHTML = renderPanel();
  const chip = overlay.querySelector('#codexArchetype');
  if (chip) chip.textContent = archetype ? `${archetype.nome} · NÍVEL ${getArchetypeLevel(progress)}` : 'SEM MÓDULO ATIVO';
  bind(overlay, panel);
}

function bind(root, panel) {
  root.querySelectorAll('.codex-tab').forEach(button => {
    button.addEventListener('click', () => setTab(button.dataset.tab));
  });
  root.querySelectorAll('.codex-companion-actions button').forEach(button => {
    button.addEventListener('click', () => {
      if (activateCompanion(context.progress, button.dataset.companion)) saveGame();
      render();
    });
  });
  panel.querySelectorAll('.codex-tool[data-tool]').forEach(button => {
    button.addEventListener('click', () => {
      if (selectTool(context.progress, button.dataset.tool)) saveGame();
      render();
    });
  });
  panel.querySelectorAll('.codex-slot[data-item]').forEach(button => {
    button.addEventListener('click', () => {
      currentSelection = button.dataset.item;
      render();
    });
  });
  const close = root.querySelector('#codexClose');
  if (close && !close.dataset.bound) {
    close.dataset.bound = '1';
    close.addEventListener('click', closeCodex);
  }
}

// ---------------------------------------------------------------------
// API
// ---------------------------------------------------------------------
export function isCodexOpen() { return opened; }

export function setTab(id) {
  if (!TABS.some(tab => tab.id === id) || id === currentTab) return false;
  currentTab = id;
  render();
  const body = overlay?.querySelector('#codexPanel');
  if (body) body.scrollTop = 0;
  overlay?.querySelector(`#codexTab-${id}`)?.focus({ preventScroll: true });
  return true;
}

export function closeCodex() {
  opened = false;
  overlay?.classList.remove('visible');
  overlay?.setAttribute('aria-hidden', 'true');
}

export function openCodex(progress, map, player) {
  context = { progress, map, player };
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'codex';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'codexTitle');
    overlay.innerHTML = `<section class="codex-panel">
      <header class="codex-header">
        <div class="codex-title-block">
          ${icon('emblema', 'codex-emblem')}
          <div><h2 id="codexTitle">CÓDEX DE ROTAS</h2><span id="codexArchetype">SEM MÓDULO ATIVO</span></div>
        </div>
        <button type="button" id="codexClose" class="codex-close" aria-label="Fechar Códex">${icon('fechar', 'codex-close-icon')}<kbd>J</kbd></button>
      </header>
      ${renderTabs()}
      <div class="codex-body" id="codexPanel" role="tabpanel" tabindex="-1"></div>
      <footer class="codex-footer">
        <span>J / ESC fechar · 1–4 trocar aba · ← → navegar</span>
        <span id="codexHint">Clique numa ferramenta para trocar a Ultimate do F.</span>
      </footer>
    </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeCodex(); });
  }
  opened = true;
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  render();
  overlay.querySelector('#codexClose')?.focus({ preventScroll: true });
}

// Consome apenas as teclas que o Códex usa; devolve true quando tratou.
export function handleCodexInput(pressed) {
  if (!opened || !pressed?.size) return false;
  const has = (...keys) => keys.some(key => pressed.has(key));
  if (has('escape', 'j', 'keyj')) { closeCodex(); return true; }
  const index = TABS.findIndex((_, i) => has(String(i + 1)));
  if (index >= 0) { setTab(TABS[index].id); return true; }
  if (has('arrowright', 'd')) { setTab(TABS[(TABS.findIndex(tab => tab.id === currentTab) + 1) % TABS.length].id); return true; }
  if (has('arrowleft', 'a')) { setTab(TABS[(TABS.findIndex(tab => tab.id === currentTab) + TABS.length - 1) % TABS.length].id); return true; }
  return false;
}

export const CODEX_TABS = TABS;

// Exposto para teste: a linha da forma do Núcleo (barra, tempo restante e
// quantas marretadas ainda cabem) não pode voltar a depender de sorte.
export const __codexInternals = Object.freeze({ formRow, renderAttributes });
