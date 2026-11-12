// Estação de escuta: último ambiente jogável antes da futura dimensão FPS.
// Coordenadas de objetos são células; map-manager aplica o centro (+.5).
const width = 15, height = 11;
const layout = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
  x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0));
const machine = (id, x, y, sprite, widthPx, label) => ({
  id, nome: label, tipo: 'painel', x, y, sprite, useCrop: true, larguraPx: widthPx,
  pivotX: .5, pivotY: .94, sombra: [19, 8], bloqueia: false,
  brilho: { cor: '#73dcd3', raio: .65, forca: .15 },
  interacao: { label, distancia: 1.45 },
});
export const map = {
  id: 'estacao_limiar_666',
  meta: { nome: 'ESTAÇÃO 66.6 — LIMIAR', tipo: 'interior', dimensao: 'arquipelago',
    estiloSala: 'frequencia_limiar', cargoKey: 'bio', corFundo: '#091116', corTema: '#63dfd2',
    useBackgroundWalls: true, ambiente: { poeira: 10, cor: '#a8dbd4' } },
  corChao: '#17232a', layout,
  spawnPoints: { inicio: { x: 3.5, y: 8.5 }, vindo_da_enseada: { x: 3.5, y: 8.5 } },
  actors: [],
  objects: [
    { id: 'saida_estacao_666_visual', tipo: 'decoracao', x: 2, y: 9, sprite: 'nucleo_sala_porta_doca', useCrop: true, larguraPx: 60, pivotX: .5, pivotY: .95, bloqueia: false },
    { id: 'anel_limiar_666', nome: 'LIMIAR DA CIDADELA', tipo: 'limiar_frequencia', x: 7, y: 2,
      bloqueia: false, interacao: { label: 'EXAMINAR LIMIAR', distancia: 1.7 } },
    { ...machine('console_limiar_666', 7, 5, 'nucleo_sala_terminal_registro', 46, 'CONSULTAR CONSOLE CENTRAL'),
      moduleSystem: { id: 'frequencia_666_console', label: 'ESTABILIZAR LIMIAR', distance: 1.6, speaker: 'NEXO-04' } },
    machine('ancora_666_origem', 3, 3, 'bio_sala_pilar_sensor', 39, 'EXAMINAR ÂNCORA DE ORIGEM'),
    machine('ancora_666_retorno', 11, 3, 'mare_sala_terminal_sonar', 43, 'EXAMINAR ÂNCORA DE RETORNO'),
    machine('ancora_666_memoria', 11, 7, 'nucleo_sala_regulador_inercia', 42, 'EXAMINAR ÂNCORA DE MEMÓRIA'),
    { id: 'arquivo_estacao_666', tipo: 'painel', x: 3, y: 6, sprite: 'dom_sala_estela_registro', useCrop: true,
      larguraPx: 36, pivotX: .5, pivotY: .94, bloqueia: false,
      interacao: { label: 'LER CADERNO DE MANUTENÇÃO', distancia: 1.35, speaker: 'CADERNO // ESTAÇÃO 66.6', dialogue: [
        'NÃO APAGUEM O CHAMADO. OS NÚMEROS NÃO SÃO UM ALARME: SÃO UM ENDEREÇO.',
        'A PRIMEIRA RESPOSTA CHEGOU TRÊS SEGUNDOS ANTES DA PERGUNTA. ANOTEI DUAS VEZES PARA TER CERTEZA.',
        'SE A JANELA VOLTAR, NÃO DESLIGUEM A ÂNCORA DE RETORNO. ALGUÉM PRECISA CONSEGUIR VOLTAR PARA CASA.',
      ] } },
    { id: 'caixa_estacao_666_a', tipo: 'decoracao', x: 2, y: 2, sprite: 'hub_props', frame: { col: 0, row: 3 }, scale: .23, anchorY: .94, bloqueia: false },
    { id: 'caixa_estacao_666_b', tipo: 'decoracao', x: 12, y: 8, sprite: 'hub_props', frame: { col: 2, row: 1 }, scale: .21, anchorY: .94, bloqueia: false },
  ],
  collectibles: [],
  portals: [{ id: 'voltar_enseada_666', tipo: 'door', x: 2, y: 9, label: 'VOLTAR À ENSEADA DOS ECOS', interactionDistance: 1.2,
    destino: { mapId: 'ilha_enseada_ecos', spawnId: 'vindo_da_estacao_666' }, transition: 'fade' }],
};
