// Sistema de coleta de fragmentos de combate e síntese da Cidadela 404.
// Materiais residem em `progress.citadelMaterials`; somente relíquias
// permanentes forjadas entram no `inventory` principal do Códex.
import { healPlayer } from './health.js';
import { getQuestState, startQuest, recordQuestEvent } from './quests.js';

export const FORGE_QUEST = 'cidadela_forja_sobrevivencia';

export const CITADEL_MATERIALS = Object.freeze({
  sucata_codigo: Object.freeze({ id: 'sucata_codigo', label: 'SUCATA DE CÓDIGO', color: '#6be7ea' }),
  nucleo_estatica: Object.freeze({ id: 'nucleo_estatica', label: 'NÚCLEO DE ESTÁTICA', color: '#ff9671' }),
});

export const CITADEL_RECIPES = Object.freeze([
  Object.freeze({
    id: 'recarga_campo',
    key: '1',
    name: 'CARGA TÁTICA DE CAMPO',
    cost: Object.freeze({ sucata_codigo: 1 }),
    description: 'Recarrega o canhão (12/12) e restaura +30 EN.',
    permanent: false,
  }),
  Object.freeze({
    id: 'injetor_reparo',
    key: '2',
    name: 'INJETOR DE MALHA VIVA',
    cost: Object.freeze({ sucata_codigo: 2 }),
    description: 'Restaura +45% de Vida e ativa Escudo por 4s.',
    permanent: false,
  }),
  Object.freeze({
    id: 'amortecedor_eco',
    key: '3',
    name: 'AMORTECEDOR DE ECO',
    cost: Object.freeze({ sucata_codigo: 1, nucleo_estatica: 1 }),
    description: 'Reduz Eco em 60% e ancora o sinal por 20s.',
    permanent: false,
  }),
  Object.freeze({
    id: 'selo_codigo_queimado',
    key: '4',
    name: 'SELO DO CÓDIGO QUEIMADO',
    cost: Object.freeze({ sucata_codigo: 3, nucleo_estatica: 1 }),
    description: 'Relíquia permanente (Códex): +25% dano de tiro na Cidadela.',
    permanent: true,
    itemId: 'selo_codigo_queimado',
  }),
  Object.freeze({
    id: 'nucleo_vigilante_forjado',
    key: '5',
    name: 'NÚCLEO DO VIGILANTE FORJADO',
    cost: Object.freeze({ sucata_codigo: 2, nucleo_estatica: 3 }),
    description: 'Relíquia pós-reator: -4 custo de Q e +2 EN/s na Cidadela.',
    permanent: true,
    requiresFlag: 'cidadela_estavel',
    itemId: 'nucleo_vigilante_forjado',
  }),
]);

export function ensureCitadelMaterials(progress) {
  if (!progress.citadelMaterials || typeof progress.citadelMaterials !== 'object' || Array.isArray(progress.citadelMaterials)) {
    progress.citadelMaterials = { sucata_codigo: 0, nucleo_estatica: 0 };
  }
  progress.citadelMaterials.sucata_codigo = Math.max(0, Math.floor(progress.citadelMaterials.sucata_codigo ?? 0));
  progress.citadelMaterials.nucleo_estatica = Math.max(0, Math.floor(progress.citadelMaterials.nucleo_estatica ?? 0));
  return progress.citadelMaterials;
}

export function startForgeQuestIfAvailable(progress) {
  if (getQuestState(progress, FORGE_QUEST).status === 'available') {
    startQuest(progress, FORGE_QUEST);
    return true;
  }
  return false;
}

export function grantCitadelMaterial(progress, kind, amount = 1) {
  const mat = CITADEL_MATERIALS[kind];
  if (!mat || amount <= 0) return null;
  const bag = ensureCitadelMaterials(progress);
  bag[kind] += amount;
  const started = startForgeQuestIfAvailable(progress);
  const eventType = kind === 'sucata_codigo' ? 'cidadela_coleta_sucata' : 'cidadela_coleta_nucleo';
  const completed = recordQuestEvent(progress, { type: eventType, target: kind, amount });
  return {
    mat,
    amount,
    total: bag[kind],
    started,
    completed,
  };
}

export function hasRelic(progress, itemId) {
  return Array.isArray(progress?.inventory) && progress.inventory.includes(itemId);
}

export function canCraftRecipe(progress, recipe, g = null, p = null) {
  if (!recipe) return { ok: false, reason: 'RECEITA INVÁLIDA.' };
  if (recipe.requiresFlag && !progress?.flags?.[recipe.requiresFlag]) {
    return { ok: false, reason: 'REQUER REATOR ESTABILIZADO.' };
  }
  if (recipe.permanent && recipe.itemId && hasRelic(progress, recipe.itemId)) {
    return { ok: false, reason: 'RELÍQUIA JÁ FORJADA.' };
  }
  if (recipe.id === 'recarga_campo' && g && p && g.ammo >= 12 && (p.energy ?? 0) >= (p.maxEnergy ?? 100)) {
    return { ok: false, reason: 'MUNIÇÃO E ENERGIA JÁ NO MÁXIMO.' };
  }
  const bag = ensureCitadelMaterials(progress);
  for (const [matId, needed] of Object.entries(recipe.cost)) {
    if ((bag[matId] ?? 0) < needed) {
      return { ok: false, reason: `FALTA ${CITADEL_MATERIALS[matId]?.label ?? matId}.` };
    }
  }
  return { ok: true, reason: 'DISPONÍVEL' };
}

export function craftCitadelRecipe(progress, g, p, recipeId) {
  const recipe = CITADEL_RECIPES.find(r => r.id === recipeId || r.key === String(recipeId));
  const check = canCraftRecipe(progress, recipe, g, p);
  if (!check.ok) return { ok: false, message: `${recipe?.name ?? 'SÍNTESE'}: ${check.reason}` };

  const bag = ensureCitadelMaterials(progress);
  for (const [matId, needed] of Object.entries(recipe.cost)) {
    bag[matId] -= needed;
  }

  let effectText = '';
  if (recipe.id === 'recarga_campo') {
    g.ammo = 12;
    g.reload = 0;
    p.energy = Math.min(p.maxEnergy ?? 100, (p.energy ?? 0) + 30);
    effectText = 'CANHÃO 12/12 + 30 EN.';
  } else if (recipe.id === 'injetor_reparo') {
    const healed = healPlayer(p, progress, (p.maxHealth ?? 100) * 0.45);
    g.shield = Math.max(g.shield ?? 0, 4);
    effectText = `+${Math.round(healed)} VIDA • ESCUDO 4s.`;
  } else if (recipe.id === 'amortecedor_eco') {
    g.echo = Math.max(0, (g.echo ?? 0) - 60);
    g.echoAnchor = Math.max(g.echoAnchor ?? 0, 20);
    effectText = '-60% ECO • SINAL ANCORADO 20s.';
  } else if (recipe.permanent && recipe.itemId) {
    progress.inventory ??= [];
    if (!progress.inventory.includes(recipe.itemId)) progress.inventory.push(recipe.itemId);
    effectText = 'RELÍQUIA INTEGRADA AO CÓDEX.';
  }

  startForgeQuestIfAvailable(progress);
  const completed = recordQuestEvent(progress, { type: 'cidadela_sintese_item', target: 'craft', amount: 1 });
  const questNote = completed.length ? ` • MISSÃO CONCLUÍDA +${completed[0].rewards?.xp ?? 0} XP` : '';
  return {
    ok: true,
    recipe,
    completed,
    message: `SÍNTESE: ${recipe.name} • ${effectText}${questNote}`,
  };
}
