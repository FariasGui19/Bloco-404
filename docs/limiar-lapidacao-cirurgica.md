# Limiar — lapidação cirúrgica: rosto, espada, cartucho X10 e formas

## Fontes e limites

As referências foram abertas visualmente no workspace: `assets/sprites/player/player-sheet.png`, `player-dominio-lvl1.png`, `player-bio-forja-lvl1.png`, `player-mare-lvl1.png`, `player-10x-bruta-ataque-lateral.png` e `player-10x-bruta-transformacao.png`, além de `player-10x-veloz-andar-frente.png` e `dominio-ataque-lateral-0316.png`. A sequência de ataque da Quebra documenta preparação acima da cabeça, aceleração descendente, contato e recuperação/exaustão. A de transformação fundamenta as colunas de montagem industrial. Não existe `video_1.mp4` neste checkout; não foi possível analisá-lo. A semelhança é estilizada a partir do operador retratado nos sprites, não uma reconstrução fotográfica.

Não há novos mapas, missões, níveis, desbloqueios, migração de save ou substituição dos sistemas 2D. Quebra Sistemas continua exigindo nível 4. Colisão, velocidade, barco, voo e mergulho continuam regidos pelo controlador nativo; aumentar o modelo não concede alcance, dano ou uma hitbox diferente.

## 1. Rosto e cabelo

- Mandíbula e bochechas mais preenchidas, nariz menos projetado e iluminação suavizada na superfície frontal, mantendo geometria low-poly.
- Óculos com contorno angular e hastes contínuas, em vez de aros circulares. Olhos menores, íris e sobrancelhas mais legíveis, bigode reposicionado próximo ao nariz e boca alinhada.
- Preservadas a direção do olhar, piscada, expressão de esforço e microatuação existentes.
- Cabelo com cobertura contínua, pequenas irregularidades na superfície e menos mechas superiores, mais baixas e alongadas. A inspeção de frente revelou inicialmente uma pequena faixa de pele na coroa; a cobertura foi corrigida antes da validação final. Texturas continuam nítidas com NearestFilter, sem mipmaps.
- O laboratório ganhou enquadramentos de corpo inteiro, rosto/cabeça e bracelete. Eles não alteram a câmera de gameplay.

## 2. Transformação em quatro fases

O envelope compartilhado distingue **convergência → montagem → liberação → estabilização**. O operador aproxima os braços na ativação, há resposta no dispositivo e canais/colunas envolvem a silhueta antes da revelação do novo rig. As poses diferem: sustentação do Domínio, abertura fluida de Maré e assentamento pesado da Quebra.

A troca **visual** é adiada apenas no primeiro 24% da atuação: aproximadamente 252 ms da transformação nativa de 1,05 s. O estado nativo, timer, HUD e controles mudam imediatamente; não existe congelamento do jogador, cópia de estado nem rig antigo retido na cena. O rig anterior é descartado ao revelar o novo. A galeria usa o mesmo critério, com envelope de inspeção de 1,4 s.

Movimento reduzido elimina esse adiamento, abertura das aletas do bracelete, rastros locomotores, vapor periódico e rotação dos efeitos. As poses são atenuadas, sem escala pulsante global do personagem nem clarões de tela. A galeria agora também lê a preferência real de movimento reduzido.

## 3. Domínio Ancião — espada como identidade

Espada reconhecível durante o repouso equipado: empunhadura escura, pomo, guarda dourada curva, lâmina curva de um gume, bainha escura no quadril, sulco claro e intervalos gravados na lâmina. A energia se estende na ação. O modelo não aparece na roupa civil.

J alterna o sentido da ação com rotação de tronco/ombro e rastro amplo; L usa uma variação de estocada/ação axial com selo no solo; K sustenta a espada e manifesta uma inscrição octogonal de frequência. A armadura recebeu inscrições peitorais e contornos dourados adicionais nos ombros. Não há coroas de cristais orbitando.

## 4. Motor Bio-Forja

Cabos orgânicos texturizados contornam a parte posterior, integrados às placas, bíceps tatuados e propulsores existentes. A leitura K usa postura bilateral de diagnóstico e canais de propulsão, não o mesmo retículo flutuante de todos os outros arquétipos. A ação L assume preparação de força com os dois braços, assentamento corporal e descarga de forja, usando a habilidade nativa de impulso.

## 5. Maré Astral

Preservados os dutos ciano e as correntes móveis sobre o torso. K abre os braços e manifesta três faixas curvas de corrente. L abre uma variação bilateral mais ampla, em lugar de copiar o gesto da espada. O deslocamento ganha duas esteiras de água/energia, com ajuste de altura no nado e mergulho; elas desaparecem ao parar, embarcar ou voar. Efeitos usam malhas fixas, não emissores ilimitados.

## 6. X10 original: cartucho de malha B404

Novo módulo compartilhado `operator-bracelet.js`: dispositivo longitudinal sobre o antebraço, carcaça chanfrada, fixações, espinha lateral metálica, trava âmbar assimétrica e três trilhos luminosos interrompidos. Sem disco central, ampulheta ou símbolo importado de outra franquia.

