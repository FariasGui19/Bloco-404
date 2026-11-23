# Maré Cromática — lote 4 (contenção, dano e entrada pelas Docas)

Este lote não redesenha a baía nem a missão aprovada. Ele acrescenta **dez originais** e uma camada jogável de contenção sobre o que já existia: o pulso Q agora fere e dissolve infectados, os ataques têm duas leituras, o dano local é tensão (nunca vida global) e as Docas ganham uma saída visível e legítima para testar a dimensão.

## Dez folhas

Fonte em `assets/source-art/mare-missao-lote4/`; sprites em `assets/sprites/mare-missao-lote4/`. O preparo é reproduzível com `PYTHONPATH=.qa/python python tools/preparar-mare-lote4.py` (chave magenta, NEAREST e recorte justo).

| folha | uso |
| --- | --- |
| `infectado-golpe-baixo` | ataque rasteiro quando o operador está muito perto |
| `infectado-golpe-alto` | golpe vertical, telegrafia mais longa e mais tensão |
| `infectado-dano` | reação de impacto do pulso |
| `infectado-dissolvido` | colapso da forma ao chegar a zero de vida |
| `casulo-mare` | âncora física da reforma dos infectados |
| `eco-operador` | eco do próprio operador, leitura única no salão |
| `painel-contencao` | leitura de ameaças ativas e ciclo de reforma |
| `cabo-energia` | perigo de piso que drena tensão ao ser isolado |
| `lanterna-sinal` | luz que acalma a sala e aumenta a detecção inimiga |
| `porta-fenda` | moldura visível do portal de eco nas Docas |

As dez folhas foram geradas para o mesmo enquadramento e paleta do lote 3; `tests/mare-mission-combat.mjs` confere que os dez sprites são PNG RGBA e que cada peça tem aproximação livre com linha de visão.

## Mecânica de contenção

- **Golpe F**: ataque curto de 2,0 m, 1 de dano, recarga de 0,55 s, com arco de tela e impacto próprio. Não custa vida nem inventário; é a resposta rápida quando a resina chega perto.
- **Pulso Q**: raio `3.2 + domínio local × 0.35` (3,55 m no domínio 1; 4,6 m no 4). Cada infectado tem 3 de vida local. O pulso causa 1 de dano (2 para Motor Bio-Forja), exige linha de visão e não atravessa parede.
- **Dano e reforma**: dano → `hurt` por 0,45 s → atordoado; vida zero → `dissolve` por 1,15 s → corpo removido. Após **30 s** a forma reergue em um dos dois casulos (`26.2,15.2` ou `4.4,18.1`) com vida cheia. Nada disso altera vida, inventário, XP ou identidade global.
- **Duas leituras de ataque**: a menos de 0,75 m o infectado usa `golpe-baixo` (telegrafia 0,55 s, +16 de tensão); acima disso usa `golpe-alto` (0,85 s, +26). O som, a pose e o tempo mudam juntos, para o ataque ser lido em vez de adivinhado.
- **Cabo energizado**: a 1,3 m do cabo, +13 de tensão por segundo. `E` isola o cabo uma vez, devolve 12 de tensão e libera a passagem central.
- **Lanterna de sinal**: alterna com `E`. Perto dela (6 m) a tensão cai 2,6/s; em troca, a detecção dos infectados sobe 4 m (agachado 9 → 13; em pé 16 → 20). É uma escolha, não um buff gratuito.
- **Eco e painel**: o eco é uma leitura única que devolve 18 de tensão; o painel informa ameaças ativas, casulos e ciclo de 30 s. Nenhum dos dois concede dados mnemônicos ou domínio.
- **Feedback**: arco de golpe, anel de pulso, clarão vermelho curto no impacto, tremor de câmera, osciladores distintos para pulso, dano, dissolução e reforma; o HUD passa a mostrar `AMEAÇAS n/2` e o texto de ajuda cita golpe e pulso. O botão `GOLPE` replica F no toque.

A tensão continua sendo o único caminho de falha: ao chegar a 100 o operador desperta no terminal/boia com 25, sem perder dados, itens ou vida. Não há game over.

## Entrada pelas Docas (save existente)

`SAVE_VERSION` passou de 1 para 2. No carregamento, **somente** um save de versão anterior, arquétipo `mare_astral`, último mapa `mare_cromatica_docas` e com a Docas já alcançada recebe `concluirIncursaoLegado`:

- grava fragmentos, fitas, sincronização 4, estação aberta, três painéis, `ancoraEstavel` e `desfecho: 'total'`;
- grava as bandeiras `docas_chave`, `docas_fusivel`, `cromatica_estacao_aberta`, `cromatica_ancora_estavel`, `cromatica_desfecho` e `docas_incursao_concluida_v2`;
- preserva inventário, vida, arquétipo, mapa e posição;
- não sobrescreve o save até o próximo `saveGame`; é idempotente.

Saves novos (v2), outros arquétipos e interiores cromáticos parciais não recebem o atalho. A regra está testada em `tests/mare-legado-docas.mjs`.

Nas Docas, a saída agora existe no mundo: um portal de eco no píer (`23.72, 67.68`), com a arte `porta-fenda`, rótulo `[E] PORTAL DE ECO`, aviso `SELADO` enquanto a âncora não estiver estável e transição própria `mare-fenda` até `mare_cromatica_fenda`. O portal ficava ao lado do barco e do diário do píer. **Atualização do lote 7:** ele foi movido para o pátio central (`877, 566`; célula `33.76, 63.82`), recebeu a arte `portal-mare` com 280 unidades e halo pulsante; a topologia, a flag e o destino não mudaram. Veja `docs/mare-missao-lote7.md`. `tests/docas-vila-04.mjs` passou a fixar quatro portais (três interiores + eco) e o teste de navegador percorre menu → save v1 → Docas → portal → fenda.

## Verificação executada

- `node --test tests/mare-mission-life.mjs tests/mare-mission-lore.mjs tests/mare-mission.mjs tests/mare-mission-combat.mjs tests/mare-legado-docas.mjs tests/dimension.mjs tests/dimension-rupture.mjs tests/cidadela-progressao.mjs tests/docas-vila-04.mjs` — 9/9.
- `tests/mare-mission-browser.mjs` (Chromium real) — entrada, assets decodificados, Q ferindo/dissolvendo, cabo isolando, objetivos, relatório e retorno sem perda.
- `tests/docas-legado-browser.mjs` (Chromium real) — save v1 no píer, missão concluída, inventário intacto, portal visível, fenda carregada e missão 3D iniciada pelo limiar com `E`, depois `Esc` de volta.
- `tests/dimension-rupture-browser.mjs` — terminal final → Nulo → Limiar → Esc/2D, referências e vitais inalterados.

**Honestidade sobre o que não foi feito**: não houve playthrough manual completo depois deste lote; os testes acima encenam posições e entradas reais, mas não substituem uma sessão humana. Também não foram refeitas as 23 falhas herdadas de outras suítes (docas-lote5/8–13, enseada, caminho-correntes, combat-basic etc.). Não há medição de FPS neste lote e nenhuma alegação de ganho de desempenho.
