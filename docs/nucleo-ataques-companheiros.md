# Núcleo, combate e companheiros — protótipos

## Núcleo 10X

A roda exibe uma prévia pulsante recortada da forma já existente (não é uma nova folha de caminhada). Confirmar sustenta a forma por 30 segundos de exploração; o relógio fica parado durante a própria transição e em menus/diálogos. No fim, aguarda Q, varreduras e efeitos de habilidade terminarem e uma posição segura antes de iniciar o retorno visual. A recarga de 8 segundos também conta apenas durante exploração, depois do retorno. O retorno manual inicia a mesma recarga; Q rápido continua disponível. O HUD informa tempo restante/recarga. Forma e relógio são temporários e não alteram o save.

## Riscos de ataques encadeados

Como ainda não há inimigos, dano ao jogador ou resistências elementais, a primeira fraqueza é uma recuperação adicional do ataque básico após uma sequência rápida; não altera dano, energia, deslocamento, Q, R, colisão ou travessia. O contador aparece no HUD e a reação é avisada, em vez de um efeito aleatório injusto. A sequência expira depois de 1,3 s sem atacar:

| Arquétipo | Sequência | Efeito provisório |
| --- | --- | --- |
| Bio-Forja | 4 | Sobrecarga Bio: +0,50 s de recuperação |
| Domínio Ancião | 3 | Abertura da lâmina: +0,65 s |
| Maré Astral | 4 | Dispersão da maré: +0,45 s |
| Núcleo 10X | 5 | Instabilidade do Núcleo: +0,55 s |

Isso é apenas um início ajustável: efeitos contextuais e inesperados mais ricos dependem de inimigos, perigos, leitura visual e balanceamento. Não simula fraquezas elementais que não existem.

A nova folha Bio possui nove quadros frontais com ferramenta/faíscas, sem vistas laterais ou traseira. Ela é usada apenas em ataque frontal com traje Bio ativo. Nas demais direções e trajes, o corpo faz uma reação procedural com o efeito básico existente. As folhas Q do Domínio e da Maré mostram, respectivamente, golpe pesado e deslocamento, não um ciclo direcional de ataque básico: não são exibidas como se fossem essa animação. Futuramente gerar ataques básicos frontal, costas e laterais para cada traje, pés e duração consistentes, com espada pequena para Domínio e sem escudo de Maré no ataque.

## Fundação dos Companheiros de Eco

`js/game/companions.js` contém apenas definições e um protótipo puro de seguimento, ainda sem integração no mundo, interface, save, combate, inventário, captura ou aquisição. Bolt é o cachorro real do criador: precisa de sua própria folha e de uma regra de autorização/obtenção, ainda não decidida. Lúmeo, Marujo e Trisco são conceitos originais, não espécies prontas ou concedidas a jogadores. Antes de ligar ao jogo: arte direcional, animação e sombra/âncora; navegação com colisão e recuperação quando preso; portais e spawn seguro; vínculo ao jogador/conta e consentimento para Bolt; persistência versionada, progressão e acessibilidade. Não clonar franquias ou personagens conhecidos.

## Cenário

O saguão recebeu vias luminosas e um selo procedural no piso, sem alterar objetos, hitboxes, spawns ou portais. As folhas novas de costa, estação e ruínas são referências para as próximas regiões; algumas possuem fundo opaco e perspectiva/recortes heterogêneos, portanto não foram espalhadas como tiles sem validação. O próximo passo é selecionar peças isoladas, limpar fundo sem apagar detalhes, testar âncoras e profundidade e conferir acessibilidade no mapa real.
