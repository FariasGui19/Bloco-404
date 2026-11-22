# Alinhamento básico da chegada 3D

## Operador — rosto e cabelo

- Nariz mais contido, bigode mais fino e menos largo, hastes dos óculos mais leves.
- As mechas isoladas antigas foram substituídas por sete curvas em S, sobrepostas e assentadas no couro cabeludo contínuo, em duas fileiras desencontradas. Altura e contraste foram ajustados após inspeção frontal e lateral para evitar mechas flutuantes.
- Escultura segue volumétrica e low-poly; não usa planos com fotografia ou fundo de referência. As três texturas compartilhadas por rig continuam em `THREE.NearestFilter`.
- Mesma implementação em `operator.js` para jogo, laboratório e Morfador. Nenhum rig paralelo foi criado.

## Domínio — espada e gestos

- Lâmina com mais espessura, guarda reposicionada abaixo da mão, cabo alongado e marcas metálicas transferidas para a empunhadura.
- Polegar acompanha o pivô de empunhadura. O punho não substitui o cotovelo.
- Removido o esticamento/recolhimento da arma inteira durante o ataque; cabo, guarda e fuller permanecem com escala fixa. A lâmina dourada mantém comprimento consistente em repouso e golpe.
- Repouso oblíquo para a ponta não atravessar o piso; rastro do Domínio mais estreito e curto para não dominar a silhueta.
- `T`: Bio comprime/impulsiona, Maré abre/ondula, Domínio conduz a liberação pelo braço armado, Veloz recolhe e projeta a cabeça. Retorno anterior preservado.
- `R`: X10 continua selecionando as formas nativas. Nos demais kits é **sintonia visual**, sem novo menu, poder ou desbloqueio: Domínio contém a arma e observa; Bio examina antebraço; Maré abre os braços. Removidos os hologramas de formas X10 desses outros kits.
- `J` e `K`: preservadas as curvas de ataque/leitura específicas existentes; agora recebem a montagem consistente da espada e o novo volume felino.
- `E`: gesto de interação específico do kit, sem ataque, custo ou efeito de combate. Não sobrescreve uma ação já em andamento. Interações de barco/âncora continuam com as mesmas regras e efeito imediato; a animação é apresentação, não uma nova espera obrigatória.
- Laboratório ganhou botão **E · INTERAÇÃO** e R foi rotulado como **SINTONIA**. Seleção X10 real não mudou.

## Veloz — leão alienígena

- Cabeça menos alongada/reptiliana, focinho curto, nariz escuro, olhos laterais, orelhas, presas e mandíbula articulada.
- Juba facetada em grupo próprio; espinhos dorsais e assinatura verde mantidos.
- Novo módulo puro `feline-profile.js`: calcula um fenótipo visual limitado a partir do envelope da ação existente.
- Em corrida: largura até 5,5% menor e comprimento até 4,5% maior.
- No pico agressivo: largura até 14% maior, altura até 4,5%, comprimento até 9%, juba até 20%, mandíbula aberta e pequena compressão de apoio.
- Recuperação devolve as proporções sem trocar modelo ou forma. Movimento reduzido limita a amplitude agressiva a 45%.
- Nenhuma alteração de hitbox, dano, velocidade, duração, energia, recarga, desbloqueio ou catálogo. Não é uma terceira forma X10.
- Geometria pré-alocada; nenhuma troca/criação de malha ou textura por quadro.

## Orçamento e segurança

Medição Node de repouso: operador civil 3.922 tri / 35 chamadas; Bio 6.842 / 46; Maré 6.190 / 42; Domínio 7.474 / 53; Veloz aproximadamente 4.030 / 40. Orçamentos dos testes existentes mantidos sem relaxamento.

`DimensionManager`, `rupture.js`, seus hooks e regras da missão não foram alterados. Sem novas revelações do 404, level ou desbloqueios.

## Validação

- Execução ampla Node: **199 aprovados e os mesmos 23 casos legados falhando** já documentados em `limiar-ruptura-dimensional.md`. Não se afirma que todo o repositório está verde.
- Todos os testes dimensionais, Maré Cromática e estrutura aprovados após os ajustes finais.
- **9 suítes Chromium/WebGL executadas com sucesso**: dimension, surgery, living, sculpt, polish, master-morpher, rupture, environment e arrival-polish.
- Nova suíte `dimension-arrival-polish.mjs`: variação/redução/recuperação felina, limites de escala, poses distintas T/R/E, E sem ataque e sem custo, seleção não altera estado nativo, cabo fixo e identidade de forma preservada.
- Nova suíte browser: retrato em frente/perfil/costas, Veloz correndo/atacando/recuperando e gestos R/E/J/K do Domínio sem erros de página ou escrita em storage.
- Regressões existentes cobrem WASD, voo/nado, trajes, HUD X10, Morfador, saves, context loss, terminal da ruptura e Esc/retorno 2D.

Capturas de QA em `.qa/arrival-face-{front,profile,back}.png`, `.qa/arrival-feline-{run,attack}.png` e `.qa/arrival-ancient-{select,interact,primary,secondary}.png`. Não versionadas.
