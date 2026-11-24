# Maré Cromática — lote 13 (leitura de baía)

Lote de **orientação**, não de mecânica. Nada aqui muda regra, dano, tempo ou
progressão: a missão continua concluível exatamente como antes. O que o lote
resolve são os três incômodos do mapa — decoração solta demais, objetivo
espalhado em três linhas de texto e o mesmo `[E]` para tudo.

## Folhas

| arquivo | uso |
| --- | --- |
| `trilha-tabua.png` | textura 256² da passarela de tábuas |
| `cabo-guia.png` | textura 256² do cabo entre postes |
| `poste-sinalizador.png` | marco de trilha com placa de seta |
| `seta-chao.png` | decal de chão nas bifurcações (alphaTest) |
| `placa-missao.png` | placa do percurso, junto ao píer |
| `marcador-objetivo-0…3.png` | losango flutuante do objetivo ativo |
| `farol-pulso-0…5.png` | anel lento do farolim quando um sinal cai |
| `interacao-onda-0…5.png` | onda no objeto tocado pelo `E` |
| `terminal-estados-0…3.png` | terminal apagado → leitura → dados → sobrecarga |

Originais em `assets/source-art/mare-missao-lote13/`; publicados em
`assets/sprites/mare-missao-lote13/` e `assets/textures/mare-missao-lote13/` por
`tools/preparar-mare-lote13.py` (`OK: 2 texturas, 3 props, 4 tiras`).

## Percurso

`mare-mission-lote13.js` guarda quatro polilinhas conferidas contra `cell()` e
`canStand()` — amostragem a cada 0,3 m, 241 amostras, **zero bloqueadas**:

- `praia` — píer até a porta da cabana 2 (`9.4,26.2`).
- `volta` — píer → âncora → borda leste → travessia norte → porta da cabana 1
  (`8.6,9.8`). Desvia do casulo (`26.4,15.3`), da válvula (`25,14`), da lente no
  muro (`18.8,12.2`) e passa pela única fresta daquele muro (`x≈8.6`).
- `terminal` — ramo central até `16,16`.
- `sal` — ramo leste até o resíduo.

`pathGuides()` deriva as tábuas (passo 2,4 m), os postes (passo 8,2 m, lado
oposto com folga de 0,3 m em `canStand`), os cabos (catenária entre postes
vizinhos) e as setas. Hoje: **28 tábuas, 6 postes, 5 cabos, 6 setas**. A
passarela é uma única `BufferGeometry` (1 draw call), com `polygonOffset` para
não brigar com o chão.

## Objetivo no mundo

- `nextObjective(m,{fendaOpen})` devolve **um** passo: recuperar memória
  (`have/need`, site mais próximo), recompilar no terminal ou alcançar a âncora.
- O `.mare-next` (chip no alto à esquerda) mostra rótulo, detalhe, contador e
  distância em metros, com seta de rumo relativa à câmera. É a única linha nova
  de HUD: o resto do `readout` continua fora da tela, como antes.
- O alvo da bússola (`mare-target`) agora sai do objetivo atual, não de uma
  constante `24.5,24.5`.
- No mundo, um losango flutuante marca o alvo: sobe/desce, troca de quadro,
  encolhe de perto, desaparece além de 23 m.

## Resposta ao `E`

`promptFor(prop)` classifica cada interativo em quatro famílias — `◆ MISSÃO`,
`✦ REGISTRO`, `▣ COLETA`, `◇ INSPEÇÃO` — com verbo próprio e tom de áudio
próprio. O `aside` usa `promptFor(near).line` e ganha `data-kind` para a cor da
borda. Coletar qualquer coisa dispara uma onda no objeto tocado (`pulse`), um
tique curto e o pulso do chip (`avancou`); memória nova também faz o farolim
abrir o anel lento (`ringBeacon`).

O terminal tem quatro estados pintados e troca de arte conforme
`m.p.data.length` (0 apagado, 1 leitura, 2 dados, 3 sobrecarga âmbar, também em
`fendaOpen`).

## Curadoria do decorativo

`curateDecor(list,{keep:3.2,spacing:1.6})` mantém o que está a menos de 3,2 m do
percurso, respeita 1,6 m entre peças e **nunca** descarta pino/farolim. Na baía:
**33 → 16** decorativos, sem tirar nenhum ponto interativo.

## Contratos preservados

- Sem mecânica nova; nenhum prop novo entra em `nearestSignal`.
- HUD base intacta (`readout`, `objective`, `message`, `steps`, vitais, botões).
- Chuva/áudio, câmera, movimentação e colisão não foram tocados.
- Testes: `tests/mare-mission-lote13.mjs` (6 casos), `tests/mare-upgrade-3d.mjs`
  atualizado para o novo prompt, `tests/mare-mission-browser.mjs` verde com os
  contadores `NULO 1/4`, `REGISTROS 1/8`, `LORE 1/6`, `AMEAÇAS 2/2`.
