# Maré Cromática — lote 5 (sala de máquinas)

Lote visual opcional da baía. Não bloqueia âncora, rank, dados, ponte ou fenda;
a missão continua concluível sem visitar nenhum prop novo.

## Folhas

| arquivo | uso |
| --- | --- |
| `caldeira-sala.png` | caldeira da baía |
| `tubo-vapor.png` | tubo com vapor e oscilação lenta |
| `cristal-mare.png` | registro de lore opcional |
| `valvula-pressao.png` | válvula de pressão interativa |
| `painel-recompilacao.png` | leitura do estado da sala |
| `selo-recompilado.png` | selo pulsante de conclusão local |
| `guardiao-mare.png` | silhueta do guardião (variante do segundo inimigo) |
| `guardiao-dano.png` | quadro de dano/dissolução do guardião |
| `porta-recompilacao.png` | porta selada da sala de máquinas |
| `piso-metal.png` | textura 64×64 do piso interno |

Originais em `assets/source-art/mare-missao-lote5/`; folhas publicadas em
`assets/sprites/mare-missao-lote5/` por `tools/preparar-mare-lote5.py`.

## Contratos

- Sete props com raio de colisão e aproximação caminhável; todos usam
  `kind: lote5-*` e entram em `nearestSignal`.
- **Válvula**: uma vez por missão; reduz estresse em 14 e muda o áudio da sala.
- **Painel**: leitura idempotente, informa válvula/selo.
- **Selo**: exige válvula e painel; reduz estresse em 20, ativa a classe
  `.mare-mission.recompilado` e a camada de áudio adicional.
- Caldeira, tubo, cristal e porta são leituras locais persistentes.
- O guardião reutiliza a mesma simulação do infectado (hp 3, mesmo ataque e
  dissolução), trocando apenas a arte.
- `piso-metal` é desenhado a 22% de opacidade apenas nos interiores.

## Verificação

`tests/mare-mission-lote5.mjs` cobre as dez folhas RGBA, referências na missão,
aproximações, interações, sanitização de retomada, guardião, transição, áudio e
textura. `tests/mare-mission-browser.mjs` continua validando a missão em Chromium.
