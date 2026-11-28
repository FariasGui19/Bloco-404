# Maré Cromática — Baía de Quarentena

**Linha de retorno / circuito H-03.** Na Fenda, use **Examinar o outro lado** depois de estabilizar a âncora da incursão 2D. A Baía é a missão em primeira pessoa; o botão de sandbox do Setor Limiar não inicia esse percurso.

| Etapa | Onde | Scanner (`E`) | O que muda |
| --- | --- | --- | --- |
| 01 | Píer de Entrada | Sintonizar sensor costeiro | Fixa a frequência e libera a partida do gerador. |
| 02 | Setor dos Galpões | Reativar gerador auxiliar | Alimenta o painel, firma a iluminação de serviço e permite recarregar a lanterna junto à máquina. |
| 03 | Estação da Âncora | Sincronizar painel da âncora | Fecha a fase da rede. O objetivo passa a **Estabilizar Âncora**, no portal. |
| A | Píer do portal | Estabilizar âncora | Confirma o retorno e entrega a missão à ponte existente para o Setor Limiar. |

O cabo liga fisicamente os equipamentos. **Vermelho** indica equipamento sem rede; **âmbar**, o próximo pronto para uso; **ciano**, sistema ativo. Os números, as palavras no display e os passos no HUD permitem ler o estado sem depender só da cor ou do som. Cada ativação produz uma onda no equipamento, um sinal sonoro se o áudio estiver ligado e uma linha de rádio. **M** mostra a carta de serviço, sua posição e o que cada sistema liberou. O diário e o prontuário nas cabanas são opcionais. Não existe etapa de coleta ou recompilação em um terminal central.

## Retomar e sair

- **Esc** devolve o operador ao mesmo ponto do 2D. Ao reentrar pelo portal da Fenda, a missão começa no píer e indica o primeiro sistema ausente.
- A contagem usa os IDs existentes `fita`, `sal`, `eco` de `progress.mareMission.data`. A ordem de um save antigo não importa. Os registros e equipamentos opcionais já gravados não são requisitos, nem há uma segunda lista de flags.
- **3/3 não conclui sozinho.** Só o último `E` na âncora confirma `completed` e solicita a ruptura. A confirmação acontece antes do relatório de quatro segundos, inclusive se o operador usar Esc durante ele. A ponte só inicia o Limiar depois de o manager desmontar a Baía e restaurar o 2D.
- Se os dez minutos terminarem, o relatório é de **retirada à Fenda**, não de vitória. Uma nova janela permite retomar os sistemas sem recomeçar do zero. O progresso da incursão 2D não é alterado.

## Implementação e verificação

`js/dimension/mare-mission-circuit.js` define os locais, as aproximações, o cabo, o estado e os verbos. Colisão e seleção por alcance/linha de visada ficam em `mare-mission-model.js`. `mare-mission-stations.js` constrói os três aparelhos em Three.js; o raycaster Canvas usa os mesmos locais, cabo e estados. A carta e os dois relatórios são comuns aos dois renderizadores. As tábuas, setas, marcador e onda reutilizam a arte publicada do lote 13; não há carga de modelos externos.

```sh
node --test tests/mare-mission.mjs tests/mare-mission-lote13.mjs tests/dimension-rupture.mjs
```

O teste do modelo percorre a passarela com `move()` e cobre as oito combinações de sistemas em saves parciais. Com um servidor estático na porta 8000 e Playwright/Chromium em `.qa/`, `tests/mare-mission-browser.mjs` exercita teclas, botão de scanner, luzes WebGL, fallback, saída, expiração e falha de decodificação. `tests/dimension-rupture-browser.mjs` verifica no jogo real a sequência Fenda → Baía → Limiar → 2D (precisa de `BROWSER_EXECUTABLE` e `PLAYWRIGHT_MODULE`). Os testes de integração preparam posições para verificar os encontros; não exigem uma partida manual completa.
