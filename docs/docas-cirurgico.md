# Docas da Neblina — ajustes cirúrgicos

Base desta revisão: `1fb2a0d`. Sem mudanças em input, câmera do jogo, movimentação, colisões, save, missão ou `DimensionManager`.

## Resultado verificável

- [Prévia animada](previa-docas-cirurgico.html), com câmera de detalhe e botão **Mar superior**. Não lê/grava a partida; a preferência de movimento da prévia também não é persistida.
- [Antes/depois desta revisão](../qa/docas-cirurgico-antes-depois.jpg).
- [Mapa completo](../qa/docas-cirurgico-completo.png) e [câmera ao norte, incluindo Y negativo](../qa/docas-cirurgico-mar-superior.png).
- O antes é a captura original do commit-base, preservada em `qa/docas-encaixe-resultado.png`. A opção “Composição antiga, sem encaixe” da prévia é uma comparação ainda mais antiga, explicitamente rotulada, não o antes desta revisão.

## 1. Substituições de nitidez — somente cinco peças

Foi acrescentado **um atlas `refino.png`**, contendo oito frames: cinco substituições, uma borda de terreno e duas amostras de material. Total carregado: **4 atlas, 33 frames registrados** (os cinco recortes de vegetação ocultos continuam arquivados no atlas original, sem entrar no desenho).

| Peça substituída | O que foi refeito | O que não mudou |
|---|---|---|
| `cabana-oeste` | RGB da fonte nativa, máscara preservada e sharpening leve nas telhas/madeira | Caixa original, pé e porta |
| `galpao` | Cobertura metálica e interior/terminais com a mesma restauração localizada | Silhueta, bancada e coordenadas dos monitores |
| `anexo-cais` | Telhado, pilares, janelas e madeira da construção junto à borda direita | Caixa/âncora da construção |
| `caixa-c` | Arestas e ripas da carga com RGB nativo e alpha limpo | Dimensões; apenas o registro visual muda conforme a tabela abaixo |
| `barril-c` | Aros/ripas e contorno com o mesmo tratamento | Dimensões; apenas o registro visual muda |

Os três PNGs anteriores (`estruturas`, `relevo`, `vida`) permanecem **byte a byte intactos**. As demais estruturas não foram repintadas. `refinar-docas-cirurgico.py` faz leitura direta da fonte nativa 1672×941, preserva as máscaras, prepara os frames a densidade 2× e aplica UnsharpMask moderado (raio .65, 75%, limiar 3). Canvas usa amostragem de alta qualidade nos recortes.

**Limite importante:** isso é restauração técnica/re-amostragem com maior densidade de armazenamento, não nova arte gerada, super-resolução neural ou invenção de detalhe inexistente na fonte. Não alegamos aumento real de resolução de origem nem fidelidade pixel a pixel do mapa inteiro.

Para reproduzir:

```sh
.venv/bin/python tools/preparar-docas-encaixe.py
.venv/bin/python tools/refinar-docas-cirurgico.py
```

Dependências de arte: Pillow e NumPy. O segundo comando é idempotente e preserva `baseFrames` no manifesto para rastrear exatamente cada substituição.

## 2. Lado direito do cais: sobreposição, chão e faces

- `margem-direita`: novo recorte de terreno, caixa da planta **(940,480,456,158)**, com as máscaras de prédios/objetos subtraídas. Reconecta a base do anexo, rochas e estacas sem duplicar telhados nas camadas de chão.
- `solo-reparo`: amostra da referência aplicada às junções cinzentas em **x840–1400/y520–642** e sob a torre **x1280–1405/y445–535**. Passa pelo recorte dos polígonos de terra já existentes; não pinta o deck nem cria chão sobre o mar.
- `rocha-reparo`: substitui a aparência de tijolos das faces expostas à direita, apenas em segmentos com **x médio ≥850 e y médio ≥510**, até a profundidade visual já usada (24 pixels da planta). Faces internas são descartadas por amostragem da união da terra.
- As faces são desenhadas antes do piso, as sombras antes dos objetos, e o deck/estacas/embarcações seguem a mesma lista de profundidade anterior.

Coordenadas abaixo em pixels da planta 1568×882, antes de `ESCALA_DOCAS=2.5`. `x,y,w,h` descrevem a caixa da arte, não uma nova colisão:

| Peça | Antes: caixa / pé Y | Depois: caixa / pé Y |
|---|---|---|
| `cristal-c` | `(1003,553,81,71)` / 612 | `(962,558,45,40)` / 598 |
| `caixa-c` | `(940,566,42,42)` / 600 | `(920,551,42,42)` / 585 |
| `barril-c` | `(902,565,30,44)` / 601 | `(892,539,30,44)` / 575 |
| `caixas-b` | `(718,518,73,49)` / 556 | `(698,508,73,49)` / 546 |

O cristal pequeno agora termina antes de x1007, enquanto a caixa do anexo começa em x1010. As caixas próximas ao deck deixam livre o barril metálico existente. Cada peça usa seu **pé corrigido** no z-sort e recebe sombra de contato nesse registro.

Também foi corrigido um defeito de emissão: o halo de `cristal-c` permanecia no Y de origem, **181 pixels abaixo** da peça já transladada. Luzes agora passam pela mesma transformação de posição/escala do objeto; o teste de navegador verifica que o centro do halo fica dentro da caixa visível.

