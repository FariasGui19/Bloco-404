# Docas da Neblina — reconstrução em andamento

## Base jogável e navegação
A travessia leva ao mapa `mare_cromatica_docas`. A imagem `assets/sprites/docas-neblina/referencia.png` é mantida **somente como referência de produção**: não é carregada nem desenhada no cenário. O mapa usa a planta ampliada em 2,5 vezes, piso gerado separadamente, mar texturizado, margens rochosas, máscara de colisão e peças de arquitetura individuais. As peças principais, o personagem e os infectados são ordenados pela profundidade de seus pés. A máscara de colisão continua baseada em células; peças decorativas reaproveitadas não têm colisão individual. A reconstrução não é uma cópia perfeita da referência e ainda precisa de acabamento de relevo e paisagismo.

A travessia mantém inércia, sonar [R] e adiciona farol alternável [L]: peixes e sombras no cone de luz são atraídos, mas ainda podem atacar por proximidade com o farol apagado. Há rastro de espuma limitado, bancos de névoa e botão de farol para toque. O sonar tem recarga. Movimento reduzido congela o deslocamento decorativo da névoa.

## Setor 1 — ancoradouro sul
- O pesqueiro e o bote são recortes separados da referência do setor. O deck, o guarda de fundo, as estacas dianteiras e a rede também são peças separadas: o jogador anda sobre as tábuas e passa atrás das estacas quando está acima de seus pontos de apoio.
- A escada de maré é arte nova, texturizada com a rocha da referência. Os degraus mais baixos têm pedra úmida e reflexo, e a base mergulha até a linha d’água. Cais e escada compartilham a transformação da planta com a máscara de piso; a escada é a única ligação a pé até a ilha. A altura dos degraus é visual, não um eixo adicional de física.
- Reflexos são uma camada de água com transparência; nenhuma imagem completa é usada como piso. Os cascos balançam discretamente sem deslocar as amarras nem a interação do pesqueiro. O balanço e o cintilar param com movimento reduzido.
- O spawn, o diário do píer e os IDs de progresso continuam válidos. O pesqueiro mantém o início manual da incursão, o descanso e o retorno à Enseada.
- As peças finais estão em `assets/sprites/docas-cais-sul/`. Para reproduzir os recortes: `python tools/preparar-docas-cais.py /caminho/para/image-1.png` (Pillow e o recorte de referência fornecido para este setor).

## Setor 2 — costa oeste e lado oposto da escada
- O segundo recorte é registrado pelos mastros e pela lanterna do pesqueiro. O mar azul-violeta, os reflexos magenta, a espuma e os bancos de névoa são independentes da areia e dos recortes de rochas, palmeiras e cristais. Não se carrega a prancha completa.
- O tentáculo é uma presença ambiental na água, sem combate: A folha atual (ver Ressaca abaixo) dobra e estende o corpo sem deslocar a raiz. Espuma, rastros e respingos são desenhados à parte. Com movimento reduzido, a pose inicial e a espuma estática continuam visíveis.
- A margem agora tem uma faixa de areia transitável entre o promontório e a vila. Rochas e água bloqueiam passagem; a saída do cais segue pela escada, que ganhou alvenaria na face oeste e pedras gastas na chegada ao solo. A poça de maré e a fogueira conservam os IDs e foram reancoradas no novo terreno.
- Peças finais: `assets/sprites/docas-costa-oeste/`. A versão remasterizada repinta as 11 peças em densidade 2×, mantendo os recortes e as dimensões no mapa. Usa repintura registrada, microtextura de água e grão de areia; mar e areia usam WebP com alfa. A folha original de 64 poses agora serve de referência para a pose de repouso da ressaca.
- Para recriar com Pillow e NumPy: `python tools/remasterizar-docas-costa-oeste.py /caminho/para/image-2.png`. Os dois doadores de textura ficam em `assets/source-art/docas-costa-oeste/` e não são carregados pelo jogo. O remaster usa `preparar-docas-costa-oeste.py` internamente para gerar as máscaras originais, incluindo as exclusões de barcos e estacas. Esses arquivos de origem não substituem a planta.
- `node tests/docas-costa-oeste.mjs` verifica encaixe, sprites, laço de movimento reduzido e ida e volta com colisão. A rota do cais até a areia também foi percorrida no Chromium usando o movimento normal do jogo.

