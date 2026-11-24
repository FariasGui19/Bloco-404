# Img2GLB Studio

Ferramenta interna independente para criar e animar bases humanoides e criaturas em GLB para o BLOCO 404. Não altera o jogo.

## Como usar

1. Abra a raiz do repositório com o Live Server do VS Code e acesse `tools/img2glb-studio/`. Ou execute `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000/tools/img2glb-studio/`.
2. Escolha **Operador / NPC humanoide** ou **Monstro / criatura**. Ambos são bases bípedes procedurais com o mesmo esqueleto; a criatura tem silhueta e detalhes próprios. Trocar o preset redefine suas proporções, aberturas e cores, mas mantém a escala e a imagem carregada.
3. Opcionalmente, carregue uma imagem PNG ou JPG local. Clique em **Extrair cores da imagem** para sugerir até três cores distintas, ou ajuste as cores manualmente. Corpo colore pele; Roupa / Carapaça colore tronco e pernas; Detalhes colore cabeça, mangas e pés. A extração ignora transparência, cores muito escuras e neutros próximos de preto ou branco. Ela é heurística: outras cores do fundo podem influenciar o resultado, e cores úteis muito escuras ou quase brancas também podem ser ignoradas. Se faltarem cores distintas, os seletores restantes mantêm seus valores.
4. Ajuste escala, cabeça, tronco, comprimento dos braços e pernas e abertura dos membros. Arraste no viewport para orbitar, use a roda para zoom e o botão direito para mover a câmera. O botão de rig mostra ou oculta ossos e articulações.
5. Escolha **Idle**, **Walk**, **Run** ou **Action** para pré-visualizar um clipe em loop. Use **Pausar / Reproduzir** e **Velocidade** para controlar a prévia. A velocidade é apenas da prévia e não altera a duração dos clipes exportados. Alterar proporções ou pose recalcula os clipes e reinicia a prévia selecionada; o estado de play/pause é preservado.
6. Clique em **Exportar GLB**. O arquivo contém apenas a malha, os materiais, o esqueleto e os quatro clipes nomeados; grade, luzes e indicadores do editor não são exportados. O modelo mantém escala, proporções e cores atuais. A pose visível é a do momento da exportação, e os clipes podem ser selecionados em um visualizador glTF ou mixer de animação compatível.

Os clipes são animações procedurais **no lugar**, sem deslocamento horizontal: o jogo deve mover a entidade pelo cenário. A altura da raiz é amostrada e gravada nos clipes para manter o pé mais baixo próximo do chão durante a prévia e a reprodução do GLB; não há IK ou detecção de terreno, e pode haver pequenas variações entre amostras. O botão Resetar restaura o humanoide, os parâmetros e a câmera, mas mantém a imagem de referência.

## Limitações

A imagem é uma referência visual e fonte de cores. Diferente de um serviço de reconstrução 3D por IA, esta versão **não gera nem reconstrói a geometria a partir da imagem**, não transfere detalhes e não identifica automaticamente a anatomia. Os presets são bípedes, com skin rígido (cada peça segue um osso); não reproduzem formas arbitrárias, criaturas de múltiplas pernas ou esqueletos personalizados. A exportação fornece bases animadas para posterior refinamento e integração, não uma conversão fiel de qualquer imagem.

O navegador precisa suportar WebGL e módulos ES/import maps. Use um servidor HTTP, não `file://`. A ferramenta usa o Three.js r187 já presente em `js/vendor/` e os addons correspondentes em `vendor/`, sob a licença MIT em `js/vendor/THREE-LICENSE.txt`. Nenhuma imagem é enviada a um servidor.

## Testes

Com Node.js 22, na raiz do repositório, execute:

```sh
node --experimental-loader ./tools/img2glb-studio/tests/three-loader.mjs --test tools/img2glb-studio/tests/studio.test.mjs
```

Os testes cobrem extração, presets, materiais, animações, pés no chão e conteúdo básico do GLB animado.
