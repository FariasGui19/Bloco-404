# Evolução dimensional — etapa 1 / Setor Limiar

## Como experimentar

Sirva o repositório por HTTP (sem build, sem CDN, sem instalar dependências de runtime):

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

1. Abra `index.html`, continue/crie um perfil e conclua a escolha do arquétipo.
2. Em um mapa 2D, fora de diálogos, cutscenes, travessias e menus, clique em **◇ 3D // SETOR LIMIAR**, no alto da tela.
3. A ruptura inclina/desfaz uma captura do Canvas 2D, enquanto a câmera 3D sai de uma vista elevada e chega à terceira pessoa.
4. Alcance o núcleo no cume e pressione **E**. A estabilização registra `progress.flags.dimensionalAnchorStabilized` no save atual.
5. **Esc** ou o botão de retorno recompõem a sessão 2D, no mesmo mapa e coordenadas de antes.

Há também um laboratório independente em [`setor-limiar-3d.html`](setor-limiar-3d.html): escolha qualquer um dos quatro arquétipos sem criar perfil. **Esse laboratório não lê nem grava saves**. O teste de integração principal usa o jogo completo, não o laboratório.

Entrada por evento para futuros marcos narrativos:

```js
window.dispatchEvent(new CustomEvent('bloco404:rupture'));
```

O evento usa os mesmos bloqueios de segurança do botão. Nesta etapa, não altera automaticamente a conclusão de missões antigas nem conecta compulsoriamente a campanha à nova dimensão. `window.__dimension404` expõe o gerenciador para inspeção/debug.

## Entrega 1 — ponte transacional

`js/dimension/dimension-manager.js` é independente de DOM e Three.js. Estados: `2d → loading → entering → 3d → exiting → 2d`.

- Three.js local, já licenciado em `js/vendor/`, é carregado pela nova camada somente após a entrada deliberada.
- O loop existente entrega seus frames ao módulo e deixa de executar toda a simulação/HUD 2D enquanto o gerenciador está ativo. Não existe segundo RAF de gameplay no módulo integrado. A Cidadela retro-FPS existente não é usada como ponto de entrada nesta etapa.
- Mapa, posição, direção e alvo 2D são preservados. Coordenadas 3D são separadas e nunca são escritas em `state.player.x/y`.
- Vida, energia, inventário, arquétipo e nível usam os próprios objetos de `state`: não há inventário paralelo, cópia divergente de progresso ou nova versão obrigatória de save.
- Energia de turbo é consumida e regenerada no estado compartilhado; a exploração não concede cura, níveis ou XP artificiais.
- Entrada duplicada é rejeitada. Cancelamento durante importação descarta uma inicialização tardia. Falha de WebGL, erro de frame e perda de contexto devolvem o controle ao 2D.
- Retorno descarta geometrias, materiais, texturas, contexto WebGL, listeners e teclas seguradas. Reentrada cria um runtime novo.
- Sons sintetizados de ruptura/âncora são opcionais, inicialmente desligados, sem autoplay. A preferência de movimento reduzido elimina a rotação de ruptura sem esconder o alerta textual.

Narrativa apresentada: o plano isométrico era a contenção usada para estabilizar a consciência; a ruptura permite descompressão espacial. A Âncora estabiliza a exploração, sem reescrever os eventos antigos.

## Entrega 2 — primeiro setor aberto

`sector-data.js` define a planta e a função de altura; `sector-scene.js` constrói a cena procedural.

