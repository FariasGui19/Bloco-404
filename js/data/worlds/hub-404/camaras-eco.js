// Câmaras de Eco da Área de Carga — uma por arquétipo, mesma planta baixa
// compacta (11×9). A gramática é sempre R → Q → fragmento → metrô, mas a
// trava, a arte e a fala mudam com o módulo equipado. O renderer
// `carga_eco` dá vida ao bay: esteira, guindaste, drone de conferência,
// campo da trava e berço do fragmento.
const variants = {
  dominio: {
    id: 'hub_camara_dominio', nome: 'CÂMARA DE FREQUÊNCIA', cor: '#d8ab4c',
    arquetipo: 'lamina_dominio_anciao', action: 'golpe_ruptura', obstacle: 'lacre_frequencia',
    objeto: 'LACRE DE FREQUÊNCIA', col: 0, row: 1,
    sprite: 'dom_sala_lacre_frequencia', terminal: 'dom_sala_estela_registro',
    scan: 'VEIOS DE FREQUÊNCIA REVELAM O PONTO FRÁGIL.',
    blocked: 'O LACRE EXIGE A LÂMINA DO DOMÍNIO.',
    notice: 'LEIA A FREQUÊNCIA COM R, APONTE PARA O LACRE E USE Q.',
    success: 'LACRE ROMPIDO — A CARGA DE FREQUÊNCIA ESTÁ LIVRE.',
    archive: ['ARQUIVO DE FREQUÊNCIA: O LACRE VIBRA EM PADRÕES GEOMÉTRICOS.', 'A LEITURA REVELA A FISSURA. UM GOLPE CONCENTRADO ROMPE O LACRE.'],
    manifest: ['MANIFESTO DE CARGA 04-B: UM SELO ANCESTRAL PRENDE O FRAGMENTO NO BERÇO LESTE.', 'A LÂMINA NÃO NEGOCIA COM O LACRE: LEIA [R] E ROMPA [Q].'],
    fragment: ['O LACRE SE DESFAZ EM RUNAS FRIAS. O FRAGMENTO PULSA NO BERÇO.', 'ASSINATURA DE DOMÍNIO ESTÁVEL. A LINHA INTERDIMENSIONAL PODE ACEITAR CALIBRAÇÃO.'],
    details: [['dom_sala_pira', 3.5, 1.5, 30], ['dom_sala_pilar', 9, 2, 28]],
  },
  mare: {
    id: 'hub_camara_mare', nome: 'CÂMARA DE FLUXO', cor: '#4dd8e7',
    arquetipo: 'mare_astral', action: 'passo_corrente', obstacle: 'fluxo_contido',
    objeto: 'FLUXO CONTIDO', col: 0, row: 2,
    sprite: 'mare_sala_fluxo_contido', spriteAberto: 'mare_sala_fluxo_aberto', terminal: 'mare_sala_terminal_sonar',
    scan: 'CORRENTES PRESAS INDICAM A SAÍDA DO FLUXO.',
    blocked: 'A PRESSÃO EXIGE CONTROLE DE CORRENTE.',
    notice: 'USE R. NO CENTRO DO CORREDOR, APONTE PARA O OUTRO LADO E USE Q.',
    success: 'CORRENTE ALINHADA — O FLUXO RECONHECE SUA PASSAGEM.',
    archive: ['ARQUIVO HIDRODINÂMICO: UMA CORRENTE ESTÁ PRESA NO ANEL.', 'SINTA O FLUXO COM R. O PASSO DE CORRENTE ATRAVESSA SEM DESTRUIR O ANEL.'],
    manifest: ['MANIFESTO DE CARGA 04-C: O ANEL HIDRÁULICO NÃO DEIXA A CARGA CRUZAR A PÉ.', 'LEIA A CORRENTE [R] E ATRAVESSE COM O PASSO DE CORRENTE [Q].'],
    fragment: ['A ÁGUA PARA DE GRITAR. O FRAGMENTO BOIA NO BERÇO COMO UMA BOLHA DE LUZ.', 'ASSINATURA DE MARÉ ESTÁVEL. A LINHA INTERDIMENSIONAL PODE ACEITAR CALIBRAÇÃO.'],
    details: [['mare_sala_lanterna_abissal', 3.5, 1.5, 27], ['mare_sala_pilar_hidro', 9, 2, 30]],
  },
  nucleo: {
    id: 'hub_camara_nucleo', nome: 'CÂMARA DE ECO CINÉTICO', cor: '#70f995',
    arquetipo: 'nucleo_dez_forma', action: 'forma_veloz', obstacle: 'malha_cinetica',
    objeto: 'MALHA CINÉTICA', col: 2, row: 2,
    sprite: 'nucleo_sala_malha_cinetica', terminal: 'nucleo_sala_terminal_registro',
    scan: 'A MALHA REVELA UMA JANELA DE ACELERAÇÃO.',
    blocked: 'A MALHA EXIGE UMA ASSINATURA CINÉTICA COMPATÍVEL.',
    notice: 'USE R. NO CENTRO DO CORREDOR, APONTE PARA O OUTRO LADO E USE Q.',
    success: 'JANELA CINÉTICA CRUZADA — A MALHA GRAVA SUA VELOCIDADE.',
    archive: ['ARQUIVO CINÉTICO: A MALHA REAGE A UMA ASSINATURA VELOZ.', 'USE R PARA LOCALIZAR A JANELA. Q ATRAVESSA; A ESTRUTURA PERMANECE INTACTA.'],
    manifest: ['MANIFESTO DE CARGA 04-D: A MALHA SÓ ABRE PARA MASSA EM MOVIMENTO.', 'LEIA A JANELA [R], ALINHE-SE AO VÃO E CRUZ COM O PULSO VELOZ [Q].'],
    fragment: ['A MALHA PARA DE ZUMBIR. O FRAGMENTO GIRA NO BERÇO, PESADO E LEVE AO MESMO TEMPO.', 'ASSINATURA CINÉTICA ESTÁVEL. A LINHA INTERDIMENSIONAL PODE ACEITAR CALIBRAÇÃO.'],
    details: [['nucleo_sala_pilar_cinetico', 3.5, 1.5, 27], ['nucleo_sala_regulador_inercia', 9, 2, 30]],
  },
};

