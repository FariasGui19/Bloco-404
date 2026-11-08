# Ordem de arte e implementação — Praia → Saguão → Estação

Regra de produção: em cada atualização, gerar e integrar no máximo **duas folhas ou peças visuais novas**, validar escala, direção, ponto de apoio, transparência, ordenação e colisão; guardar originais e não trocar o personagem por outro. Uma peça única não é uma folha de animação. Efeitos e gameplay só são considerados prontos depois dos testes de uso e do navegador.

## Rodada atual: apoio e escala da Estação Bio

Duas artes estáticas: uma folha 2×2 de margens (canto, cano, ruína, mureta) e uma plataforma técnica. Os recortes são preparados por `tools/preparar-margens-bio.py`; não são folhas de animação. As peças têm colisões pequenas e estão distribuídas em pontos selecionados, não como paredes contínuas. Piso sob as estruturas conecta o terminal, plataforma e estufa aos caminhos.

Terminal e estufa foram ampliados e tiveram hitboxes e ordenação ajustadas. A ordenação de estruturas inteiras é uma aproximação, não divisão em paredes/frente/fundo: ainda pode haver inconsistências em alguns ângulos. A ponte segue em camada de fundo sem recorte individual dos guarda-corpos; margens da ilha, canais retos e transições da areia continuam provisórios. A rodada anterior trouxe uma folha de piso e outra de detalhes industriais.

## Próximas rodadas sugeridas (ordem ajustável depois do teste)

1. **Estação Bio — continuidade espacial:** melhorar encaixe do piso/ruínas, transições com a areia e profundidade das passagens, testados no jogo. Evitar gerar uma imagem plana e fingir que suas escadas são caminháveis. Corrigir a borda retangular da ilha, variedade de cenários e transições.
2. **Praia Inicial — travessias e teleférico:** uma folha de peças de teleférico/apoios e, se necessário, uma de obstáculos e animações de reconstrução. Preservar o R de diagnóstico e as rotas das quatro classes; trilhos não devem invadir a areia.
3. **Bolt — animações reais:** uma direção por vez, ou até duas folhas se tiverem quadrícula e alpha válidos; validar identidade, patas e tamanho com o tutor. Hoje só existe uma pose, não caminhada real. Missão pessoal e autorização de conta continuam pendentes.
4. **Saguão — NPCs:** NEXO de frente/costas e, numa rodada seguinte, gestos; preservar aparência já aprovada. Viajante só substituída se houver uma melhoria consistente com as quatro direções e a mala.
5. **Enseada — vínculo e fauna:** arte do Lúmeo com idle/movimento e, depois, objetos de uma cena de encontro. Concluir uma missão de vínculo real, sem revogar pets de saves antigos. Evitar apenas mais cristais para clicar.
6. **Estação Bio — missão:** peças para condutor, válvulas e estufa, leitura de estado e puzzle que use R e Q sem alterar seus valores aprovados. Garantir que salvar/recarregar preserve etapas, com saída e retorno.
7. **Combate — base antes da arte de chefe:** vida e recuperação do jogador, telegraph acessível, ataques com colisão e IA em testes. Depois uma folha de inimigo Bio e sua folha de preparação/ataque, somente quando direção e silhueta forem consistentes; miniboss em rodadas próprias.
8. **Demais arquétipos e regiões:** primeiro missão própria e adversário correspondente, depois habilidades novas quando custo, tecla, colisão, efeitos e progressão estiverem definidos. Domínio, Maré e Núcleo mantêm seus trajetos e identidades; não presumir múltiplos arquétipos simultâneos.
9. **Nave:** após um ciclo terrestre confiável, vertical slice com interior e voo contínuo aparente entre dois locais, controles acessíveis e recuperação; não trocar a ambição por um teleporte.

## Animações dos arquétipos — na fila, entre as etapas acima

Por rodada, no máximo duas folhas; cada ação/direção deve manter o traje nível 1, identidade, pés, proporção, alpha, grade e ordenação. Integrar e testar somente quadros aprovados; não substituir Q/R já aprovados nem supor que uma pose estática é animação. Os prompts e referências estão em `docs/prompts-sprites-precisao.md`.

1. **Bio-Forja:** ataque básico direcional e caminhada coerente com o traje ativo; conferir os quadros já existentes antes de gerar o que falta. Preservar os valores e o modo rápido de Q.
2. **Domínio:** ataque básico direcional com espada pequena (não o Q pesado); hoje há apenas poses laterais provisórias do traje de nível 1.
3. **Maré:** ataque básico direcional com fita líquida e o traje correto; sem escudo para baixo nem troca de identidade.
4. **Núcleo 10X:** corrida frontal e traseira da Forma Veloz, atualmente ausentes; preservar corrida lateral e ataque aprovados. Depois avaliar as demais lacunas, sem trocar a criatura.
5. Para cada arquétipo, avaliar caminhada/idle em direções faltantes e transições/efeitos de habilidades em folhas separadas, somente depois de validar quais quadros realmente faltam. Novas habilidades exigem definição de input, custo e progressão antes de arte e implementação.

O objetivo final está em `docs/missoes-inimigos-habilidades-e-pets.md` e `docs/roteiro-proximas-etapas.md`. A sequência não significa que todas as peças já existam; cada etapa deve ser aprovada antes de avançar.
