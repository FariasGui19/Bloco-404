# Enseada dos Ecos — Mapeamento da Referência (imagem 2)

Referência final: `docs/enseada-referencia-final.png` (1522×826).
Estado anterior (imagem 1): ilha em losango, tudo areia, 155 objetos com
41 sobreposições e 23 objetos em célula errada (água/terra trocada).

## Regra de reconstrução

Setor por setor, um marco por lugar, sem duplicata. Cada objeto tem
`larguraPx` em px de mundo a 100% (1 tile = 64px). Objetos grandes
(>150px) ficam a ≥3 tiles de qualquer outro grande. Nenhum objeto de
terra fica em célula de água; fauna marinha fica em água.

## Setores (mundo 72×64, x→leste, y→sul)

| Setor | Conteúdo da referência | Mundo (x,y) | Sprite | larguraPx |
|---|---|---|---|---|
| 1 Norte | Platô + cascata | 22.0, 14.0 | `enseada3_platao_cascata` | 560 |
| 1 Norte | Estação 66.6 (porta no rochedo) | 28.5, 15.5 | `enseada8_entrada_666` | 170 |
| 2 Noroeste | Relógio de maré | 13.0, 28.0 | `enseada4_relogio` | 70 |
| 2 Noroeste | Torre-antenna | 15.5, 26.0 | `enseada4_torre_vigilia` | 90 |
| 2 Noroeste | Bancada de campo | 14.5, 30.5 | `enseada4_mesa_campo` | 110 |
| 2 Noroeste | Fogueira | 16.0, 33.5 | `enseada4_fogueira` | 90 |
| 2 Noroeste | Tenda | 19.0, 29.0 | `enseada4_tenda` | 120 |
| 2 Noroeste | Caixas | 21.5, 31.0 | `enseada4_caixas` | 90 |
| 2 Noroeste | Bandeirola | 18.0, 25.0 | `enseada_bandeirola_vento` | 50 |
| 3 Oeste | Pórtico da trilha | 13.5, 42.0 | `enseada3_portico_oeste` | 150 |
| 3 Oeste | Carrilhão de vento | 16.0, 40.0 | `enseada_carrilhao_vento` | 60 |
| 3 Oeste | Bosque oeste | 18.0, 44.0 | `enseada3_palmeiral` | 320 |
| 3 Oeste | Bosque sudoeste | 21.5, 53.5 | `enseada3_palmeiral` | 300 |
| 4 Centro | Monólito de Eco (com praça) | 33.0, 32.0 | `enseada3_monolito` | 220 |
| 4 Centro | Estela dos Navegadores | 30.0, 33.5 | `enseada8_estela` | 70 |
| 4 Centro | Cairn Zen | 36.5, 31.0 | `enseada4_cairn` | 80 |
| 4 Centro | Borboletas | 34.5, 30.0 | `enseada_borboletas_vivas` | 50 |
| 4 Centro | Bosque centro-oeste | 28.0, 28.0 | `enseada3_palmeiral` | 300 |
| 4 Centro | Bosque leste | 40.0, 24.0 | `enseada3_palmeiral` | 320 |
| 5 Sudoeste | Piscina de maré viva | 28.0, 50.0 | `enseada3_piscina` | 240 |
| 5 Sudoeste | Espelho dos Arquétipos (+praça) | 33.0, 48.0 | `enseada_espelho_arquetipo` | 80 |
| 5 Sudoeste | Gruta-concha (concha grande) | 24.0, 47.0 | `enseada8_gruta` | 120 |
| 5 Sudoeste | Gruta 2 (gruta de pedra) | 32.0, 52.5 | `enseada4_gruta` | 110 |
| 5 Sudoeste | Rede de treino | 36.0, 54.0 | `enseada4_rede` | 150 |
| 5 Sudoeste | Travessia de pedras (água) | 52.0, 56.0 | `enseada4_travessia_pedras` | 110 |
| 6 Sul | Cais + veleiro | 46.0, 48.0 | `enseada3_cais_barco` | 280 |
| 6 Sul | Embarcadouro (interação) | 44.0, 46.0 | `enseada_embarcadouro_mare` | 110 |
| 6 Sul | Farolete (rochedos leste) | 54.0, 20.5 | `enseada_farolete_baia` | 80 |
| 7 Leste | Portal leste (rochedo) | 53.0, 24.0 | `enseada8_portal_leste` | 170 |
| 7 Leste | Jardim cercado | 44.0, 30.0 | `enseada7_jardim` | 110 |
| 7 Leste | Baú à deriva | 46.0, 33.0 | `enseada_bau_deriva` | 60 |
| 7 Leste | Banco de ostras | 48.0, 28.0 | `enseada_banco_ostras` | 70 |
| 7 Leste | Coral luminescente | 50.0, 26.0 | `enseada_coral_azul` | 70 |
| 7 Leste | Ninho de tartarugas | 52.0, 30.0 | `enseada_ninho_tartarugas` | 70 |
| 8 Mar | Portal NE (ilhota) | 36.0, 4.0 | `enseada3_portal_recife` | 170 |
| 8 Mar | Boias (×4) | 32/40, 2/7 | `enseada6_boia` | 40 |
| 8 Mar | Golfinhos / tartaruga / corais | água | `enseada5_*` / `enseada6_*` | 70–110 |
| 9 Praia | Caranguejos, estrela, conchas | 30–42, 54–57 | `enseada5_*` / `enseada6_*` | 60–80 |
| 9 Praia | Placa + poste lanterna | 27,44 / 30,46 | `enseada4_placa` / `enseada6_poste` | 60–74 |