export function buildEchoChamber(key) {
  const v = variants[key];
  if (!v) throw new Error(`Câmara desconhecida: ${key}`);
  const scanFlag = `scan_${v.obstacle}`;
  const gateFlag = `gate_${v.obstacle}`;
  const traversable = key !== 'dominio';
  return {
    id: v.id,
    meta: {
      nome: v.nome, tipo: 'interior', dimensao: 'hub_404',
      estiloSala: 'carga_eco', cargoKey: key, corTema: v.cor,
      corFundo: '#0b1016', estiloPiso: 'placas', alturaParede: 0.95,
      useBackgroundWalls: true,
      ambiente: { poeira: 14, cor: v.cor },
    },
    corChao: '#161d26',
    spawnPoints: { inicio: { x: 2.5, y: 4.5 }, vindo_do_aeroporto: { x: 2.5, y: 4.5 } },
    layout: [
      [1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,0,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1],
    ],
    objects: [{
      id: v.obstacle, nome: v.objeto, tipo: 'obstaculo', x: 5, y: 4,
      sprite: v.sprite, useCrop: true, pivotX: 0.5,
      larguraPx: 50, pivotY: 0.78, escalaY: key === 'dominio' ? 1.7 : key === 'mare' ? 1.5 : 1.35,
      colunas: { count: 6, esq: 0.5, dir: -0.5 },
      sombra: [22, 9], bloqueia: true,
      hitbox: { offsetX: -0.18, offsetY: -0.5, width: 0.36, height: 1.0 },
      ...(traversable ? { phaseAction: v.action } : { hideWhenFlag: gateFlag }),
      brilho: { cor: v.cor, raio: 1.2, forca: 0.34 },
      interacao: { label: `EXAMINAR ${v.objeto} • R: LER / Q: AGIR`, distancia: 2.6 },
      gate: {
        anyOf: [{ arquetipo: v.arquetipo }], requiresFlag: scanFlag,
        diagnosisArchetype: v.arquetipo, requiredAction: v.action,
        scanFlag, scanMessage: v.scan, actionMessage: v.notice,
        falhaDiagnostico: [v.notice], falha: [v.blocked], sucesso: [v.success],
        ...(v.spriteAberto ? { spriteAberto: v.spriteAberto, manterVisivel: true } : {}),
      },
    },
      // Mural de arquivo + manifesto vivo: leitura curta, sem bloquear o bay.
      { id: `arquivo_${key}`, nome: 'REGISTRO DE ECO', tipo: 'painel', x: 2.5, y: 2.2,
        sprite: v.terminal, useCrop: true, larguraPx: 48, pivotX: 0.5, pivotY: 0.94,
        sombra: [26, 11], bloqueia: true, hitbox: { offsetX: -0.3, offsetY: -0.24, width: 0.6, height: 0.48 },
        brilho: { cor: v.cor, raio: 0.8, forca: 0.23 },
        interacao: { label: 'LER REGISTRO', distancia: 1.5, speaker: v.nome, dialogue: v.archive } },
      { id: `manifesto_carga_${key}`, nome: 'MANIFESTO DE CARGA', tipo: 'painel', x: 2.5, y: 6.7,
        sprite: v.terminal, useCrop: true, larguraPx: 40, pivotX: 0.5, pivotY: 0.94,
        sombra: [24, 10], bloqueia: true, hitbox: { offsetX: -0.28, offsetY: -0.22, width: 0.56, height: 0.44 },
        brilho: { cor: v.cor, raio: 0.7, forca: 0.2 },
        interacao: { label: 'CONSULTAR MANIFESTO DE CARGA', distancia: 1.5, speaker: 'MANIFESTO 04', dialogue: v.manifest } },
      // O cristal faz parte do sprite: aparece e desaparece com o coletável.
      { id: `berco_fragmento_${key}`, nome: 'BERÇO DE SINCRONIZAÇÃO', tipo: 'pedestal', x: 8, y: 4,
        sprite: 'nucleo_sala_relicario_vetor', useCrop: true, larguraPx: 54, pivotX: 0.5, pivotY: 0.92,
        sombra: [24, 10], bloqueia: false, showWhenFlag: gateFlag, hideWhenFlag: 'collected_fragmento_sincronizacao',
        brilho: { cor: v.cor, raio: 1.1, forca: 0.3 } },
      // Carga de verdade nas quinas: sólidas, mas fora do corredor R→Q.
      { id: `caixa_carga_${key}_a`, tipo: 'caixa', x: 1.6, y: 1.6, sprite: 'hub_props', frame: { col: 0, row: 3 },
        scale: 0.26, anchorY: 0.94, bloqueia: true, hitbox: { offsetX: -0.32, offsetY: -0.32, width: 0.64, height: 0.64 } },
      { id: `caixa_carga_${key}_b`, tipo: 'caixa', x: 8.5, y: 6.6, sprite: 'hub_props', frame: { col: 0, row: 3 },
        scale: 0.26, anchorY: 0.94, bloqueia: true, hitbox: { offsetX: -0.32, offsetY: -0.32, width: 0.64, height: 0.64 } },
      { id: `totem_carga_${key}`, tipo: 'decoracao', x: 7.3, y: 1.6, sprite: 'aero_totem_holo',
        scale: 0.10, anchorY: 0.95, bloqueia: false, brilho: { cor: v.cor, raio: 0.8, forca: 0.2 } },
      ...v.details.map(([sprite, x, y, larguraPx], i) => ({ id: `cenario_${key}_${i}`, tipo: 'decoracao', x, y,
        sprite, useCrop: true, larguraPx, pivotX: 0.5, pivotY: 0.94, sombra: [14, 6], bloqueia: false,
        brilho: { cor: v.cor, raio: 0.6, forca: 0.14 } })),
    ],
    collectibles: [{
      id: 'fragmento_sincronizacao', tipo: 'fragmento', x: 8, y: 4,
      label: 'COLETAR FRAGMENTO DE SINCRONIZAÇÃO', interactionDistance: 1.35,
      requiresFlag: gateFlag, nome: 'FRAGMENTO DE SINCRONIZAÇÃO',
      dialogue: [...v.fragment, 'MISSÃO ATUALIZADA: RETORNE AO PAINEL DO METRÔ NO SAGUÃO CENTRAL.'],
    }],
    portals: [{ id: 'voltar_ao_aeroporto', tipo: 'door', x: 1, y: 6,
      label: 'VOLTAR AO AEROPORTO CENTRAL', destino: { mapId: 'hub_aeroporto', spawnId: 'vindo_da_carga' }, transition: 'fade' }],
  };
}
