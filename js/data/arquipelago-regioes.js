// Regiões jogáveis e futuras. As conexões planejadas não criam portais.
// Esta tabela não cria portais, não desbloqueia mapas e não altera saves.
export const ARQUIPELAGO_REGIONS = Object.freeze([
  Object.freeze({ id: 'praia_inicial', nome: 'Praia Inicial', biome: 'costa', status: 'jogavel', mapId: 'ilha_praia_inicial', neighbours: Object.freeze(['enseada_dos_ecos', 'estacao_que_respira']) }),
  Object.freeze({ id: 'estacao_que_respira', nome: 'Estação que Respira', biome: 'bioindustrial', status: 'jogavel', mapId: 'ilha_estacao_bio', neighbours: Object.freeze(['praia_inicial', 'sala_controle_bio']) }),
  Object.freeze({ id: 'sala_controle_bio', nome: 'Sala de Controle Bio', biome: 'interior', status: 'jogavel', mapId: 'bio_sala_controle', neighbours: Object.freeze(['estacao_que_respira']) }),
  Object.freeze({ id: 'enseada_dos_ecos', nome: 'Enseada dos Ecos', biome: 'praia', status: 'jogavel', mapId: 'ilha_enseada_ecos', neighbours: Object.freeze(['praia_inicial', 'manguezal_sussurrante', 'rota_das_mares']) }),
  Object.freeze({ id: 'rota_das_mares', nome: 'Rota das Marés', biome: 'mar aberto', status: 'jogavel', mapId: 'mar_rota_mare_astral', requiresFlag: 'rota_livre_enseada_aberta', neighbours: Object.freeze(['enseada_dos_ecos', 'darsena_abissal']) }),
  Object.freeze({ id: 'darsena_abissal', nome: 'Dársena Abissal', biome: 'base de Maré', status: 'jogavel', mapId: 'sala_mare', requiresFlag: 'rota_livre_enseada_aberta', neighbours: Object.freeze(['rota_das_mares']) }),
  Object.freeze({ id: 'manguezal_sussurrante', nome: 'Manguezal Sussurrante', biome: 'mangue', status: 'planejado', mapId: null, neighbours: Object.freeze(['enseada_dos_ecos', 'floresta_das_raizes']) }),
  Object.freeze({ id: 'floresta_das_raizes', nome: 'Floresta das Raízes', biome: 'floresta', status: 'planejado', mapId: null, neighbours: Object.freeze(['manguezal_sussurrante', 'falhas_do_farol']) }),
  Object.freeze({ id: 'falhas_do_farol', nome: 'Falhas do Farol', biome: 'falésia', status: 'planejado', mapId: null, neighbours: Object.freeze(['floresta_das_raizes']) }),
]);
