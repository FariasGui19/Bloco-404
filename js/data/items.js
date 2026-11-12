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
  boia_de_cortica: Object.freeze({
    name: 'BOIA DE CORTIÇA',
    kind: 'lembrança',
    icon: 'missoes',
    description: 'A boia que marcava o limite de quem ainda não sabia nadar. Agora é só lembrança: o mar inteiro é seu.',
  }),
  semente_de_mare: Object.freeze({
    name: 'SEMENTE DE MARÉ',
    kind: 'fragmento',
    icon: 'energia',
    description: 'Núcleo de sal e luz recolhido no fundo da Enseada. Pulsa no ritmo da maré.',
  }),
  concha_ressonante: Object.freeze({
    name: 'CONCHA RESSONANTE',
    kind: 'lembrança',
    icon: 'missoes',
    description: 'Presente do mar para quem soltou o que estava preso. Encostada no ouvido, devolve o som dos bichos salvos.',
  }),
  bio_estacao_estufa: Object.freeze({
    name: 'ASSINATURA DA ESTUFA',
    kind: 'registro',
    icon: 'progressao',
    description: 'Pulso estabilizado da estufa. O setor inicial está concluído.',
  }),
  fragmento_eco_bio: Object.freeze({
    name: 'FRAGMENTO DE ECO — BIO-FORJA',
    kind: 'fragmento',
    icon: 'energia',
    description: 'Núcleo vivo recolhido no relicário da Oficina Bio-Forja. Vibra em sintonia com o Banco de Reconstrução.',
  }),
  selo_forja_bio: Object.freeze({
    name: 'SELO DE IMPULSO BIO-FORJA',
    kind: 'registro',
    icon: 'progressao',
    description: 'Certificação gravada pela Oficina Bio-Forja após romper a Grade de Ímpeto Vivo com diagnóstico e propulsão.',
  }),
  fragmento_eco_dominio: Object.freeze({
    name: 'FRAGMENTO DE ECO — DOMÍNIO',
    kind: 'fragmento',
    icon: 'energia',
    description: 'Relíquia ancestral recolhida além do Lacre de Frequência. Guarda o timbre exato da Coroa Antiga.',
  }),
  insignia_anel_dominio: Object.freeze({
    name: 'INSÍGNIA DO ANEL ANCIÃO',
    kind: 'registro',
    icon: 'progressao',
    description: 'Marca consagrada no Altar da Lâmina Ancestral por quem leu a frequência do Lacre e o partiu num só golpe.',
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
