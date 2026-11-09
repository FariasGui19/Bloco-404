# Ordem de arte e implementação — Praia → Saguão → Estação

Regra de produção: em cada atualização, gerar e integrar **exatamente duas folhas ou peças visuais novas**, validar escala, direção, ponto de apoio, transparência, ordenação e colisão; guardar originais e não trocar o personagem por outro. Uma peça única não é uma folha de animação. Efeitos e gameplay só são considerados prontos depois dos testes de uso e do navegador.

## Rodada atual (0.3.5): continuidade espacial da Estação Bio

**Duas imagens estáticas geradas e implementadas**, não folhas de animação: `assets/sprites/estacao-bio/bio-cabeceira.png` (cabeceira/apoio de ponte) e `bio-distribuidor.png` (distribuidor de pressão com tela e tubos). Os originais sobre fundo magenta estão em `assets/source-art/estacao-bio/`; `tools/preparar-integracao-bio.py` reproduz a limpeza com alpha real. Foram escolhidas depois de revisar mapa e renderer, porque as pontes e máquinas estavam desconectadas: gerar mais uma folha de personagem sobre essa geometria quebrada não teria validade de escala, profundidade ou colisão.

O que entrou junto, sem esperar outra rodada: as duas pontes deixaram de ser a mesma imagem desenhada ao fundo e viraram **decks caminháveis sobre células de água**, com tabuleiro, faces laterais e guarda-corpos desenhados por trecho com `x + y` real; quatro cabeceiras geradas apoiam as margens; a rede de pressão liga condutor, regulador, biorreator e estufa por conduítes no piso; terminal, biorreator e estufa passaram a ser desenhados em **faixas com profundidade própria** (`depthLayers`), em vez de um `depthOffset` único; a hitbox do terminal foi medida a partir do PNG e testada por vários lados; as estruturas grandes ganharam avental de piso e sombra de apoio. A válvula da estufa é uma consequência opcional dos reparos já existentes: **R** diagnostica, **E** abre fluxo parcial, a rede e a estufa mudam de estado visual, mas não há item, recompensa, conclusão de missão nem afirmação de sistema completo. Saves com os reparos feitos e os três coletáveis antigos continuam válidos.

Verificação: todos os `tests/*.mjs`, inclusive os novos `tests/bio-integracao.mjs` e a versão atualizada de `tests/estacao-bio.mjs`; e Chromium headless real com capturas em vários pontos, travessia de ida e volta pelo deck, água bloqueada, sequência R/E, diálogo, `localStorage` e zero erros de console. As capturas não são arte do repositório. Ainda é protótipo: canais retos, areia, bordas da ilha, transições, escala fina e camadas por pixel seguem pendentes; as faixas horizontais são uma separação real de desenho, não profundidade por pixel de cada objeto.

## Rodada anterior (0.3.4): diagnóstico e reparo na Estação Bio

Duas folhas estáticas: estados danificado/reparado para condutor e regulador, e quatro peças de vegetação industrial. A primeira geração veio em 4×2, e os quadros extremos de cada linha são usados como estados; a segunda tem linhas que são excluídas no recorte. `tools/preparar-sistemas-bio.py` reproduz a preparação. Não são animações: o sprite troca instantaneamente ao reparar.

A sequência opcional usa R de Bio-Forja para diagnosticar e E para reparar o condutor da chegada e depois o regulador do pátio. Os reparos permanecem sólidos e visíveis e as flags sobrevivem à reentrada, sem substituir coletáveis antigos nem missão ativa. Ainda não ativam a estufa nem concedem recompensas. O cenário continua provisório; árvores, areia, água e bordas exigem refinamento. A aproximação de profundidade do terminal foi ajustada para o novo ponto do print, mas não substitui camadas reais.

## Próximas rodadas sugeridas (ordem ajustável depois do teste)

1. **Estação Bio — refino do que foi consolidado:** a base espacial (decks, canais, camadas, colisão medida, rede) já está implementada e testada; falta suavizar a borda retangular da ilha, os canais retos, a transição areia/piso, a variedade de cenário e a profundidade fina das passagens. Evitar gerar uma imagem plana e fingir que suas escadas são caminháveis. Testar em vários tamanhos de tela antes de aprovar.
2. **Praia Inicial — travessias e teleférico:** uma folha de peças de teleférico/apoios e, se necessário, uma de obstáculos e animações de reconstrução. Preservar o R de diagnóstico e as rotas das quatro classes; trilhos não devem invadir a areia.
3. **Bolt — animações reais:** uma direção por vez, ou até duas folhas se tiverem quadrícula e alpha válidos; validar identidade, patas e tamanho com o tutor. Hoje só existe uma pose, não caminhada real. Missão pessoal e autorização de conta continuam pendentes.
4. **Saguão — NPCs:** NEXO de frente/costas e, numa rodada seguinte, gestos; preservar aparência já aprovada. Viajante só substituída se houver uma melhoria consistente com as quatro direções e a mala.
5. **Enseada — vínculo e fauna:** arte do Lúmeo com idle/movimento e, depois, objetos de uma cena de encontro. Concluir uma missão de vínculo real, sem revogar pets de saves antigos. Evitar apenas mais cristais para clicar.
6. **Estação Bio — missão:** peças para condutor, válvulas e estufa, leitura de estado e puzzle que use R e Q sem alterar seus valores aprovados. Garantir que salvar/recarregar preserve etapas, com saída e retorno.
7. **Combate — base antes da arte de chefe:** vida e recuperação do jogador, telegraph acessível, ataques com colisão e IA em testes. Depois uma folha de inimigo Bio e sua folha de preparação/ataque, somente quando direção e silhueta forem consistentes; miniboss em rodadas próprias.
8. **Demais arquétipos e regiões:** primeiro missão própria e adversário correspondente, depois habilidades novas quando custo, tecla, colisão, efeitos e progressão estiverem definidos. Domínio, Maré e Núcleo mantêm seus trajetos e identidades; não presumir múltiplos arquétipos simultâneos.
9. **Nave:** após um ciclo terrestre confiável, vertical slice com interior e voo contínuo aparente entre dois locais, controles acessíveis e recuperação; não trocar a ambição por um teleporte.

