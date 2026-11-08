# Estação Bio e Bolt — primeiro recorte jogável

## Estação que Respira

A primeira versão é um **setor explorável provisório 72 × 72**, conectado à Praia Inicial depois do diagnóstico e reconstrução do teleférico Bio-Forja. O zoom mínimo é maior só nessa área; volta ao padrão nos demais mapas. Há caminhos largos, canais bloqueados com duas travessias por trecho, elementos ambientais, dois simuladores de treino e três interações em sequência (condutor → regulador → estufa), além do caminho de volta. A missão principal e outros arquétipos não são substituídos; o progresso das interações usa as flags normais de coletáveis.

**Não confundir com o objetivo final:** o setor combina pisos/objetos existentes com um terminal, um biorreator, uma estufa e uma ponte gerados como peças isoladas; o piso usa quatro variantes de uma folha estática sobre a geometria procedural. Uma segunda folha fornece quatro detalhes estáticos com colisões pequenas. A ponte é reutilizada nas duas travessias, na camada de fundo; seus guarda-corpos não têm recorte de profundidade individual, e a imagem não define colisão. A arte `assets/concepts/bio-forja-missao-mapa.png` é um conceito e **não** é a geometria do mapa. As peças novas são interpretações do conceito, não cortes literais do mapa; ainda faltam camadas, peças modulares, geometria, escala, profundidade e caminhos que reproduzam sua ambição. Não há ainda monstros agressivos, chefes, puzzles de habilidade reais, sons ou cenário completo; os alvos são inofensivos. O zoom limitado não garante que toda a área fique invisível em monitores de qualquer resolução. Fazer testes em diversos tamanhos de tela. Não usar essa primeira malha como mapa final aprovado.

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

## Prioridades de arte

O planejamento de peças e folhas, com limite de duas por rodada, está em `docs/ordem-de-arte-e-implementacao.md`.

## Conferir a versão após importar

O print relatado mostrava um portal genérico e 122 objetos, enquanto a revisão posterior ao PR #25 já não tinha esse portal e registrava 64 objetos. Isso indica versões diferentes, mas não identifica se a origem foi importação, pasta, servidor ou cache. A versão desta rodada mostra `BASE V0.3.2-bio` no HUD, terminal na chegada, um único biorreator no pátio, estufa, duas pontes com o mesmo modelo, piso modular e detalhes industriais. A versão no HUD não comprova, sozinha, que todos os arquivos vieram da mesma revisão.

Confira se a cópia executada inclui o merge do PR #25 e esta atualização, incluindo `js/data/worlds/arquipelago-rotas-perdidas/estacao-bio.js` e os PNGs em `assets/sprites/estacao-bio/`, incluindo a folha de piso e os quatro detalhes. Sirva a pasta correta e faça recarga forçada (Ctrl+Shift+R). Se aparecer aviso de arte ausente, reimporte o projeto completo. Se persistir, informe a versão do HUD e envie outro print. Não é necessário limpar armazenamento local, trocar a origem/endereço do jogo ou apagar saves; mudar origem pode fazer saves existentes deixarem de aparecer no navegador.
