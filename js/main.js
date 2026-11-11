// js/main.js
// =====================================================================
// MAIN
//
// Diretor do jogo.
// =====================================================================

import { updateBasicCombat, tryBasicAttack } from './game/combat.js';
import { updateHealth } from './game/health.js';
import { updateHazards } from './game/hazards.js';
import { updateNucleoForm } from './game/nucleo-form.js';
import { canStandAt } from './game/collision.js';
import { dispararPropulsao } from './game/nado.js';
import { desenharMedidorAr, desenharDegrauNado } from './ui/nado-hud.js';
import { atualizarProvas, garantirMissaoDeNado, lerArvore, provaDe, degrauDe, nomeDoDegrau } from './game/nado-arvore.js';
import { pushCombatText } from './game/combat-feedback.js';
import { atualizarMissaoMare, criarFragmentosDeMare } from './game/mare-missao.js';
import { atualizarFauna, socorrerProximo } from './game/fauna-ferida.js';
import { ganharRespeito, cabecaSubmersa, noFundoDoMar } from './game/nado.js';
import { criarClima, atualizarClima, criarParticulas } from './game/clima.js';
import { getVidaAquatica } from './game/vida-aquatica.js';
import { alternarMorfador, manterInfinitos, autorizado } from './game/morfador.js';
import { alternarPainel, morfadorAberto, promoverAutoria } from './ui/morfador-panel.js';
import { getCoastFieldForMap } from './engine/coast-field.js';
import { CONFIG } from './config.js';
import { isCodexOpen, openCodex, closeCodex, handleCodexInput } from './ui/codex.js';
import { updateOwnedCompanion } from './game/companions.js';
import { updateCoastalFauna } from './game/fauna-costeira.js';
import { state } from './game/state.js';

import { getFloor } from './game/world.js';
import { loadMap, getSafeSpawn } from './game/map-manager.js';

