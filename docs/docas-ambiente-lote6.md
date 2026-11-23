# Docas — lote 6: vestígios da maré e desempenho

## Dez fontes novas, dez elementos implementados

Algas encalhadas, conchas partidas, garrafa com recado, argola do cais,
rede rasgada, penas negras, velas votivas, bússola quebrada, caranguejo e
bandeira naval rasgada. Escala pequena e posição no chão, sem novos sólidos,
missões obrigatórias ou recompensas. Os dez apoios foram conferidos contra
navegação real. O caranguejo faz uma pequena excursão determinística e só
aceita posições caminháveis; não é mob nem interfere no combate.

Fontes: `assets/source-art/docas-ambiente-lote6/`.
Sprites RGBA e hashes: `assets/sprites/docas-ambiente-lote6/manifest.json`.
Preparação: `tools/preparar-docas-ambiente-lote6.py` (Pillow/numpy).
Prévia: `docs/previa-docas-ambiente-lote6.html`.

## Otimização sem cortar a lógica do jogo

- Classificação água/terra memoizada por mapa e célula, limitada a 4096 entradas.
- Oito grades de células de mar reutilizáveis, sem reconstrução contínua.
- Caminhos Path2D dos recortes da costa construídos uma vez por mapa;
  fallback preservado para contextos sem Path2D.
- Somente a camada translúcida do mar perimetral é amortizada a **12 Hz**,
  em superfície de até 1536×1536 (~9 MiB RGBA por mapa vivo). Efeitos suaves
  rasterizados a 75% da resolução CSS projetada, independentes do DPR.
- Margem de 120 unidades mundiais evita reconstrução a cada pequeno movimento
  da câmera. Mundo e cache usam a mesma transformação: sem FX presos à tela.
- Invalidação por tempo visual, mapa, zoom, preferência de movimento, saída da
  margem e disponibilidade da textura. Modo reduzido reutiliza quadro estável.
- RAF principal, input, jogador, IA, colisão, cronômetro e áudio não são limitados.
  Farol, barcos, portal, construções e sprites dos inimigos não foram reamostrados.

## Medição local, não promessa de FPS no dispositivo do jogador

Chromium headless do sandbox, canvas 1568×880, três vistas, 20 aquecimentos e
50 amostras por vista. Cada amostra executa render e leitura de pixel para
forçar conclusão; não é FPS do jogo completo nem profiling no hardware do usuário.
Base `6186a0a` versus estado final, com os dez elementos novos já ativos.

| Vista | Mediana antes | Depois | Redução |
|---|---:|---:|---:|
| Mapa aberto | 114,0 ms | 60,7 ms | 47% |
| Centro | 77,6 ms | 48,0 ms | 38% |
| Norte | 117,1 ms | 35,5 ms | 70% |

P95: aberto 133,2 → 121,9 ms; centro 244,5 → 83,8 ms;
norte 143,0 → 101,3 ms. Há variação entre execuções e picos nos quadros de
reconstrução do cache. Isso **não resolve todo o custo do exterior** nem garante
60 FPS. Execuções preliminares chegaram a mostrar P95 central maior apesar da
mediana menor; por isso a resolução dos FX foi reduzida no acabamento final.

Resumo bruto em `qa/docas-ambiente-lote6-performance.json`.
Reproduzir com servidor na raiz (porta 8000), variáveis BROWSER_EXECUTABLE,
PLAYWRIGHT_MODULE e BROWSER_LIBRARY_PATH e `node tools/medir-docas-lote6.mjs`.
O script extrai somente JS/docs da base em `.qa/baseline`, sem mudar a branch.

## Validação

Node: `docas-ambiente-lote6`, `docas-mar-cache`, `docas-interiores-lote5`,
`mare-cromatica-ameacas`, `docas-navigation`, `docas-animation`,
`docas-revisao-final`: passaram. Incluem 600 posições do caranguejo, dez
registros/hashes, cache limitado/invalidação, modo reduzido, 11.786 arestas
navegáveis e as rotas do farol/portal. Nenhuma colisão alterada neste lote.

Chromium: interiores, navegação, gameplay-live, fidelidade, oeste-pontual e
ambiente-lote6 passaram. A última observa as dez artes desenhadas no exterior,
compara normal animado/reduzido estável e verifica ausência de erros ou escrita
em storage. Captura: `qa/docas-ambiente-lote6-exterior.png`.
A suíte completa não foi repetida; falhas herdadas seguem documentadas no lote 2.
Validação automatizada e revisão das capturas, não travessia humana.
