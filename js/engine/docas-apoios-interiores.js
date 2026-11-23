import {CONFIG} from '../config.js';
// Generated opaque contact pixels; see tools/registrar-apoios-docas.py.
export const APOIOS_MOBILIA_DOCAS=Object.freeze({
 "docas_interior_lote3_rede_secagem": {
  "front": [
   0.72155,
   0.99805
  ],
  "contacts": [
   [
    0.28087,
    0.99609
   ],
   [
    0.56174,
    0.77148
   ],
   [
    0.72155,
    0.99805
   ]
  ]
 },
 "docas_interior_lote3_mesa_refeicao": {
  "front": [
   0.5,
   0.99777
  ],
  "contacts": [
   [
    0.07812,
    0.75446
   ],
   [
    0.5,
    0.99777
   ],
   [
    0.92188,
    0.75446
   ]
  ]
 },
 "docas_interior_lote3_bau_suprimentos": {
  "front": [
   0.74219,
   0.9973
  ],
  "contacts": [
   [
    0.33594,
    0.83784
   ],
   [
    0.66797,
    0.96486
   ],
   [
    0.74219,
    0.9973
   ]
  ]
 },
 "docas_interior_lote3_reserva_agua": {
  "front": [
   0.80469,
   0.99804
  ],
  "contacts": [
   [
    0.29102,
    0.96477
   ],
   [
    0.39062,
    0.96477
   ],
   [
    0.80469,
    0.99804
   ]
  ]
 },
 "docas_interior_lote2_cama_pescador": {
  "front": [
   0.35352,
   0.99472
  ],
  "contacts": [
   [
    0.33789,
    0.98681
   ],
   [
    0.35352,
    0.99472
   ],
   [
    0.66992,
    0.62269
   ]
  ]
 },
 "docas_interior_lote2_estante_pesca": {
  "front": [
   0.61505,
   0.99805
  ],
  "contacts": [
   [
    0.33763,
    0.82617
   ],
   [
    0.61505,
    0.99805
   ],
   [
    0.66882,
    0.97266
   ]
  ]
 },
 "docas_interior_lote2_barris_salmoura": {
  "front": [
   0.74805,
   0.99586
  ],
  "contacts": [
   [
    0.26367,
    0.86957
   ],
   [
    0.66406,
    0.98758
   ],
   [
    0.74805,
    0.99586
   ]
  ]
 },
 "docas_interior_lote2_bau_marinheiro": {
  "front": [
   0.70703,
   0.99724
  ],
  "contacts": [
   [
    0.33203,
    0.86188
   ],
   [
    0.66602,
    0.98895
   ],
   [
    0.70703,
    0.99724
   ]
  ]
 },
 "docas_interior_lote2_cama_vigia": {
  "front": [
   0.7168,
   0.99678
  ],
  "contacts": [
   [
    0.33789,
    0.51447
   ],
   [
    0.66797,
    0.78778
   ],
   [
    0.7168,
    0.99678
   ]
  ]
 },
 "docas_interior_lote2_radio_vigia": {
  "front": [
   0.40184,
   0.99805
  ],
  "contacts": [
   [
    0.10736,
    0.89453
   ],
   [
    0.40184,
    0.99805
   ],
   [
    0.90184,
    0.83984
   ]
  ]
 },
 "docas_interior_lote2_arquivo_vigia": {
  "front": [
   0.32026,
   0.99805
  ],
  "contacts": [
   [
    0.32026,
    0.99805
   ],
   [
    0.34641,
    0.99219
   ],
   [
    0.66993,
    0.86523
   ]
  ]
 },
 "docas_interior_lote2_rack_crt": {
  "front": [
   0.53846,
   0.99805
  ],
  "contacts": [
   [
    0.33333,
    0.94531
   ],
   [
    0.53846,
    0.99805
   ],
   [
    0.66667,
    0.96484
   ]
  ]
 },
 "docas_interior_lote2_bancada_eletrica": {
  "front": [
   0.61914,
   0.9977
  ],
  "contacts": [
   [
    0.33789,
    0.81839
   ],
   [
    0.61914,
    0.9977
   ],
   [
    0.66992,
    0.96552
   ]
  ]
 },
 "docas_interior_lote2_carrinho_ferramentas": {
  "front": [
   0.56055,
   0.99803
  ],
  "contacts": [
   [
    0.33789,
    0.79487
   ],
   [
    0.56055,
    0.99803
   ],
   [
    0.66992,
    0.85799
   ]
  ]
 },
 "docas_interior_pescador": {
  "front": [
   0.26758,
   0.99673
  ],
  "contacts": [
   [
    0.26758,
    0.99673
   ],
   [
    0.33984,
    0.88235
   ],
   [
    0.83008,
    0.81046
   ]
  ]
 },
 "docas_interior_vigia": {
  "front": [
   0.625,
   0.9969
  ],
  "contacts": [
   [
    0.03906,
    0.77709
   ],
   [
    0.625,
    0.9969
   ],
   [
    0.95117,
    0.96594
   ]
  ]
 },
 "docas_interior_crt": {
  "front": [
   0.50586,
   0.99797
  ],
  "contacts": [
   [
    0.30273,
    0.8313
   ],
   [
    0.50586,
    0.99797
   ],
   [
    0.68555,
    0.85366
   ]
  ]
 }
});
export function caixaMobiliaDocas(o,asset){
 const [w,h]=o.docasSize,visual=o.docasVisual;
 const footprintWidth=(w+h)*CONFIG.TILE_W/2,flip=Boolean(visual?.flip||o.docasFlip);
 let width=Math.min(visual?.width??footprintWidth,footprintWidth*1.08),height=width*asset.height/asset.width;
 if(visual?.maxHeight&&height>visual.maxHeight){width*=visual.maxHeight/height;height=visual.maxHeight;}
 const [u,v]=APOIOS_MOBILIA_DOCAS[o.docasAsset]?.front??[.5,1];
 const frontX=(o.x-o.y)*CONFIG.TILE_W/2+(w-h)*CONFIG.TILE_W/4;
 const frontY=(o.x+o.y)*CONFIG.TILE_H/2+(w+h)*CONFIG.TILE_H/4;
 const x=frontX-(flip?1-u:u)*width,y=frontY-v*height;
 const contacts=(APOIOS_MOBILIA_DOCAS[o.docasAsset]?.contacts??[[u,v]]).map(([a,b])=>[x+(flip?1-a:a)*width,y+b*height]);
 return {x,y,width,height,frontX,frontY,contacts,flip};
}
