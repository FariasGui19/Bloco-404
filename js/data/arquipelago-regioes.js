// Regiões jogáveis e futuras. As conexões planejadas não criam portais.
// Esta tabela não cria portais, não desbloqueia mapas e não altera saves.
export const ARQUIPELAGO_REGIONS = Object.freeze([
  Object.freeze({ id: 'praia_inicial', nome: 'Praia Inicial', biome: 'costa', status: 'jogavel', mapId: 'ilha_praia_inicial', neighbours: Object.freeze(['enseada_dos_ecos']) }),
  Object.freeze({ id: 'enseada_dos_ecos', nome: 'Enseada dos Ecos', biome: 'praia', status: 'jogavel', mapId: 'ilha_enseada_ecos', neighbours: Object.freeze(['praia_inicial', 'manguezal_sussurrante']) }),
  Object.freeze({ id: 'manguezal_sussurrante', nome: 'Manguezal Sussurrante', biome: 'mangue', status: 'planejado', mapId: null, neighbours: Object.freeze(['enseada_dos_ecos', 'floresta_das_raizes']) }),
  Object.freeze({ id: 'floresta_das_raizes', nome: 'Floresta das Raízes', biome: 'floresta', status: 'planejado', mapId: null, neighbours: Object.freeze(['manguezal_sussurrante', 'falhas_do_farol']) }),
  Object.freeze({ id: 'falhas_do_farol', nome: 'Falhas do Farol', biome: 'falésia', status: 'planejado', mapId: null, neighbours: Object.freeze(['floresta_das_raizes']) }),
]);
