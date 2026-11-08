# Ordem de arte e implementação — Praia → Saguão → Estação

Regra de produção: em cada atualização, gerar e integrar no máximo **duas folhas ou peças visuais novas**, validar escala, direção, ponto de apoio, transparência, ordenação e colisão; guardar originais e não trocar o personagem por outro. Uma peça única não é uma folha de animação. Efeitos e gameplay só são considerados prontos depois dos testes de uso e do navegador.

## Rodada atual: Estação que Respira

1. **Terminal de teleférico e biorreator:** duas peças isoladas inspiradas no conceito aprovado, com preparação de alpha em `tools/preparar-estacao-bio.py`. O terminal é uma estrutura estática sólida; dois biorreatores marcam as áreas de manutenção. Pavimentação e guarda-corpos são procedurais, não contam como folhas geradas.
2. Reorganizar vegetação e adicionar detritos, caminhos e pátios, mantendo a máscara do mapa e o acesso ao retorno e aos três objetivos. Os simuladores e diálogos seguem provisórios; a arte não transforma esses objetivos num puzzle real. A estrutura não é um interior caminhável.

## Próximas rodadas sugeridas (ordem ajustável depois do teste)

1. **Estação Bio — continuidade espacial:** um conjunto de piso/ruínas modular e uma peça de passagem/ponte coerente com os canais, testados no jogo. Evitar gerar uma imagem plana e fingir que suas escadas são caminháveis. Corrigir a borda retangular da ilha, variedade de cenários e transições.
2. **Praia Inicial — travessias e teleférico:** uma folha de peças de teleférico/apoios e, se necessário, uma de obstáculos e animações de reconstrução. Preservar o R de diagnóstico e as rotas das quatro classes; trilhos não devem invadir a areia.
3. **Bolt — animações reais:** uma direção por vez, ou até duas folhas se tiverem quadrícula e alpha válidos; validar identidade, patas e tamanho com o tutor. Hoje só existe uma pose, não caminhada real. Missão pessoal e autorização de conta continuam pendentes.
4. **Saguão — NPCs:** NEXO de frente/costas e, numa rodada seguinte, gestos; preservar aparência já aprovada. Viajante só substituída se houver uma melhoria consistente com as quatro direções e a mala.
5. **Enseada — vínculo e fauna:** arte do Lúmeo com idle/movimento e, depois, objetos de uma cena de encontro. Concluir uma missão de vínculo real, sem revogar pets de saves antigos. Evitar apenas mais cristais para clicar.
6. **Estação Bio — missão:** peças para condutor, válvulas e estufa, leitura de estado e puzzle que use R e Q sem alterar seus valores aprovados. Garantir que salvar/recarregar preserve etapas, com saída e retorno.
7. **Combate — base antes da arte de chefe:** vida e recuperação do jogador, telegraph acessível, ataques com colisão e IA em testes. Depois uma folha de inimigo Bio e sua folha de preparação/ataque, somente quando direção e silhueta forem consistentes; miniboss em rodadas próprias.
8. **Demais arquétipos e regiões:** primeiro missão própria e adversário correspondente, depois habilidades novas quando custo, tecla, colisão, efeitos e progressão estiverem definidos. Domínio, Maré e Núcleo mantêm seus trajetos e identidades; não presumir múltiplos arquétipos simultâneos.
9. **Nave:** após um ciclo terrestre confiável, vertical slice com interior e voo contínuo aparente entre dois locais, controles acessíveis e recuperação; não trocar a ambição por um teleporte.

O objetivo final está em `docs/missoes-inimigos-habilidades-e-pets.md` e `docs/roteiro-proximas-etapas.md`. A sequência não significa que todas as peças já existam; cada etapa deve ser aprovada antes de avançar.
