// =====================================================================
// FERRAMENTAS ESCOLHIDAS
//
// O jogador escolhe UMA ferramenta por arquétipo (FERRAMENTA no Bio-Forja e
// no Domínio, CORRENTE na Maré, FORMA no Núcleo). A escolha fica no save
// (`progress.tools[arquétipo]`) e é o que define a Ultimate do nível 1.
//
// Sem escolha, o operador usa a Ultimate de arquétipo (a base) — assim um
// save antigo continua jogável e nada é concedido de graça.
// =====================================================================
import { getTools, getTool, ARCHETYPE_TOOLS } from '../data/archetype-tools.js';

// Escolha válida para o arquétipo ativo. Ids desconhecidos (save antigo,
// arquétipo trocado) simplesmente não valem nada.
export function getSelectedToolId(progress, archetype = progress?.archetype) {
  const toolId = progress?.tools?.[archetype];
  return getTool(archetype, toolId) ? toolId : null;
}

export function getSelectedTool(progress, archetype = progress?.archetype) {
  return getTool(archetype, getSelectedToolId(progress, archetype));
}

// Lista pronta para a HUD/Códex.
export function listTools(progress, archetype = progress?.archetype) {
  const selected = getSelectedToolId(progress, archetype);
  return getTools(archetype).map(tool => ({
    ...tool,
    selected: tool.id === selected,
    ultimate: tool.ultimate,
  }));
}

// Escolhe (ou limpa, com null) a ferramenta do arquétipo ativo.
// Devolve a ferramenta escolhida ou null quando o id não pertence ao módulo.
export function selectTool(progress, toolId, archetype = progress?.archetype) {
  if (!progress || !ARCHETYPE_TOOLS[archetype]) return null;
  if (toolId === null || toolId === undefined) {
    if (progress.tools) delete progress.tools[archetype];
    return null;
  }
  const tool = getTool(archetype, toolId);
  if (!tool) return null;
  progress.tools ??= {};
  progress.tools[archetype] = tool.id;
  return tool;
}

// Limpa escolhas inválidas (save antigo, arquétipo inexistente).
export function ensureTools(progress) {
  if (!progress) return progress;
  if (!progress.tools || typeof progress.tools !== 'object') {
    progress.tools = {};
    return progress;
  }
  for (const archetype of Object.keys(ARCHETYPE_TOOLS)) {
    if (progress.tools[archetype] === undefined) continue;
    if (!getTool(archetype, progress.tools[archetype])) delete progress.tools[archetype];
  }
  return progress;
}
