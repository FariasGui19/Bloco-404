// =====================================================================
// CATÁLOGO DE ITENS
//
// O save guarda apenas IDs. Este catálogo dá nome, tipo e descrição para o
// Códex; itens desconhecidos aparecem com um rótulo neutro, nunca quebram.
// `icon` aponta para assets/sprites/ui/codex/icone-<icon>.png
// =====================================================================

export const ITEMS = Object.freeze({
  registro_de_calibracao: Object.freeze({
    name: 'REGISTRO DE CALIBRAÇÃO',
    kind: 'dado',
    icon: 'xp',
    description: 'Assinatura de combate gravada pelo NEXO-04. Prova que o módulo já responde a estímulos reais.',
  }),
  fragmento_sincronizacao: Object.freeze({
    name: 'FRAGMENTO DE SINCRONIZAÇÃO',
    kind: 'fragmento',
    icon: 'progressao',
    description: 'Fragmento estável de Eco usado para alinhar os terminais do metrô dimensional.',
  }),
  enseada_rastro_mar: Object.freeze({
    name: 'RASTRO DA MARÉ',
    kind: 'vestígio',
    icon: 'missoes',
    description: 'Marca deixada por alguém que percorreu a Enseada antes de você. A água ainda a acompanha.',
  }),
  enseada_rastro_pedra: Object.freeze({
    name: 'MARCA NO BASALTO',
    kind: 'vestígio',
    icon: 'progressao',
    description: 'Símbolo gravado na pedra apontando para além da Enseada. A origem é desconhecida.',
  }),
  enseada_rastro_mata: Object.freeze({
    name: 'VESTÍGIO DA MATA',
    kind: 'vestígio',
    icon: 'inventario',
    description: 'Folhas e pegadas que indicam uma trilha para o interior da ilha.',
  }),
  bio_estacao_condutor: Object.freeze({
    name: 'LEITURA DO CONDUTOR',
    kind: 'registro',
    icon: 'energia',
    description: 'Diagnóstico de um condutor que falhou na Estação Bio.',
  }),
  bio_estacao_regulador: Object.freeze({
    name: 'LEITURA DO REGULADOR',
    kind: 'registro',
    icon: 'energia',
    description: 'Ajuste de pressão registrado no pátio da Estação Bio.',
  }),
  bio_estacao_estufa: Object.freeze({
    name: 'ASSINATURA DA ESTUFA',
    kind: 'registro',
    icon: 'progressao',
    description: 'Pulso estabilizado da estufa. O setor inicial está concluído.',
  }),
});

export function getItem(id) {
  if (typeof id !== 'string' || !id) return null;
  if (Object.hasOwn(ITEMS, id)) return ITEMS[id];
  return {
    name: id.replaceAll('_', ' ').toUpperCase(),
    kind: 'não catalogado',
    icon: 'inventario',
    description: 'Item sem registro no catálogo. Será documentado em uma próxima visita ao Códex.',
  };
}

export function listInventory(progress) {
  return [...new Set((Array.isArray(progress?.inventory) ? progress.inventory : []).filter(id => typeof id === 'string' && id))];
}
