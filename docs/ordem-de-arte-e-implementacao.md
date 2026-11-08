# Ordem de Arte e Implementação

## Regra
Gerar e implementar **exatamente duas folhas/imagens por atualização**, seguindo a ordem de prioridade:
1. Saguão (concluído)
2. Animações dos arquétipos (em fila)
3. Estação Bio / Bio-Forja (rodadas 0.3.5 e 0.3.6)
4. Folha de sprites do Bolt (prévia opt-in, sem concessão automática)

## Rodada atual (0.3.6-bio)
**Peças geradas (exatamente duas):**
1. `assets/source-art/estacao-bio/margem-canal-baixa.png` → `assets/sprites/estacao-bio/bio-margem-baixa.png` (512×309, alpha real, bordas rente ao canal)
2. `assets/source-art/estacao-bio/fundacao-maquina.png` → `assets/sprites/estacao-bio/bio-fundacao.png` (512×281, alpha real, placas sob as máquinas)

**Implementação:**
- Mapa `estacao-bio.js`: margens baixas (32 instâncias, sem colisão, profundidade negativa), fundações (9 instâncias, sob máquinas, escala proporcional), rota da primeira missão (16 pontos, 4 estágios), diário (etapas Bio, sem recompensa), portal (leitura registrada).
- Renderer: `drawStationCanalRims` (bordas de pedra rente à água), `drawStationRoute` (losangos no piso), profundidade das sombras (contato duro), conduítes (6/3.5/1.2 px), lâmpadas (raio 2.6).
- Config/Main: versão `0.3.6-bio`, manifesto (4 sprites novos), aviso de arte ausente.
- UI: diário (etapas Bio, sem recompensa), interação (portal com leitura registrada).
- Testes: `tests/estacao-bio.mjs` (126 objetos, 32 margens, 9 fundações, rota, diário, portal), `tests/bio-integracao.mjs` (portal com leitura), `tests/quest-journal.mjs` (etapas Bio). **30/30 OK**.
- Navegador: capturas `v36-*.png` (terminal, ponteA, ponteB, patio, valvula, wide) confirmam livre:true, version V0.3.6-bio, ERROS [].

## Rodada anterior (0.3.5-bio)
**Peças geradas (exatamente duas):**
1. `assets/source-art/estacao-bio/cabeceira-ponte.png` → `assets/sprites/estacao-bio/bio-cabeceira.png` (640×503, alpha real)
2. `assets/source-art/estacao-bio/distribuidor-pressao.png` → `assets/sprites/estacao-bio/bio-distribuidor.png` (640×595, alpha real)

**Implementação:**
- Mapa `estacao-bio.js`: canais, decks, rede, válvula (55,53), cabeceiras (4), distribuidores (3), sombras, filtros, hitbox 7².
- Renderer: `drawStationBridges`, `drawBioNetwork`, `drawBioShadows`, `stationClip`, `depthLayers`, conduítes, tábuas.
- Config/Main: versão `0.3.5-bio`, manifesto (2 sprites novos).
- Testes: **30/30 OK** (incluindo R→E, saves, coletáveis).
- Navegador: capturas `new-*.png` e `final-*.png` (válvula visível, rede ciano), interação Chromium real (R→E, diálogo, save).
- PR #30 mesclada em `main` (commit `9567ec4`).

## Rodada anterior (0.3.4-bio)
**Peças geradas (exatamente duas):** (histórico)
- Animações de arquétipos (fila preservada)

## Próximos passos
- Continuar fila de animações dos arquétipos (prioridade: Saguão → Arquétipos → Bio-Forja → Bolt).
- Missão completa visual/mecanicamente: ilha compartilhada, áreas exploráveis, puzzles, minibosses, pets.
- Viagem espacial/galáctica (nave, interior, melhorias) — vertical slice futura.
- Não gerar terceira imagem na rodada 0.3.6.

## Justificativa da fila
A Estação Bio (0.3.5 e 0.3.6) foi priorizada para consolidar o ciclo terrestre (piso, canais, rede, missão inicial) antes de retomar as animações dos arquétipos e o Bolt. A ordem de prioridade (Saguão → Arquétipos → Bio-Forja → Bolt) é mantida.
