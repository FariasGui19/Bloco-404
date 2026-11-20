# Passo 3B.2 — identidade, formas reais e atuação do operador

## Referências e escopo

O pedido menciona `video_1.mp4`, mas esse arquivo não estava disponível no checkout/anexos acessíveis desta sessão. Não foi declarado como vídeo inspecionado. Foram inspecionadas as referências reais `assets/sprites/ui/nucleo-forma-veloz.png`, `assets/source-art/novos-sprites/forma-veloz.png` e `assets/source-art/nucleo/quebra-sistemas-turnaround.png`, além da construção lvl 1 já integrada.

Esta revisão altera personagens, apresentação de ações e laboratório. **Não muda mapa, `DimensionManager`, controlador, câmera de exploração, custos de habilidade, física, regras de desbloqueio nem arquivos 2D.** Passos 3B.3 e 4 não foram iniciados. Golpes/leitura continuam sendo apresentações e impulsos do sandbox, não um sistema novo de inimigos/dano 3D.

## Base humana mais viva

O retrato deixa de ter olhos/sobrancelhas estáticos pintados na textura: sclera, íris, pálpebras, sobrancelhas e boca possuem pequenas peças de atuação sob os óculos. Há piscada curta, deslocamento discreto do olhar, reação de sobrancelha/boca ao esforço e compensação da cabeça em golpes/leitura. A textura de pele continua mapeada no rosto volumétrico, sem cartão facial nem fundo de referência.

O cabelo inclui topo e franja em camadas mais volume nas laterais e nuca. Um pivô próprio acompanha o movimento com pequenas compensações; não há simulação física cara de cabelo. Texturas do traje/rosto/tatuagem continuam sendo três mapas opacos NearestFilter, sem mipmaps e sem uploads de textura por frame.

## X10: substituição real de modelo

`operator-forms.js` constrói dois rigs próprios a partir dos IDs canônicos, não uma recoloração do operador humano:

- **Forma Veloz:** criatura escura, mais baixa e projetada para a frente; crânio alongado, focinho, chifres recuados, espinhos dorsais, garras e linhas verdes. Não carrega um rosto humano com óculos sobre uma armadura verde. Usa animação de membros e inclinação próprias sobre o mesmo contrato de locomoção.
- **Quebra Sistemas:** corpo industrial mais largo, sem cabeça humana, núcleo/fornalha âmbar integrado ao bloco superior, ombreiras com faixas de advertência, exaustores, reforços e marreta. A ação de peso envolve ambos os braços, inclinação e compressão de pernas.
- **Base:** continua sendo o operador reconhecível com bracelete circular verde. Voltar à base descarta o rig da forma e reconstrói o humano, sem anexos de forma residual.

T continua usando `toggleNucleoForm`; duração/recarga continuam usando `updateNucleoForm`. O retorno automático por esgotamento da barra agora também recebe a apresentação de retorno. R continua **selecionando uma forma já disponível**, não concede formas nem ignora a recarga de T. Sua reação de bracelete inclui pose de leitura e um pequeno holograma da seleção. A Veloz permanece disponível no kit básico; a Quebra mantém seu requisito real de **nível 4**. Não foram inventadas outras formas.

A transformação visual combina novo rig/silhueta, pose, montagem de escala limitada e fragmentos luminosos. Não é um morph esquelético importado contínuo entre topologias. A troca mecânica permanece no instante definido pela regra nativa para não atrasar controle, duração ou colisão.

## Identidade e ações por arquétipo

- **Domínio Ancião:** runas douradas suspensas, contornos dorsais ancestrais e lente preservada. J usa preparação, torção de tronco, apoio de pernas, lâmina de energia modelada em volume e rastro de corte. K é uma leitura concentrada, não o mesmo golpe com outro nome.
- **Motor Bio-Forja:** reforços biomecânicos posteriores adicionais e peso maior nas envelopes de ação. Propulsão responde a movimento/impulso/ação; golpe produz rastro e eco de impacto de geometria fixa. Braços tatuados e contraste escuro/ciano/dourado permanecem.
- **Maré Astral:** dutos ciano recebem pulsação lenta e resposta à ação; rotação corporal e braços têm envelope mais fluido. Corrente/efeito aquático difere do corte ancestral. O nado preserva a locomoção existente.
- **Núcleo X10:** bracelete continua sendo o foco de seleção/transformação e leitura. Forma Veloz tem corte/garra verde; Quebra usa marreta e preparação pesada. Ações básicas mantêm os IDs e custos dos kits existentes.

