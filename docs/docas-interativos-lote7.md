# Docas — lote 7: missão e estados dos infectados

## Dez folhas e integração

Sete artes substituem a apresentação genérica de nove interativos existentes:
fragmentos da costa/vigia, gravadores oeste/leste, chave da trilha, fusível e
terminal CRT. Os gravadores são reutilizados no galpão. IDs, coordenadas,
distâncias, diálogos, colisões e requisitos de início da missão não mudaram.
Os objetos mantêm o sprite anterior como fallback se a arte nova faltar.

Os apoios opacos são medidos offline; caixas, suportes e gravadores não
levitam. Indicadores respiram discretamente enquanto pendentes, distinguem
registros concluídos e gravadores vazios no galpão. Anel local somente quando
o jogador se aproxima. O desenho lê progresso, mas não grava flags/saves.
Movimento reduzido estabiliza os sinais. Fontes/sprites/manifesto com hashes
em `assets/{source-art,sprites}/docas-interativos-lote7`.

Três artes adicionais: alerta estacionário, recuperação após golpe e queda.
Usam estados reais da IA, nos dois renderizadores. A queda permanece por
até .8s, sem novo dano, XP, respawn ou obstáculo; desaparece depois. Purificação
total continua removendo a ameaça sem deixar cadáver persistente. O alerta
só substitui a pose quando parado; não interrompe perseguição nem ataque.
Preparo, golpe, impacto e prioridade dos avisos anteriores foram preservados.

## Leveza

Miniaturas 2× da largura de desenho são rasterizadas uma vez por imagem;
60 quadros reutilizam o mesmo canvas. Indicadores usam traços simples, sem
novos gradientes por quadro, timers ou leituras de pixels. Nenhum emissor
sonoro novo. Mantidos os caches do mar do lote 6.

Novo cache do terreno estático na resolução projetada: só é construído após
três quadros no mesmo zoom, limitado a 2048² (~16 MiB RGBA no pior caso,
normalmente menor). Uma única entrada é retida. Durante gesto de zoom e
ampliação, usa o caminho original para evitar reconstruções e perda de detalhe.
Não reamostra jogador, inimigos, HUD ou itens de missão.

## Medição comparativa

Base `06c35c1` (lote 6 já otimizado), Chromium headless local, 20 aquecimentos,
50 amostras por vista, leitura de pixel forçando conclusão. Resultado final:

| Vista | Mediana base | Mediana nova | P95 base → novo |
|---|---:|---:|---:|
| Aberto | 94,3 ms | 72,2 ms | 172,2 → 143,8 ms |
| Centro | 71,7 ms | 65,2 ms | 114,2 → 106,6 ms |
| Norte | 48,2 ms | 40,2 ms | 133,8 → 130,0 ms |

Redução mediana aproximada de 23%, 9% e 17% nesta execução. Não é FPS do
aparelho do usuário, nem garantia de ganho fixo. Houve variabilidade: a primeira
execução, antes do cache de terreno, mostrou regressão; isso motivou a nova
mudança. Números brutos finais: `qa/docas-interativos-lote7-performance.json`.
Método: `tools/medir-docas-lote6.mjs` com base substituída por `06c35c1` e
saída renomeada; mesma cena/protocolo. Não foi refeita a suíte inteira do repo.

## Validação executada

Node: novo teste lote7, cache de terreno, interiores lotes 2/3/4/5,
ambiente lote6, ameaças cromáticas, navegação, animação, cache do mar e revisão
final passaram. Checam nove interativos, progresso, dez fontes/hashes,
queda limitada sem dano/respawn, cache único para 60 quadros, rotas e colisões.

Chromium: interiores, navegação, gameplay-live, fidelidade, oeste-pontual e
ambiente-lote6 passaram. Interior entrou/saiu com E e colisão real nas três
salas; observou sete novas artes em uso e três poses em canvas; comparou
indicadores pendentes animados e modo reduzido estável para os sete tipos;
inventário/vitais intactos, áudio opt-in e nenhum erro de página.
As cinco suítes exteriores foram repetidas após o cache do terreno.

Prévia isolada: `docs/previa-docas-interativos-lote7.html`.
Capturas: `qa/docas-interior-lote7-*.png` e
`qa/docas-interativos-lote7-previa.png`. Testes automatizados e revisão visual,
não travessia humana. Falhas herdadas da suíte completa continuam documentadas.
