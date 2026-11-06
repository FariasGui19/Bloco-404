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
    ilha_praia_inicial: {
    nome: 'Praia Inicial',
    dimensao: 'arquipelago',
    load: () => import('./worlds/arquipelago-rotas-perdidas/praia-inicial.js'),
  },
}; 