## Chão

A referência tem **areia na orla (2 tiles) e grama no interior**.
Na Enseada, `beach-surface.js` pinta grama onde a distância à água passa de
2,2 tiles (mesma grade `SMT`, sem mudar colisão nem `walkMask`). As demais
praias mantêm a textura original. A distribuição ainda requer comparação visual
no jogo com a referência.

## Removidos (duplicatas / fora da referência)

- 8 cópias de `western-palm-grove` sobrepostas → 5 bosques espaçados.
- `stone-path-cobble` sob o monólito (o sprite do monólito já traz a praça).
- `cais-barco-sem-areia` 420px + barco duplicado → 1 cais+veleiro 280px.
- `estacao-666-cliff-gate` 380px sobre o platô → porta 170px ao lado.
- Clutter `enseada5/6/7` sem interação espalhado no interior → só
  detalhes de praia/mar nos setores 8–9.
- `falesia-selva`, `pilar-palmeiras`, rochedos avulsos sobre a areia.

## Preservados (código depende dos ids)

Todos os ids com interação em `js/game/interactions.js` e
`js/engine/renderer.js` foram mantidos (24 ids), apenas reposicionados
e redimensionados. O ponto de retorno do mar foi movido para o cais,
pois o anterior ficava numa ilhota desconectada. A poça de treino foi
movida para a piscina. A acessibilidade pela máscara não substitui a
verificação visual e de colisões dentro do jogo.

## Revisão por setores após a captura da versão 3.1

- **Mar:** o golfinho saltando e os cristais azuis foram movidos para células
  de água (considerando o meio tile somado pelo carregador).
- **Acampamento:** novo terraço com escada, atrás dos equipamentos existentes;
  a fogueira e as caixas foram realinhadas. É uma peça **cenográfica**: a
  malha de navegação ainda é plana e não restringe a subida à escada.
- **Norte:** a entrada da Estação foi encostada à falésia e alinhada à posição
  do portal. Ainda precisa de refinamento para reproduzir a construção da
  referência sem emenda entre as duas peças.
- **Portais:** a arte do portal nordeste foi trocada pela versão com base de
  coral; o portal leste recebeu rochedo próprio. A zona de nado da Dársena foi
  movida para a água junto ao portal leste; a rota automática foi testada.
- **Chão:** corredores de areia atravessam o interior verde sem mudar a
  máscara de colisão. As novas artes de terraço e rochedo estão em
  `assets/source-art/enseada-setores/` e suas versões com fundo removido em
  `assets/sprites/enseada-setores/`.

A renderização foi conferida no navegador em vista geral; as dimensões e a
composição ainda não são equivalentes à referência. Faltam altura física e
escada funcional, unir organicamente estação e falésia, melhorar as trilhas e
vegetação, acertar costa e ilhota, e revisar os demais setores em detalhe.

## Ajustes seguintes: acampamento, portal e cais

- O acampamento passou para um terraço mais a oeste com rampa de areia, e o
  relógio, a antena, a bancada, a fogueira, a tenda e as caixas foram
  redistribuídos; o conjunto ganhou banco de tronco, palmeiras e biruta.
- O portal sobre o rochedo leste foi espelhado; sua zona de nado permanece
  na mesma costa. O cais usa a peça orientada para baixo e à direita, deslocada
  até a orla; o retorno do barco e sua interação ficam em terra.
- Foi gerado um lote de dez artes em `assets/source-art/enseada-lote-10/`.
  Quatro foram preparadas para uso em `assets/sprites/enseada-lote-10/`.
  As demais ainda não estão prontas para uso: várias têm fundo quadriculado
  desenhado na imagem e precisam de recorte/revisão antes de entrar no jogo.
- O golfinho saltando foi afastado para não se projetar sobre o terraço.

Esses ajustes foram conferidos numa vista geral do navegador, mas ainda não
reproduzem toda a referência. A rampa continua cenográfica, sem altura física
nem colisão que obrigue o uso do caminho; faltam também novos ajustes finos do
terreno, vegetação, objetos e estação.

## Ajuste de proximidade: acampamento, cais e portal leste

- Mesa, banco, fogueira, tenda, caixas e biruta do acampamento foram
  redistribuídos; a composição foi conferida em zoom próximo no navegador.
- O píer visual foi deslocado para fora da areia e pintado antes do jogador;
  os pontos de interação do cais, barco e embarcadouro permanecem na praia,
  sem exibir plataformas duplicadas.
- O portal foi virado novamente e recebeu um rochedo com subida de areia,
  preparado a partir da arte `03-rochedo.png` do lote anterior.
- A subida dos dois relevos continua cenográfica, assim como o píer sobre a
  água: ainda não há malha de altura nem passarela navegável correspondente
  às artes. O acampamento ainda precisa de refinamento visual em relação à
  referência; a presente revisão não comprova equivalência exata.