## Passada de movimento — Docas Vivas
- Dez artes geradas foram preparadas como **dez atlas transparentes de 16 poses**: ondulação, espuma, caústica magenta, névoa, respingo, ventosa, fumaça, reflexo âmbar, bandeirola e cintilações. São poses deformadas por malha a partir de cada pintura, não dez filmes nem 160 desenhos manuais. As fontes otimizadas ficam em `assets/source-art/docas-vivas/`; `python tools/preparar-docas-vivas.py` (Pillow e NumPy) gera os atlas finais.
- A superfície do mar se desloca sob o terreno; cristas quebram junto às pedras e ao casco. O pesqueiro e o bote inclinam e sobem com o balanço, enquanto bandeirola, fumaça e luzes acompanham a pose do pesqueiro. O cais continua fixo. Palmas dobram com o vento e cristais cintilam. O tentáculo recebe brilho e respingos na base.
- **Som e trilha** habilita uma partitura ambiente original de 32 segundos e quatro sons de cena sintetizados em Web Audio: ondas, madeira, sino de boia e chamado submerso. Os sons têm posição estéreo e atenuação por distância; o trecho fica silencioso durante pausa ou fora das Docas. Não há autoplay nem downloads de áudio.
- A preferência de movimento reduzido mantém a pose e os efeitos visíveis, sem deslocamento contínuo. A animação não altera área jogável, spawn, velocidade ou colisões. `node tests/docas-vivas.mjs` verifica atlas, ancoragem e mixagem.

## Segunda passada de movimento — Ressaca nas Docas
- **Dez folhas RGBA, 156 quadros:** quatro folhas de mar (formação, crista, quebra, refluxo), quatro de tentáculo (emersão, dobra, alcance, recolhimento) e duas de reação do casco (respingo na proa e esteira na popa). As pinturas-chave ficam em `assets/source-art/docas-ressaca/`; `python tools/preparar-docas-ressaca.py` (Pillow, NumPy e OpenCV) registra e interpola os quadros em `assets/sprites/docas-ressaca/`.
- A mesma frente de onda atravessa costa e cais. Pesqueiro e bote amostram a altura na proa e na popa separadamente; a diferença inclina o casco. Espuma, reflexos e respingos usam a fase local, com esteira atrás do casco e spray à frente. As estacas, tábuas, escada e colisões ficam fixas.
- `desenharTentaculoRessaca` recebe ponto de inserção na água, escala e progresso normalizado. Usa a mesma raiz em todas as poses e atende à costa oeste, aos tentáculos decorativos offshore e à travessia. Na travessia, aviso e ataque selecionam trechos do ciclo sem alterar os tempos nem os danos.
- Com movimento reduzido, casco e tentáculo ficam em repouso e as ondas exibem uma pose fixa. `node tests/docas-ressaca.mjs` verifica formato dos atlas, ciclos, ancoragem e balanço.

## Checklist dos lotes (histórico)
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

### Lote 8 — exploração livre e vestígios
- [x] Dez peças estáticas integradas: boia antiga, rede, mastro, cesto, madeiras, arbusto, placa, ampola, corais e lampião. Fontes e PNGs em `assets/sprites/docas-lote8/`, preparados por `tools/preparar-docas-lote8.py`; animação permanece para etapa posterior.
- [x] Atracar não inicia mais a incursão. O HUD mostra AGUARDANDO 10:00 e a escolha **INICIAR INCURSÃO • 10 MINUTOS** no barco inicia a missão. A exploração, os diários, descansar e retornar continuam acessíveis; itens de missão e ameaças ficam em espera. Uma vez iniciada, a contagem não reinicia ao voltar ou recarregar.
- [x] Migração única de save antigo não concluído devolve 10:00 e aguarda confirmação, preservando descobertas e estado de progresso. Finais concluídos não são apagados; um colapso anterior volta ao estado de preparação, preserva registros e número de colapsos, mas limpa painéis da tentativa falha. Testes cobrem a migração, espera, dano, início, reload e a rota.
- [x] Navegador carregou um save antigo com 12 segundos, mostrou AGUARDANDO 10:00 sem reduzir, e iniciou a contagem pela escolha do barco; fragmento/fita antigos permaneceram. A inspeção usou cenário de teste, não uma jornada completa.
- [ ] Elevação física e oclusão da escada e do píer, revisão completa da costa, animações novas e benchmark de FPS continuam pendentes.

