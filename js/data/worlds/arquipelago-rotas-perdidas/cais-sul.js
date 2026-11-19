// Planta local da referência do cais (1568 × 617). Arte, posição dos pés,
// linha d'água e polígonos caminháveis usam a mesma transformação.
export const CAIS_SUL = {
  x: 275, y: 513, escala: .47,
  largura: 1568, altura: 617,
  rocha: { id:'rocha-amarra', x:1189, y:151, w:379, h:285 },
  deck: [[555,252],[675,203],[824,153],[984,107],[1026,101],[1107,126],
    [1182,158],[1080,211],[978,259],[862,313],[773,348],[680,373],[627,368],[559,320]],
  escada: [[1150,40],[1303,90],[1183,160],[1026,112]],
  pecas: [
    { id:'deck', x:528, y:97, w:670, h:392 },
    { id:'guarda-fundo', x:638, y:13, w:402, h:201 },
    { id:'barril', x:1024, y:34, w:56, h:88, pe:113 },
    { id:'escada-mare', x:1006, y:31, w:318, h:182 },
    { id:'estaca-leste', x:1160, y:108, w:46, h:197, pe:180 },
    { id:'rede', x:907, y:190, w:228, h:228, pe:296 },
    { id:'estaca-meio', x:754, y:295, w:44, h:180, pe:359 },
    { id:'estaca-oeste', x:641, y:343, w:46, h:148, pe:382 },
    { id:'bote', x:930, y:304, w:254, h:148, pe:446, balanco:1.2 },
    { id:'pesqueiro', x:42, y:16, w:610, h:568, pe:555, balanco:1.6 },
    { id:'boia-rede', x:567, y:465, w:35, h:41, pe:501, balanco:1.8 },
    { id:'amarracao', x:0, y:417, w:66, h:137, pe:554 },
  ],
};

export const SPRITES_CAIS_SUL = ['reflexos', CAIS_SUL.rocha.id, ...CAIS_SUL.pecas.map(p => p.id)]
  .map(id => ({ id: `docas_cais_sul_${id}`, src: `assets/sprites/docas-cais-sul/${id}.png` }));

export function plantaCais([x,y]) {
  return [CAIS_SUL.x+x*CAIS_SUL.escala, CAIS_SUL.y+y*CAIS_SUL.escala];
}
