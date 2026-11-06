// =====================================================================
// STATE
//
// Estado vivo da partida.
// Dados fixos ficam em js/data/worlds.
// Dados persistentes ficam em game/save.js.
// =====================================================================

export const state = {
  // -------------------------------------------------------------------
  // Mundo/mapa atual
  // -------------------------------------------------------------------
  world: {
    currentMapId: 'hub_saguao',
    currentDimension: 'hub_404',
    currentMap: null,
    isLoading: false,

    // Último spawn usado ao carregar/transitar de mapa.
    currentSpawnId: 'inicio',
  },

  // Compatibilidade temporária com código antigo.
  floorIndex: 0,

  // -------------------------------------------------------------------
  // Runtime do mapa ativo
  // Essas listas são recriadas ao trocar de mapa.
  // -------------------------------------------------------------------
  actors: [],
  objects: [],
  portals: [],
  collectibles: [],

  onElevator: false, 

  // -------------------------------------------------------------------
  // Interação atual
  // -------------------------------------------------------------------
  interaction: {
    active: null,
    talkingTo: null,
  },

  // -------------------------------------------------------------------
  // SAVE / PERFIL ATIVO
  // -------------------------------------------------------------------
  save: {
    activeSlot: null,
    profileName: null,
    loaded: false,
  },

  // -------------------------------------------------------------------
  // PROGRESSO PERSISTENTE
  // -------------------------------------------------------------------
  progress: {
    onboardingStarted: false,
    onboardingCompleted: false,
    talkedToNexo: false,
    onboardingQuestionIndex: 0,

    onboardingScores: {
      nucleo_dez_forma: 0,
      lamina_dominio_anciao: 0,
      motor_bio_forja: 0,
      mare_astral: 0,
    },

    // Arquétipo futuro:
    // nucleo_dez_forma
    // lamina_dominio_anciao
    // motor_bio_forja
    // mare_astral
    archetype: null,

    abilities: [],
    inventory: [],

    activeQuest: null,
    completedQuests: [],

    unlockedMaps: [
      'hub_saguao',
      'hub_aeroporto',
      'hub_elevadores',
      'hub_setor_anime',
    ],

    unlockedPortals: [],
    flags: {},
  },

  // -------------------------------------------------------------------
  // Jogador
  // -------------------------------------------------------------------
  player: {
    x: 0,
    y: 0,

    dir: 1,
    facing: 'down',

    target: null,
    moving: false,
    // Energia e runtime de habilidades.
    energy: 100,
    maxEnergy: 100,
     // NOVO: Controla qual traje o player está usando visualmente
    equippedSuit: null, // 'bio_forja', etc.

    ability: {
      active: null,
      cooldowns: {},

      // Preenchido enquanto Bio-Dash está ativo.
      dash: null,

      // Pequena mensagem visual para HUD.
      lastMessage: null,
      messageTimer: 0,
    },
  },
};