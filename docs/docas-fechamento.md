# Docas da Neblina — fechamento de área

Base: `66f4a3c`. Este passo trata a casinha esquerda, a encosta atrás das casas, a margem direita e o mar perimetral. **Não altera o topo do farol, a estrutura/cristal ciano do portal, sua porta, suas poses nem seus atlas.**

## Resultado

- [Prévia animada com seis setores](previa-docas-fechamento.html): completo, centro, norte, leste, sul e oeste. Mesmo renderizador do jogo; sem leitura/gravação de save ou preferência persistida.
- [Comparação com a referência](../qa/docas-fechamento-comparacao.jpg).
- [Mapa completo](../qa/docas-fechamento-completo.png), [casinha/encosta](../qa/docas-fechamento-esquerda.png) e [mar leste](../qa/docas-fechamento-mar-leste.png).

## Arte nova — 3 imagens, 1 atlas adicional

Foram geradas **três artes novas independentes**, todas guiadas por `assets/sprites/docas-neblina/referencia.png`, idêntica ao anexo. Não são recortes ampliados da pintura anterior:

1. `casinha-esquerda.png`: cabana pequena isolada, telhas metálicas gastas, madeira escura, janelas e degrau. Substitui somente a representação de `anexo-oeste`, preservando seu pé Y451 e uma caixa próxima à referência: **(337,369,123,88)**.
2. `encosta-viva.png`: uma peça conectada de rocha, raízes, três palmeiras, árvore seca, arbustos e cristais pequenos. Caixa **(425,165,423,225)**, pé visual Y388, atrás das construções. Todos os troncos pertencem ao mesmo apoio rochoso; não reativa os cinco recortes flutuantes ocultados anteriormente.
3. `margem-rochosa.png`: borda baixa de basalto irregular, musgo, arbustos e cristais/corais, reutilizada sob o anexo direito **(1053,600,197,56)** e no flanco leste **(1280,539,128,55)**.

As fontes ficam em `assets/source-art/docas-fechamento/`. `tools/preparar-docas-fechamento.py` remove o chroma, reduz spill verde e produz **um atlas PNG RGBA** com gutters transparentes e RGB invisível limpo, em `assets/sprites/docas-fechamento/`. Há agora cinco atlas de cenário carregados (os quatro existentes + um novo), abaixo do limite de dez imagens novas. A porta da casinha recebe interior escuro, não transparência mostrando o mar através da parede. Um teste de imagem impede a regressão de um retângulo de fundo opaco.

A encosta é **relevo cênico não transitável**, não uma extensão de piso: não cria terreno caminhável nem muda a máscara física. É desenhada atrás dos prédios/personagem. O balanço mínimo é ancorado na base e mantém as raízes em contato com a própria rocha.

## Faixa da encosta e margem direita

- Nove pontos de vagalumes/brilho ambiente na faixa de vegetação; dois pequenos caranguejos visuais junto à margem. Não são atores de missão nem novas interações.
- Cinco props existentes reaproveitados, com sombra e pé na mesma ordenação de profundidade do personagem:

| Prop | Centro/pé na planta | Largura |
|---|---:|---:|
| Arbusto costeiro | (1374,488) | 34 |
| Arbusto costeiro | (1309,477) | 25 |
| Rochedos | (1327,503) | 31 |
| Cristal violeta | (1355,519) | 18 |
| Coral/pedra | (1381,531) | 24 |

- Os cinco apoios são validados sobre terra existente; não ocupam o topo reservado para a próxima etapa.
- As duas peças de margem são desenhadas depois do relevo estático e antes das construções e do deck; não encobrem janelas, não mudam o z-sort de barcos e não são um painel de água opaca.
- As junções de solo à direita recebem base de cor mais uniforme e apenas 16% da textura anterior, reduzindo a repetição evidente de ladrilhos sem mudar seu recorte de terra.
- Três boias adicionais usam o atlas animado já existente: **(1214,696)**, **(1274,766)** e **(1434,572)**, com balanço, halo âmbar e anel na linha d’água. As antigas permanecem; nenhum dado de `map.marDocas` é alterado.

## Água em todo o perímetro

`docas-mar-perimetral.js` reutiliza **as mesmas folhas pintadas de onda/ressaca, cáustica e névoa do cais** e a mesma `faseRessaca`/relógio visual. Não troca o sistema de contato dos cascos nem os movimentos das embarcações.