## Missão e limitações anteriores
No barco é possível descansar/salvar ou retornar à Enseada. As cabanas mantêm seus interiores fixos, infectados, fragmentos, fitas, chave e fusível; o galpão mantém terminal e gravadores. Os três painéis e a âncora no platô reutilizam o estado e os desfechos persistentes da Maré Cromática. O save registra o spawn, não a posição exata. Os quatro pontos de arquétipo ainda concedem apenas ressonância/energia, não seus sistemas completos. A torre FPV permanece interditada e o áudio de fitas, ondas de combate e sabotagem ainda não foram implementados. Ao colapsar, o retorno continua no Limiar 66.6.

`tests/docas-neblina.mjs` verifica a acessibilidade com prioridade real de interação, spawns e progressão; `tests/travessia-neblina.mjs` cobre movimento, farol, ameaças, sonar, rastro e rota vencível; `tests/travessia-artes.mjs` valida as dez folhas e peças da navegação; `tests/docas-lote3.mjs` valida as dez folhas de vegetação/props e seu registro no mapa; `tests/docas-relevo.mjs` valida o lote de relevo, percurso por movimento e ordenação; `tests/docas-lote5.mjs` valida o lote de superfície e os pés sobre a geometria; `tests/docas-lote6.mjs` cobre o lote de vestígios e a coerência da máscara; `tests/docas-lote7.mjs` verifica as peças, deck e água bloqueada; `tests/docas-inicio.mjs` e `tests/docas-lote8.mjs` cobrem a nova preparação e o lote 8. Não há medição comprovada de 60 FPS; revisão visual em diferentes telas e em hardware real continua necessária.

### Lote 9 — organização e costa
- Dez peças RGBA novas: banco, boias, engrenagem, flores, pescaria, placa, postes, tronco, vasos e ânfora. As imagens são decorações estáticas, sem colisão individual; flores têm balanço procedural discreto, respeitando redução de movimento.
- Agrupamentos junto ao píer, cabanas e galpão; alguns vestígios foram retirados do centro do caminho. O barco foi aproximado do píer e os redemoinhos circulares destacados foram retirados para dar lugar aos tentáculos costeiros.
- Espuma procedural discreta é calculada sobre as faces externas da costa e animada junto à água; não modifica a máscara de colisão. A vista continua 2.5D planar: altura física da escada e oclusão independente de corrimãos ainda não foram implementadas.
- Validação: `tests/docas-lote9.mjs`, testes de rotas e colisão das Docas, progresso e travessia; inspeção em Chromium com save sintético no píer, vila e costa. A inspeção usa teleporte para enquadrar, não substitui percurso manual integral nem benchmark de FPS.

### Lote 10 — vigília na névoa
- Dez novas artes recortadas e integradas como peças RGBA independentes: algas, ancoradouro, barricada, baú, coral, farolete, fogueira, guincho, mural e tambores. São sprites estáticos, não folhas de quadros desenhados; os efeitos de chama/fumaça, brilho e partículas são procedurais e limitados, com alternativa para movimento reduzido.
- O mural e a fogueira oferecem relatos opcionais dos vigias. O jogador pode acender ou apagar a fogueira: a escolha e a leitura persistem no save, sem iniciar ou alterar a contagem e sem bloquear a missão.
- A ancoragem dos dez objetos, ordenação por pé e acessibilidade dos marcadores fazem parte dos testes. Inspeção em Chromium usou save simulado e teleporte para enquadrar píer, fogueira, mural e costa; confirmou interação e persistência da fogueira e do mural, e 10:00 em espera. Não é percurso manual integral nem benchmark de desempenho.
- Continuam pendentes altura física da escada, oclusão própria de corrimãos e animações desenhadas quadro a quadro para os elementos estáticos. A causa da antiga tela preta de retorno não foi confirmada nesta etapa.

