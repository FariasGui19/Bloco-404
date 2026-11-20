# Setor Limiar — lapidação ambiental 01

**Escopo fechado: chão, água, luz, céu e névoa.** Estruturas, densidade do mapa, personagem, controlador, voo, câmera/colisões, interações e missões não foram redesenhados. `sector-data.js` e `controller.js` permanecem inalterados. O relevo físico e as posições de todos os vértices do terreno continuam iguais.

## Resultado visual

- Uma pintura global determinística substitui o mosaico de grama repetido por chunk: manchas orgânicas de grama/musgo escuro, solo exposto, pedra em superfícies inclinadas, areia e material úmido na costa e tons de fundo submerso.
- Distribuição em duas escalas de ruído coerente, pequenas marcas de vegetação sem linhas regulares de tufo, veios de pedra e transições graduais. `NearestFilter` permanece nos mapas; não há filtro de blur/pós-processamento para esconder a textura.
- UVs em coordenadas mundiais atravessam os 64 chunks sem reiniciar o padrão em cada fronteira.
- Água azul/verde com cor de profundidade, pequenas ondas em direções cruzadas, glints discretos e tom de reflexão do céu. A espuma é quebrada por ondas e acompanha a profundidade do terreno, não um círculo ou contorno colocado à mão.
- Céu com gradiente de crepúsculo, brilho quente discreto no horizonte e zênite azul escuro. A névoa e a luz fria foram ajustadas em conjunto para manter o relevo legível. Lua/estrelas não aparecem dentro d'água.
- Nenhum novo farol, prédio, árvore ou objeto de gameplay foi adicionado: estes são assuntos dos próximos passos.

As comparações locais usam exatamente a mesma câmera, resolução 1100 × 700 e tempo visual de 12 segundos. Capturas e relatórios ficam em `.qa/`, ignorados pelo Git. São pixels renderizados pelo WebGL, não pinturas de conceito.

## Arquitetura reutilizável

### `environment-data.js` — receita e bake, sem Three/DOM

`LIMIAR_ENVIRONMENT` reúne seed, limites em metros, nível do mar, resolução do albedo, paleta de biomas, cores do céu/água, iluminação e parâmetros de névoa. O bake recebe **uma função de altura**, sem conhecer farol, barco, operador ou missões.

```js
import { LIMIAR_ENVIRONMENT } from './environment-data.js';

const outraReceita = {
  ...LIMIAR_ENVIRONMENT,
  id: 'costa-fria-02',
  seed: 812,
  terrainPalette: {
    ...LIMIAR_ENVIRONMENT.terrainPalette,
    moss: [42, 65, 68],
    grass: [76, 105, 98],
  },
};
```

O Setor Limiar aceita `createSector({ environmentProfile: outraReceita })`. Para outro mapa, o módulo de cena usa `createEnvironment(scene, { heightAt: alturaDoMapa, profile: receita })` e aplica `environment.applyTerrainUV(geometria)` após colocar os vértices nas coordenadas do mundo. Os limites e o nível do mar da receita devem corresponder à geometria/física desse mapa; o módulo visual **não modifica a física para fazer os valores coincidirem**.

Uma única entrada de cache CPU é mantida, com chave derivada das propriedades que alteram a pintura. Alterar só céu/luz não refaz o albedo. Reentrar no mesmo setor reutiliza o bake; mudar de mapa substitui a entrada, evitando cache crescente de biomas.

### `environment-view.js` — recursos WebGL e atmosfera

- Albedo global 1024² RGBA/sRGB, nearest, sem mipmaps.
- Campo de altura de 257² células, RGBA float/nearest. Cada texel leva os quatro cantos de uma célula; o shader reconstrói profundidade contínua com uma única consulta, sem degraus de espuma e sem depender de extensões de filtragem linear de float.
- Mapa periódico de ondulações 128², nearest. Material da água em passagem única, com ondas no vertex shader e espuma/brilho no fragment shader.
- Domo de céu leve e luzes Hemisphere/Directional; os dois PointLights de marcos já existentes foram preservados. Sem novas luzes pontuais, shadow maps, render targets de reflexo ou SSR.
- `environment.update(time)` atualiza apenas o tempo da água. A malha de água não é mais reescrita/enviada pela CPU a cada frame.
- `environment.setCamera(camera, underwater)` centraliza névoa/céu e o estado submerso. O runtime não sobrescreve mais a paleta com cores antigas hardcoded.
- `environment.dispose()` libera explicitamente as texturas, incluindo as usadas apenas em uniforms. É idempotente. O runtime continua responsável por descartar materiais e geometrias da cena.

## Orçamento e trade-offs

A paleta mais rica usa aproximadamente **5,1 MiB de texturas ambientais na GPU**, mais as pequenas texturas de pedra/madeira já existentes. O bake CPU completo fica abaixo de 6 MiB; não é persistido em save nem gravado como imagem no repositório. Isso aumenta a memória de textura em relação ao protótipo inicial, em troca de eliminar repetição evidente sem adicionar materiais/draw calls por bioma.

O primeiro bake é feito uma vez durante o carregamento (cerca de 1–1,5 s na medição Node deste ambiente); não se repete em cada chunk nem em cada frame. Reentrada no mesmo perfil reaproveita o buffer CPU, mas cria recursos GPU novos corretamente descartáveis.

Comparação isolada, mesmas vistas, **sem operador/HUD**:

| Vista | Draws antes → depois | Triângulos antes → depois |
|---|---:|---:|
| Chão | 64 → 63 | 18.836 → 15.896 |
| Costa | 110 → 110 | 26.865 → 24.105 |
| Voo | 124 → 124 | 29.081 → 26.321 |

A queda no custo geométrico vem principalmente da passagem única da água transparente (o material anterior podia desenhar frente e verso separadamente). O domo acrescenta apenas uma malha leve; a geometria física do mundo não foi simplificada para obter esses números. As texturas residentes observadas passaram de quatro para cinco.

Esses contadores e o microbenchmark de fixture não são promessa de FPS em qualquer máquina. No teste completo de gameplay, este ambiente SwiftShader por software continua em torno de 5 FPS. A comprovação de 60 FPS em GPUs/dispositivos de destino continua pendente, como na etapa anterior.

## Verificação

```sh
node --experimental-default-type=module tests/dimension-environment.mjs
node --experimental-default-type=module tests/dimension.mjs
```

O teste ambiental verifica seed/cache, alteração de receita, biomas, dados de profundidade contínuos, UVs globais, posição original de todos os vértices, nearest/sRGB, ausência de uploads de vértices por frame, atmosfera acima/abaixo d'água, contagem de luzes e descarte idempotente.

Com servidor HTTP e Chromium/Playwright configurados pelas mesmas variáveis dos testes anteriores:

```sh
node --experimental-default-type=module tests/dimension-environment-browser.mjs
node --experimental-default-type=module tests/dimension-browser.mjs
```

O primeiro renderiza quatro vistas WebGL, checa movimento determinístico da água, programas de shader estáveis e liberação real das texturas de uniforms. O segundo usa o **menu/save/loop reais**, validando WASD, voo, órbita, mira, Âncora, barco, mergulho, reentrada, retorno ao 2D e falhas de WebGL. Não houve erros inesperados de console, página ou HTTP.

Para inspeção visual, abra o laboratório já existente em `docs/setor-limiar-3d.html` ou entre pelo botão do jogo. `tests/fixtures/dimension-environment.html` é uma fixture de QA com vistas fixas, não substitui a validação em gameplay.

**Próximo passo reservado:** estruturas, marcos e densidade de cenário. Não foi iniciado nesta entrega.