import { updatePlayer } from './game/player.js';
import { updateAbilities, showAbilityMessage } from './game/abilities.js';
import { beginUltimate, updateUltimate } from './game/ultimate.js';
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
import { isDebugEnabled } from './game/debug.js';
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
  { id: 'bio_lateral_andar_0315', src: 'assets/sprites/player/bio-andar-lateral-0315.png' },
  { id: 'bio_costas_andar_0315', src: 'assets/sprites/player/bio-andar-costas-0315.png' },
  { id: 'bio_frente_andar_0314', src: 'assets/sprites/player/bio-frente-andar-0314.png' },
  { id: 'player_bio_forja', src: 'assets/sprites/player/player-bio-forja-lvl1.png' },
  { id: 'player_bio_forja_scan', src: 'assets/sprites/player/player-bio-forja-scan.png' },
  { id: 'player_dominio_reference', src: 'assets/sprites/player/player-dominio-reference.png' },
  { id: 'player_mare_reference', src: 'assets/sprites/player/player-mare-reference.png' },
  { id: 'player_10x_reference', src: 'assets/sprites/player/player-10x-reference.png' },
  { id: 'dominio_andar_lateral_0317', src: 'assets/sprites/player/dominio-andar-lateral-0317.png' },
  { id: 'dominio_andar_costas_0317', src: 'assets/sprites/player/dominio-andar-costas-0317.png' },
  { id: 'dominio_ataque_frente_0317', src: 'assets/sprites/player/dominio-ataque-frente-0317.png' },
  { id: 'dominio_ataque_costas_0317', src: 'assets/sprites/player/dominio-ataque-costas-0317.png' },
  { id: 'mare_andar_frente_0318', src: 'assets/sprites/player/mare-andar-frente-0318.png' },
  { id: 'mare_andar_costas_0318', src: 'assets/sprites/player/mare-andar-costas-0318.png' },
  { id: 'mare_andar_lateral_0318', src: 'assets/sprites/player/mare-andar-lateral-0318.png' },
  { id: 'mare_ataque_frente_0318', src: 'assets/sprites/player/mare-ataque-frente-0318.png' },
  { id: 'mare_ataque_costas_0318', src: 'assets/sprites/player/mare-ataque-costas-0318.png' },
  { id: 'mare_ataque_lateral_0318', src: 'assets/sprites/player/mare-ataque-lateral-0318.png' },
  { id: 'dominio_andar_frente_0316', src: 'assets/sprites/player/dominio-andar-frente-0316.png' },
  { id: 'dominio_ataque_lateral_0316', src: 'assets/sprites/player/dominio-ataque-lateral-0316.png' },
  { id: 'player_dominio_lvl1', src: 'assets/sprites/player/player-dominio-lvl1.png' },
  { id: 'player_dominio_q', src: 'assets/sprites/player/player-dominio-q.png' },
  { id: 'player_dominio_r', src: 'assets/sprites/player/player-dominio-r.png' },
  { id: 'player_mare_lvl1', src: 'assets/sprites/player/player-mare-lvl1.png' },
  // Transformação do T (tools/preparar-transformacao.py): o traje se veste e
  // se desmonta em 4 quadros. O Núcleo usa o bracelete como identidade.
  { id: 'player_t_bio', src: 'assets/sprites/player/player-t-bio.png' },
  { id: 'player_t_mare', src: 'assets/sprites/player/player-t-mare.png' },
  { id: 'player_t_dominio', src: 'assets/sprites/player/player-t-dominio.png' },
  { id: 'player_t_nucleo', src: 'assets/sprites/player/player-t-nucleo.png' },
  // Execução da Ultimate do MARÉ ASTRAL (F): uma folha por corrente, mais o
  // Q de costas (tools/preparar-mare-ultimate.py).
  { id: 'player_mare_ult_cupula', src: 'assets/sprites/player/player-mare-ult-cupula.png' },
  { id: 'player_mare_ult_vortice', src: 'assets/sprites/player/player-mare-ult-vortice.png' },
  { id: 'player_mare_ult_chicote', src: 'assets/sprites/player/player-mare-ult-chicote.png' },
  { id: 'player_mare_ult_sonar', src: 'assets/sprites/player/player-mare-ult-sonar.png' },
  { id: 'player_mare_ult_estuario', src: 'assets/sprites/player/player-mare-ult-estuario.png' },
  { id: 'player_mare_propulsor_costas', src: 'assets/sprites/player/player-mare-propulsor-costas.png' },
  // Execução da Ultimate do DOMÍNIO ANCIÃO (F): uma folha por arma/postura,
  // mais a coroa da base do módulo (tools/preparar-dominio-ultimate.py).
  { id: 'player_dominio_ult_coroa', src: 'assets/sprites/player/player-dominio-ult-coroa.png' },
  { id: 'player_dominio_ult_lamina', src: 'assets/sprites/player/player-dominio-ult-lamina.png' },
  { id: 'player_dominio_ult_muralha', src: 'assets/sprites/player/player-dominio-ult-muralha.png' },
  { id: 'player_dominio_ult_tita', src: 'assets/sprites/player/player-dominio-ult-tita.png' },
  { id: 'player_dominio_ult_trono', src: 'assets/sprites/player/player-dominio-ult-trono.png' },
  { id: 'player_mare_q', src: 'assets/sprites/player/player-mare-q.png' },
  { id: 'player_mare_r', src: 'assets/sprites/player/player-mare-r.png' },
  { id: 'player_10x_lvl1', src: 'assets/sprites/player/player-10x-lvl1.png' },
  { id: 'veloz_ataque_direcional', src: 'assets/source-art/proximas-animacoes/veloz-ataque-alternativa.png' },
  { id: 'veloz_corrida_lateral', src: 'assets/source-art/proximas-animacoes/veloz-lateral.png' },
  // Caminhada vertical da Forma Veloz (4 quadros por direção, alpha real).
  { id: 'veloz_andar_frente', src: 'assets/sprites/player/player-10x-veloz-andar-frente.png' },
  { id: 'veloz_andar_costas', src: 'assets/sprites/player/player-10x-veloz-andar-costas.png' },
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
  { id: 'bio_piso_novo', src: 'assets/source-art/estacao-bio/piso-pixel-09.png' },
  { id: 'bio_jardim_novo', src: 'assets/source-art/estacao-bio/jardim-pixel-09.png' },
  { id: 'bio_piso', src: 'assets/sprites/estacao-bio/piso-industrial-folha.png' },
  { id: 'bio_floreira', src: 'assets/sprites/estacao-bio/detalhe-floreira.png' },
  { id: 'bio_tubos', src: 'assets/sprites/estacao-bio/detalhe-tubos.png' },
  { id: 'bio_caixa', src: 'assets/sprites/estacao-bio/detalhe-caixa-bobina.png' },
  { id: 'bio_luminaria', src: 'assets/sprites/estacao-bio/detalhe-luminaria.png' },
  { id: 'bio_ponte', src: 'assets/sprites/estacao-bio/ponte-industrial.png' },
  { id: 'bio_estufa', src: 'assets/sprites/estacao-bio/estufa.png' },
  { id: 'bio_terminal', src: 'assets/sprites/estacao-bio/terminal.png' },
  { id: 'bio_reator', src: 'assets/sprites/estacao-bio/biorreator.png' },
  { id: 'bio_cabeceira', src: 'assets/sprites/estacao-bio/bio-cabeceira.png' },
  { id: 'bio_distribuidor', src: 'assets/sprites/estacao-bio/bio-distribuidor.png' },
  { id: 'bio_margem_baixa', src: 'assets/sprites/estacao-bio/bio-margem-baixa.png' },
  { id: 'bio_fundacao', src: 'assets/sprites/estacao-bio/bio-fundacao.png' },
  { id: 'pet_bolt', src: 'assets/sprites/companions/bolt.png' },
  { id: 'hub_nexo_lateral', src: 'assets/sprites/saguao/nexo-lateral-limpo.png' },
  { id: 'hub_viajante', src: 'assets/sprites/saguao/viajante-2026.png' },
  { id: 'hub_vaso_novo', src: 'assets/sprites/saguao/vaso.png' },
  { id: 'hub_reciclagem', src: 'assets/sprites/saguao/reciclagem.png' },
  { id: 'hub_carrinho', src: 'assets/sprites/saguao/carrinho.png' },
  { id: 'hub_bebedouro', src: 'assets/sprites/saguao/bebedouro.png' },
  { id: 'player_bio_ataque_frontal', src: 'assets/sprites/player/player-bio-ataque-frontal.png' },
  // Ataque nas outras direções e o avanço do Q (tools/preparar-bio-acoes.py):
  // o exo tinha arte só de frente e deslizava andando durante o propulsor.
  { id: 'player_bio_ataque_costas', src: 'assets/sprites/player/player-bio-ataque-costas.png' },
  { id: 'player_bio_ataque_lateral', src: 'assets/sprites/player/player-bio-ataque-lateral.png' },
  { id: 'player_bio_propulsor', src: 'assets/sprites/player/player-bio-propulsor.png' },
  // Execução da Ultimate do MOTOR BIO-FORJA (F): uma folha por ferramenta
  // (tools/preparar-bio-ultimate.py). A nível 1 a ferramenta instala a
  // própria Ultimate; a base do módulo é a cúpula.
  { id: 'player_bio_ult_forja_dome', src: 'assets/sprites/player/player-bio-ult-forja-dome.png' },
  { id: 'player_bio_ult_serra', src: 'assets/sprites/player/player-bio-ult-serra.png' },
  { id: 'player_bio_ult_martelo', src: 'assets/sprites/player/player-bio-ult-martelo.png' },
  { id: 'player_bio_ult_cabos', src: 'assets/sprites/player/player-bio-ult-cabos.png' },
  { id: 'player_bio_ult_propulsores', src: 'assets/sprites/player/player-bio-ult-propulsores.png' },
  { id: 'player_10x_q', src: 'assets/sprites/player/player-10x-q.png' },
  { id: 'player_10x_r', src: 'assets/sprites/player/player-10x-r.png' },
  // Segunda forma do Núcleo 10X — QUEBRA SISTEMAS (tools/preparar-quebra-sistemas.py).
  { id: 'player_10x_bruta_parado', src: 'assets/sprites/player/player-10x-bruta-parado.png' },
  { id: 'player_10x_bruta_andar_frente', src: 'assets/sprites/player/player-10x-bruta-andar-frente.png' },
  { id: 'player_10x_bruta_andar_costas', src: 'assets/sprites/player/player-10x-bruta-andar-costas.png' },
  { id: 'player_10x_bruta_andar_lateral', src: 'assets/sprites/player/player-10x-bruta-andar-lateral.png' },
  { id: 'player_10x_bruta_ataque_lateral', src: 'assets/sprites/player/player-10x-bruta-ataque-lateral.png' },
  { id: 'player_10x_bruta_ataque_frente', src: 'assets/sprites/player/player-10x-bruta-ataque-frente.png' },
  { id: 'player_10x_bruta_ataque_costas', src: 'assets/sprites/player/player-10x-bruta-ataque-costas.png' },
  { id: 'player_10x_bruta_transformacao', src: 'assets/sprites/player/player-10x-bruta-transformacao.png' },
  // Execução da Ultimate das duas formas (F): antes só existia o efeito.
  { id: 'player_10x_bruta_ultimate', src: 'assets/sprites/player/player-10x-bruta-ultimate.png' },
  { id: 'player_10x_veloz_ultimate', src: 'assets/sprites/player/player-10x-veloz-ultimate.png' },
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
  { id: 'fauna_nova_1010', src: 'assets/sprites/fauna/fauna-nova-1010.png' },
  { id: 'fauna_caranguejo', src: 'assets/sprites/fauna/caranguejo.png' },
  { id: 'costa_rochosa', src: 'assets/sprites/objects/costa-rochosa.png' },
  { id: 'praia_plataforma_kit', src: 'assets/sprites/praia/plataforma-kit-0311.png' },
  { id: 'vegetacao_tropical', src: 'assets/sprites/objects/vegetacao-tropical.png' },
  { id: 'beach_props', src: 'assets/sprites/objects/beach-props.png' },
  // ---- PRAIA 11: flora e rochedos extras (tools/preparar-flora-praia.py) ----
  { id: 'vegetacao_tropical_2', src: 'assets/sprites/objects/vegetacao-tropical-2.png' },
  { id: 'costa_rochosa_2', src: 'assets/sprites/objects/costa-rochosa-2.png' },
  // ---- PRAIA 11: relevo — falésias, pilares, cascatas, arco e ilhota
  // (tools/preparar-relevo-praia.py). `*_agua` é a máscara da queda-d'água.
  { id: 'relevo_falesia_alta', src: 'assets/sprites/praia/relevo/falesia-alta.png' },
  { id: 'relevo_falesia_selva', src: 'assets/sprites/praia/relevo/falesia-selva.png' },
  { id: 'relevo_falesia_muro', src: 'assets/sprites/praia/relevo/falesia-muro.png' },
  { id: 'relevo_pilar_samambaias', src: 'assets/sprites/praia/relevo/pilar-samambaias.png' },
  { id: 'relevo_pilar_palmeiras_a', src: 'assets/sprites/praia/relevo/pilar-palmeiras-a.png' },
  { id: 'relevo_pilar_palmeiras_b', src: 'assets/sprites/praia/relevo/pilar-palmeiras-b.png' },
  { id: 'relevo_pilar_cascata', src: 'assets/sprites/praia/relevo/pilar-cascata.png' },
  { id: 'relevo_pilar_cascata_agua', src: 'assets/sprites/praia/relevo/pilar-cascata-agua.png' },
  { id: 'relevo_macico_cascata', src: 'assets/sprites/praia/relevo/macico-cascata.png' },
  { id: 'relevo_macico_cascata_agua', src: 'assets/sprites/praia/relevo/macico-cascata-agua.png' },
  { id: 'relevo_arco_pedra', src: 'assets/sprites/praia/relevo/arco-pedra.png' },
  { id: 'relevo_ilhota_palmeiras', src: 'assets/sprites/praia/relevo/ilhota-palmeiras.png' },
  { id: 'relevo_rochas_mar', src: 'assets/sprites/praia/relevo/rochas-mar.png' },
  { id: 'relevo_rochedo_pe', src: 'assets/sprites/praia/relevo/rochedo-pe.png' },
  // ---- NADO: o corpo na horizontal, dois quadros por traje
  // (tools/preparar-nado.py). O jogo gira e ondula o corpo; não há folha
  // por direção.
  { id: 'nado_civil', src: 'assets/sprites/player/nado-civil.png' },
  { id: 'nado_mare', src: 'assets/sprites/player/nado-mare.png' },
  { id: 'nado_mare_impulso', src: 'assets/sprites/player/nado-mare-impulso.png' },
  { id: 'nado_mare_submerso', src: 'assets/sprites/player/nado-mare-submerso.png' },
  { id: 'fundo_mar_mare', src: 'assets/sprites/tiles/fundo-mar-mare.png' },
  { id: 'nado_bio', src: 'assets/sprites/player/nado-bio.png' },
  { id: 'nado_dominio', src: 'assets/sprites/player/nado-dominio.png' },
  { id: 'nado_nucleo', src: 'assets/sprites/player/nado-nucleo.png' },
]);