- Grade de coordenadas de mundo cobrindo o viewport, inclusive X/Y negativos e além do canvas do terreno. Até 360 células candidatas por chamada; largura/fase determinísticas, sem RNG por frame ou canvas novo por frame.
- Cor-base/reflexos azuis graduais aproximam as regiões norte/leste/sul da água do cais, sem um painel retangular opaco.
- Ondulação, brilho/cáustica e névoa animados nos quatro lados; o novo reforço de ondas cai suavemente a zero no setor já finalizado de barco/água oeste (X100–920/Y510–900).
- Cada polígono de terra, deck e bloqueio é removido do recorte separadamente. Isso é importante: uma única máscara even-odd com todas as peças reaplicaria água nas interseções de dois polígonos. O teste Chromium verifica também essa sobreposição.
- A nova água é desenhada depois do mar oeste, mas antes de terreno, construções, deck e cascos. As margens cênicas e pilares ficam à frente dela.
- Modo reduzido produz pixels estáveis nos quatro setores; retomada volta ao relógio visual normal. Não altera o contador da missão.

## O que ficou intacto

- Atlas/metadados de `farol`, `camara` e `porta`, cobertura do topo, emissão ciana, luz e movimento do farol. Hashes de cada frame protegido fixados em `docas-fechamento.mjs`.
- Os quatro atlas de encaixe anteriores e todos os atlas de cais, barcos, Tentáculo 02 e água existentes.
- Layout, polígonos físicos, bloqueios, spawn points, objetos de missão, portais e lista marítima: os oito contratos hash de `docas-central.mjs` continuam aprovados.
- Controles, câmera do jogo, movimentação/colisão, saves, missão e `DimensionManager`. A nova câmera por setor pertence somente à prévia isolada.
- Se o atlas novo não carregar, a representação anterior continua disponível; os prédios principais/cais não desaparecem.

## Validação desta execução

- Suíte completa `tests/*.mjs`: **209 sucessos, 11 opcionais ignorados e 23 falhas preexistentes**. Todas as 23 foram reproduzidas em extração local dos módulos/testes do commit-base `66f4a3c`.
- `docas-fechamento.mjs`: fontes/atlas/gutters, orçamento/determinismo, boias na água, props sobre terra, fallback e hashes do topo.
- `docas-fechamento.py`: recortes transparentes, ausência de chroma verde, gutters/RGB invisível e proteção contra fundo opaco na casinha.
- Chromium executado explicitamente:
  - `docas-fechamento-browser.mjs`: água **isolada** nos quatro lados (não passa só porque o barco se mexe), repouso estável, exclusão de terra/deck/bloqueios/sobreposições, artes novas animadas, integração no render real, câmeras e storage intacto.
  - `docas-cirurgico-browser.mjs`: câmera norte/Y negativo, oceano/tentáculos, halo aderente e estado/storage.
  - `docas-encaixe-browser.mjs`: UVs/oclusão com personagem e animações isoladas.
  - `docas-gameplay-live-browser.mjs`: index real, menu/save/RAF, mar/barcos/tentáculo, reload e calibração.
  - `docas-pesqueiro-03-browser.mjs`: folhas e ordem costa/mar/casco.
  - `dimension-rupture-browser.mjs`: terminal → Nulo → ruptura → Limiar 3D → Esc/2D, referências/vitais/resultado preservados.
- `estrutura.mjs`, boot, contratos de Docas e `git diff --check` aprovados.

Falhas preexistentes: `caminho-correntes`, `combat-basic`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-ecos`, `enseada-reconstrucao`, `limiar-frequencia`, `nado-desenho`, `oceano-animado`.

## Limites e condição de merge

O resultado usa a referência como direção visual, mas **não é idêntico pixel a pixel**: costa e embarcações preservadas têm geometria diferente, e as três artes novas são interpretações de maior definição. Também não seria correto chamar a suíte geral de “sem falhas”, pois há 23 falhas herdadas.

O pedido condicionou o merge automático à ausência de falhas. Embora nenhuma regressão tenha sido identificada e os testes específicos tenham passado, a suíte geral ainda apresenta as 23 falhas herdadas descritas acima. Por cautela, o PR fica aberto para revisão, sem merge automático; é necessária confirmação para mesclar com essas falhas conhecidas. Não alteramos testes antigos ou a malha física para mascarar esse resultado.
