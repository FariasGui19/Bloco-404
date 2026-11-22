# Docas — lote 2: dez peças para lapidar os interiores

## Decisão de composição

Foram geradas **exatamente 10 imagens neste lote**, processadas em dez sprites RGBA e implementadas nos três interiores acessíveis. Em vez de encher as salas, o lote substitui móveis procedurais já existentes. O rack é reutilizado em dois pontos: são **11 substituições visuais**, sem novos objetos sólidos.

A quantidade permanece **18 móveis**: 7 no oeste, 6 no leste e 5 no galpão. Posições, dimensões físicas, IDs e hitboxes desses móveis permanecem iguais à base; os testes protegem o hash das três plantas. Os itens de missão, inimigos, saídas e spawns não foram deslocados.

## Distribuição, uma peça por vez

| Peça gerada | Ambiente | Substituição / intenção |
|---|---|---|
| Cama do pescador | Cabana oeste | Cama de madeira gasta, manta e roupa de cama; leitura de abrigo habitado. |
| Estante de pesca | Cabana oeste | Apetrechos, cordame e tecido; fica junto à parede, sem ocupar o centro. |
| Barris de salmoura | Cabana oeste | Par compacto com ferragens e sal; mantém o espaço dos barris anteriores. |
| Baú do marinheiro | Cabana oeste | Armazenamento baixo, madeira escura e cintas; não cobre a circulação. |
| Cama do vigia | Cabana leste | Estrutura metálica e coberta fria; orientação espelhada para o encaixe existente. |
| Rádio do vigia | Cabana leste | Receptor com antena, mostrador ciano e pedestal. |
| Arquivo do vigia | Cabana leste | Cartas enroladas, fichários e caixa de instrumentos; poucos itens legíveis. |
| Rack CRT | Galpão | Uma pintura usada nos dois racks existentes, com escala contida e indicadores independentes. |
| Bancada elétrica | Galpão | Chassi de rádio aberto, instrumentos e ferramentas organizados. |
| Carrinho de ferramentas | Galpão | Carrinho baixo no lugar do suporte simples de ferramentas. |

As três pinturas do lote anterior continuam presentes. Agora são 13 pinturas distintas em **14 posições pintadas**; quatro móveis simples permanecem para preservar o respiro e orientar o próximo lote, em vez de tentar detalhar tudo de uma vez.

## Escala, recorte e profundidade

- Cada peça tem largura e altura máxima próprias em `docas-interiores-lote2.js`; estantes e racks não foram escalados automaticamente à altura de uma construção.
- Fontes originais em `assets/source-art/docas-interiores-lote2/`; sprites finais em `assets/sprites/docas-interiores-lote2/`.
- O processamento remove o verde, corrige spill nas bordas, recorta a transparência e reduz a resolução. Dois resultados da geração repetiram o mesmo móvel lado a lado: o processador seleciona apenas a cópia esquerda. Não há duplicata desenhada nem folha com múltiplas vistas no jogo.
- `manifest.json` registra SHA-256 das fontes, seleção, crop e tamanho. Reproduzir com `tools/preparar-docas-interiores-lote2.py` (Pillow + NumPy).
- Os objetos continuam no mesmo fluxo de ordenação por profundidade, nas mesmas pegadas. Se um sprite não carregar, o móvel procedural continua disponível.

## Animação: somente onde faz sentido

O brilho genérico não é aplicado aos novos móveis sem emissão. Cama, tecido, madeira, barris, arquivo, bancada desligada e carrinho permanecem estáveis.

Rádio e rack recebem:

- halo suave registrado nas coordenadas normalizadas da tela;
- varredura recortada ao quadrilátero do mostrador, não à caixa inteira do sprite;
- indicadores âmbar do rack com pulso lento e defasagem entre as duas unidades;
- coordenadas que acompanham a escala e o espelhamento do objeto;
- modo reduzido completamente estável, usando o relógio visual existente.

As três peças anteriores mantêm emissão suave com fase local. Não foram acrescentados balanços de móveis ou vibrações do chão. A animação externa existente foi preservada e revalidada: vegetação oeste, copas traseiras, mar, barcos, tentáculos, luzes e névoa continuam no RAF real. Este lote não altera os arquivos de navegação, áudio nem o fluxo dimensional.

## Ver e testar

- **Prévia interativa:** [previa-docas-interiores-lote2.html](previa-docas-interiores-lote2.html). Permite inspecionar as dez peças, pausar e comparar o movimento reduzido, sem ler ou escrever saves/preferências.
- **Antes/depois:** [comparação dos três interiores](../qa/docas-interiores-lote2-comparacao.jpg).
- Capturas completas: [oeste](../qa/docas-interior-lote2-cabana_oeste.png), [leste](../qa/docas-interior-lote2-cabana_leste.png), [galpão](../qa/docas-interior-lote2-galpao.png).

### Validação desta rodada

- **231 suítes Node:** 208 passaram; 23 falhas herdadas reproduzidas no HEAD-base extraído, sem trocar de branch. Nenhuma falha nova nesse conjunto. Performance/relevo da praia rodaram serialmente.
- **5 suítes Chromium passaram:** interiores, navegação, gameplay-live, fidelidade e oeste-pontual.
- Novo teste do lote: dez fontes/sprites/entradas de carregamento, hashes e dimensões corretos; onze substituições e densidade/hitboxes intactas; emissão somente nos equipamentos energizados.
- Chromium confirmou que **as dez pinturas são efetivamente desenhadas no jogo**, não só carregadas. Verificou também pixels animados de rádio/rack, estabilidade dos dez elementos no modo reduzido e ausência de mudanças temporais nos oito sem emissão.
- Entrada/saída por E nos três interiores, após percorrer as rotas com o motor real; 12 interações/saídas internas acessíveis; inventário, vida e energia preservados.
- Prévia isolada carregou dez imagens, animou o rádio, congelou o rack no modo reduzido e não escreveu localStorage.
- Teste externo mantém continuidade de vento, relógio visual, gameplay/save/RAF e fallback. O teste de ruptura Node passou; a suíte WebGL de ruptura completa não foi reexecutada neste lote, pois seu fluxo não foi alterado.
- `git diff --check` passou.

As 23 falhas herdadas continuam sendo: `caminho-correntes`, `combat-basic`, `enseada-ecos`, `nado-desenho`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-reconstrucao`, `limiar-frequencia`, `oceano-animado`.

```sh
node --experimental-default-type=module tests/docas-interiores-lote2.mjs
node --experimental-default-type=module tests/docas-revisao-final.mjs
# Servidor HTTP em 8000 e Chromium/Playwright configurados:
BROWSER_EXECUTABLE=/tmp/chromium \
PLAYWRIGHT_MODULE=$PWD/.qa/node_modules/playwright-core/index.mjs \
BROWSER_LIBRARY_PATH=/tmp/al2023/lib \
node --experimental-default-type=module tests/docas-interiores-browser.mjs
```
