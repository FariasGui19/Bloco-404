# Limiar — Passo 2: estruturas, marcos e densidade

## Escopo entregue

- Píer com postes, lanternas emissivas, amarrações, guarda-corpos e tábuas. Rampa física/visual liga o terreno ao tablado original (5,3 m), sem mudar impulso de salto ou altura do terreno.
- Farol com alvenaria repetida em escala métrica, aberturas, cintas, galeria, lanterna e cobertura. Texturas não são esticadas pela altura da torre.
- Âncora com base chanfrada, anéis e quatro nervuras; ruínas com sete plataformas preservadas, colunas e fragmentos; anel distante segmentado.
- Cinco POIs identificáveis no minimapa e na orientação: Píer, Âncora, Farol, Ruínas e Anel. Legenda mostra distância e direção relativa; caminhos autorais aparecem no mapa.
- 174 elementos em nove agrupamentos determinísticos: 54 árvores de três silhuetas, 55 rochas, 48 samambaias, cinco paredes baixas e 12 marcos de caminho. Reservas de passagem evitam espalhar colisores sobre as rotas.

## Módulos reutilizáveis

`sector-layout.js` é o contrato puro de composição, POIs, rotas e índice espacial. `sector-materials.js` compartilha três texturas procedurais de 128² com NearestFilter. `sector-meshes.js` reúne geometria, UVs métricas e batching; `sector-landmarks.js` mantém raízes nomeadas por POI; `sector-scenery.js` constrói os agrupamentos. `sector-scene.js` integra tudo ao ambiente do Passo 1.

Os hooks de lore e progressão são apenas identificadores de metadados, sem missões, recompensa, escrita de save ou desbloqueio de nível 2. Passos 3 e 4 permanecem pendentes.

## Colisão e custo

133 sólidos, além das plataformas, usam broadphase em grade de 16 m. Troncos, rochas, paredes e plataformas possuem proxies de câmera, invisíveis e excluídos do batching visível. Folhagem decorativa não vira parede. Geometria estática é agrupada por material/chunk; objetos animados ficam separados. Os chunks permanecem residentes, com visibilidade por distância — não se trata de streaming de memória.

Contadores WebGL em quatro câmeras fixas, antes → depois:

| Vista | Draw calls | Triângulos |
|---|---:|---:|
| Solo | 63 → 63 | 15.896 → 20.114 |
| Costa | 110 → 111 | 24.105 → 35.075 |
| Voo | 124 → 120 | 26.321 → 38.345 |
| Submersa | 111 → 112 | 22.693 → 34.833 |

Texturas residentes: 5 → 6; as três texturas ambientais anteriores são preservadas. Sem novas luzes por poste, reflection targets ou uploads de vértices por frame. O orçamento de regressão foi atualizado explicitamente para seis texturas, até 145 calls e menos de 42 mil triângulos para acomodar a geometria adicional. Não há promessa de 60 FPS: a regressão completa em Chromium/SwiftShader mediu aproximadamente 4 FPS neste ambiente de software.

## Validação

- `tests/dimension-layout.mjs`: determinismo, 10 mil comparações do broadphase com AABBs, colisores/proxies, caminhada efetiva pelas quatro rotas, rampa, seis saltos consecutivos entre plataformas, canais navegáveis, materiais e hooks passivos.
- `tests/dimension.mjs`: controlador, estado compartilhado, salto, voo, mergulho, barco e colisão.
- `tests/dimension-environment.mjs`: relevo/bake e comportamento ambiental preservados.
- `tests/dimension-environment-browser.mjs`: quatro vistas WebGL, shader/água, determinismo, orçamento e descarte de texturas.
- `tests/dimension-browser.mjs`: menu/save, controles, voo, órbita, Âncora, retorno 2D, Maré, reentrada e rollback por perda de contexto.

Os testes de navegador usam `BROWSER_EXECUTABLE`, `BROWSER_LIBRARY_PATH` e `PLAYWRIGHT_MODULE` conforme o ambiente local. Capturas comparativas e de detalhe foram feitas com as mesmas câmeras e tempo visual fixo; artefatos de QA ficam ignorados em `.qa/`, fora dos assets do jogo.
