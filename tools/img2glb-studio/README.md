# Teste de GLB · BLOCO 404

Laboratório isolado para visualizar um **GLB pronto** no Setor Limiar. A antiga tentativa de reconstrução a partir de imagens, seus controles e o servidor TripoSR foram removidos. O laboratório não altera arquivos, controles, HUD, câmera, colisão, `DimensionManager` ou `rupture.js` do jogo.

## Usar

Na raiz do repositório, inicie um servidor HTTP:

```sh
python3 -m http.server 8000
```

Abra <http://localhost:8000/tools/img2glb-studio/> e escolha **Abrir arquivo .glb**. O arquivo fica apenas na memória do navegador; nenhum upload ou gravação de save é feito. O operador é substituído visualmente até escolher **Restaurar operador** ou fechar a página. WASD move, arrastar o mouse orbita, a roda aproxima/afasta e espaço pula; em telas de toque há botões para movimento e pulo. **Girar 180°** corrige modelos voltados para trás.

O laboratório executa o mesmo runtime, terreno, iluminação, câmera, controlador e colisões do Setor Limiar 3D com um estado de jogo separado. Não é o jogo principal nem aplica o modelo automaticamente a uma partida real. A escala é normalizada para 1,85 m e o pivô é posicionado no centro e na base da pose carregada, sem alterar o arquivo. Modelos com posições de origem ou animações incomuns podem precisar ser preparados antes no Blender ou outro editor.

GLBs com ou sem esqueleto e animações são aceitos. Escolha um clipe específico para inspecioná-lo em loop. No modo automático são reconhecidos nomes como **Idle**, **Walk**, **Run**, **parado**, **andar** e **corrida**, conforme a velocidade; se não houver nome correspondente, não inventamos uma animação. Sem clipes, o modelo permanece estático. Não há retargeting, ajuste de rig, sincronização de ações, compensação de root motion ou IK: se o clipe desloca a raiz, o visual pode sair da posição ou deslizar em relação à colisão. A colisão do jogo continua sendo a do controlador, não o formato do GLB.

O arquivo deve ser **GLB 2.0 com geometria e recursos incorporados**, até 100 MiB. Draco, Meshopt e texturas KTX2/Basis comprimidas exigem decodificadores que este laboratório não inclui; exporte sem eles. A leitura não acessa arquivos externos. Alguns materiais/extensões glTF e modelos muito grandes podem não funcionar ou prejudicar o desempenho. Um erro de carregamento mantém o modelo anterior.

## Limites

Este laboratório **não gera nem reconstrói um modelo 3D a partir de uma imagem**. Use uma ferramenta externa para modelar/gerar, texturizar, rigar e animar o GLB. A incorporação permanente ao jogo e o mapeamento de animações para habilidades exigem integração e testes específicos; esta prévia não faz isso automaticamente.

O Three.js r187 é o usado pelo projeto, e o addon `GLTFLoader` correspondente é distribuído sob a licença MIT em `js/vendor/THREE-LICENSE.txt`.

## Testes

Na raiz do projeto, com Node.js 22:

```sh
node --experimental-loader ./tools/img2glb-studio/tests/three-loader.mjs --test tools/img2glb-studio/tests/glb.test.mjs
node tests/dimension.mjs
node tests/dimension-rupture.mjs
```

O teste opcional de navegador `tools/img2glb-studio/tests/browser.mjs` usa o mesmo protocolo dos testes do projeto (`BROWSER_EXECUTABLE`, `PLAYWRIGHT_MODULE`, `BROWSER_LIBRARY_PATH` e `PREVIEW_ORIGIN`), com um servidor HTTP já ativo.
