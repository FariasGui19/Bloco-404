# Passo 3 — revisão de identidade lvl 1, ações e vida do Limiar

Esta revisão substitui a aparência genérica descrita na primeira entrega do Passo 3. Mantém o rig/poses e a câmera daquela etapa; não inicia o Passo 4.

## Referências realmente disponíveis

Foram inspecionadas e usadas como guia as imagens `assets/sprites/player/player-{10x,bio-forja,mare,dominio}-lvl1.png`. Os três nomes `Gemini_Generated_Image_wa5gwnwa5gwnwa5g.jpg`, `Gemini_Generated_Image_iuen86iuen86iuen.jpg` e `Gemini_Generated_Image_2wjbls2wjbls2wjb.jpg` citados no pedido não estavam no checkout. Não são declarados como imagens inspecionadas. As sprites lvl 1 disponíveis já mostram o bracelete verde, cabelo/óculos/bigode, tatuagens, trajes e assinaturas ciano/douradas correspondentes.

As referências não são coladas em planos com seu fundo: o personagem é geometria 3D articulada e texturas procedurais opacas. Assim, não entram fundos pretos/quadriculados das folhas. Texturas de rosto, tatuagem e traje usam NearestFilter, sem mipmaps. Não houve geração de novas imagens por IA nem alteração das sprites 2D.

## Aparência

- Identidade humana compartilhada: cabeça facetada, rosto pixelado com óculos, sobrancelhas e bigode, nariz/orelhas em volume, mechas sobrepostas formando cabelo ondulado e tatuagens no pescoço. Bio-Forja também mostra braços tatuados expostos.
- X10: traje cinza-esverdeado, circuitos verdes e bracelete com mostrador emissivo e símbolo no antebraço esquerdo. Forma Veloz recebe painéis verdes; o rig acompanha a forma ativa do jogador.
- Bio-Forja: placas escuras, dourado nos detalhes, ciano nos circuitos/lâmina e exaustão nos impulsos.
- Maré: traje escuro, tubulação ciano nos ombros/braços e módulo dorsal, resposta de corrente aquática.
- Domínio: placas escuras e douradas, lente ancestral e lâmina dourada no Golpe de Ruptura, em vez do antigo tratamento violeta genérico.

Peças rígidas são agrupadas por material **dentro de cada articulação**, nunca fundidas entre pivôs animados. Rosto/rig continuam low-poly procedurais, não uma reprodução final de todos os pixels das sprites. Modelos finais esculpidos, rig importado, IK e materiais pintados à mão continuam possíveis refinamentos futuros. As formas de nível maior não receberam aqui uma reconstrução artística completa; a revisão é centrada no operador lvl 1 e sua primeira forma disponível.

## Controles e ações reais

Preservados: WASD, pulo, Shift, F/altitude, nado/mergulho, E, barco, escalada, órbita, zoom, Q para mirar a Âncora e Esc para retornar.

Adicionados, sem ocupar Q/E/F:

| Tecla | Função |
|---|---|
| J | Primária do kit ativo |
| K | Leitura/diagnóstico do kit ativo |
| T | Transformar/retornar no X10; acionar/recolher traje nos demais |
| R | Percorrer somente formas do X10 disponíveis para o nível atual |

O HUD mostra seleção/forma e atalhos. As primárias usam os IDs reais de `ARCHETYPE_KITS`: `bio_dash`, `forma_veloz`, `golpe_ruptura`, `passo_corrente`; as leituras usam `bio_diagnostic`, `eco_scan`, `postura_dominio`, `senso_corrente`. O jogador precisa possuir a habilidade, ter energia e respeitar recarga. A Quebra Sistemas, se já legítima no save, usa `pancada_quebra` e o custo nativo de barra.