### Lote 11 — marcas da maré e leitura de ameaças
- Dez artes novas, recortadas como sprites RGBA: rocha costeira, arbusto, cais lateral, cogumelos, correntes, gramíneas, lanterna, sucata, bandeirola e totem. São imagens estáticas independentes, não dez folhas de animação quadro a quadro; as gramíneas balançam proceduralmente e cogumelos, totem e lanterna recebem brilho suave.
- A marca das marés tem relato opcional e leitura persistida, sem alterar objetivos nem a espera da incursão. Os anéis de objetos próximos agora destacam a interação selecionada sem alterar prioridade ou distância.
- Nas Docas, infectados usam direção horizontal, balanço conforme movimento real, preparação de ataque legível e resposta visual a dano. Parados por colisão não caminham no lugar. O movimento visual respeita a preferência de redução; não muda dano, alcance ou frequência de ataque.
- O áudio opcional recebeu dois harmônicos suaves e modulação lenta sobre o ambiente existente. Não é trilha musical completa; continua exigindo ativação pelo usuário e usa fontes fixas.
- Testes cobrem artes, ancoragem, interações, bloqueio/movimento e ataque dos infectados, save, áudio opt-in e regressões da missão. Chromium com save sintético e teleporte inspecionou píer, costa, marca e torre, persistência da leitura, espera de 10:00 e renderização com ameaça. Não substitui percurso manual completo nem mede 60 FPS.
- Ainda há elementos da referência a lapidar e a animação quadro a quadro permanece pendente para a maioria das artes. Escada e corrimãos continuam sem altura física e oclusão independente; causa da antiga tela preta não foi confirmada nesta etapa.

### Lote 12 — costa e vigília
- Dez novas peças RGBA: rocha com musgo, raízes, rede, estacas, caixote, vasilhame, flora, lampião, poça e corais. São sprites independentes estáticos; a flora tem balanço procedural e o lampião, a poça e os corais têm luz suave. As peças não acrescentam colisões ou piso.
- A chama da fogueira foi redesenhada em pixels escalonados e continua acompanhada de fumaça limitada; seu estado aceso é persistido como antes. Com áudio ambiente ativado, um ruído filtrado de brasa cresce ao se aproximar da fogueira acesa e desaparece ao afastar, pausar ou apagá-la. É síntese opcional, não gravação nem trilha completa.
- A poça tem relato opcional sobre as marcas de sal e os efeitos da âncora; a leitura é salva e não inicia a incursão. Marcadores de missão mantêm prioridade e rotas verificadas.
- Validação: testes de peças, ancoragem, prioridade, rotas, ameaças, áudio opt-in e progressão; Chromium com save simulado, teleporte e som ativado para inspecionar píer, costa e torre e validar leitura salva da poça com 10:00 em espera. O som não foi avaliado auditivamente em hardware real; não houve percurso manual completo ou benchmark de FPS.
- Pendentes: altura física e corrimãos da escada, revisão dos encaixes e escala de todo o cenário, animações quadro a quadro para a maioria das artes, trilha/fitas completas, torre FPV e testes de desempenho/jornada integral. A antiga tela preta não foi reproduzida nesta etapa.

### Lote 13 — fogo e atmosfera por setor
- Dez artes de efeito independentes: chama, brasa, fumaça, névoa, lampejos âmbar/ciano, interferência CRT, ondas ciano/magenta e redemoinho. As artes foram processadas para RGBA e usadas como camadas no mapa. A folha de chama tem oito quadros derivados por deformação da mesma arte, não são oito desenhos manuais; faíscas e brilho são procedurais.
- A fogueira acesa usa a nova chama/brasas no lugar dos retângulos e mantém o estado persistente e o áudio opcional. Barco recebeu oscilação vertical adicional, luz quente e fumaça posicionada na chaminé; boias recebem oscilação e luz, com reflexos discretos na água. Galpão e âncora recebem sobreposições leves, e névoa baixa desliza. Movimento reduzido fixa os efeitos, sem interromper a legibilidade.
- Testes cobrem registro das dez artes, tamanho/alpha da folha, estados da fogueira, prioridade de interações, trajetos, saves, ameaças e áudio. Chromium com save sintético inspecionou fogo a 300%, píer, vila, escada e platô com som ativado; sem pageerrors ou recursos faltantes e cronômetro em espera. Enquadramentos por teleporte não equivalem a jogar a rota integral; o áudio não foi avaliado auditivamente em hardware real.
- A escadaria continua com colisão planar: altura física, oclusão independente dos corrimãos e união visual definitiva do penhasco estão pendentes. O cristal da câmara continua estático com lampejo sobreposto, não gira fisicamente; as janelas, monitores e lanternas ainda não são camadas próprias. Não há benchmark de 60 FPS, trilha completa nem verificação da antiga tela preta neste lote. Evitou-se adicionar uma encosta visual que sugeria uma passagem não suportada pela colisão.

### Refino do cais e mar