## Animações dos arquétipos — na fila, entre as etapas acima

A rodada 0.3.5 não gastou suas duas imagens com personagens porque a prioridade relatada era a integração espacial da Estação Bio; as folhas de arquétipos exigem referência aprovada, grade e alpha conferidos antes de implementar, e não devem ser geradas "no escuro" para justificar a cota. Elas continuam na ordem abaixo e podem retomar a cota de duas imagens por rodada assim que esta base for aprovada pelo jogador.

Por rodada, exatamente duas folhas ou imagens; cada ação/direção deve manter o traje nível 1, identidade, pés, proporção, alpha, grade e ordenação. Integrar e testar somente quadros aprovados; não substituir Q/R já aprovados nem supor que uma pose estática é animação. Os prompts e referências estão em `docs/prompts-sprites-precisao.md`.

1. **Bio-Forja:** ataque básico direcional e caminhada coerente com o traje ativo; conferir os quadros já existentes antes de gerar o que falta. Preservar os valores e o modo rápido de Q.
2. **Domínio:** ataque básico direcional com espada pequena (não o Q pesado); hoje há apenas poses laterais provisórias do traje de nível 1.
3. **Maré:** ataque básico direcional com fita líquida e o traje correto; sem escudo para baixo nem troca de identidade.
4. **Núcleo 10X:** corrida frontal e traseira da Forma Veloz, atualmente ausentes; preservar corrida lateral e ataque aprovados. Depois avaliar as demais lacunas, sem trocar a criatura.
5. Para cada arquétipo, avaliar caminhada/idle em direções faltantes e transições/efeitos de habilidades em folhas separadas, somente depois de validar quais quadros realmente faltam. Novas habilidades exigem definição de input, custo e progressão antes de arte e implementação.

O objetivo final está em `docs/missoes-inimigos-habilidades-e-pets.md` e `docs/roteiro-proximas-etapas.md`. A sequência não significa que todas as peças já existam; cada etapa deve ser aprovada antes de avançar.

## Rodada 0.3.8 — piso e primeira sala

Exatamente duas texturas geradas: piso industrial ortográfico e solo de jardim, aplicadas sobre a máscara caminhável e cacheadas em blocos; sem folhas de animação nesta rodada. O relato visual priorizou a unidade do chão e a escala/oclusão sobre novas poses. Os recortes seguintes devem validar o terminal e o novo piso em jogo, criar uma base de vida/dano/recuperação e telegraph antes de inimigos ou miniboss, e só então retomar as folhas direcionais de ataque e caminhada Bio com referência e quadros validados. A sala de controle e o puzzle R/Q/E são um primeiro recorte funcional, não a missão final nem um interior completo para todas as estruturas.

## Rodada 0.3.9 — retorno visual do jogador

Duas texturas de chão pixel art geradas e integradas; as texturas anteriores foram preservadas como originais. O terminal foi recuado com fundação alinhada à hitbox; a sala ganhou decoração e circuito, e a praia recebeu plataforma de embarque e distinção dos limiares de travessia. São aproximações de código e peças existentes, não uma estação ferroviária final nem revisão de toda a costa. Próximos passos: testar em jogo os recuos, oclusão, legibilidade e desempenho; só depois prosseguir com folha de animação Bio ou peças específicas para a praia e iniciar vida/dano antes de inimigos.

## 0.3.10 — inventário e prompts para produção externa

Nenhuma imagem nova gerada. A prioridade mudou a pedido do criador: `docs/prompts-arquipelago-producao.md` contém instruções exatas e referências, começando por estação da praia e bordas de mar, depois Bio e animações. As folhas de ataque de Domínio e Maré arquivadas não preservam os trajes aprovados e continuam sem uso. A caminhada Bio usa apenas os dois passos laterais da folha já existente, com prioridade de ataque/Q/R; frente e costas ainda não têm ciclo validado. Os limiares das pontes usam identidades procedurais provisórias, alinhadas aos centros lógicos e físicos, com sinalização combinada nas rotas compartilhadas Maré/10X. O mar, plataformas e gates ainda precisam de aprovação em navegador.