`operator-actions.js` é um adaptador espacial: golpes/leituras apresentam pose, lâmina/pulso/anel; primárias de deslocamento acrescentam impulso curto, que atravessa os mesmos subpassos e colisões do controlador. **Não há inimigos nem dano/gates 3D implementados nesta etapa**, e as leituras não concedem revelações, missões, XP de missão ou recompensas. A notificação indica resposta visual quando for o caso. Não se chama o combate 2D para atingir entidades de outro mapa.

Transformações reutilizam `toggleNucleoForm`, `updateNucleoForm`, `NUCLEO_FORMS` e `isToolAvailable`. A seleção não inventa formas ou desbloqueios: a Veloz é a forma básica; Quebra Sistemas mantém seu requisito existente de nível 4. Trajes reutilizam `toggleArchetypeSuit`. O acionamento preserva os efeitos/contabilidade nativos dessas funções; não substitui o sistema de progressão. A duração, recarga e o multiplicador terrestre da forma vêm dos dados canônicos. Voo/mergulho/barco mantêm suas velocidades normais; o bônus explícito de uma primária é transitório.

Como o atualizador 2D fica pausado durante a exploração dimensional, o adaptador avança recargas, efeito de transformação e o temporizador nativo da forma. Esses campos permanecem no mesmo jogador compartilhado; não há um segundo inventário/save. `DimensionManager` não foi alterado.

## Vida do ambiente

- Copas/samambaias têm vento leve por shader e variação em pequenas células de cor, sem reescrever buffers de vértices por frame nem criar uma textura por árvore. Troncos/colisores não se movem.
- Lanternas emissivas do píer e inscrições violetas pulsam suavemente, sem adicionar point lights.
- Sete cristais das ruínas ganham flutuação/rotação; plataformas mantêm posições e superfícies físicas. Incrustações decorativas dão leitura às lajes.
- O anel distante contém um cristal alongado animado; permanecem a rotação/pulso da Âncora, feixe do farol e água GPU das etapas anteriores.
- O vento novo e a flutuação decorativa nova são suprimidos com a preferência explícita de movimento reduzido. As animações funcionais do jogador permanecem.

## Validação e custos

PASS: `dimension.mjs`, `dimension-motion.mjs`, `dimension-layout.mjs`, `dimension-identity.mjs`, `dimension-environment.mjs`, `estrutura.mjs`, `dimension-environment-browser.mjs` e `dimension-browser.mjs`.

O teste de identidade verifica os quatro rigs/kits, energia/recargas, bloqueio de formas por nível, temporizador nativo, traje e deslocamento efetivo do impulso. O navegador percorre o jogo real: transforma e retorna, aciona J/K no X10, Bio-Forja/Domínio e leitura Maré, além de caminhada, voo, órbita, barco, mergulho, save, retorno 2D, reentrada e perda de contexto. Concessões de habilidades nos cenários de QA são apenas preparação do teste, não código de desbloqueio no runtime.

Câmeras ambientais fixas (sem personagem):

| Vista | Calls | Triângulos | Texturas |
|---|---:|---:|---:|
| Solo | 71 | 20.458 | 6 |
| Costa | 114 | 35.379 | 6 |
| Voo | 128 | 38.689 | 6 |
| Submersa | 120 | 35.177 | 6 |

Continuam abaixo do orçamento anterior de 145 calls/42 mil triângulos/seis texturas ambientais, sem relaxar o teste. Oito objetos decorativos animados explicam o aumento de calls contra a revisão anterior. O personagem adiciona três texturas pequenas (32²), geometrias e materiais próprios fora desses contadores. A regressão completa em SwiftShader mediu aproximadamente 8 FPS neste sandbox: não é promessa de desempenho em GPU real.

`tests/fixtures/dimension-operators.html` permite inspecionar os quatro modelos com o mesmo construtor usado no jogo. Capturas ignoradas em `.qa/`: `operators-lvl1.png`, `operators-actions.png` e `dimension-identity-action.png` (gameplay real). Não confundir a galeria de inspeção com uma demonstração de combate completo.
