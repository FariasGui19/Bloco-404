# Docas — lote 5: detalhe ambiental e legibilidade do combate

## Prioridade e dez originais

1. Infectado: preparação de ataque, golpe e reação de impacto (três imagens).
2. Pescadores: boias antigas, calendário de marés e rastro molhado.
3. Escuta: osciloscópio de parede e anotações de sinal.
4. Oficina: ventilador e medidor de pressão.

Sete detalhes são projeções sem colisão nas paredes/piso; não se acrescentaram
novos obstáculos nas rotas. Originais e sprites estão nos diretórios
`assets/{source-art,sprites}/docas-interiores-lote5`.

O gerador retornou oito poses nas fontes de preparo e impacto apesar do pedido
de figura única; a preparação seleciona respectivamente os quadros 6 e 2,
sem regenerações. Mantidas exatamente dez fontes neste lote. O script
`tools/preparar-docas-interiores-lote5.py` remove o matte, limita a 512px,
registra hashes e mede contatos opacos dos pés offline. Requer Pillow/numpy.

## Combate e colisão

- Os dois infectados externos usavam posições arredondadas da antiga grade,
  fora do piso atual. Agora nascem em (1050,455) e (980,190) da planta,
  verificadas contra a máscara contínua com raio .22.
- Renderizador compartilhado exterior/interior: prioridade impacto → preparo
  → golpe → caminhada → repouso; sprites ancorados nos contatos medidos.
- Repouso não percorre os oito quadros de caminhada. Respiração sutil não
  desloca a origem dos pés. Modo reduzido congela movimento decorativo, mas
  preserva mudanças de estado e o aviso essencial do ataque.
- Golpe visível por .25s após o preparo; dano, alcance, aviso .65s e cooldown
  permanecem. Reação de impacto não introduz invulnerabilidade nova.
- Se o deslocamento direto estiver bloqueado, testa tangentes em três
  subamostras, sem teletransporte. Inimigos vivos mantêm separação .44;
  mortos não se tornam obstáculos. Não é um pathfinder global.
- Corrigida a orientação do rosto para projeção isométrica versus lateral.
- Preservados número de inimigos, vida, recompensa e condição de purificação.

## Atmosfera

Osciloscópio com varredura recortada no fósforo; sombras suaves das pás no
interior da grade imóvel do ventilador; boias com movimento inferior discreto.
Sem novos sons automáticos nem mudança da trilha do lote anterior.
Farol, barcos, costa e portal não foram redesenhados.

## Validação

Oito suítes Node direcionadas passaram: interiores lotes 2/3/4/5,
maré-cromática-ameaças, navegação, animação e revisão-final.
Incluem spawns, tangentes livres/bloqueadas, estados de combate, modo reduzido,
399 amostras de paredes, 11.786 arestas navegáveis, três rotas farol/portal,
12 interações/saídas interiores e preservação do áudio opt-in.

Cinco suítes Chromium passaram: interiores, navegação, gameplay-live,
fidelidade e oeste-pontual. Interiores percorreu as três salas com colisão e
E, verificou sete detalhes novos no jogo, três caminhos de renderização das
poses em canvas, inventário/vitais intactos, FX estáveis em modo reduzido e
nenhum erro de página. As poses também constam na prévia isolada testada.
Após o último ajuste de separação/orientação da IA, as oito suítes Node foram
repetidas, assim como a suíte Chromium de interiores; as outras quatro
suítes Chromium haviam passado antes desse último ajuste.

Capturas: `qa/docas-interior-lote5-*.png`,
`qa/docas-interiores-lote5-previa.png`. Prévia:
`docs/previa-docas-interiores-lote5.html` (sem leitura/gravação de saves).
Revisão visual das capturas e testes automatizados, não travessia humana.
A suíte completa não foi repetida: continuam documentadas as falhas herdadas
do lote 2. Validação direcionada não equivale a garantia de zero defeitos.
