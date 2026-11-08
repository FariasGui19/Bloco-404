# Estação Bio e Bolt — Estado V0.3.6-bio

## Versão
- HUD/Menu: `V0.3.6-bio` (config.js)
- Mapa: 72×72 (estacao-bio.js)
- Objetos: 126 (124 decorativos, 2 portais/coletáveis, 30 testes OK)

## Estado da Estação Bio
- Canais: faixas retas com bordas de pedra rente ao solo (margens baixas, 32 instâncias, profundidade negativa).
- Decks: B (24-27,19-20) e b (45-46,38-41) com tábuas, longarinas, treliças, rebites e encontros baixos.
- Rede de pressão: conduítes (6/3.5/1.2 px), nós (condutor, regulador, válvula), rota da primeira missão (16 pontos, 4 estágios).
- Máquinas: terminal (7² hitbox), reator, estufa (filtro, sombra), plataforma, módulos (floreira, tubo, caixa, luminária).
- Fundações: 9 placas baixas sob as máquinas (escala proporcional, profundidade negativa, sem colisão).
- Reparos: condutor (18,14), regulador (39,21), válvula (55,53) — R→E, diagnóstico, fluxo parcial, sem recompensa, sem item.
- Coletáveis: preservados (condutor, regulador, estufa) com flags `collected_*`.
- Portal: volta à praia (leitura registrada se a missão for concluída).
- Arte: 4 imagens estáticas (cabeceira, distribuidor, margem baixa, fundação).
- Documentação: ordem de arte (exatamente duas por rodada), roteiro, estado.
- Testes: 30/30 OK (incluindo navegação, R/E, diário, portal).
- Navegador: capturas v36-*.png (livre:true, versão V0.3.6-bio, ERROS []).

## Bolt (cachorro real)
- Pose provisória com espelhamento e movimento procedural (não folha animada).
- Prévia opt-in no diário (não concedida automaticamente).
- Obtenção pessoal, autorização, animações e progressão real ainda por definir.

## Limitações
- Primeira missão visual/mecanicamente pronta (ilha compartilhada, áreas exploráveis, puzzles, minibosses, pets — próximos passos).
- Viagem espacial/galáctica (nave, interior, melhorias) — vertical slice futura.
- Não gerar terceira imagem na rodada 0.3.6.
- Não declarar sistema completo, não conceder recompensa.

## Base
- BASE V0.3.6-bio
- Commit atual: arena/e9de45fa-bloco-404
- PR #30 mesclada (0.3.5-bio)
