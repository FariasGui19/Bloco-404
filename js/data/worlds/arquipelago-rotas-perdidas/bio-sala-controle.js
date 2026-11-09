// Interior independente: o exterior continua sólido, a porta usa transição explícita.
const layout = Array.from({ length: 11 }, (_, y) =>
  Array.from({ length: 14 }, (_, x) => x === 0 || y === 0 || x === 13 || y === 10 ? 1 : 0));
export const map = {
  id: 'bio_sala_controle',
  meta: { nome: 'ESTAÇÃO BIO · SALA DE CONTROLE', tipo: 'interior', dimensao: 'arquipelago', corFundo: '#101e1d', estiloPiso: 'placas', ambiente: { poeira: 5, cor: '#9ddbb0' } },
  corChao: '#263b35', layout,
  spawnPoints: { inicio: { x: 2.5, y: 8.5 } },
  objects: [
    { id: 'controle_instrucoes', tipo: 'painel', nome: 'REGISTRO DE MANUTENÇÃO', x: 3, y: 5,
      sprite: 'bio_distribuidor', useCrop: true, larguraPx: 70, bloqueia: false,
      interacao: { label: 'LER PROTOCOLO', distancia: 1.5, dialogue: [
        'RECONSTRUA O CONDUTOR E O REGULADOR NO EXTERIOR. ABRA O FLUXO NA ESTUFA.',
        'NO INTERIOR, DIAGNOSTIQUE A PLACA COM R E PASSE SOBRE ELA COM Q.',
        'POR FIM, ATIVE O PAINEL DE CONTROLE. A ESTAÇÃO AINDA NÃO ESTARÁ TOTALMENTE RESTAURADA.'
      ] } },
    { id: 'bio_pulso_interior', tipo: 'obstaculo', nome: 'PLACA DE IMPULSO', x: 7, y: 5,
      bioMarker: 'R → Q', bloqueia: false, dashSensor: true,
      moduleSystem: { id: 'bio_pulso_interior', diagnosisFlag: 'bio_pulso_diagnostico', requiresFlag: 'gate_bio_valvula_estufa', allowedArchetypes: ['motor_bio_forja'], distance: 2.2, label: 'DIAGNOSTICAR PLACA', speaker: 'LINK BIO-FORJA', dialogue: ['A PLACA RECEBE FLUXO DA ESTUFA.', 'ATRAVESSE A MARCA NO CHÃO COM Q PARA ENVIAR O IMPULSO AO PAINEL.'] },
      interacao: { label: 'EXAMINAR PLACA', distancia: 1.6 },
      gate: { anyOf: [{ arquetipo: 'motor_bio_forja' }], prerequisiteFlag: 'gate_bio_valvula_estufa', requiresFlag: 'bio_pulso_diagnostico', diagnosisArchetype: 'motor_bio_forja', requiredAction: 'bio_dash', actionMessage: 'ATRAVESSE A PLACA COM Q.', falhaPrerequisito: ['ABRA O FLUXO PARCIAL NA VÁLVULA DA ESTUFA PRIMEIRO.'], falhaDiagnostico: ['USE R PARA DIAGNOSTICAR A PLACA.'], falha: ['A PLACA EXIGE BIO-FORJA.'], manterVisivel: true, manterColisao: true } },
    { id: 'bio_controle_central', tipo: 'obstaculo', nome: 'PAINEL CENTRAL', x: 10, y: 3,
      sprite: 'bio_distribuidor', useCrop: true, larguraPx: 90, pivotX: .5, pivotY: 1,
      bloqueia: true, hitbox: { offsetX: -.35, offsetY: -.35, width: .7, height: .7 },
      interacao: { label: 'SINCRONIZAR CONTROLE', distancia: 1.7 },
      filterOnFlag: 'gate_bio_controle_central', filterOn: 'brightness(1.22) saturate(1.2)',
      gate: { anyOf: [{ arquetipo: 'motor_bio_forja' }], prerequisiteFlag: 'gate_bio_pulso_interior',
        falhaPrerequisito: ['O PAINEL AGUARDA UM IMPULSO DA PLACA.'], falha: ['ESTE PAINEL EXIGE BIO-FORJA.'],
        sucesso: ['CONTROLE SINCRONIZADO. O FLUXO PARCIAL ESTÁ MONITORADO.', 'A RECONSTRUÇÃO DA ESTAÇÃO AINDA NÃO TERMINOU.'], manterVisivel: true, manterColisao: true } },
    { id: 'controle_tubos', tipo: 'decoracao', x: 10, y: 6, sprite: 'bio_tubos', scale: .18, bloqueia: false },
    { id: 'controle_floreira', tipo: 'decoracao', x: 3, y: 2, sprite: 'bio_floreira', scale: .18, bloqueia: false },
  ],
  portals: [{ id: 'sair_controle_bio', tipo: 'door', x: 2, y: 8, label: 'SAIR PARA A ESTAÇÃO', interactionDistance: 1.2,
    destino: { mapId: 'ilha_estacao_bio', spawnId: 'vindo_controle' }, transition: 'fade' }],
};
