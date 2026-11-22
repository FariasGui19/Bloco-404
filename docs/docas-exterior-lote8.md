# Docas — lote 8: interações do exterior

## Dez folhas, doze marcadores existentes

Fragmento da trilha, selo do núcleo, painel de sincronia, controle da âncora,
diário do píer, aviso dos vigias, mural dos vigias, amostra de resina, caixa
elétrica e biomassa. O painel é reutilizado nas três interações de alinhamento.
Fontes/sprites em `assets/{source-art,sprites}/docas-exterior-lote8`.
Manifesto: dez hashes de fontes e tamanhos RGBA ≤512px. A fonte do aviso veio
com duas vistas; o preparador seleciona a metade esquerda, sem gerar outra arte.

Os objetos de gameplay permanecem idênticos: IDs, coordenadas, distâncias,
diálogos, requisitos, cronômetro, colisão e saves não mudaram. O renderer usa
os marcadores existentes para ordenar os desenhos junto ao jogador e prédios.
Não há novos obstáculos nem objetivos obrigatórios; farol/portal/costa/barcos
não foram redesenhados. As novas artes são objetos pequenos, não construções.

Dispositivos têm indicação discreta de pendência/conclusão lida do progresso:
fragmento registrado, estação aberta, três painéis independentes, âncora estável
e ressonâncias ativadas. Livros/murais não recebem luz artificial. Um anel local
aparece perto do jogador. Contatos opacos dos apoios são medidos offline.
Movimento reduzido congela os sinais decorativos; nenhum timer/áudio novo.

## Inimigos

Inclinação discreta na preparação, passada e recuperação, ancorada no contato
dos pés. Usa o relógio/estados reais existentes, sem alterar dano, alcance,
colisão, cooldown, spawns ou recompensas. Mantidos os avisos essenciais e o
modo reduzido. Não há novas artes de inimigos neste lote: a prioridade foi dar
corpo às interações externas antes invisíveis.

## Leveza e decisão de medição

- Novos interativos são descartados por viewport antes de compor a lista.
- Quadros reduzidos dos novos dispositivos são reutilizados em cache global
  de no máximo 2.097.152 pixels (~8 MiB RGBA), com descarte FIFO.
- Estruturas do atlas completamente fora da tela (com margem de 120 unidades)
  e traços da água fora do viewport não recebem comandos de desenho inúteis.
- Caches de terreno e mar dos lotes anteriores preservados.

Foi experimentado o cache reduzido também nos inimigos, mas **não permaneceu
em produção**: no microbenchmark de 64 sprites/amostra, 20 aquecimentos e
50 amostras, a mediana ficou 2,0 → 2,0 ms e P95 2,2 → 2,8 ms. O resultado não
justifica anunciar ganho; foi mantido o caminho original dos infectados.
Dados: `qa/docas-exterior-lote8-raster-performance.json`. Isso mede só um
workload de desenho em Chromium local, não FPS do jogo nem hardware do usuário.
Não há alegação de ganho percentual de FPS neste lote.

## Validação

13 suítes Node direcionadas passaram: exterior-lote8, interativos-lote7,
terreno-cache, interiores lotes 2/3/4/5, ambiente-lote6, ameaças cromáticas,
navegação, animação, mar-cache e revisão-final. Checam fontes/hashes, doze IDs
preservados, estados independentes, culling, reaproveitamento de recortes,
rotas reais, colisão, estados dos inimigos e áudio opt-in.

Sete suítes Chromium passaram: exterior-lote8, interiores, navegação,
gameplay-live, fidelidade, oeste-pontual e ambiente-lote6. A específica observa
as dez fontes sendo desenhadas no exterior, compara sinais dos dispositivos
animados, livros estáticos e modo reduzido estável, sem erro de página nem
mutação de storage. Cinco suítes exteriores foram repetidas após o culling
final; interiores e ambiente-lote6 haviam passado antes dessa última mudança.

Prévia: `docs/previa-docas-exterior-lote8.html`.
Captura revisada: `qa/docas-exterior-lote8.png`.
Preparação: `tools/preparar-docas-exterior-lote8.py` (Pillow/numpy).
Validação automatizada e revisão visual, não travessia humana. Suíte completa
não repetida; falhas herdadas continuam documentadas nos lotes anteriores.