- Área física de 256 × 256 m, com oceano visual estendido ao horizonte e limites seguros de exploração.
- 64 setores de 32 m, malha de terreno com passo de 2 m, alturas reais, encosta principal e mesa com escarpa escalável.
- Colunata quebrada, sete plataformas suspensas com progressão de altura alcançável pelo pulo, portal arruinado no horizonte.
- Píer elevado com estacas, barco navegável, farol com galeria, lanterna e feixe giratório, núcleo pulsante no cume.
- Formas orgânicas facetadas para operador, árvores e rochas; texturas procedurais pequenas com `NearestFilter`, iluminação Lambert/Phong simples, Hemisphere/Directional + dois PointLights, `FogExp2`.
- Água semitransparente com ondas geométricas e textura em movimento; partículas submersas e mudança de cor/neblina/overlay conforme a câmera mergulha. Não usa refração física ou pós-processamento pesado.
- HUD separada: identificação do traje, nível, vida/energia, altitude/profundidade/velocidade, bússola, minimapa e contador de desempenho real.

### Orçamento e desempenho

- Ativação por distância de setores residentes em memória, frustum culling padrão e batching estático por material. **Não é streaming de disco/rede de um mundo infinito.**
- Geometrias e texturas compartilhadas/batcheadas onde apropriado; sem shadow maps, SSAO, reflexos de tela ou dependências de rede.
- Sombra circular acompanha terreno, plataformas e superfície do mar; em mergulho, acompanha o fundo.
- Resoluções de render 60%, 85% (padrão) e 100%, pixel ratio fixo de 1; UI fica nítida na resolução CSS.
- A física usa subpassos pequenos, independentes da malha visual. Altura de colisão interpola exatamente os mesmos triângulos do terreno desenhado.
- O contador de FPS mede tempo real de parede, não o delta limitado da simulação. Na validação headless deste ambiente, **SwiftShader por software mediu aproximadamente 4–6 FPS**, com cerca de 19–21 mil triângulos e 77–104 draw calls em vistas amostradas após batching. Isso valida execução e orçamento geométrico, **não comprova 60 FPS em GPU real**.
- 60 FPS permanece uma meta de profiling em hardware de destino, não uma promessa universal. Dispositivos móveis de entrada ainda precisam de medição própria.

## Entrega 3 — operador, física e controles

`controller.js` não depende de Three.js e pode ser testado em Node. `operator.js` monta uma hierarquia articulada de geometrias low-poly.

| Comando | Função |
|---|---|
| WASD | Movimento relativo à câmera |
| Arrastar mouse / dedo | Órbita da câmera |
| Roda do mouse | Distância da câmera |
| Espaço | Pulo / subir em voo ou nado |
| Ctrl | Descer em voo / mergulhar com Maré Astral |
| Shift | Impulso terrestre / turbo com consumo de energia |
| F | Ativar/desativar voo do Núcleo X10 |
| E + avançar | Escalar encosta íngreme |
| E | Estabilizar núcleo / embarcar / desembarcar |
| Q | Trava opcional na Âncora, alvo não hostil de teste |
| Esc | Retorno ao 2D, inclusive durante carregamento |

- Núcleo X10: asas, propulsores, voo omnidirecional, subida/descida, turbo, inclinação ligada à velocidade e à curva real; pouso por contato ou desativação do voo.
- Maré Astral: nadadeiras/aura emissiva e nado com profundidade livre. Outros módulos têm flutuação de superfície.
- Bio-Forja: silhueta de armadura mais pesada e locomoção diferenciada; Lâmina: acessórios e lâmina energética próprios. Não foi criado um novo arquétipo de campanha chamado Casco Titânio; os quatro IDs existentes foram preservados.
- Gravidade, pulo, impulso, aterrissagem e bloqueio de paredes/tetos/plataformas usam cápsula aproximada e caixas sólidas, com deslizamento por eixos. A câmera testa o segmento até o personagem contra terreno e arquitetura, inclusive após suavização.
- Embarcação responde a WASD/turbo, permanece no mar e permite desembarque; junto ao píer, retorna ao deck.
- Controles de toque básicos aparecem em dispositivos de ponteiro grosso.

## Escopo deliberado desta etapa

