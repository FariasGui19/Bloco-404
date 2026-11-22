# Docas — vila/costa 04

Dez pinturas geradas separadamente a partir da referência visual: cabana oeste, galpão de telhados múltiplos, cabana leste, árvores secas, palmeiras, cristais, cerca, promontório, quebra-mar e carga (caixas/barris).

## Arte e integração

- Fontes em `assets/source-art/docas-vila-04/`; PNGs RGBA prontos em `assets/sprites/docas-vila-04/`.
- Preparação reproduzível: `.venv/bin/python tools/preparar-docas-vila-04.py` (Pillow e NumPy). O manifesto registra corte, cor-chave e dimensões. A cabana leste usa chave ameixa; as demais, verde.
- Os quatro elementos da costa mantêm os quadros 2x e as caixas anteriores. Ondulação das palmeiras e brilhos dos cristais continuam no renderer existente.
- Os três edifícios mantêm IDs, pés e larguras anteriores. As árvores secas foram colocadas atrás da cabana oeste; cercas mantêm seus pontos anteriores.
- Três pilhas antigas de caixas foram substituídas pelo registro estático `vila04_carga`. Não usar o prefixo `lote3_`: ele recorta atlas de oito quadros.
- Não houve mudanças no relógio visual, barco, tentáculo, mar, colisões, portais, missão ou saves. As peças são estáticas, não dez novas folhas de animação. A composição adapta a referência à planta navegável existente, sem promessa de reprodução pixel a pixel.

## Verificação

Executar com `node --experimental-default-type=module tests/<nome>.mjs`:

- `docas-vila-04`: dez imagens RGBA carregadas, dimensões, carga, âncoras dos prédios e três portais.
- `docas-costa-oeste`: dimensões 2x, bloqueios e percurso areia/cais de ida e volta.
- `docas-neblina`, `docas-inicio`, `docas-cais-refino`, `docas-lote3`, `docas-lote6`, `docas-pesqueiro-03`, `docas-tentaculo-02`, `docas-animation`.
- `docas-gameplay-live-browser`: menu e save reais, RAF, movimento normal/reduzido/sistema, retomada, calibração e reload. Passou após a troca das imagens, sem erros de página/HTTP.

Inspeção visual de gameplay com câmera livre em `.qa/docas-vila-04-gameplay.png` (artefato local de QA, não distribuído). O restante do mapa segue para lotes posteriores.
