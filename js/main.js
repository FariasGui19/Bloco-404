// js/main.js
// =====================================================================
// MAIN
//
// Diretor do jogo.
// =====================================================================

import { state } from './game/state.js';

import { getFloor } from './game/world.js';
import { loadMap } from './game/map-manager.js';

import { updatePlayer } from './game/player.js';
import { updateAbilities } from './game/abilities.js';
import { toggleBioSuit } from './game/ability-context.js';
import { updateCamera } from './engine/camera.js';

import { input, initInput, endInputFrame } from './engine/input.js';
import { initRenderer, render } from './engine/renderer.js';
import { loadSprites } from './engine/sprites.js';

import { initHud, updateHud } from './ui/hud.js';
import { initTitleScreen } from './ui/menu.js';
import { initTransition } from './ui/transition.js';

import { checkInteractions } from './game/interactions.js';

import { updateDebugInput } from './game/debug.js';
import {
  updateBackgroundCalibration,
  isBackgroundCalibrationEnabled,
} from './game/background-calibration.js';
import { updateNpcBrains } from './game/npc-brain.js';

import {
  isElevatorMenuOpen,
  updateElevatorMenu,
} from './ui/elevator-menu.js';

import { updateObjectTools } from './game/object-tools.js';
import { updateDoors } from './game/doors.js';

import {
  initSaveMenu,
  openSaveMenu,
} from './ui/save-menu.js';
import {
  initDialogue,
  isDialogueOpen,
} from './ui/dialogue.js';

import {
  saveGame,
  saveOnPageExit,
} from './game/save.js';
import {
  initArchetypeCards,
  isArchetypeCardsOpen,
} from './ui/archetype-cards.js';


const canvas = document.getElementById('game');

let gameStarted = false;
let last = 0;

// =====================================================================
// PREPARAÇÃO
// =====================================================================

initRenderer(canvas);
initHud();
initTransition();
initSaveMenu();
initArchetypeCards();
initDialogue();

await loadSprites([
  {
    id: 'player',
    src: 'assets/sprites/player/player-sheet.png',
  },
  { id: 'player_bio_forja', src: 'assets/sprites/player/player-bio-forja-lvl1.png' },
   { id: 'player_bio_forja_walk', src: 'assets/sprites/player/player-bio-forja-walk.png' },
  { id: 'player_bio_forja_scan', src: 'assets/sprites/player/player-bio-forja-scan.png' },
  {
    id: 'elevator_door',
    src: 'assets/sprites/objects/elevator-door.png',
  },
  {
    id: 'robo_limpeza',
    src: 'assets/sprites/npcs/robo-limpeza.png',
  },
  {
    id: 'hub_props',
    src: 'assets/sprites/objects/hub-lobby-props.png',
  },
  {
    id: 'nexo_04',
    src: 'assets/sprites/npcs/nexo-04-sheet.png',
  },
  {
    id: 'hub_floor',
    src: 'assets/sprites/tiles/hub-floor.png',
  },
  {
    id: 'hub_walls',
    src: 'assets/sprites/tiles/hub-walls.png',
  },
  {
    id: 'metro_props',
    src: 'assets/sprites/objects/metro-interdimensional-props.png',
  },
  {
    id: 'dimensional_train',
    src: 'assets/sprites/objects/dimensional-train.png',
  },
  {
    id: 'metro_structure',
    src: 'assets/sprites/objects/metro-structure-props.png',
  },
  {
    id: 'metro_platform_tiles',
    src: 'assets/sprites/tiles/metro-platform-tiles.png',
  },
  {
    id: 'metro_background',
    src: 'assets/sprites/backgrounds/metro-station-base.png',
  },
  {
    id: 'metro_rail_kit',
    src: 'assets/sprites/tiles/metro-rail-kit.png',
  },
  {
    id: 'dimensional_rail_strip',
    src: 'assets/sprites/objects/dimensional-rail-strip.png',
  },
  {
    id: 'train_boarding_terminal',
    src: 'assets/sprites/objects/train-boarding-terminal.png',
  },
  { id: 'beach_floor', src: 'assets/sprites/tiles/beach-floor.png' },
  { id: 'beach_props', src: 'assets/sprites/objects/beach-props.png' },
]);

// =====================================================================
// UPDATE
// =====================================================================

async function update(dt) {
  updateDebugInput();
  // Atualiza a ferramenta de calibração antes de qualquer outro input.
  updateBackgroundCalibration();

  const player = state.player;

  // ===============================================================
  // MODO DE CALIBRAÇÃO
  //
  // Quando J está ativo:
  // - não move player;
  // - não usa dash;
  // - não ativa portas;
  // - não mexe em objetos;
  // - WASD/Setas servem somente para mover o background.
  // ===============================================================
  if (isBackgroundCalibrationEnabled()) {
    player.moving = false;
    player.target = null;
    input.click = null;

    updateCamera(dt, player.x, player.y);
    return;
  }

  // Ferramentas de edição de objetos só funcionam fora da calibração.
  updateDoors(dt);
  updateObjectTools();

  if (isDialogueOpen()) {
    player.moving = false;
    player.target = null;
    input.click = null;
    updateNpcBrains(dt);
    updateCamera(dt, player.x, player.y);
    return;
  }

  // NOVO: Se o jogador estava escaneando, mas o diálogo fechou, destrava ele.
  if (state.player.ability?.scanning > 0) {
    state.player.ability.scanning = 0;
  }

  if (isArchetypeCardsOpen()) {
    player.moving = false;
    player.target = null;
    input.click = null;

    updateNpcBrains(dt);
    updateCamera(dt, player.x, player.y);
    return;
  }

  if (isElevatorMenuOpen()) {
    updateElevatorMenu();

    player.moving = false;
    player.target = null;

    input.click = null;
    state.onElevator = false;
  } else {
    // T não atua em diálogos, menus, calibração ou durante um dash.
    if (input.pressed.has('t') || input.pressed.has('keyt')) {
      toggleBioSuit(state.progress, player);
    }
    const abilityLocksMovement = updateAbilities(dt);

    if (!abilityLocksMovement) {
      updatePlayer(dt);
    }

    const pressedE =
      input.pressed.has('e') ||
      input.pressed.has('keye');

    await checkInteractions(pressedE);
  }

  updateNpcBrains(dt);
  updateCamera(dt, player.x, player.y);
}

// =====================================================================
// LOOP
// =====================================================================

async function frame(now) {
  requestAnimationFrame(frame);

  const dt = Math.max(
    0,
    Math.min(0.033, (now - last) / 1000)
  );

  last = now;

  await update(dt);

  const map = getFloor();

  render(map, state);
  updateHud(map, state);

  endInputFrame();
}

// =====================================================================
// INÍCIO REAL DO JOGO
// =====================================================================

async function startGameFromSave({ mapId, spawnId }) {
  if (gameStarted) return;

  gameStarted = true;

  initInput(canvas);

  // Carrega o mapa do save/perfil selecionado.
  await loadMap(
    mapId ?? 'hub_saguao',
    spawnId ?? 'inicio'
  );

  last = performance.now();
  requestAnimationFrame(frame);
}

// =====================================================================
// MENU INICIAL
// =====================================================================

initTitleScreen(() => {
  openSaveMenu(startGameFromSave);
});

// =====================================================================
// AUTOSAVE
// =====================================================================

window.addEventListener('beforeunload', () => {
  saveOnPageExit();
});

// Salva a cada 30 segundos.
setInterval(() => {
  saveGame();
}, 30000); 