Duas aletas respondem à seleção e à convergência. A cor de seleção distingue Veloz e Quebra. O mesmo projeto permanece no antebraço das duas formas, com acabamento industrial na Quebra. O HUD e suas artes canônicas continuam ligados à seleção, disponibilidade, duração e recarga nativas. X10 humano continua civil, sem traje inventado.

## 7. Veloz e Quebra Sistemas

**Veloz:** cadência própria mais rápida, inclinação frontal no deslocamento terrestre, postura de impulso mais baixa e esteiras longitudinais de velocidade; L usa extensão de braço/impulso distinta. As esteiras desaparecem ao parar e em movimento reduzido. Velocidade real, custo e duração continuam nativos.

**Quebra Sistemas:** altura visual de aproximadamente **2,38 m**, contra **1,91 m** do humano; escala do rig 1,20 × 1,28 × 1,13. Marreta com tambor maior, faces reforçadas, aros, detalhes luminosos e haste legível. Parafusos, grelhas, atuadores deslizantes e vapor industrial dão atividade à máquina. A marcha tem cadência mais lenta e menor balanço; o ataque separa preparação longa, queda acelerada e recuperação. J alterna impacto descendente/lateral, L usa sustentação bilateral. O chão recebe fissuras radiais luminosas transitórias de apresentação, sem alterar o terreno.

A câmera de gameplay compensa suavemente a estatura da Quebra com alvo um pouco mais alto e distância adicional, sem tremor de câmera. A galeria também enquadra a forma maior.

## 8. Ações disponíveis e significado de L

- **J:** alterna duas coreografias de ataque do poder primário existente, respeitando recarga.
- **K:** leitura própria do arquétipo, com gesto e geometria distintos.
- **L:** variação especial de apresentação do mesmo poder primário. Reutiliza seu ID, custo de energia, impulso, duração e recarga. Na Quebra, continua consumindo o tempo de forma previsto pelo golpe nativo.
- **R/T:** seleção e ativação/retorno nativos, sem conceder formas bloqueadas.

**Não são novas habilidades de dano nem um sistema de combate contra inimigos 2D.** O L aumenta as ações expressivas do sandbox sem inventar desbloqueios ou uma segunda regra de recursos. Galeria e jogo principal compartilham a coreografia. Uma faixa de toque separada oferece J/K/L/T/R sem aumentar o painel de movimento existente.

## Orçamento medido

Malhas visíveis em repouso, incluindo verificação dos ancestrais:

| Modelo | Triângulos | Draw calls |
|---|---:|---:|
| X10 humano civil | 3.702 | 35 |
| Bio equipado | 6.622 | 46 |
| Maré equipada | 5.970 | 42 |
| Domínio equipado com espada | 7.198 | 47 |
| Veloz | 3.294 | 36 |
| Quebra Sistemas | 4.848 | 47 |

Galeria final: **171 calls / 23.494 triângulos / 12 texturas**, contra 162 / 22.306 / 12 na passada anterior. A espada, o cartucho e a máquina mais rica têm custo; não é uma melhoria gratuita. O teto explícito do teste de escultura passa a 7.500 triângulos para Domínio (espada persistente), 7.100 Bio e 6.600 demais humanos; continuam menos de 55 calls por rig humano. Formas mantêm teto de 7.100 triângulos / 55 calls. Ações/piscadas transitórias podem elevar a contagem instantânea.

Amostra de gameplay da suíte principal: **125 calls / 29.289 triângulos / 6 FPS em SwiftShader**. Não é benchmark de GPU física nem promessa de FPS. Texturas e geometria dos quatro enquadramentos ambientais permaneceram estáveis; nenhuma malha de efeito/textura é criada no frame update.

## Validação e evidências

**10 suítes Node:** dimension, dimension-motion, dimension-identity, dimension-performance, dimension-sculpt, dimension-polish, dimension-surgery, dimension-layout, dimension-environment e estrutura.

**5 suítes Chromium/SwiftShader:** dimension-browser, dimension-sculpt-browser, dimension-polish-browser, dimension-environment-browser e dimension-surgery-browser.

Cobrem custos/recargas de L, alternância de gestos, quatro fases, assinaturas visuais distintas, espada equipada, cartucho sem aro circular, proporção/apoio da Quebra, esteira Veloz e movimento reduzido. No navegador: J/K/L/T/R, detalhe de rosto/bracelete, transformação de traje real na galeria e gameplay, Quebra nível 4 em estado de QA isolado, retorno, toque em 390×844, barra sem sobrepor o status, storage inalterado no laboratório, ausência de erros de página e descarte ao trocar modelos. As suítes anteriores continuam cobrindo voo, mergulho, barco, colisões, save, 2D, reentrada e perda de contexto.

Durante a implementação, o seletor de forma da galeria inicialmente mostrava o modelo anterior por causa da revelação adiada. Foi corrigido para representar o alvo pendente enquanto a atuação acontece; o teste de teclado T voltou a passar.

Capturas locais ignoradas pelo Git em `.qa/surgery-*`. A demonstração `.qa/lapidacao-3d.gif` reúne **124 frames amostrados** do renderizador real do laboratório, avançando o mesmo atualizador de animação entre capturas. É uma sequência de inspeção, não vídeo em tempo real, benchmark ou análise do vídeo ausente.
