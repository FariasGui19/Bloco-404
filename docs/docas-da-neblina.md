# Docas da Neblina — reconstrução em andamento

## Base jogável e navegação
A travessia leva ao mapa `mare_cromatica_docas`. A imagem `assets/sprites/docas-neblina/referencia.png` é mantida **somente como referência de produção**: não é carregada nem desenhada no cenário. O mapa usa a planta ampliada em 2,5 vezes, piso gerado separadamente, mar texturizado, margens rochosas, máscara de colisão e peças de arquitetura individuais. As peças principais, o personagem e os infectados são ordenados pela profundidade de seus pés. A máscara de colisão continua baseada em células; peças decorativas reaproveitadas não têm colisão individual. A reconstrução não é uma cópia perfeita da referência e ainda precisa de acabamento de relevo e paisagismo.

A travessia mantém inércia, sonar [R] e adiciona farol alternável [L]: peixes e sombras no cone de luz são atraídos, mas ainda podem atacar por proximidade com o farol apagado. Há rastro de espuma limitado, bancos de névoa e botão de farol para toque. O sonar tem recarga. Movimento reduzido congela o deslocamento decorativo da névoa.

## Checklist dos lotes
### Lote 1 — navegação
- [x] Farol alternável e atração pelo cone; o risco não some no escuro.
- [x] Sonar, espuma e névoa em camadas com custo limitado.
- [x] **Dez artes marítimas dedicadas**: rocha, naufrágio, boia, óleo, redemoinho, tentáculo, olhos, sombra, espuma e peixe. Estão integradas à travessia; seis delas também aparecem junto à costa das Docas. Os marcos decorativos não têm colisão própria.
- [x] Dez folhas de oito quadros leves e animação no jogo. **São transformações procedurais das imagens únicas**, não quadros desenhados manualmente: as boias oscilam, o vórtice gira, os tentáculos balançam e as demais peças se movimentam suavemente. `tools/preparar-travessia-lote1.py` reproduz o processamento. O movimento decorativo para com `prefers-reduced-motion`.
- [ ] Polimento artístico dos quadros e colisões de naufrágios/rochas caso devam funcionar como obstáculos; ainda não há animação de deformação orgânica real nem sprites direcionais do peixe.

### Lote 2 — terreno e estruturas
- [x] Referência integral removida do renderizador e do carregamento de sprites.
- [x] Planta expandida, terreno, água, margens, colisões de área e ordenação em profundidade.
- [x] Dez artes geradas, processadas e integradas: barco, píer, cabana oeste, cabana leste, galpão, escada, torre, farol, câmara e porta. Fontes e arquivos preparados estão em `assets/sprites/docas-reconstrucao/`; `tools/preparar-docas-estruturas.py` recria as versões transparentes.
- [x] Farol com feixe móvel; luzes da torre e câmara pulsam. O desenho de barcos, monitores, fumaça, ondas e cristais não tem animação própria quadro a quadro; o cristal não gira ainda.
- [ ] Integrar melhor as junções, relevo escalonado, portas e pisos com arte/colisões específicas, incluindo revisão manual de oclusão e proporcionalidade em todo o percurso. A escadaria e o píer são camadas de chão; a altura física ainda não é simulada (ver lote 4).

### Lote 4 — união e sustentação dos platôs
- [x] Dez elementos estáticos de relevo gerados e processados: falésia frontal e lateral, rampa, escadaria de rocha, platô, muro, cascalho, pilar, passarela e borda. Os arquivos ficam em `assets/sprites/docas-relevo/`, reproduzíveis com `tools/preparar-docas-relevo.py`. São peças estáticas; animação será trabalhada depois conforme pedido.
- [x] Extensão do piso superior sob farol e porta, faces rochosas nas margens e apoios sob estruturas. A geometria da superfície continua sendo a fonte de colisão; as novas peças de relevo são visuais e não criam piso ou bloqueios por si próprias.
- [x] Teste de percurso com `moveWithCollision` do píer ao platô e bloqueio da borda; teste da ordenação por pé para personagens e estruturas. Inspeção no navegador de vila, escada e platô sem erros de carregamento/JavaScript, com teleporte para cada local.
- [ ] **Altura física ainda não implementada:** a escada continua projetada como chão, sem camadas de elevação, transição de altura ou oclusão separada dos corrimãos. A ordenação por pé resolve frente/trás de estruturas comuns, mas não garante oclusão física da escadaria. Revisar visualmente os encaixes de toda a ilha, relevo e passagens; ainda há diferenças de perspectiva e faces simplificadas.

