# Img2GLB Studio

Ferramenta interna independente para criar uma base humanoide e exportar em GLB para o BLOCO 404. Não altera o jogo.

## Como usar

1. Abra a raiz do repositório com o Live Server do VS Code e acesse `tools/img2glb-studio/`. Ou execute `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000/tools/img2glb-studio/`.
2. Opcionalmente, carregue uma imagem PNG ou JPG local. Clique em **Extrair cores da imagem** para sugerir até três cores distintas, ou ajuste as cores manualmente. Corpo colore a pele; Roupa colore tronco e calça; Detalhes colore cabelo, mangas e botas. A extração ignora pixels transparentes e muito escuros, mas outras cores de fundo ainda podem influenciar o resultado. Se não houver cores distintas suficientes, os seletores restantes mantêm seus valores anteriores. A detecção de pele é aproximada e pode exigir ajuste manual.
3. Ajuste proporções, escala e pose. Arraste no viewport para orbitar, use a roda para zoom e o botão direito para mover a câmera. O botão de rig mostra ou oculta ossos e articulações.
4. Clique em **Exportar GLB**. O arquivo contém apenas o personagem com malha, materiais e esqueleto; grade, luzes e indicadores do editor não são exportados.

A imagem é apenas uma referência e fonte de cores: esta versão **não reconstrói uma malha 3D a partir da imagem**. A base é procedural, com skin rígido (cada peça segue um osso), sem animações prontas. A pose e as proporções atuais são exportadas. Os pés são reposicionados no chão após cada ajuste. O botão Resetar restaura os parâmetros e a câmera, mas mantém a imagem de referência.

O navegador precisa suportar WebGL e módulos ES/import maps. Use um servidor HTTP, não `file://`. A ferramenta usa o Three.js r187 já presente em `js/vendor/` e os addons correspondentes em `vendor/`, sob a licença MIT em `js/vendor/THREE-LICENSE.txt`. Nenhuma imagem é enviada a um servidor.

## Testes

Com Node.js 22, na raiz do repositório, execute:

```sh
node --experimental-loader ./tools/img2glb-studio/tests/three-loader.mjs --test tools/img2glb-studio/tests/studio.test.mjs
```

Os testes cobrem extração com fundo escuro, paletas incompletas, materiais, pés no chão e conteúdo básico do GLB.
