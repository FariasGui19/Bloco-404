// js/main.js
// =====================================================================
// MAIN
//
// Diretor do jogo.
// =====================================================================

import { updateBasicCombat, tryBasicAttack } from './game/combat.js';
import { updateNucleoForm } from './game/nucleo-form.js';
import { canStandAt } from './game/collision.js';
import { CONFIG } from './config.js';
import { isQuestJournalOpen, openQuestJournal, closeQuestJournal } from './ui/quest-journal.js';
import { updateOwnedCompanion } from './game/companions.js';
import { updateCoastalFauna } from './game/fauna-costeira.js';
import { state } from './game/state.js';

import { getFloor } from './game/world.js';
import { loadMap } from './game/map-manager.js';

import { updatePlayer } from './game/player.js';
import { updateAbilities } from './game/abilities.js';
import { toggleArchetypeSuit } from './game/ability-context.js';
import { openNucleoWheel, isNucleoWheelOpen, updateNucleoWheel } from './ui/nucleo-wheel.js';
import { updateCamera } from './engine/camera.js';

import { input, initInput, endInputFrame } from './engine/input.js';
import { initRenderer, render } from './engine/renderer.js';
import { loadSprites, getSprite } from './engine/sprites.js';

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
  { id: 'player_dominio_reference', src: 'assets/sprites/player/player-dominio-reference.png' },
  { id: 'player_mare_reference', src: 'assets/sprites/player/player-mare-reference.png' },
  { id: 'player_10x_reference', src: 'assets/sprites/player/player-10x-reference.png' },
  { id: 'player_dominio_lvl1', src: 'assets/sprites/player/player-dominio-lvl1.png' },
  { id: 'player_dominio_q', src: 'assets/sprites/player/player-dominio-q.png' },
  { id: 'player_dominio_r', src: 'assets/sprites/player/player-dominio-r.png' },
  { id: 'player_mare_lvl1', src: 'assets/sprites/player/player-mare-lvl1.png' },
  { id: 'player_mare_q', src: 'assets/sprites/player/player-mare-q.png' },
  { id: 'player_mare_r', src: 'assets/sprites/player/player-mare-r.png' },
  { id: 'player_10x_lvl1', src: 'assets/sprites/player/player-10x-lvl1.png' },
  { id: 'veloz_ataque_direcional', src: 'assets/source-art/proximas-animacoes/veloz-ataque-alternativa.png' },
  { id: 'veloz_corrida_lateral', src: 'assets/source-art/proximas-animacoes/veloz-lateral.png' },
  { id: 'bio_condutor_quebrado', src: 'assets/sprites/estacao-bio/reparo-condutor-quebrado.png' },
  { id: 'bio_condutor_ativo', src: 'assets/sprites/estacao-bio/reparo-condutor-ativo.png' },
  { id: 'bio_regulador_quebrado', src: 'assets/sprites/estacao-bio/reparo-regulador-quebrado.png' },
  { id: 'bio_regulador_ativo', src: 'assets/sprites/estacao-bio/reparo-regulador-ativo.png' },
  { id: 'bio_mato_cano', src: 'assets/sprites/estacao-bio/bio-mato-cano.png' },
  { id: 'bio_mato_ventilacao', src: 'assets/sprites/estacao-bio/bio-mato-ventilacao.png' },
  { id: 'bio_mato_barris', src: 'assets/sprites/estacao-bio/bio-mato-barris.png' },
  { id: 'bio_mato_fissura', src: 'assets/sprites/estacao-bio/bio-mato-fissura.png' },
  { id: 'bio_plataforma', src: 'assets/sprites/estacao-bio/plataforma-tecnica.png' },
  { id: 'bio_margem_canto', src: 'assets/sprites/estacao-bio/margem-canto.png' },
  { id: 'bio_margem_cano', src: 'assets/sprites/estacao-bio/margem-cano.png' },
  { id: 'bio_margem_ruina', src: 'assets/sprites/estacao-bio/margem-ruina.png' },
  { id: 'bio_margem_mureta', src: 'assets/sprites/estacao-bio/margem-mureta.png' },
  { id: 'bio_piso', src: 'assets/sprites/estacao-bio/piso-industrial-folha.png' },
  { id: 'bio_floreira', src: 'assets/sprites/estacao-bio/detalhe-floreira.png' },
  { id: 'bio_tubos', src: 'assets/sprites/estacao-bio/detalhe-tubos.png' },
  { id: 'bio_caixa', src: 'assets/sprites/estacao-bio/detalhe-caixa-bobina.png' },
  { id: 'bio_luminaria', src: 'assets/sprites/estacao-bio/detalhe-luminaria.png' },
  { id: 'bio_ponte', src: 'assets/sprites/estacao-bio/ponte-industrial.png' },
  { id: 'bio_estufa', src: 'assets/sprites/estacao-bio/estufa.png' },
  { id: 'bio_terminal', src: 'assets/sprites/estacao-bio/terminal.png' },
  { id: 'bio_reator', src: 'assets/sprites/estacao-bio/biorreator.png' },
  { id: 'pet_bolt', src: 'assets/sprites/companions/bolt.png' },
  { id: 'hub_nexo_lateral', src: 'assets/sprites/saguao/nexo-lateral-limpo.png' },
  { id: 'hub_viajante', src: 'assets/sprites/saguao/viajante-2026.png' },
  { id: 'hub_vaso_novo', src: 'assets/sprites/saguao/vaso.png' },
  { id: 'hub_reciclagem', src: 'assets/sprites/saguao/reciclagem.png' },
  { id: 'hub_carrinho', src: 'assets/sprites/saguao/carrinho.png' },
  { id: 'hub_bebedouro', src: 'assets/sprites/saguao/bebedouro.png' },
  { id: 'player_bio_ataque_frontal', src: 'assets/sprites/player/player-bio-ataque-frontal.png' },
  { id: 'player_10x_q', src: 'assets/sprites/player/player-10x-q.png' },
  { id: 'player_10x_r', src: 'assets/sprites/player/player-10x-r.png' },
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
  { id: 'beach_shore', src: 'assets/sprites/tiles/beach-shore.png' },
  { id: 'visao_dominio', src: 'assets/sprites/backgrounds/camara-dominio-visao.jpg' },
  { id: 'visao_mare', src: 'assets/sprites/backgrounds/camara-mare-visao.jpg' },
  { id: 'visao_nucleo', src: 'assets/sprites/backgrounds/camara-nucleo-visao.jpg' },
  { id: 'beach_novas_artes', src: 'assets/sprites/tiles/beach-novas-artes.png' },
  { id: 'fauna_costeira', src: 'assets/sprites/fauna/fauna-costeira.png' },
  { id: 'fauna_caranguejo', src: 'assets/sprites/fauna/caranguejo.png' },
  { id: 'costa_rochosa', src: 'assets/sprites/objects/costa-rochosa.png' },
  { id: 'vegetacao_tropical', src: 'assets/sprites/objects/vegetacao-tropical.png' },
  { id: 'beach_props', src: 'assets/sprites/objects/beach-props.png' },
]);