### Lote 3 — fauna, vegetação e props
- [x] Dez peças individuais geradas e integradas: cristal, árvore, palmeira, caixotes, barris, resina, fita, tentáculo, esporos e rede. O lote substitui as palmeiras e caixas provisórias; os conjuntos de mata antigos ainda são reutilizados.
- [x] Dez folhas RGBA de oito quadros com ancoragem no pé e movimento procedural discreto; árvores e tentáculos balançam, cristais/resina pulsam e esporos têm partículas limitadas. `tools/preparar-docas-lote3.py` reproduz os arquivos. As folhas usam cisalhamento de uma única arte, **não são quadros pintados individualmente**; com movimento reduzido as partículas param e o primeiro quadro é usado.
- [ ] Fazer animações orgânicas desenhadas quadro a quadro e revisar a distribuição e oclusão ao longo de toda a rota. As novas peças são **decorativas, sem colisão ou interação**; as fitas/resinas visuais não são os itens coletáveis. A máscara e as interações de missão seguem inalteradas.
- [x] Validação automatizada das dez folhas e dos marcos de rota; inspeção de vila e platô no Chromium sem erros JavaScript ou falhas de carregamento do lote. A inspeção usou teleporte e não substitui uma jornada manual completa ou benchmark em dispositivo real.

### Lote 5 — superfície, costa e vestígios
- [x] Dez artes estáticas integradas: quatro texturas (areia úmida, terra, pedra e falésia) e seis objetos (conchas, destroços, cordas, âncora, poste e capim). Fontes e versões otimizadas ficam em `assets/sprites/docas-lote5/`; `tools/preparar-docas-lote5.py` requer Pillow. Como combinado, a animação deste lote fica para depois; não são folhas quadro a quadro.
- [x] Piso texturizado, caminhos, marcas irregulares na parte interna da costa e faces rochosas; o mar preenche também o espaço fora do canvas cacheado. Vegetação que tinha o pé fora da área de terra foi reposicionada. O píer e o barco preservam suas posições e mecânicas.
- [x] Dois diários opcionais de ambientação no píer e na vila explicam a luz, a chave e o fusível; a primeira leitura é registrada em flags do save e os textos podem ser lidos novamente. Não dão itens, não condicionam a missão e não alteram o cronômetro.
- [x] Testes de arquivos e pontos de apoio, prioridade das interações e rota até o platô; navegador validou píer, vila, escada e abertura dos dois diários sem erros JS ou falhas de carregamento. A inspeção usou teleporte.
- [ ] A costa ainda segue a planta poligonal, com facetas visíveis; as texturas e detalhes não modificam a colisão. Falta remodelar contornos e transições com testes manuais, substituir a altura projetada por uma solução física na escadaria e animar o lote posteriormente. Os objetos novos são decorativos, não bloqueiam e não são itens coletáveis.

