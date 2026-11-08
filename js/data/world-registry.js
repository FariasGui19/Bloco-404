// js/data/world-registry.js
export const WORLD_REGISTRY = {
  hub_saguao: {
    nome: 'Saguão Central',
    dimensao: 'hub_404',
    load: () => import('./worlds/hub-404/saguao.js'),
  },
  hub_aeroporto: {
    nome: 'Aeroporto Central',
    dimensao: 'hub_404',
    load: () => import('./worlds/hub-404/aeroporto.js'),
  },
  hub_aeroporto_carga: {
    nome: 'Área de Carga Desativada',
    dimensao: 'hub_404',
    load: () => import('./worlds/hub-404/aeroporto-carga.js'),
  },
  hub_camara_dominio: { load: () => import('./worlds/hub-404/camara-dominio.js') },
  hub_camara_mare: { load: () => import('./worlds/hub-404/camara-mare.js') },
  hub_camara_nucleo: { load: () => import('./worlds/hub-404/camara-nucleo.js') },
  hub_setor_anime: {
    nome: 'Setor Anime',
    dimensao: 'hub_404',
    load: () => import('./worlds/hub-404/setor-anime.js'),
  },
  hub_elevadores: {
    load: () => import('./worlds/hub-404/elevadores.js'),
  },
  hub_metro: {
    nome: 'Metrô Interdimensional',
    dimensao: 'hub_404',
    load: () => import('./worlds/hub-404/metro.js'),
  },
  
  // ==========================================
  // ARQUIPÉLAGO DAS ROTAS PERDIDAS (Futuro)
  // ==========================================
    ilha_estacao_bio: { nome: 'Estação que Respira', dimensao: 'arquipelago', load: () => import('./worlds/arquipelago-rotas-perdidas/estacao-bio.js') },
    ilha_enseada_ecos: { nome: 'Enseada dos Ecos', dimensao: 'arquipelago', load: () => import('./worlds/arquipelago-rotas-perdidas/enseada-ecos.js') },
    ilha_praia_inicial: {
    nome: 'Praia Inicial',
    dimensao: 'arquipelago',
    load: () => import('./worlds/arquipelago-rotas-perdidas/praia-inicial.js'),
  },
}; 