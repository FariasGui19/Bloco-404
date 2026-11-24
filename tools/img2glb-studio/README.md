# Img2GLB Studio

Ferramenta interna independente para construir, texturizar e animar bases bípedes em GLB para o BLOCO 404. Não altera o jogo e não envia imagens para servidores.

## Como usar

1. Abra a raiz do repositório com o Live Server do VS Code e acesse `tools/img2glb-studio/`. Ou execute `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000/tools/img2glb-studio/`.
2. Escolha **Operador / NPC humanoide** ou **Monstro / criatura**. Trocar o preset redefine proporções, aberturas e cores; mantém escala e imagem. Ambos são bípedes com o mesmo esqueleto.
3. Carregue uma imagem PNG/JPG local. Ela é aplicada automaticamente como projeção e são sugeridas cores; aguarde o modelo atualizar. Para o operador, a extração tenta amostrar pele, cabelo, regata, calça e calçado das regiões detectadas. A detecção é heurística: corrija manualmente os seletores quando necessário.
4. Em **Região para recortar**, escolha cabeça, tronco, braços ou pernas e arraste um retângulo na imagem. Também é possível ajustar horizontal, vertical, largura e altura pelos controles. A sugestão automática é apenas um ponto de partida: para melhores resultados use uma imagem frontal, com personagem inteiro e fundo simples, e revise todos os recortes. As regiões dos braços e das pernas são divididas automaticamente entre os lados e segmentos.
5. Marque as regiões desejadas. **Aplicar projeção** reaplica a imagem; **Remover** desativa a projeção sem apagar a referência. As imagens são projetadas na frente das peças; laterais e costas mantêm cores sólidas. Ajuste a **intensidade da imagem** para misturar com a cor manual. A remoção de fundo opcional procura cores semelhantes aos cantos conectadas às bordas: ela pode apagar cabelo ou roupa escuros, especialmente em fundo escuro. Desative-a se isso ocorrer.
6. O operador inclui cabelo com cachos em relevo, regata com acabamento, nariz e pelos faciais, óculos com ponte e hastes, cinto, bolsos cargo, tiras e tênis com sola, cadarços e acentos. Em **Detalhes modulares**, ative/desative o cabelo, rosto, óculos e conjunto de acessórios, e ajuste tamanho e posição. Eles acompanham os ossos. A projeção facial e os detalhes geométricos podem não se alinhar em toda imagem: ajuste o recorte ou desative os detalhes que se sobrepõem.
7. Ajuste escala e proporções. Arraste no viewport para orbitar, use a roda para zoom e o botão direito para mover a câmera. **Mostrar rig** exibe ossos e articulações, inclusive um osso por dedo. O skin é rígido por peça; não há articulações nas falanges nem deformação contínua.
8. Escolha **Idle**, **Walk**, **Run** ou **Action** para pré-visualizar um clipe em loop. Use **Pausar / Reproduzir** e **Velocidade**. A velocidade afeta apenas a prévia, não a duração exportada. Alterar proporções, pose ou detalhes reinicia a prévia selecionada, preservando play/pause.
9. Clique em **Exportar GLB**. O arquivo incorpora texturas aplicadas, detalhes, malha, materiais, esqueleto e os quatro clipes nomeados; grade, luzes e indicadores do editor não são exportados. A pose visível é a do momento da exportação. O recorte é incorporado ao arquivo, não depende da imagem original após a exportação.

Os clipes são procedurais e não avançam continuamente pelo cenário: o jogo deve mover a entidade. Em Walk/Run, a raiz oscila longitudinalmente em cada ciclo para reduzir o deslocamento do tornozelo de apoio, voltando ao início; sua altura é amostrada para manter o pé mais baixo próximo do chão. Ainda pode haver deslizamento, pequenas penetrações entre amostras e contato imperfeito: não há IK ou adaptação ao terreno. Ao integrar com controle de movimento próprio, considere a oscilação horizontal da raiz nos clipes. Resetar restaura o humanoide, parâmetros e câmera e desativa a projeção, mas mantém a imagem carregada.

## Limitações

A ferramenta **não reconstrói automaticamente a geometria 3D a partir da imagem** como um serviço de geração por IA: ela aplica recortes 2D à frente de uma base procedural e adiciona detalhes geométricos pré-definidos. O resultado depende do enquadramento, pode apresentar emendas, sobreposições ou estiramento e não inventa laterais, costas ou detalhes tridimensionais ocultos. A aparência do operador é inspirada na referência, não uma cópia fiel gerada automaticamente. Para uma malha realmente fiel a imagens arbitrárias, ainda é necessária modelagem manual ou uma solução de reconstrução 3D especializada.

O navegador precisa suportar WebGL e módulos ES/import maps. Use um servidor HTTP, não `file://`. A ferramenta usa o Three.js r187 já presente em `js/vendor/` e os addons correspondentes em `vendor/`, sob a licença MIT em `js/vendor/THREE-LICENSE.txt`.

## Testes

Com Node.js 22, na raiz do repositório, execute:

```sh
node --experimental-loader ./tools/img2glb-studio/tests/three-loader.mjs --test tools/img2glb-studio/tests/studio.test.mjs
```
