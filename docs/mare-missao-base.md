# Maré Cromática — base jogável da baía

> **Registro histórico desta versão.** Para jogar a missão atual, veja [Baía de Quarentena — circuito H-03](mare-missao-lote13.md). O percurso de memórias/terminal e o antigo fim por sabotagem descritos abaixo foram substituídos pela ativação de três sistemas e pela estabilização do portal.

## Escopo entregue

Base independente de primeira pessoa, inspirada na linguagem PSX/terror analógico, sem reutilizar a física do Setor Limiar. Baía 32×32 com quatro cabanas atravessáveis, rotas externas conectadas e portas abertas reais. Renderização por raycaster Canvas 384×216, travessia DDA de no máximo 64 células por coluna, profundidade para sprites e distância limitada. Não há dependência de WebGL para esta missão. Não é uma promessa de FPS em celulares, nem uma otimização dos mapas 2D existentes.

Dez fontes originais em `assets/source-art/mare-missao-base/`, dez derivados leves em `assets/sprites/mare-missao-base/` (~300 KiB no total): madeira salgada, concreto marinho, porta naval, piso/resina, terminal, gravador, resíduo, âncora, Nulo e infectado. Os quatro primeiros são texturas; os demais são billboards com transparência. `tools/preparar-mare-missao.py` reproduz os derivados com Pillow. Nenhuma arte exterior aprovada das Docas foi substituída.

- Movimento com aceleração/frenagem, deslizamento e colisão por raio; WASD, setas/arrasto para olhar, botões de toque.
- Três memórias, fita de evacuação, terminal central de recompilação e âncora primária. As memórias ficam nas cabanas noroeste, nordeste e sudoeste; a âncora fica na sudeste.
- Domínio **local** 1→4, independente do nível global. Colete as três memórias e use E no terminal para recompilar. Identidade, inventário e vida global não são consumidos.
- Q: radar/distâncias da Maré Astral; repulsão/cegueira do Núcleo; proteção do Domínio; recuperação maior de tensão da Bioforja. Todas possuem proteção curta e recarga reduzida pelo domínio. São especializações iniciais, não árvores de habilidades completas.
- Nulo observa ao norte. Dois perseguidores começam a avançar após 60 segundos e aceleram contra ociosidade. Tensão máxima recupera o eco junto do terminal, sem game over ou descarte de dados.
- Névoa por distância, teto escuro dentro de cabanas, água/resina com ondulação discreta, oscilação de infectados e interferência reduzida quando o navegador solicita menos movimento.
- Áudio **opt-in** sintetizado: mar/vento filtrado, drone cuja frequência cresce, passos, sinais de rádio e interações. Não troca a trilha 2D existente. Sem gravações vocais nem trilha industrial composta nesta base.
- A tentativa de extração no domínio 4 **sempre** sofre sabotagem. O prazo de 600 segundos também leva à mesma falha narrativa. Mensagem por quatro segundos → ruptura existente → Setor Limiar. Nunca game over.

## Integração e persistência

`cromatica_limiar_final` solicita a baía após a âncora estável. O diálogo deve fechar e as guardas usuais devem permitir a entrada. `ui.js` seleciona o runtime pelo motivo `mare-cromatica:baia-v1`; `DimensionManager` continua responsável por snapshot, pausa do 2D, ESC, erro e descarte. Nenhum contrato de `rupture.js` foi alterado.

`progress.mareMission`: versão, IDs de dados, rank, tempo acumulado ativo e conclusão. Salva a cada cinco segundos, interação e saída. Reentrada posiciona no acesso sul; preserva dados/domínio/tempo, não a posição dos perseguidores. ESC pausa a ameaça e permite nova tentativa pelo objeto da Fenda. Pedidos de ruptura legados já existentes continuam pelo caminho anterior. Sandbox 3D continua independente.

No encerramento, solicita `requestRupture`, sai transacionalmente ao ponto 2D e deixa o bridge existente abrir o Setor Limiar. Se o recurso não carregar, limpa a montagem temporária e retorna com erro recuperável. Os listeners de missão, áudio e controles são descartados.

## Validação

- `node --experimental-default-type=module tests/mare-mission.mjs`: conectividade de todas as cabanas/objetivos, bloqueio por domínio, coleta idempotente, recompilação, colisão radial e retomada.
- Suites existentes `dimension.mjs`, `dimension-rupture.mjs`, `cidadela-progressao.mjs`.
- `tests/mare-mission-browser.mjs`: Chromium real, DOM/manager de produção isolados; movimento por teclado, interações, decodificação das dez artes, saída e preservação de estado, timeout, áudio opt-in e rollback de falha de imagem. Posições dos objetivos são preparadas pelo teste; **não é um percurso manual completo**.
- `tests/dimension-rupture-browser.mjs`: jogo/menu/save reais, diálogo da Fenda, entrada da missão, objetivos preparados, sabotagem, bridge para o 3D existente e retorno ao 2D.
- Capturas `qa/mare-mission-baia.png` e `qa/mare-mission-cabana.png`, revisadas visualmente. São imagens da base, não concept art.

Dependências locais de QA (ignoradas): `npm install --prefix .qa --no-save playwright-core @sparticuz/chromium`. O teste isolado usa esses pacotes. Em ambientes mínimos, Chromium pode precisar das bibliotecas al2023 fornecidas pelo pacote em `LD_LIBRARY_PATH`.

## Próximos refinamentos (não entregues como completos)

Retratos corrompidos próprios, variedade de cabanas e mobiliário, costa com relevo e água física, combate/munição/biomassa completos, trilha de perseguição composta, sabotagem de terminais em múltiplas etapas, navegação de inimigos por portas e adaptação tática profunda por arquétipo. A IA atual pode ficar bloqueada por uma cabana; não usa pathfinding e não é uma elite finalizada. As paredes possuem escurecimento lateral, não sombras dinâmicas físicas. O mapa contém exploração livre em escala contida, não um mundo aberto extenso. A chegada 3D reutiliza o Setor Limiar existente, sem novo capítulo de redenção ainda.

A suíte completa histórica não foi executada nesta rodada; falhas antigas registradas em tarefas anteriores não são declaradas resolvidas.

Resultado desta rodada: quatro suites Node e duas suites Chromium passaram. A tentativa de executar os dois Chromium simultaneamente excedeu o timeout de captura; os testes foram repetidos **sequencialmente** e passaram. Não foi considerado sucesso da execução paralela.

## Continuação

O lote 2 (`docs/mare-missao-lote2.md`) adiciona dez originais, props opcionais, perseguição compartilhada, fôlego/tração e camadas de áudio sem alterar o contrato desta base.