### Lote 6 — vestígios da vila e costa
- [x] Dez peças estáticas inspiradas na referência: cerca, árvore seca, cristal violeta, coral, bote, caixote com barril, runa, armadilha de pesca, rochedos e luminária. `assets/sprites/docas-lote6/` contém fontes e recortes; `tools/preparar-docas-lote6.py` recria os PNGs com Pillow. Este lote ainda não é animado.
- [x] Margens de terra recebem subdivisões irregulares pequenas, determinísticas e compartilhadas pelo piso e pela máscara de colisão, mantendo a planta de referência; caminhos, portais e pontos de missão continuam acessíveis nos testes. As peças são decorativas e ainda não bloqueiam passagem, inclusive as cercas.
- [x] Marca opcional dos navegantes explica os três fragmentos e duas fitas, sem condicionar a missão; sua leitura é salva. A torre deixou de exibir texto de desenvolvimento e informa, dentro da história, que a subida está interditada.
- [x] Validados dez PNGs, apoio da decoração no terreno, coerência do contorno com a máscara e percurso por movimento; inspeção por teleporte de píer, vila, costa e escada, e abertura da marca no navegador. Após detectar fundo verde entre as tábuas, o processamento foi corrigido e os dez recortes foram checados novamente.
- [ ] A costa ainda tem facetas e exige polimento manual; as peças não têm colisões específicas nem animação própria. A escada continua sem elevação física/oclusão de corrimãos. Não foi concluída uma jornada manual integral nem medido desempenho em hardware real.

### Lote 7 — encontro do píer com a água
- [x] Dez peças estáticas: margem arenosa, pedras de margem, raiz, coral, estacas, passagem, lajotas, talude, degrau e rocha alta. Fontes e PNGs preparados em `assets/sprites/docas-lote7/`; `tools/preparar-docas-lote7.py` usa Pillow. Animação fica para etapa posterior.
- [x] A superfície do deck tem máscara própria compartilhada com a colisão, mas não pinta terra debaixo dele. O píer foi ajustado sobre a água e uma antiga peça de borda, que formava uma ilha solta sob os postes, foi retirada de renderização. A água continua bloqueada fora do polígono do deck.
- [x] Testes verificam spawn no deck, pontos bloqueados na água, acesso ao platô e retorno ao píer usando movimento com colisão. O navegador foi usado para inspecionar píer, vila, costa, escada e platô por teleporte; sem erros JavaScript ou falhas de carregamento das novas peças. Não houve percurso manual integral.
- [ ] O deck ainda é uma superfície 2D aproximada pela grade, sem altura física ou oclusão dos postes. Ainda podem existir pequenas divergências entre tábuas e máscara; revisar ao jogar. Costa e platô continuam com facetas, e a escada não tem elevação física nem corrimãos separados. Os detalhes novos são visuais, sem colisão independente.

## Missão e limitações anteriores
No barco é possível descansar/salvar ou retornar à Enseada. As cabanas mantêm seus interiores fixos, infectados, fragmentos, fitas, chave e fusível; o galpão mantém terminal e gravadores. Os três painéis e a âncora no platô reutilizam o estado e os desfechos persistentes da Maré Cromática. O save registra o spawn, não a posição exata. Os quatro pontos de arquétipo ainda concedem apenas ressonância/energia, não seus sistemas completos. A torre FPV permanece interditada e o áudio de fitas, ondas de combate e sabotagem ainda não foram implementados. Ao colapsar, o retorno continua no Limiar 66.6.

`tests/docas-neblina.mjs` verifica a acessibilidade com prioridade real de interação, spawns e progressão; `tests/travessia-neblina.mjs` cobre movimento, farol, ameaças, sonar, rastro e rota vencível; `tests/travessia-artes.mjs` valida as dez folhas e peças da navegação; `tests/docas-lote3.mjs` valida as dez folhas de vegetação/props e seu registro no mapa; `tests/docas-relevo.mjs` valida o lote de relevo, percurso por movimento e ordenação; `tests/docas-lote5.mjs` valida o lote de superfície e os pés sobre a geometria; `tests/docas-lote6.mjs` cobre o lote de vestígios e a coerência da máscara; `tests/docas-lote7.mjs` verifica as peças, deck e água bloqueada. Não há medição comprovada de 60 FPS; revisão visual em diferentes telas e em hardware real continua necessária.