Esta entrega é uma **fundação jogável e reversível**, não a conversão de todo o jogo para 3D. A campanha, os sistemas de combate/arquétipos, missões, inventários e mapas 2D continuam no caminho original. O sandbox ainda não porta inimigos, combos, veículos de outros mapas, árvore inteira de transformações, escalada com IK, nem IA de mundo aberto. A mira de teste aponta para o núcleo; não simula combate já implementado. A posição 3D não é persistida entre visitas/reloads: a entrada volta ao spawn do setor e o save continua apontando ao mapa 2D seguro.

## Validação executada

Sem navegador:

```sh
for t in dimension estrutura boot input-ataque progressao rpg prologo-save docas-animation docas-neblina docas-inicio docas-costa-oeste docas-vila-04; do
  node --experimental-default-type=module tests/$t.mjs
done
```

Com Chromium/Playwright e um servidor estático já iniciado:

```sh
BROWSER_EXECUTABLE=/caminho/chromium \
PLAYWRIGHT_MODULE=/caminho/playwright-core/index.mjs \
BROWSER_LIBRARY_PATH=/caminho/libs \
node --experimental-default-type=module tests/dimension-browser.mjs
```

`dimension.mjs`: transação/reentrada/cancelamento/falha, identidade dos objetos compartilhados, preservação de vitais e coordenadas, pulo, voo, mergulho, flutuação, limite aéreo, embarcação, parede do farol e escarpa que exige escalada.

`dimension-browser.mjs`: menu e save reais, WebGL real via SwiftShader, WASD, voo, câmera orbital, alteração de resolução, Âncora persistida, pilotagem/desembarque, ida e volta, troca de modelo/mergulho de Maré, reentrada, perda de contexto e ausência de WebGL. Sem erros inesperados de página, console ou HTTP (a mensagem Three.js de contexto indisponível é esperada no teste de falha).

Também passou `docas-gameplay-live-browser.mjs`: as animações e os modos de movimento do jogo anterior continuam funcionando no loop real. O laboratório foi inspecionado em viewport desktop e estreito, sem erros de página/console.

Relatórios e capturas locais ficam em `.qa/`, ignorados pelo Git; não são necessários para executar o jogo.

## Lapidação linear — base ambiental 01

A primeira revisão visual está descrita em [limiar-base-ambiental-01.md](limiar-base-ambiental-01.md): terreno orgânico, costa/água por profundidade, iluminação e céu/névoa. O perfil ambiental e o bake foram separados para reaproveitamento em outros mapas. Os dados físicos, estruturas e controlador desta etapa continuam os mesmos. A animação da água agora é feita no shader, sem reescrita de vértices pela CPU por frame. As medições anteriores acima são histórico da primeira etapa; consulte o novo documento para os contadores desta revisão.


## Estruturas e composição — Passo 2

Veja [limiar-estruturas-02.md](limiar-estruturas-02.md) para os marcos modulares, densidade, rotas protegidas, acesso ao píer, índice espacial e novos contadores. O controlador e a base ambiental são preservados; animações/personagens do Passo 3 e progressão do Passo 4 não foram antecipados.


## Personagem e câmera — Passo 3

Veja [limiar-personagem-03.md](limiar-personagem-03.md): apresentação modular por estados, articulações e enquadramento limitado por velocidade, preservando o controlador e a colisão de câmera. A progressão do Passo 4 continua pendente.


### Revisão de identidade lvl 1

A [revisão do Passo 3](limiar-identidade-lvl1-03.md) substitui o operador genérico por rosto/cabelo/óculos/tatuagens e trajes baseados nas sprites disponíveis. Acrescenta ações espaciais e integração às formas nativas, sem liberar níveis ou implementar missões do Passo 4.


### Passo 3B.1 — escultura exclusiva

A [revisão de escultura](limiar-escultura-3b1.md) refina rosto volumétrico, proporções e identidade dos quatro trajes. O laboratório ganhou inspeção de frente/três-quartos/costas com o mesmo modelo do jogo principal. Não altera habilidades ou mapa; Passos 3B.2 e 3B.3 permanecem pendentes.
