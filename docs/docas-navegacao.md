# Docas — navegação contínua e vida ambiental

## Escopo

A arte aprovada não foi redesenhada. Os PNGs/atlases, barcos, cais, construções, terreno renderizado e sistemas do jogo permanecem intactos. Não foram necessárias novas sprite sheets.

### Colisão

- Nova planta física em `js/data/worlds/arquipelago-rotas-perdidas/docas-navegacao.js`, separada dos polígonos do terreno renderizado e do layout histórico. Registro no mesmo espaço 1568 × 882 da composição.
- `collision.js` opta por essa planta somente quando o mapa declara `navegacaoDocas`. Os demais mapas continuam usando o caminho anterior.
- União de pisos contínuos para praia oeste, pátio, soleira oeste, cais e acesso, margem sudeste, escadarias, base do farol e plataforma do núcleo. As junções não são tratadas como paredes internas entre polígonos sobrepostos.
- 27 pegadas sólidas: rochas/banco costeiro oeste, abrigo/cristais/palmeiras/cerca oeste, cabanas, console CRT central, anexo do cais, vigia, farol, pedestal/console do núcleo, cristal da trilha, palmeira do pátio, caixas, barris e cercas dos fundos. Os volumes seguem as bases, não os retângulos dos telhados/copas.
- Água profunda e bordas sem piso continuam bloqueadas. As pegadas sólidas usam distância exata círculo/segmento; a sustentação do círculo na união de pisos verifica centro e 32 pontos de perímetro.
- `tileAt` e `hitsWall` consultam a mesma fonte contínua. Movimento, deslizamento, raio do jogador e subpassos de 0,08 tile não foram alterados.
- **Três marcadores físicos do núcleo foram realinhados:** origem `(1190,220) → (1185,193)`, retorno `(1240,250) → (1240,206)` e memória `(1300,210) → (1300,187)`. As posições antigas, sobretudo retorno, estavam na face da falésia da composição atual. Corrigir a posição evita liberar a falésia como chão para tornar a interação acessível. IDs, textos, efeitos de missão, âncora final e distância de interação não mudaram.
- Os snapshots de terreno/layout, cais, costa, spawns, portais e mar permanecem iguais. Só o snapshot de objetos foi atualizado para os três deslocamentos acima. Testes antigos de rota agora amostram quartos de tile, sem exigir degraus artificiais de um tile inteiro nas escadas diagonais.

### Animações

A auditoria confirmou animações existentes para janelas/luzes, CRTs, varredura/pulso do farol, sinal vermelho da torre, tentáculos/anéis, cristais, mar/reflexos e bancos de névoa. Foram reutilizadas, sem empilhar efeitos redundantes ou alterar os topos das estruturas.

A camada nova do recanto oeste ainda desenhava suas palmeiras e árvore estáticas. Agora ambas recebem oscilação discreta, com pivô no pé registrado, mantendo ordenação por profundidade e recorte local. A intensidade da árvore seca é menor que a das palmeiras. O tempo vem do relógio visual existente, não do cronômetro da missão. O modo reduzido congela a transformação. Solo, abrigo e cerca não balançam junto.

## Prévia

Abra `docs/previa-docas-navegacao.html` em servidor HTTP. WASD/setas movem um marcador usando `moveWithCollision`; não é um segundo controlador do jogo. Verde indica os pisos candidatos, vermelho os sólidos; a área realmente transitável é a união verde menos os sólidos e a margem do raio. O overlay não faz parte do jogo publicado. Nenhum save/preferência é escrito pela prévia.

Captura: `qa/docas-navegacao-colisoes.png`.

## Validação executada

- **229 suítes Node sem navegador:** 206 passaram; 23 falharam. As mesmas 23 falhas foram reproduzidas em extração do HEAD anterior às alterações, sem trocar de branch. Nenhuma falha nova remanescente nesse conjunto. Testes de performance/relevo da praia rodaram serialmente.
- **10 suítes Chromium passaram:** oeste-pontual, fidelidade, acabamento, fechamento, encaixe, cirúrgico, pesqueiro-03, gameplay-live, dimension-rupture e navigation. As outras 11 suítes browser do repositório não foram executadas nesta rodada.
- Um primeiro teste concorrente de ruptura estourou o prazo da captura de tela; reexecutado sozinho, passou. O fluxo real terminal final → diálogo do Nulo → sequência → Limiar → Esc/2D passou, com referências/vitais/resultado preservados.
- `docas-navigation.mjs`: **12.474 arestas percorridas com o movimento real subpassado**, sete setores alcançados (oeste, píer, pátio, torre, subida, farol e núcleo), todas as interações/portas e âncora final acessíveis; 27 centros sólidos bloqueados e sondas de mar/falésia rejeitadas.
- Ida/volta física entre cais/oeste e cais/plataforma superior nos testes de costa/relevo. Spawns de retorno e interiores válidos no teste de missão.
- Chromium verificou movimento por teclado na prévia, animação efetiva das duas camadas vegetais, estabilidade no modo reduzido, ausência de alterações no localStorage e ausência de erros de página.
- Teste oeste preserva **zero pixels alterados fora do recorte aprovado** (incluindo tolerância de antialias definida pelo teste), ordenação das seis camadas e fallback de assets.
- Teste gameplay-live confirmou menu/save/RAF real, animações enquanto o cronômetro aguarda em 10:00, movimento reduzido/retomada, reload e calibração.
- `git diff --check` passou. `DimensionManager`, `js/dimension/rupture.js`, inventário, controles e implementação de saves/HUD não foram editados.

A travessia integral foi automatizada pelo motor de movimento; não deve ser confundida com uma sessão manual humana em todos os setores. O teclado foi exercitado em Chromium e a ruptura final foi executada no jogo real.

### Falhas herdadas reproduzidas (23)

`caminho-correntes`, `combat-basic`, `enseada-ecos`, `nado-desenho`, `docas-lote5/8/9/10/11/12/13`, `enseada-2-lote4/5/6/7/8/9/10`, `enseada-3-reference`, `enseada-4-lote`, `enseada-reconstrucao`, `limiar-frequencia`, `oceano-animado`.

### Comandos principais

```sh
node --experimental-default-type=module tests/docas-navigation.mjs
node --experimental-default-type=module tests/docas-neblina.mjs
node --experimental-default-type=module tests/docas-relevo.mjs
node --experimental-default-type=module tests/docas-costa-oeste.mjs
# Servidor HTTP em 8000; configure os três caminhos conforme seu Chromium.
BROWSER_EXECUTABLE=/tmp/chromium \
PLAYWRIGHT_MODULE=$PWD/.qa/node_modules/playwright-core/index.mjs \
BROWSER_LIBRARY_PATH=/tmp/al2023/lib \
node --experimental-default-type=module tests/docas-navigation-browser.mjs
```
