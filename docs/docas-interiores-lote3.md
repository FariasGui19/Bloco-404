# Docas — lote 3 e apoio dos móveis

10 novas imagens: rede de secagem, mesa de refeição, baú de suprimentos,
reserva de água, esteira de sisal, carta náutica, grelha de piso, capa,
lanterna de parede e tubulação com válvula.

Quatro substituem os móveis procedurais restantes. Seis detalhes são
projetados nos planos de piso/parede, sem novos obstáculos. Os 18 sólidos,
seus tamanhos, posições e interações foram preservados.

## Correção de apoio

O desenho anteriormente ancorava a caixa da imagem no centro da peça.
Agora usa um ponto opaco medido e o canto frontal projetado da área de
apoio; respeita espelhamento e limita a largura à projeção do móvel.
Sombras discretas acompanham três pontos opacos. A bancada do pescador
foi espelhada para acompanhar a orientação do seu espaço longitudinal.

Reproduzir metadados: `python tools/registrar-apoios-docas.py`
(requer Pillow/numpy). A preparação das dez imagens fica em
`tools/preparar-docas-interiores-lote3.py`.

## Movimento

Somente depois dos elementos: chuva recortada nos vidros, chama/halo da
lanterna e barra inferior da capa; gancho e suportes permanecem fixos.
Vento exterior recebe uma envoltória suave comum, mantendo raízes fixas.
Movimento reduzido congela os efeitos. Arte exterior não foi substituída.

## Validação

- Node: docas-interiores-lote2, docas-interiores-lote3,
  docas-animation e docas-revisao-final passaram.
- Chromium: docas-interiores, docas-navigation, docas-gameplay-live,
  docas-fidelidade e docas-oeste-pontual passaram.
- Teste automatizado entrou/saiu dos três interiores com E e colisão real;
  observou as dez imagens novas sendo desenhadas; inventário e vitais intactos.
- Capturas: `qa/docas-interior-lote3-{cabana_oeste,cabana_leste,galpao}.png`.
  Revisão visual das três capturas, não uma travessia humana.
- A suíte completa não foi repetida no lote 3. No lote 2: 208/231 testes
  Node passaram; os 23 restantes também falharam no commit-base.
