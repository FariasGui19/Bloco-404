// Três câmaras iniciais provisórias, com obstáculos e narrativas por módulo.
// A mesma gramática de colisão garante que a leitura R preceda a ação Q.
const variants = {
  dominio: {
    id: 'hub_camara_dominio', nome: 'CÂMARA DE FREQUÊNCIA', cor: '#d8ab4c',
    arquetipo: 'lamina_dominio_anciao', action: 'golpe_ruptura', obstacle: 'lacre_frequencia',
    objeto: 'LACRE DE FREQUÊNCIA', col: 0, row: 1,
    scan: 'VEIOS DE FREQUÊNCIA REVELAM O PONTO FRÁGIL.',
    blocked: 'O LACRE EXIGE A LÂMINA DO DOMÍNIO.',
    notice: 'LEIA A FREQUÊNCIA COM R, APONTE PARA O LACRE E USE Q.',
    archive: ['ARQUIVO DE FREQUÊNCIA: O LACRE VIBRA EM PADRÕES GEOMÉTRICOS.', 'A LEITURA REVELA A FISSURA. UM GOLPE CONCENTRADO ROMPE O LACRE.'],
    details: [[1, 1, 0, 3], [8, 2, 2, 1], [8, 6, 0, 3]],
  },
  mare: {
    id: 'hub_camara_mare', nome: 'CÂMARA DE FLUXO', cor: '#4dd8e7',
    arquetipo: 'mare_astral', action: 'passo_corrente', obstacle: 'fluxo_contido',
    objeto: 'FLUXO CONTIDO', col: 0, row: 2,
    scan: 'CORRENTES PRESAS INDICAM A SAÍDA DO FLUXO.',
    blocked: 'A PRESSÃO EXIGE CONTROLE DE CORRENTE.',
    notice: 'USE R. NO CENTRO DO CORREDOR, APONTE PARA O OUTRO LADO E USE Q.',
    archive: ['ARQUIVO HIDRODINÂMICO: UMA CORRENTE ESTÁ PRESA NO ANEL.', 'SINTA O FLUXO COM R. O PASSO DE CORRENTE ATRAVESSA SEM DESTRUIR O ANEL.'],
    details: [[1, 1, 3, 1], [8, 2, 3, 1], [8, 6, 0, 1]],
  },
  nucleo: {
    id: 'hub_camara_nucleo', nome: 'CÂMARA DE ECO CINÉTICO', cor: '#70f995',
    arquetipo: 'nucleo_dez_forma', action: 'forma_veloz', obstacle: 'malha_cinetica',
    objeto: 'MALHA CINÉTICA', col: 2, row: 2,
    scan: 'A MALHA REVELA UMA JANELA DE ACELERAÇÃO.',
    blocked: 'A MALHA EXIGE UMA ASSINATURA CINÉTICA COMPATÍVEL.',
    notice: 'USE R. NO CENTRO DO CORREDOR, APONTE PARA O OUTRO LADO E USE Q.',
    archive: ['ARQUIVO CINÉTICO: A MALHA REAGE A UMA ASSINATURA VELOZ.', 'USE R PARA LOCALIZAR A JANELA. Q ATRAVESSA; A ESTRUTURA PERMANECE INTACTA.'],
    details: [[1, 1, 3, 2], [8, 2, 0, 1], [8, 6, 3, 2]],
  },
};

export function buildEchoChamber(key) {
  const v = variants[key];
  if (!v) throw new Error(`Câmara desconhecida: ${key}`);
  const scanFlag = `scan_${v.obstacle}`;
  return {
    id: v.id,
    meta: { nome: v.nome, tipo: 'interior', dimensao: 'hub_404', corFundo: '#10151c', estiloPiso: 'placas', ambiente: { poeira: 12, cor: v.cor } },
    corChao: '#19212a',
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
      sprite: 'beach_props', frame: { col: v.col, row: v.row }, useCrop: true,
      larguraPx: 84, pivotX: 0.5, pivotY: 1, bloqueia: true,
      hitbox: { offsetX: -0.5, offsetY: -0.5, width: 1.0, height: 1.0 },
      ...(key === 'dominio' ? { hideWhenFlag: `gate_${v.obstacle}` } : { phaseAction: v.action }),
      brilho: { cor: v.cor, raio: 1, forca: 0.3 },
      interacao: { label: 'EXAMINAR • R: LER / Q: AGIR', distancia: 2.6 },
      gate: {
        anyOf: [{ arquetipo: v.arquetipo }], requiresFlag: scanFlag,
        diagnosisArchetype: v.arquetipo, requiredAction: v.action,
        scanFlag, scanMessage: v.scan, actionMessage: v.notice,
        falhaDiagnostico: [v.notice], falha: [v.blocked],
      },
    },
      // Registros e luzes não bloqueantes enriquecem a cena sem mudar o puzzle.
      { id: `arquivo_${key}`, nome: 'REGISTRO DE ECO', tipo: 'painel', x: 2, y: 2,
        sprite: 'hub_props', sceneSprite: `visao_${key}`, frame: { col: 1, row: 3 }, scale: 0.30, anchorY: 0.94,
        bloqueia: false, brilho: { cor: v.cor, raio: 0.8, forca: 0.23 },
        interacao: { label: 'LER REGISTRO', distancia: 1.3, speaker: v.nome, dialogue: v.archive } },
      ...v.details.map(([x, y, col, row], i) => ({ id: `cenario_${key}_${i}`, tipo: 'decoracao', x, y,
        sprite: 'hub_props', frame: { col, row }, scale: 0.24, anchorY: 0.94, bloqueia: false,
        brilho: { cor: v.cor, raio: 0.7, forca: 0.16 } })),
    ],
    collectibles: [{
      id: 'fragmento_sincronizacao', tipo: 'fragmento', x: 8, y: 4,
      label: 'COLETAR FRAGMENTO DE SINCRONIZAÇÃO', interactionDistance: 1.25,
      requiresFlag: `gate_${v.obstacle}`, nome: 'FRAGMENTO DE SINCRONIZAÇÃO',
      dialogue: ['FRAGMENTO ESTABILIZADO.', 'RETORNE AO PAINEL DO METRÔ NO SAGUÃO.'],
    }],
    portals: [{ id: 'voltar_ao_aeroporto', tipo: 'door', x: 1, y: 6,
      label: 'VOLTAR AO AEROPORTO CENTRAL', destino: { mapId: 'hub_aeroporto', spawnId: 'vindo_da_carga' }, transition: 'fade' }],
  };
}
