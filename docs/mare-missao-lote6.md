# Maré Cromática — lote 6 (o arquivo do operador)

Lote de presença e materialidade da baía. A missão principal continua
concluível sem os encontros opcionais; o lote acrescenta leitura, combate,
texturas e a transição da fenda.

## Folhas

| arquivo | uso |
| --- | --- |
| `nulo-operador.png` | Nulo físico, pose de arquivo |
| `nulo-operador-voz.png` | variante de estática para a voz do Nulo |
| `cacador-mare.png` | caçador do lote 6, substituído visualmente no lote 7 |
| `cacador-dano.png` | quadro de dano/dissolução do caçador do lote 6 |

> **Lote 7:** o caçador agora usa `afogado-mare`/`afogado-dano`; continua sendo `enemy[0]` e as duas ameaças não mudaram. Veja `docs/mare-missao-lote7.md`.
| `parede-azulejo.png` | parede interna, 64×64 tileável |
| `parede-ferrugem.png` | parede externa, 64×64 tileável |
| `chao-grade.png` | piso industrial gradeado, 64×64 tileável |
| `turbina-sala.png` | estrutura interativa da sala de máquinas |
| `escada-servico.png` | estrutura vertical de serviço |
| `transicao-fenda.png` | fenda da âncora e transição final |

Originais em `assets/source-art/mare-missao-lote6/`; folhas em
`assets/sprites/mare-missao-lote6/`; preparo por `tools/preparar-mare-lote6.py`.

## Nulo em quatro estágios

`nuloPoints` acompanha o progresso: baía (0), primeira memória (1), rank 2 (2)
e rank 4 (3). Cada estágio tem fala própria, uma leitura persistente em
`progress.mareMission.nulo` e alívio de tensão apenas na primeira leitura. A
arte alterna para `nulo-operador-voz` em um pulso curto de estática, sem
reduzir a legibilidade do encontro.

## Inimigos

O caçador substitui a variante inicial do primeiro perseguidor: silhueta baixa
e larga, 18% mais rápido, windup de 0,36 s e dano menor (11/18) que o guardião
(16/26). Continua usando a mesma simulação de hp 3, casulos e dissolução; o
guardião do lote 5 permanece no segundo perseguidor. O painel segue reportando
duas ameaças.

## Materiais, estruturas e transição

- Paredes internas usam `parede-azulejo`, paredes externas `parede-ferrugem`;
  portas continuam com a folha própria.
- O piso é um floor cast 192×108 com `chao-grade` ao ar livre e `piso-metal`
  em interiores, névoa por distância e ondulação de maré.
- Turbina e escada são estruturas com colisão e leitura local; a turbina alivia
  tensão uma vez.
- Rank 4 abre a fenda: classe `.fenda-aberta`, aviso na missão, áudio e a fenda
  pulsante junto da âncora. A conclusão desenha a fenda expandindo antes do
  relatório de eco.

## Verificação

`tests/mare-mission-lote6.mjs` cobre as dez folhas, texturas 64×64, Nulo,
persistência, estruturas, fenda, caçador, objetivo e ganchos de render/áudio.
`tests/mare-mission-browser.mjs` valida o encontro do Nulo no DOM real.