- [x] Ondulações determinísticas no setor sul, com folga em relação aos polígonos de terra, reflexos magenta, névoa baixa e clareamento localizado da chegada.
- [x] Tentáculo novo com ventosas, balanço segmentado e anéis; bote isolado deslocado do deck para a água, com flutuação suave.
- [x] Rochas e cristais novos na margem, pulso de luz e ajuste de rede/boias; iluminação adicional no barco existente. Peças de terra continuam na ordenação pelo pé; não alteram a malha física.
- [x] Testes `docas-*`, `mare-cromatica*`, `travessia-neblina` e `boot`, mais `docas-cais-refino`: passaram. Verificação Chromium com save sintético, posições por teleporte e movimento reduzido: HUD aguardando 10:00, sem erros de página ou respostas HTTP com erro.
- [ ] Revisar com percurso manual e save real; não foi feito benchmark de 60 FPS. A costa continua usando relevo e colisão planar preexistentes, e barco/píer são as artes anteriores, portanto a composição não é uma reprodução exata da referência. Os testes de navegador não comprovam fluxo manual completo ou recuperação de um save específico.

### Ajuste cirúrgico de cor no cais

- [x] Removido o aglomerado de cristais junto ao bote, sem deslocar as demais estruturas.
- [x] Contraste e saturação limitados às artes do píer e pesqueiro; luz quente da cabine e lâmpada vermelha reforçadas.
- [x] Espuma segmentada junto ao casco e à margem próxima, anéis magenta interrompidos e balanço contínuo do tentáculo mantido. Movimento reduzido conserva os efeitos estáticos.
- [x] Testes de Docas, Maré, travessia e boot passaram; Chromium com save sintético e teleporte conferiu cais e margem, HUD aguardando 10:00 e sem erros de página/HTTP. Não é teste de percurso manual nem benchmark de desempenho.

## Cascos 01 — pesqueiro e bote (10 folhas)

- Duas novas pinturas geradas a partir do recorte fornecido, isoladas por chroma key, registradas nas caixas existentes: pesqueiro 610×568 e bote 254×148. Preservam orientação, cabine âmbar, casco vinho, pneus, cordame e bancos do bote, mas **não são cópias pixel a pixel**: proporções internas e pequenos detalhes diferem. Não foi redesenhado o cais neste lote.
- Dez atlas WebP lossless RGBA, 16 quadros por folha (160 no total), em `assets/sprites/docas-cascos/`: dois cascos com caústica/cordame sutil, duas espumas de proa, duas esteiras de popa, dois reflexos e duas ondulações. **São duas repinturas e efeitos/deformações procedurais, não 160 pinturas independentes.** O tentáculo e o mar geral conservam os sistemas anteriores.
- O balanço rígido continua amostrando a ressaca no runtime, aplicado uma única vez; os atlas seguem a fase local da mesma onda. Pés, caixas, escala, interação, profundidade, planta e colisões não mudaram. Há fallback para os PNGs anteriores se o atlas não carregar. Movimento reduzido fixa os dez atlas no primeiro quadro e mantém espuma/reflexo visíveis.
- Fontes: `assets/source-art/docas-cascos/`. Reprodução: `.venv/bin/python tools/preparar-docas-cascos.py` (Pillow e NumPy). `manifest.json` registra dimensões e procedência. Aproximadamente 6,5 MB em disco entre fontes e arquivos preparados; o maior atlas mede 2440×2272 (~22 MB decodificado). Não houve benchmark de GPU/FPS.
- Prévia isolada: abrir `/docs/previa-docas-cascos.html` por servidor HTTP. Usa o renderizador real das peças e oferece pausa, movimento reduzido e comparação com os cascos anteriores; o fundo de água da prévia é um guia, não o mapa completo. Não houve inspeção em navegador nem percurso manual nesta etapa.
- Validação: `node tests/docas-cascos.mjs` verifica dez atlas, RGBA, dimensões, ciclo, repouso, fallback e caixas. Passaram também cais-refino, costa-oeste, início, lotes 3/6/7, neblina, recuperação, relevo, ressaca, vivas, Maré (3 testes), travessia e boot. Os testes históricos dos lotes **5, 8, 9, 10, 11, 12 e 13** falham por expectativas de peças/efeitos anteriores; as mesmas sete falhas foram reproduzidas no código de `HEAD` sem as alterações deste lote. Não foram mascaradas ou modificadas.

