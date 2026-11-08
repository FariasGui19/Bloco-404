# Próximas Etapas — Bloco 404

## Concluído
- Saguão (concluído)
- Estação Bio 0.3.5-bio (cabeceira, distribuidor, rede, válvula, 30/30 testes, PR #30 mesclada)
- Estação Bio 0.3.6-bio (margem baixa, fundação, rota da missão, diário, portal, 30/30 testes, capturas v36-*.png)

## Em fila (prioridade)
1. Animações dos arquétipos (Saguão → Arquétipos → Bio-Forja → Bolt)
   - Arquétipo 1: ataque básico adaptativo, 4 habilidades (Q/R + Ultimate), direção, escala, pés, transparência (conferir `docs/prompts-sprites-precisao.md`).
   - Arquétipo 2: ...
2. Bolt (cachorro real): prévia opt-in no diário (não conceder automaticamente), obtenção, autorização, animações, progressão.

## Missão completa (primeira missão visual/mecanicamente pronta)
- Ilha compartilhada, ampla e coerente (áreas exploráveis, missões próprias, marcantes).
- Obstáculos, puzzles, inimigos agressivos telegrafados, minibosses com contrajogo.
- Pets com níveis, progressão e inventário reais.
- Viagem espacial/galáctica contínua (nave, interior interativo, melhorias) — vertical slice entre dois destinos.

## Restrições
- Exatamente duas folhas/imagens por atualização.
- Preservar saves, progresso, interações, caminhos, portais.
- Clique esquerdo ataca; Shift + clique move.
- Bio-Forja Q aprovado (2,15 tiles / 28 energia; com traje 2,80 tiles / 22 energia; recarga 1,25 s).
- Um arquétipo e um módulo por vez.
- T alterna roupa civil/armadura.
- Núcleo 10X: roda própria; Forma Veloz mais rápida.
- Portal e animação interior: não animar a estrutura inteira, apenas o interior/tela.
- Consultar `docs/prompts-sprites-precisao.md` antes de gerar animações.
- Bolt: semelhança aprovada, pose provisória, prévia opt-in.

## Próxima ação
- Retomar fila de animações dos arquétipos (conforme `docs/ordem-de-arte-e-implementacao.md`).
- Gerar exatamente duas folhas/imagens para o próximo arquétipo (prioridade: Saguão → Arquétipos).
- Implementar, testar (30/30), capturar (Chromium real), documentar, commit, push, PR.
