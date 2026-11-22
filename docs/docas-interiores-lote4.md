# Docas: lote 4 — identidade, atmosfera e bordas sólidas

## Dez folhas originais

- Abrigo dos pescadores: ex-votos, peixes secos, mancha de sal/mofo e sino de neblina.
- Posto de escuta: fotos de desaparecidos, alto-falante e cortina.
- Oficina CRT: quadro de fusíveis, cabos de parede e vazamento.

Os dez elementos são texturas RGBA independentes, projetadas nos planos de
parede/piso. Não adicionam obstáculos invisíveis nem itens obrigatórios.
Originais, sprites e hashes estão em `assets/{source-art,sprites}/docas-interiores-lote4`.
Preparação reproduzível: `.venv/bin/python tools/preparar-docas-interiores-lote4.py`
(Pillow e numpy). A remoção de magenta é específica deste lote, sem reprocessar
as artes já aprovadas.

## Correções e acabamento

- Ampliação das faixas de parede/apoio das duas cabanas e do abrigo oeste;
  preservada a passagem para a poça de maré. A colisão não usa o telhado.
- Degraus visíveis da subida ao farol recortados no próprio polígono transitável,
  sem um segundo deslocamento independente. Mantida a arte do farol/portal.
- Pivô dos pequenos objetos de missão levado ao apoio inferior e escala
  reduzida; sombras locais. Os 18 móveis e seus hitboxes interiores permanecem.
- Retirado o tapete procedural que duplicava a esteira pintada do pescador.
- Escurecimento localizado das paredes e juntas úmidas, não uma máscara preta
  sobre jogador, HUD ou saídas.
- Barra da cortina/peixes reage ao vento; goteira cria ondulação discreta;
  sinalizadores respiram lentamente, sem estrobo. Movimento reduzido congela FX.
- Três texturas sonoras originais: cordame/madeira no abrigo, interferência
  no posto e goteiras/transformador na oficina. Preservada a partitura existente,
  com volume local menor; sons só iniciam pelo opt-in e respeitam suspensão.

## Validação executada

Node passou: `docas-interiores-lote2`, `docas-interiores-lote3`,
`docas-interiores-lote4`, `docas-navigation`, `docas-animation`,
`docas-revisao-final`.

- 399 amostras ao longo das paredes das cabanas/abrigo (não apenas centroides).
- 11.786 arestas de movimento reais: sete setores e todas as interações acessíveis.
- Subida e retornos farol/portal verificados por movimentos subpassados na suíte final.
- Dez fontes/sprites registrados com hashes, limites das salas e áudio exclusivo.

Chromium passou: `docas-interiores-browser`, `docas-navigation-browser`,
`docas-gameplay-live-browser`, `docas-fidelidade-browser`,
`docas-oeste-pontual-browser`.

O teste de interiores percorre rotas com colisão e entra/sai com E, observa os
10 novos desenhos, verifica inventário/vitais, áudio opt-in/reuso e compara
pixels das superfícies animadas em cada sala e do modo reduzido estável.
Capturas revisadas: `qa/docas-interior-lote4-*.png` e resumo
`qa/docas-interiores-lote4.jpg`. Travessia automatizada, não teste humano.
As cinco suítes passaram após as mudanças principais; o teste de interiores
foi repetido depois do último ajuste de posição do quadro de fotos.

A suíte completa do repositório não foi repetida neste lote. Há 23 falhas
herdadas documentadas no lote 2. Os testes acima não são garantia absoluta de
que toda posição possível ou toda configuração de dispositivo esteja sem defeitos.
