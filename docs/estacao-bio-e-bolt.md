# Estação Bio e Bolt — primeiro recorte jogável

## Estação que Respira

A primeira versão é um **setor explorável provisório 72 × 72**, conectado à Praia Inicial depois do diagnóstico e reconstrução do teleférico Bio-Forja. O zoom mínimo é maior só nessa área; volta ao padrão nos demais mapas. Há caminhos largos, canais bloqueados com duas travessias por trecho, elementos ambientais, dois simuladores de treino e três interações em sequência (condutor → regulador → estufa), além do caminho de volta. A missão principal e outros arquétipos não são substituídos; o progresso das interações usa as flags normais de coletáveis.

**Não confundir com o objetivo final:** o setor ainda usa pisos e objetos existentes. A arte `assets/concepts/bio-forja-missao-mapa.png` é um conceito e **não** é a geometria do mapa. Para usá-la como cenário fiel, separar e redesenhar peças, construir máscaras de piso e colisão coerentes, escala, profundidade, passarelas, camadas e caminhos verificáveis. Não há ainda monstros agressivos, chefes, puzzles de habilidade reais, sons ou cenário completo; os alvos são inofensivos. O zoom limitado não garante que toda a área fique invisível em monitores de qualquer resolução. Fazer testes em diversos tamanhos de tela. Não usar essa primeira malha como mapa final aprovado.

## Bolt

Uma pose inicial de Bolt foi gerada a partir das fotos fornecidas: border collie blue merle, peito e faixa brancos, expressão amigável. A arte foi limpa de fundo e é exibida como **uma única pose provisória**, com espelhamento lateral e leve movimento procedural. Não é uma folha direcional nem animação real de caminhada. As fotografias não foram adicionadas ao repositório; a imagem gerada é uma interpretação e precisa de avaliação do tutor.

No diário **J**, "TESTAR BOLT NESTE SAVE" ativa a prévia local e salva a seleção. Após obter Lúmeo, "ACOMPANHAR COM LÚMEO" permite voltar a ele sem apagar nenhum vínculo. Não há autenticação de conta neste jogo local; o botão é explícito mas **não protege acesso exclusivo** ao Bolt. Definir autorização real antes de qualquer distribuição ou multiplayer. Bolt não é concedido automaticamente, não substitui a missão nem o Lúmeo.

Cada pet selecionado recebe dados aditivos `level: 1`, `xp: 0`, `inventory: []` e `skills: {}` próprios no progresso. O diário mostra nível, XP e contagem de itens. Isso é uma **fundação**, não uma árvore interativa, progressão de XP, inventário manipulável ou equipamento; nenhum bônus ou habilidade é aplicado. Preserva o array de itens do jogador e a flag antiga do Lúmeo. Ainda falta menu de pets acessível completo, regras de desbloqueio, migrações versionadas, atividades e recompensas.

## Próximas entregas recomendadas

1. Aprovar a aparência do Bolt e gerar folhas separadas de idle/caminhada, quatro direções, brincar, esperar e comer com transparência real e proporções fixas. Trocar a pose provisória por animações reais, sem distorção.
2. Fazer missão pessoal memorável e autorizada para Bolt; criar interação, escolha, exploração e vínculo sem liberar a identidade a todos automaticamente. Evoluir Lúmeo mantendo saves antigos.
3. Finalizar base de vida e adversários telegrafados antes de colocar monstros ou minibosses no mapa; só depois integrar recompensas, XP e equipamentos de pet. Ainda não existem ataques de inimigos, HUD de vida nem morte/respawn.
4. Converter o conceito Bio em tiles/camadas com arte consistente, caminhos testados e obstáculos/puzzles que usem o diagnóstico R e reconstrução. Transformar o esboço de três pontos numa missão dramática real.
5. Criar uma habilidade adicional por arquétipo somente com input, custo, cooldown, arte, colisão, travas e testes definidos; não inventar slots extras ou alterar Q/R já aprovados. As ideias e prompts estão em `docs/missoes-inimigos-habilidades-e-pets.md`.