## Rota unificada e Tentáculo 02 — mais 10 folhas

### Mesmo pesqueiro nos três contextos
- O pesqueiro de Cascos 01 agora aparece no cais sul das Docas, no percurso de navegação e na composição de embarque da Enseada. Na travessia conserva a proporção 610:568, com os mastros acima da linha d’água; a física de direção, casco, nado, sonar, farol, ameaças e chegada não foi alterada.
- O antigo veleiro da composição da Enseada foi retirado. O píer permanece imóvel nas oito poses de embarque; somente o pesqueiro flutua. A amarra foi prolongada até o casco. O ponto invisível `barco_expedicao_enseada`, suas coordenadas e a interação continuam os mesmos, sem embarcação duplicada.
- O renderizador desenha essa composição registrada diretamente, sem a limpeza automática de componentes, que poderia descartar o casco separado do píer. Os demais objetos continuam no caminho de renderização anterior. Com movimento reduzido, usa a pintura estática.
- Para reproduzir a composição: `.venv/bin/python tools/preparar-navio-rota-docas.py`, depois de gerar Cascos 01.

### Dez novas folhas / 156 quadros
- Uma nova pintura do tentáculo com pele índigo, placas úmidas, contorno frio e ventosas magenta foi isolada, registrada pela raiz e preparada em densidade 2×. Quatro folhas de 15 poses: emersão, dobra, alcance e recolhimento. O movimento é uma **deformação contínua por malha da pintura**, com extensão/flexão; não são 60 desenhos independentes nem uma animação esquelética de cada ventosa.
- Seis folhas adicionais, de 16 quadros cada: anel, espuma, reflexo, gotas, refluxo e esteira. São efeitos procedurais em camadas atrás e à frente da raiz; não substituem o terreno nem o mar completo.
- A assinatura de `desenharTentaculoRessaca` continua a mesma, então costa, marcos offshore e avisos/ataques da travessia recebem o tentáculo novo sem alterar timers ou dano. Mantidos o ponto de inserção, o tamanho lógico 192×160, o fallback antigo, a fase normalizada e o repouso. A nova textura não desloca colisões.
- Dois lotes de dez folhas somam **316 quadros**, mais oito poses específicas do embarque. Fontes, manifestos e ferramentas de reprodução estão versionados; os artefatos de navegador e dependências locais ficam ignorados.
- Reprodução: `.venv/bin/python tools/preparar-docas-tentaculo-02.py` (Pillow e NumPy). Também recria `docs/docas-tentaculo-02.gif`, uma prévia isolada das mesmas camadas, não uma captura do jogo.

### Validação desta etapa
- Testes de pixels (`.venv/bin/python tests/docas-arte-02.py`): dez folhas distintas, conteúdo animado, transparência sem halo verde, tentáculo dentro das células, continuidade da volta e píer exatamente imóvel nas oito poses.
- Testes novos `docas-tentaculo-02` e `docas-cascos`, e regressões de cais-refino, costa-oeste, início, neblina, recuperação, relevo, ressaca, vivas, Maré (3), travessia, boot, caminhos/interações da Enseada, praia/cais e animações-lote6: passaram. O teste histórico do lote6 e sua fixture de navegador foram atualizados para o novo atlas do pesqueiro (margem zero), mantendo as verificações dos demais objetos.
- Chromium real via Playwright: prévia com todos os recursos carregados, sem erros de página/HTTP, tentáculo mudando de quadro e imóvel com movimento reduzido; amostragem do **renderizador real do mapa da Enseada** confirmou o novo atlas de embarque. Teste opcional reproduzível em `tests/docas-lotes-browser.mjs` (servidor HTTP, Chromium e Playwright necessários).
- As sete falhas históricas das Docas citadas no lote anterior continuam fora do escopo. `enseada-ecos.mjs` também falha numa lista histórica de bloqueadores; essa falha foi reproduzida em `HEAD` anterior às alterações. Os caminhos e interações efetivos da Enseada passaram.
- Limites: não houve jornada integral com save real, avaliação auditiva, benchmark de GPU/FPS nem revisão de toda a ilha. O restante da costa/vila/platô não foi redesenhado. A mudança do barco da navegação foi verificada por teste de integração de arte/código e regressão de física; o teste Chromium não percorreu a viagem inteira.

## Pesqueiro 03 — remover casco duplicado e animar só navio/mar