// Importações parciais deixam colisões sem arte; avise em vez de falhar silenciosamente.
const bioMissing = ['bio_piso_novo', 'bio_jardim_novo', 'bio_terminal', 'bio_reator', 'bio_estufa', 'bio_piso', 'bio_cabeceira', 'bio_distribuidor', 'bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria', 'bio_plataforma', 'bio_margem_canto', 'bio_margem_cano', 'bio_margem_ruina', 'bio_margem_mureta', 'bio_condutor_quebrado', 'bio_condutor_ativo', 'bio_regulador_quebrado', 'bio_regulador_ativo', 'bio_mato_cano', 'bio_mato_ventilacao', 'bio_mato_barris', 'bio_mato_fissura', 'bio_terminal', 'bio_reator', 'bio_estufa', 'bio_piso', 'bio_cabeceira', 'bio_distribuidor', 'bio_margem_baixa', 'bio_fundacao', 'bio_floreira', 'bio_tubos', 'bio_caixa', 'bio_luminaria', 'bio_plataforma', 'bio_margem_canto', 'bio_margem_cano', 'bio_margem_ruina', 'bio_margem_mureta', 'bio_condutor_quebrado', 'bio_condutor_ativo', 'bio_regulador_quebrado', 'bio_regulador_ativo', 'bio_mato_cano', 'bio_mato_ventilacao', 'bio_mato_barris', 'bio_mato_fissura'].filter(id => !getSprite(id));
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

  if (isCodexOpen()) {
    handleCodexInput(input.pressed);
    player.moving = false; player.target = null;
    input.click = null; input.attackClick = null;
    updateCamera(dt, player.x, player.y); return;
  }
  if (!isElevatorMenuOpen() && (input.pressed.has('j') || input.pressed.has('keyj'))) {
    openCodex(state.progress, getFloor(), player);
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
    // Caído: o loop segue só para contar o tempo de retorno. Sem andar,
    // atacar ou interagir até renascer.
    if ((player.health ?? 1) <= 0) {
      player.moving = false; player.target = null;
      updateHealth(player, state.progress, dt, { onRespawn: () => getSafeSpawn() });
      return;
    }

    // MORFADOR DE RESSONÂNCIA — modo criador. Só para save de autoria:
    // sem a flag, a tecla não faz absolutamente nada (nem loga).
    if (input.pressed.has('m') || input.pressed.has('keym')) {
      if (autorizado(state.progress)) {
        alternarPainel(state.progress, player);
        player.moving = false; player.target = null;
        return;
      }
    }
    // O painel aberto prende o mouse como um menu, mas o jogo segue vivo:
    // é assim que se testa habilidade com o painel à vista.
    if (player.morfador?.ativo) manterInfinitos(state.progress, player);

    // Durante a carga da Ultimate o corpo está tomado: sem ataque básico.
    const carregandoUltimate = (player.ultimate?.charge ?? 0) > 0;
    if (!carregandoUltimate) updateBasicCombat(player, state.trainingTargets, dt);
    let abilityLocksMovement = updateAbilities(dt);

    // F = Ultimate do módulo. Peso alto: energia cheia, recarga longa e
    // bloqueio enquanto outra ação trava o movimento.
    // Com debug/calibração ligados, o F pertence às ferramentas de cenário.
    const fLivre = !isDebugEnabled() && !isBackgroundCalibrationEnabled();
    if (fLivre && (input.pressed.has('f') || input.pressed.has('keyf')) && !abilityLocksMovement && !state.world.isLoading) {
      beginUltimate({
        player,
        progress: state.progress,
        targets: state.trainingTargets,
        showMessage: showAbilityMessage,
      });
    }
    // A carga da Ultimate trava o corpo até a soltura.
    updateUltimate(player, state.progress, dt, {
      targets: state.trainingTargets,
      showMessage: showAbilityMessage,
    });
    abilityLocksMovement ||= player.ultimate?.charge > 0;
    updateNucleoForm(state.progress, player, dt, canStandAt(getFloor(), player.x, player.y, CONFIG.PLAYER_RADIUS, player));
    abilityLocksMovement ||= player.ability?.effect?.id === 'transformacao_10x';
    if (input.attackClick) {
      const point = input.attackClick; input.attackClick = null;
      if (!abilityLocksMovement && !state.world.isLoading) {
        tryBasicAttack({ player, progress: state.progress, map: getFloor(), targets: state.trainingTargets, point });
      }
    }

    if (!abilityLocksMovement) {
      // Propulsão do Maré: SHIFT na água. Antes do movimento para o
      // multiplicador de velocidade já valer neste quadro.
      const nado = player.nado;
      if (nado?.ativo && (input.pressed.has('shift') || input.pressed.has('shiftleft'))) {
        const mareAlinhado = state.progress?.archetype === 'mare_astral';
        dispararPropulsao(nado, mareAlinhado);
      }
      updatePlayer(dt);
    }

    // Vida e dano ambiental só correm durante a exploração, nunca em menus
    // nem durante uma habilidade que trava o movimento.
    if (!abilityLocksMovement) updateHazards(state.hazards, player, state.progress, dt);
    updateHealth(player, state.progress, dt, { onRespawn: () => getSafeSpawn() });

  }

  updateNpcBrains(dt);
  updateCoastalFauna(getFloor(), state.fauna, player, dt);

  // Missão do Maré: eventos de mergulho e coleta saem do estado real do
  // nado, nunca de um contador de tempo.
  const mapaAtual = getFloor();
  // Dica de mergulho (fragmento / bicho embaixo do operador): uma por vez,
  // com intervalo, e nunca por cima de um aviso que ainda está na tela.
  player.dicaNado = Math.max(0, (player.dicaNado ?? 0) - dt);
  const darDicaDeNado = texto => {
    if (player.dicaNado > 0 || player.ability?.messageTimer > 0 || player.nadoAviso > 0) return;
    player.ability ??= {};
    player.ability.lastMessage = texto;
    player.ability.messageTimer = 2.6;
    player.dicaNado = 6;
  };
  if (mapaAtual?.aguaPraia && player.nado) {
    player.fragmentosMare ??= criarFragmentosDeMare(mapaAtual, getCoastFieldForMap(mapaAtual));
    const res = atualizarMissaoMare({
      map: mapaAtual, player, nado: player.nado, progress: state.progress,
      fragmentos: player.fragmentosMare,
    });
    if (res.coletou) {
      player.ability ??= {};
      player.ability.lastMessage = 'FRAGMENTO DE MARÉ RECOLHIDO';
      player.ability.messageTimer = 2.2;
    } else if (player.nado.ativo && !noFundoDoMar(player.nado)) {
      // Boiando em cima de um fragmento: com a árvore de nado o corpo só
      // desce com ESPAÇO, e o fundo do azul-escuro pede o degrau TRAVESSIA.
      const emCima = res.fragmentos.some(f => Math.hypot(player.x - f.x, player.y - f.y) < 1.1);
      if (emCima) {
        darDicaDeNado(lerArvore(state.progress).nivel >= 3
          ? 'FRAGMENTO NO FUNDO • ESPAÇO OU Z PARA MERGULHAR'
          : 'FRAGMENTO NO FUNDO • FALTA O DEGRAU TRAVESSIA');
      }
    }
  }
  // ÁRVORE DE NADO: as provas saem do estado real do nado (poça, cabeça
  // na água, travessia, fundo). Aqui também nasce a missão e sai o aviso
  // de cada degrau conquistado.
  if (mapaAtual?.aguaPraia && player.nado && !state.world.isLoading) {
    const avisar = (texto, tempo = 3) => {
      player.ability ??= {};
      player.ability.lastMessage = texto;
      player.ability.messageTimer = tempo;
    };
    if (garantirMissaoDeNado(state.progress)) avisar('NOVA MISSÃO • APRENDER A NADAR', 3.4);
    // A poça de treino fica na Praia Inicial: nas outras praias o aviso diz onde.
    const ondeTreinar = mapaAtual.pocas?.some(p => p.treino) ? 'NA POÇA DA CASCATA' : 'NA POÇA DA CASCATA (PRAIA INICIAL)';
    const prova = atualizarProvas({
      map: mapaAtual, player, nado: player.nado, progress: state.progress,
      dt, parado: !!player.nadoParado,
    });
    const eventos = player.nadoEventos ?? {};
    player.nadoAviso = Math.max(0, (player.nadoAviso ?? 0) - dt);
    if (prova.subiu) {
      const arvore = lerArvore(state.progress);
      const nome = nomeDoDegrau(arvore, state.progress?.archetype);
      avisar(`DEGRAU ${prova.subiu.degrau.nivel} • ${nome} — ${prova.subiu.degrau.resumo.toUpperCase()}`, 4.6);
      pushCombatText(player.x, player.y, `DEGRAU ${prova.subiu.degrau.nivel}`, { color: '#7dffe6', kind: 'heal', duration: 1.6 });
      // O HUD da árvore fica aceso por um tempo: é a comemoração.
      player.nadoDestaque = 5;
      player.nadoAviso = 4.6;
      for (const m of prova.subiu.missoes ?? []) avisar(`MISSÃO CONCLUÍDA • ${m.title}`, 4.6);
      saveGame();
    } else if (player.nadoAviso <= 0) {
      const arvore = lerArvore(state.progress);
      const proxima = provaDe(arvore);
      if (eventos.susto) {
        avisar(`O MAR ASSUSTA • TREINE ${ondeTreinar}`, 3.2);
        player.nadoAviso = 2.4; player.nadoDestaque = 4;
      } else if (eventos.engoliu) {
        avisar('ENGOLIU ÁGUA • SOLTE ESPAÇO ANTES DO AR ACABAR', 3);
        player.nadoAviso = 2.4;
      } else if (eventos.limite) {
        avisar(arvore.nivel === 0
          ? `O MAR ASSUSTA • TREINE ${ondeTreinar}`
          : `FUNDO DEMAIS PARA O DEGRAU ${degrauDe(arvore).nome}${proxima ? ` • PROVA: ${proxima.curta}` : ''}`, 3);
        player.nadoAviso = 3.2; player.nadoDestaque = 4;
      }
    }
    eventos.susto = eventos.engoliu = eventos.limite = false;
    player.nadoDestaque = Math.max(0, (player.nadoDestaque ?? 0) - dt);
  }
  // Fauna ferida: presença alivia, o módulo certo socorre.
  const ancoraFauna = getFloor();
  if (ancoraFauna?.aguaPraia) {
    // Socorro na água pede a CABEÇA na água (o gesto de mergulhar), não o
    // fundo do mar: bicho no raso se socorre no raso.
    const submerso = cabecaSubmersa(player.nado);
    const fauna = atualizarFauna(ancoraFauna, {
      player, progress: state.progress,
      arquetipo: state.progress?.archetype,
      submerso, nado: player.nado, dt,
      recifes: getVidaAquatica(ancoraFauna)?.recifes,
    });
    // "E — SOCORRER" só aparece quando há socorro real para fazer.
    state.interaction.faunaPronta = fauna.pronto
      ? { nome: fauna.pronto.bicho.def.nome, parcial: fauna.pronto.parcial }
      : null;
    // O módulo serve e o bicho está ao alcance, mas falta o gesto: avisa.
    if (fauna.dica) {
      const nome = fauna.dica.bicho.def.nome;
      if (fauna.dica.meio !== 'agua') darDicaDeNado(`SAIA DA ÁGUA PARA SOCORRER • ${nome}`);
      else if (player.nado?.ativo) darDicaDeNado(`${player.nado.mareAstral && player.nado.nivel >= 3 ? 'ESPAÇO OU Z PARA MERGULHAR' : 'SEGURE ESPAÇO PARA MERGULHAR'} • ${nome}`);
      else if (lerArvore(state.progress).nivel === 0) darDicaDeNado(`${nome} ESTÁ NA ÁGUA • APRENDA A BOIAR NA POÇA PRIMEIRO`);
      else darDicaDeNado(`${nome} ESTÁ NA ÁGUA • ENTRE E MERGULHE (ESPAÇO)`);
    }

    const pressedE2 = input.pressed.has('e') || input.pressed.has('keye');
    // O prompt de socorro tem prioridade sobre o objeto/NPC atrás dele:
    // sem isto, um E perto de bicho E de placa abriria as duas coisas.
    if (pressedE2 && fauna.pronto) state.interaction.socorroConsumiuE = true;
    if (pressedE2 && fauna.pronto) {
      const res = socorrerProximo(ancoraFauna, {
        player, progress: state.progress,
        arquetipo: state.progress?.archetype,
        submerso, nado: player.nado,
        recifes: getVidaAquatica(ancoraFauna)?.recifes,
      });
      if (res?.ok) {
        player.ability ??= {};
        player.ability.lastMessage = `${res.nome} — SALVO`;
        player.ability.messageTimer = 3;
        // (era `player.nado`: o respeito do socorro nunca chegava a contar)
        if (player.nado) ganharRespeito(player.nado.respeito, res.respeito);
        state.interaction.faunaPronta = null;
      } else if (res?.motivo) {
        player.ability ??= {};
        player.ability.lastMessage = res.motivo.toUpperCase();
        player.ability.messageTimer = 2;
      }
    }
  }

  // Interações (portais, NPCs, objetos) correm DEPOIS da fauna: assim o
  // socorro tem a primeira chance no E, e um E perto de bicho não abre
  // a placa atrás dele ao mesmo tempo.
  {
    const pressedE =
      input.pressed.has('e') ||
      input.pressed.has('keye');
    await checkInteractions(pressedE && !state.interaction.socorroConsumiuE);
    state.interaction.socorroConsumiuE = false;
  }

  updateOwnedCompanion(getFloor(), dt, canStandAt);
  updateCamera(dt, player.x, player.y);
}

// =====================================================================
// AUTORIA — comando do criador
//
// O Morfador não abre sozinho. O criador digita, UMA vez, no console:
//     __morfador("morfador_de_ressonancia")
// e este save passa a ser de autoria. A chave é o nome da própria flag: não
// é senha, é um gesto explícito, e por isso nunca aparece em save novo.
// =====================================================================
if (typeof window !== 'undefined') {
  window.__morfador = (chave) => promoverAutoria(state.progress, chave);
}

// =====================================================================
// CLIMA
//
// Um único estado de clima para a sessão, criado no boot e atualizado no
// loop. O buffer de partículas existe uma vez (120 posições fixas) e é
// reaproveitado — nunca alocado por frame.
// =====================================================================
state.clima = criarClima(4);
state.particulasClima = criarParticulas(7);

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

  atualizarClima(state.clima, dt);
  await update(dt);

  const map = getFloor();

  render(map, state);
  updateHud(map, state);
  // Fôlego só aparece quando importa (nadando); em terra não ocupa tela.
  if (state.player?.nado?.ativo) desenharMedidorAr(state.player.nado);
  // Degrau do nado + prova em curso: perto d'água, ou comemorando.
  if (map?.aguaPraia) desenharDegrauNado(state, map);

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