## 3. Cristal gigante sob a construção esquerda

A origem do problema não era o atlas central: o cristal continuava no caminho de desenho de `costaOeste.vegetacao`, sob `anexo-oeste`.

- Antes: aproximadamente **(332.07,347.16,140.33,113.47)**, pé Y449.21.
- Depois: aproximadamente **(258.92,377.26,70.16,56.74)**, centro X294 e pé Y434.
- A borda direita passa de X472.40 para **X329.08**, deixando espaço antes do telhado do anexo em X335.
- A peça é uma cópia de apresentação; `COSTA_OESTE`, blocos e margem não são mutados.
- Cintilações também são reduzidas pela escala da peça; não ficam partículas “gigantes” na posição anterior. O desenho original dos demais elementos da costa continua igual.

## 4. Mar superior, tentáculos e horizonte

Novo módulo de apresentação: `docas-mar-superior.js`.

- Ondulações em uma grade de coordenadas de mundo, limitada ao viewport e com orçamento de até 1.200 candidatos. Funciona com X/Y negativos; não usa o tamanho do canvas de terreno como limite do mar.
- Névoa/horizonte em elipses suaves, sem painel opaco nem borda horizontal rígida.
- Três tentáculos adicionais nas raízes **(157,250)**, **(274,190)** e **(1475,433)**, escalas .70/.38/.48 e fases distintas. Reutilizam as folhas animadas existentes do Tentáculo 02; nenhum desses atlas foi alterado.
- Anéis elípticos magenta e reflexos quebrados reforçam a linha d’água, além da espuma/reflexos/gotas existentes do atlas. São desenhados antes do terreno e das entidades, portanto não atravessam construções.
- Nenhum tentáculo adiciona hazard, dano, bloqueio, interação ou item ao save. Os tentáculos antigos e a animação do mar/cais/barcos não foram substituídos.

## 5. Vegetação sem apoio e vida ambiente

Foram retirados **somente da lista de desenho** os recortes `palmeira-a`, `palmeira-b`, `palmeira-d`, `palmeira-e` e `arvore-seca`, que apareciam sobre água/névoa sem terreno de apoio. Não foram deslocados para uma porta ou corredor só para preencher espaço.

As palmeiras da costa já boas e `palmeira-c`, enraizada junto à cabana direita, continuam desenhadas/animadas. Foram adicionadas três aves distantes e sete pequenos pontos de cardume bioluminescente no mar superior. São fauna **visual**, não entidades de missão ou animais interativos.

Todas as poses, ondulações, fauna e névoa usam o relógio visual já existente. Movimento reduzido mantém o desenho estático; não há `setInterval`, tempo de missão alternativo ou RNG por frame.

## Validação executada

- Suíte completa Node (`tests/*.mjs`): **208 sucessos, 10 opcionais ignorados, 23 falhas preexistentes**. As mesmas 23 falhas foram reproduzidas numa extração dos módulos/testes do commit-base `1fb2a0d` nesta execução; nenhuma foi escondida ou corrigida fora do escopo.
- `docas-central.mjs`: oito hashes protegidos continuam iguais (layout, geometria/colisões, cais, costa oeste, spawns, objetos de missão, portais e elementos marítimos).
- `docas-cirurgico.mjs`: cinco substituições sem mudança de escala física, cristal livre da cabana, remoção dos cinco recortes sem apoio, caixas/cristal separados, mar em Y negativo e estabilidade em movimento reduzido.
- `docas-encaixe.mjs`/`.py`: quatro atlas, 33 frames, UVs, gutters, transparência, RGB invisível limpo, origem, fallback e profundidade. Os testes de contagem foram atualizados para o novo atlas/material, não para afrouxar os contratos de gameplay.
- Chromium, executados com navegador configurado:
  - `docas-cirurgico-browser.mjs`: câmera norte e além de Y=0, animação do oceano isolada de barcos, redução/retomada, halo aderente ao cristal, storage e estado intactos, sem erros HTTP/JS.
  - `docas-encaixe-browser.mjs`: UVs reais dos recortes substituídos, oclusão com personagem, cinco animações isoladas e repouso estável.
  - `docas-central-browser.mjs`: prévia e retomada sem gravação de preferências/save.
  - `docas-gameplay-live-browser.mjs`: index real, menu/save/RAF, barco/água/tentáculo, reload, movimento reduzido e calibração.
  - `docas-pesqueiro-03-browser.mjs`: folhas e ordem costa/mar/casco.
  - `dimension-rupture-browser.mjs`: terminal → Nulo → ruptura → 3D/Limiar → Esc/2D, sem alterações em referências, vitais ou resultado.
- Boot/imports e `git diff --check` aprovados.

Falhas preexistentes: `caminho-correntes`, `combat-basic`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-ecos`, `enseada-reconstrucao`, `limiar-frequencia`, `nado-desenho`, `oceano-animado`.

## Limite mantido

A costa e as embarcações preservadas ainda não são geometricamente idênticas à pintura de referência. Esta revisão não altera a planta física para simular essa igualdade e não reabre a reconstrução geral: corrige os contatos, sobreposições e recortes apontados, com comparações reais disponíveis acima.
