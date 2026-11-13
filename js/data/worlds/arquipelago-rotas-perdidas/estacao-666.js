// Estação de escuta: último ambiente jogável antes da futura dimensão FPS.
// Coordenadas de objetos são células; map-manager aplica o centro (+.5).
const width = 15, height = 11;
const layout = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
  x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 1 : 0));
const machine = (id, x, y, sprite, widthPx, label, cor = '#73dcd3') => ({
  id, nome: label, tipo: 'painel', x, y, sprite, useCrop: true, larguraPx: widthPx,
  pivotX: .5, pivotY: .94, sombra: [19, 8], bloqueia: false,
  brilho: { cor, raio: .65, forca: .15 },
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
    { id: 'saida_estacao_666_visual', tipo: 'decoracao', x: .5, y: 8, sprite: 'bio_sala_porta_eclusa', useCrop: true, larguraPx: 100, pivotX: .5, pivotY: 1, ajusteY: 9, camada: 'fundo', bloqueia: false },
    { id: 'anel_limiar_666', nome: 'LIMIAR DA CIDADELA', tipo: 'limiar_frequencia', x: 7, y: 2,
      sprite: 'freq666_portal', useCrop: true, larguraPx: 172, pivotX: .5, pivotY: .95, sombra: [59, 13], bloqueia: false, interacao: { label: 'EXAMINAR LIMIAR', distancia: 1.7 } },
    { ...machine('console_limiar_666', 7, 5, 'freq666_console', 71, 'CONSULTAR CONSOLE CENTRAL'),
      moduleSystem: { id: 'frequencia_666_console', label: 'ESTABILIZAR LIMIAR', distance: 1.6, speaker: 'NEXO-04' } },
    machine('ancora_666_origem', 3, 3, 'freq666_origem', 57, 'EXAMINAR ÂNCORA DE ORIGEM', '#ffbe70'),
    machine('ancora_666_retorno', 11, 3, 'freq666_retorno', 53, 'EXAMINAR ÂNCORA DE RETORNO'),
    machine('ancora_666_memoria', 11, 7, 'freq666_memoria', 52, 'EXAMINAR ÂNCORA DE MEMÓRIA', '#b6a6ff'),
    { id: 'arquivo_estacao_666', tipo: 'painel', x: 3, y: 6, sprite: 'freq666_mesa', useCrop: true,
      larguraPx: 70, pivotX: .5, pivotY: .94, sombra: [22,8], bloqueia: false,
      interacao: { label: 'LER CADERNO DE MANUTENÇÃO', distancia: 1.35, speaker: 'CADERNO // ESTAÇÃO 66.6', dialogue: [
        'NÃO APAGUEM O CHAMADO. OS NÚMEROS NÃO SÃO UM ALARME: SÃO UM ENDEREÇO.',
        'A PRIMEIRA RESPOSTA CHEGOU TRÊS SEGUNDOS ANTES DA PERGUNTA. ANOTEI DUAS VEZES PARA TER CERTEZA.',
        'SE A JANELA VOLTAR, NÃO DESLIGUEM A ÂNCORA DE RETORNO. ALGUÉM PRECISA CONSEGUIR VOLTAR PARA CASA.',
      ] } },
    { id: 'rack_estacao_666_a', tipo: 'decoracao', x: 1, y: 3, sprite: 'freq666_rack', useCrop: true, larguraPx: 53, pivotX: .5, pivotY: .94, sombra: [18,7], bloqueia: false },
    { id: 'rack_estacao_666_b', tipo: 'decoracao', x: 10, y: 1, sprite: 'freq666_rack', useCrop: true, larguraPx: 53, pivotX: .5, pivotY: .94, sombra: [18,7], bloqueia: false },
    { id: 'rack_estacao_666_c', tipo: 'painel', x: 12, y: 2, sprite: 'freq666_escuta', useCrop: true, larguraPx: 72, pivotX: .5, pivotY: .94, sombra: [18,7], bloqueia: false,
      interacao: { label: 'CONSULTAR BANCO DE ESCUTA', distancia: 1.25, speaker: 'BANCO DE ESCUTA', dialogue: [
        'TRÊS PULSOS ENTRARAM NO ARQUIVO ANTES DE A ANTENA SER LIGADA.',
        'NEXO-04: NÃO É PROVA DE VIAGEM NO TEMPO. MAS É MOTIVO SUFICIENTE PARA NÃO APAGAR O REGISTRO.',
      ] } },
    { id: 'cartografia_estacao_666', tipo: 'painel', x: 5, y: 3, sprite: 'freq666_cartografia', useCrop: true, larguraPx: 67, pivotX: .5, pivotY: .94, sombra: [22,8], bloqueia: false,
      interacao: { label: 'EXAMINAR CARTA DE ROTAS', distancia: 1.2, speaker: 'CARTA DE ROTAS', dialogue: [
        'A ENSEADA ESTÁ MARCADA COMO PONTO DE ESCUTA, NÃO COMO ORIGEM DO CHAMADO.',
        'UMA LINHA VAI DA ANTENA À ESTAÇÃO; OUTRA TERMINA EM UM CÍRCULO SEM DESTINO DEFINIDO.',
        'NEXO-04: UM MAPA NÃO É UMA GARANTIA. A ÂNCORA DE RETORNO É O QUE NOS AJUDA A TRAÇAR O CAMINHO DE VOLTA.',
      ] } },
    { id: 'reator_estacao_666', tipo: 'painel', x: 13, y: 6, sprite: 'freq666_reator', useCrop: true, larguraPx: 57, pivotX: .5, pivotY: .94, sombra: [20,8], bloqueia: false,
      interacao: { label: 'VERIFICAR FONTE AUXILIAR', distancia: 1.25, speaker: 'FONTE AUXILIAR', dialogue: [
        'BATERIA DE RESERVA: ESTÁVEL. A ÁGUA DAS SERPENTINAS MANTÉM O SISTEMA DE ESCUTA FRIO.',
        'NEXO-04: ESTE REATOR É NOSSO. O QUE APARECEU NA VISÃO ESTÁ DO OUTRO LADO.',
      ] } },
    { id: 'registro_estacao_666', tipo: 'painel', x: 5, y: 8, sprite: 'freq666_receptor', useCrop: true, larguraPx: 43, pivotX: .5, pivotY: .94, sombra: [15,6], bloqueia: false,
      interacao: { label: 'OUVIR TRANSMISSÃO LOCAL', distancia: 1.25, speaker: 'RECEPTOR LOCAL', dialogue: [
        'REGISTRO DA EQUIPE DE ESCUTA: SE ALGUÉM AINDA ESTIVER AÍ, ESTA LINHA É PARA VOCÊ.',
        'UM CLIQUE SEGUE A MENSAGEM. NO MEIO DA ESTÁTICA, AS TRÊS NOTAS SOAM COMO UMA RESPOSTA.',
      ] } },
  ].map(o => {
    if (o.id === 'saida_estacao_666_visual') return o;
    // Apenas a pegada física no chão é sólida; a arte alta continua acima
    // do jogador. As interações são feitas de fora, dentro do seu alcance.
    const [width, height] = o.id === 'anel_limiar_666' ? [1.5, 1.0]
      : o.id === 'console_limiar_666' ? [.9, .65]
      : o.id === 'arquivo_estacao_666' || o.id === 'cartografia_estacao_666' ? [.8, .55]
      : [.55, .55];
    return {...o, bloqueia:true, hitbox:{offsetX:-width/2,offsetY:-height/2,width,height}};
  }),
  collectibles: [],
  portals: [{ id: 'voltar_enseada_666', tipo: 'door', x: 1, y: 8, label: 'VOLTAR À ENSEADA DOS ECOS', interactionDistance: 1.2,
    destino: { mapId: 'ilha_enseada_ecos', spawnId: 'vindo_da_estacao_666' }, transition: 'fade' }],
};