`operator-performance.js` separa preparação, execução e recuperação em envelopes determinísticos. J, K, T e R não reutilizam mais uma única oscilação de braço: possuem combinações de braços/cotovelos, torção, inclinação, cabeça e pernas. `operator-motion.js` acrescenta contraposição de tronco/quadril, braços dobrando na passada e respiração com frequências suaves. Não há IK/foot-locking de produção nem captura de movimento.

`operator-vfx.js` usa lâmina, arco/rastro, retículo/leque de leitura, holograma, fragmentos de transformação e eco de impacto reutilizáveis. Sem novas luzes, spawning ilimitado de partículas, crescimento de arrays, texturas animadas por upload ou alteração de geometria por frame. A preferência explícita de movimento reduzido desativa piscada/microbalanço/pulsação e reduz as amplitudes secundárias, preservando a leitura funcional da ação.

## Laboratório e jogo principal

`docs/setor-limiar-3d.html` agora oferece:

- prévia **base / Veloz / Quebra Sistemas**;
- repouso, caminhada, corrida, nado e voo;
- botões e atalhos J/K/T/R para demonstração;
- T na galeria alterna entre base e a última forma de prévia, com atualização do seletor;
- a mesma galeria anterior de quatro arquétipos, foco individual e vistas frente/três-quartos/costas.

A prévia artística da Quebra é rotulada como nível 4 e **não desbloqueia o jogador**. No modo de exploração do laboratório, somente o kit básico do arquétipo é preparado em memória local; T/R continuam sujeitos às regras nativas. Nenhum save real é lido/escrito. Trocar entre modelos descarta geometrias/materiais/texturas anteriores, sem manter três avatares sobrepostos.

O jogo principal usa os mesmos construtores e envelopes, sem um personagem especial só para fixture. Os campos de progresso/vitais compartilhados mantêm seu comportamento; a adaptação em `operator-actions.js` só acrescenta sinais de seleção/retorno e permite uma primária sobrepor a prévia decorativa de R.

## Custos e validação

Rigs visíveis em repouso, sem efeitos ativos:

| Modelo | Triângulos | Calls | Mapas |
|---|---:|---:|---:|
| X10 base | 6.064 | 39 | 3 |
| Bio-Forja | 6.784 | 46 | 3 |
| Maré | 6.212 | 40 | 3 |
| Domínio | 6.484 | 44 | 3 |
| Veloz | 2.606 | 28 | 1 |
| Quebra Sistemas | 3.264 | 35 | 1 |

A atuação facial custa algumas chamadas extras. O orçamento do teste de escultura foi explicitamente atualizado: menos de 6.600 triângulos para as bases, com até 7.000 para Bio-Forja, e menos de 55 calls; o teste mede somente meshes cujos ancestrais também estejam visíveis. A galeria dos quatro modelos usa 170 calls / 25.546 triângulos / 12 texturas em repouso. Ao substituir X10 pela forma, as texturas residentes caem a dez e retornam a doze ao voltar à base. Piscar/ativar efeitos pode acrescentar chamadas transitórias; estes números não são o pico de todas as ações simultâneas.

A amostra de gameplay principal mediu 129 calls / 31.651 triângulos e cerca de 4–5 FPS no Chromium/SwiftShader deste sandbox. Não é medição de GPU real nem promessa de 60 FPS. Os contadores e limites ambientais anteriores permanecem inalterados, pois o mapa não foi editado.

Validação:

- Node: `dimension`, `dimension-motion`, `dimension-identity`, `dimension-performance`, `dimension-sculpt`, `dimension-layout`, `dimension-environment`, `estrutura`.
- WebGL: `dimension-environment-browser`, `dimension-browser` e `dimension-sculpt-browser`.
- O teste novo verifica silhuetas separadas, ausência do retrato humano nas formas, marreta, atuação facial, envelopes distintos, limpeza de rastro, retorno automático e acesso apenas no nível correto.
- Navegador: T/R/J/K, forma Veloz no jogo principal; Quebra e retorno no laboratório com estado de QA de nível 4 (sem concessão no runtime); troca de prévias e descarte, teclado T na galeria, mobile/storage, WASD, voo, Q, barco, Maré/mergulho, save/retorno 2D, reentrada e perda de contexto.

Capturas em `.qa/` ficam fora do Git: galeria das formas, ação da Quebra no gameplay e `3b2-transformacao.gif`, que registra uma demonstração do laboratório com os mesmos modelos/animações do jogo. O GIF é uma amostragem de frames renderizados, não vídeo recebido do usuário nem uma animação desenhada que substitui o gameplay.

## Refinamento posterior

Veja [roupa civil, cobertura capilar e HUD X10](limiar-lapidacao-personagem-x10.md) para a distinção corrigida entre trajes equipados e roupa convencional, remoção dos cristais e os novos testes/medidas.