### Correção do recorte
- A proa vinho e o caixote do navio antigo estavam **embutidos em `docas-cais-sul/deck.png`**. A máscara agora os remove e recompõe somente o piso já existente, usando tábuas do mesmo deck, com transição suavizada. A planta, a área caminhável, os pés e as colisões não mudaram.
- A origem do reparo do deck é `assets/source-art/docas-pesqueiro-03/deck-antes.png`; não é carregada pelo jogo. `tools/limpar-residuo-cais.py` aplica o reparo de forma idempotente e também limpa fragmentos de estrutura em `reflexos.png`. O preparador original do cais chama essa limpeza ao regenerar os recortes.
- Quando o lote 03 está carregado, o retalho estático de água/reflexos da referência não é mais desenhado: as camadas independentes o substituem. O fallback usa o retalho já limpo, não a imagem com resíduos.

### Dez folhas novas / 192 quadros
- **Quatro folhas do pesqueiro, 12 poses cada:** subida, crista, descida e cavado de um ciclo contínuo de 6,4 s. Reutilizam a pintura aprovada, com flexão discreta do cordame, caústica no casco, luz da cabine e fumaça ancorada na chaminé. São deformações/efeitos procedurais, não 48 repinturas independentes.
- **Seis folhas de água, 24 poses cada:** mar de proa, mar de popa, espuma do costado, reflexo âmbar, reflexo violeta e spray de proa. A espuma do costado segue a borda inferior real da pintura, em vez de um anel genérico.
- `poseNavio` continua aplicando o balanço rígido uma única vez. Os quadros não contêm uma segunda subida/inclinação do casco. Reflexos e ondulação ficam no plano fixo da água; só o spray de contato acompanha a transformação do casco.
- Os efeitos anteriores específicos do pesqueiro são suspensos quando o novo conjunto está completo, evitando espuma/fumaça/reflexos duplicados. As luzes foram reancoradas nas janelas e na lanterna da pintura atual.
- A água do cais agora é desenhada **depois da superfície oeste e antes de terreno/deck/personagens**; a pintura opaca da costa não pode mais cobrir os novos efeitos. O carregamento parcial conserva o caminho antigo inteiro. Movimento reduzido fixa todas as folhas e o balanço.
- Não alterados: tentáculo, posição dele, atlas do bote, navegação/embarque da Enseada, missões, física e demais setores. A posição e a animação do tentáculo relatadas pelo usuário ficam para o próximo lote.

### Reprodução e revisão
- `.venv/bin/python tools/limpar-residuo-cais.py`
- `.venv/bin/python tools/preparar-docas-pesqueiro-03.py` (Pillow e NumPy). Dez WebP lossless e manifesto em `assets/sprites/docas-pesqueiro-03/`, cerca de 5,3 MB em disco e ~90 MiB de pixels RGBA decodificados para este conjunto; não houve benchmark de GPU/FPS.
- Prévia focada: `/docs/previa-pesqueiro-03.html`, com pausa, movimento reduzido e zoom no encaixe. `docs/docas-pesqueiro-03.gif` é uma captura de 48 instantes dessa prévia setorial, não uma gravação de uma partida completa.
- Testes Node/pixels novos: `tests/docas-pesqueiro-03.mjs` e `.py`. Verificam dez atlas/192 quadros, alfa, quadros distintos, laço, margens, reparo idempotente, tábuas, ausência da proa velha, fallback atômico, não duplicação do casco e um só balanço.
- Chromium: `tests/docas-pesqueiro-03-browser.mjs` percorre o ciclo e confirma que **todas as dez folhas são desenhadas**, repouso estável e ausência de erros de página/HTTP. A fixture `tests/fixtures/docas-pesqueiro-03.html` chama o renderizador real das Docas e verifica a ordem costa → água do pesqueiro → deck e o novo casco. Capturas em `.qa/` são locais/ignoradas. O GIF pode ser refeito com `CAPTURE_ART=1` e `tools/qa/montar-previa-pesqueiro-03.py`.
- Passaram também os testes de Cascos 01, Tentáculo 02, pixels do lote 02, cais-refino, costa-oeste, início, neblina, recuperação, relevo, ressaca, vivas, Maré (3), travessia e boot. Não houve jornada completa com save real, avaliação do som ou benchmark; os limites e falhas históricas documentados acima não foram reclassificados como resolvidos.