// Importações parciais deixam colisões sem arte; avise em vez de falhar silenciosamente.
const bioMissing = ['bio_terminal', 'bio_reator', 'bio_ponte', 'bio_estufa', 'bio_piso', 'bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria', 'bio_plataforma', 'bio_margem_canto', 'bio_margem_cano', 'bio_margem_ruina', 'bio_margem_mureta', 'bio_condutor_quebrado', 'bio_condutor_ativo', 'bio_regulador_quebrado', 'bio_regulador_ativo', 'bio_mato_cano', 'bio_mato_ventilacao', 'bio_mato_barris', 'bio_mato_fissura'].filter(id => !getSprite(id));
if (bioMissing.length) {
  const warning = document.createElement('div');
  warning.setAttribute('role', 'alert');
  warning.textContent = `Arquivos da Estação Bio ausentes: ${bioMissing.join(', ')}. Reimporte o projeto completo e recarregue; seus saves não precisam ser apagados.`;
  Object.assign(warning.style, { position: 'fixed', left: '1rem', right: '1rem', top: '1rem', zIndex: '9999', background: '#612c1a', color: 'white', padding: '1rem', font: 'bold 14px sans-serif' });
  document.body.appendChild(warning);
}

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
    input.click = null; input.attackClick = null;

    updateCamera(dt, player.x, player.y);
    return;
  }

  // Ferramentas de edição de objetos só funcionam fora da calibração.
  updateDoors(dt);
  updateObjectTools();

  if (isDialogueOpen()) {
    player.moving = false;
    player.target = null;
    input.click = null; input.attackClick = null;
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
    input.click = null; input.attackClick = null;

    updateNpcBrains(dt);
    updateCamera(dt, player.x, player.y);
    return;
  }

  if (isNucleoWheelOpen()) {
    updateNucleoWheel();
    player.moving = false;
    player.target = null;
    input.click = null; input.attackClick = null;
    updateCamera(dt, player.x, player.y);
    return;
  }

  if (isQuestJournalOpen()) {
    if (input.pressed.has('j') || input.pressed.has('keyj') || input.pressed.has('escape')) closeQuestJournal();
    player.moving = false; player.target = null;
    input.click = null; input.attackClick = null;
    updateCamera(dt, player.x, player.y); return;
  }
  if (!isElevatorMenuOpen() && (input.pressed.has('j') || input.pressed.has('keyj'))) {
    openQuestJournal(state.progress, getFloor());
    player.moving = false; player.target = null;
    input.click = null; input.attackClick = null;
    return;
  }

  if (isElevatorMenuOpen()) {
    updateElevatorMenu();

    player.moving = false;
    player.target = null;

    input.click = null; input.attackClick = null;
    state.onElevator = false;
  } else {
    // T não atua em diálogos, menus, calibração ou durante um dash.
    if (input.pressed.has('t') || input.pressed.has('keyt')) {
      if (state.progress.archetype === 'nucleo_dez_forma') {
        if (openNucleoWheel(state.progress, player, () => canStandAt(getFloor(), player.x, player.y, CONFIG.PLAYER_RADIUS, player))) {
          player.moving = false; player.target = null;
          return;
        }
      } else toggleArchetypeSuit(state.progress, player);
    }
    updateBasicCombat(player, state.trainingTargets, dt);
    let abilityLocksMovement = updateAbilities(dt);
    updateNucleoForm(state.progress, player, dt, canStandAt(getFloor(), player.x, player.y, CONFIG.PLAYER_RADIUS, player));
    abilityLocksMovement ||= player.ability?.effect?.id === 'transformacao_10x';
    if (input.attackClick) {
      const point = input.attackClick; input.attackClick = null;
      if (!abilityLocksMovement && !state.world.isLoading) {
        tryBasicAttack({ player, progress: state.progress, map: getFloor(), targets: state.trainingTargets, point });
      }
    }

    if (!abilityLocksMovement) {
      updatePlayer(dt);
    }

    const pressedE =
      input.pressed.has('e') ||
      input.pressed.has('keye');

    await checkInteractions(pressedE);
  }

  updateNpcBrains(dt);
  updateCoastalFauna(getFloor(), state.fauna, player, dt);
  updateOwnedCompanion(state, getFloor(), dt, canStandAt);
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