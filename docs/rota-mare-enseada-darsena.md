# Rota das Marés: Enseada ↔ Dársena

A rota jogável é um trecho de mar aberto de 112 × 64 tiles, inteiramente
nadável, com fronteiras reais de colisão. A moldura de água além da grade é
visual: não é um oceano infinito. Não há ilhas artificiais nas duas pontas.
A fachada marítima da Dársena e a baliza marcam a entrada; atravessar a água
diante da fachada leva ao aquário da base. O mesmo ocorre na ligação com a
Enseada e, no retorno, junto ao arco dentro do aquário. Nenhuma dessas
passagens abertas pede [E]. As saídas da rota permanecem livres para não
prender um save, mesmo se o progresso ou arquétipo mudar.

A conexão continua usando mapas distintos e uma transição de carregamento:
não é uma costura contínua. As zonas automáticas conservam o estado do nado,
inclusive o ar restante, e só rearmam após sair da zona de chegada. A entrada
pela Enseada ou Dársena ainda exige Maré Astral e a flag
`rota_livre_enseada_aberta`, obtida pela comporta já existente após
calibragem, visita e treino. Se bloqueada, a interação explica o requisito.
O save usa os spawns de entrada existentes, agora em água segura.

A carta da Maré mostra posição nos dois eixos, rumo do corpo, marcos, destino,
distância em tiles, clima e fundo na escala atual do nado (0 a 2, não metros).
O destino é escolhido conforme o lado por onde se entrou; E e D na carta são
Enseada e Dársena. O jogador pode explorar em qualquer direção e voltar.
O espaço de dados (`aguaPraia`, `pontosCorrente`, `vidaRota`, `fundoMar` e
`encontrosMare`) permite outras regiões e localizações, mas reinos, rotas
adicionais e novas camadas de profundidade ainda não foram implementados.
O trecho tem bancos suaves e leito profundo variando na escala existente de nado; não é uma batimetria de reinos.

- Superfície: controles isométricos habituais; Espaço mergulha e Z fixa ou
  libera o mergulho após Travessia. A esteira acompanha o movimento.
- Submerso, com WebGL: A/D giram, W nada/desce, S sobe, Q impulsiona e R
  usa sonar. Sem WebGL continua disponível a câmera isométrica.
- A Maré **não respira embaixo d'água**. O fôlego depende do nível, respeito
  e clima. É possível emergir para recuperá-lo; ao esgotar, ocorre a subida
  automática e é necessário soltar o comando e recuperar ar antes de descer
  novamente. Subir com S exige soltar Espaço antes de um novo mergulho.
- Os barcos estão maiores, apoiados por sombra e esteira de água. Continuam
  ancorados e cenográficos: não são veículos pilotáveis. O clima, as ondas,
  a corrente e a neblina seguem os sistemas já existentes.

## Encontros submersos

**Jardim de Retorno** (rede, tartaruga e coral) e **Testemunhas do Azul**
(arraia, peixe-guia e pérola) mantêm suas posições, eventos e flags de save.
Os seis encontros exigem Maré Astral e submersão; aproxime-se e use [E].
A rede deve ser retirada antes de libertar a tartaruga. A fauna ferida tem
prioridade na interação; ações não interrompem o consumo de ar. O Códex [J]
registra as missões e o HUD aponta o encontro pendente mais próximo.

As dez novas artes estão em `assets/sprites/oceano-vivo/`: fachada, baliza,
duas algas, dois peixes, lula, coral, arco rochoso e esteira. A fauna e o
fundo reutilizam listas limitadas com culling 2D e materiais compartilhados
em 3D; não introduzem colisão nem recompensas. A preferência por movimento
reduzido continua congelando a animação das espécies. A textura do mar é
calculada uma vez e armazenada por mapa, sem atualizar a grade a cada frame.
Nenhuma dimensão DOOM foi criada.

## Clima vivo, bancos e vestígios

Dez novas imagens em `assets/sprites/mare-animacao/` representam mar calmo,
vento, ressaca, chuva, neblina, dois cardumes, cáusticas, bolhas de impulso e
braçada. Seus pesos acompanham os valores interpolados do clima e a direção
física do vento. A grade esparsa tem orçamento de 28 pontos visíveis em 2D;
no 3D as cáusticas reutilizam geometria e material. A textura de mar aberto é assada em resolução menor e guardada em cache, sem alterar colisão. Cardumes e efeitos são
pixel art, sem simulação de colisão individual. O 3D continua sendo uma
perspectiva: o nadador usa imagens planas animadas, não um personagem 3D.
Efeitos novos respeitam movimento reduzido; água, progressão e colisão não
dependem desses efeitos. Os barcos continuam cenográficos.

A batimetria opcional compartilha a mesma função entre o limite de mergulho
e o relevo submerso: os bancos variam de aproximadamente 1,6 a 2 na escala
interna. Os limites da árvore de nado e do fôlego continuam valendo. Na
perspectiva submersa, segurar S amortece também a inércia horizontal, para
facilitar uma subida precisa; não restaura ar até emergir. A carta identifica
os setores Jardim, Bancos do Azul, Chegada à Dársena e Fronteira das Correntes dentro do mesmo mapa.
Dois vestígios opcionais junto a ruínas podem ser ouvidos com E submerso;
são pistas, não missões nem acesso a territórios ainda não criados.
