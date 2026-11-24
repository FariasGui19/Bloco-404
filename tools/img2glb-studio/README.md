# Img2GLB Studio

Ferramenta interna independente para construir, texturizar e animar bases bípedes em GLB para o BLOCO 404. Não altera o jogo. A edição procedural roda no navegador; a reconstrução por IA usa um servidor local opcional.

## Como usar

1. Abra a raiz do repositório com o Live Server do VS Code e acesse `tools/img2glb-studio/`. Ou execute `python3 -m http.server 8000` na raiz e acesse `http://localhost:8000/tools/img2glb-studio/`.
2. Escolha **Operador / NPC humanoide** ou **Monstro / criatura**. Trocar o preset redefine proporções, aberturas e cores; mantém escala e imagem. Ambos são bípedes com o mesmo esqueleto.
3. Carregue uma imagem PNG/JPG local. Ela é aplicada automaticamente como projeção e são sugeridas cores; aguarde o modelo atualizar. Para o operador, a extração tenta amostrar pele, cabelo, regata, calça e calçado das regiões detectadas. A detecção é heurística: corrija manualmente os seletores quando necessário.
4. Em **Região para recortar**, escolha cabeça, tronco, braços ou pernas e arraste um retângulo na imagem. Também é possível ajustar horizontal, vertical, largura e altura pelos controles. A sugestão automática é apenas um ponto de partida: para melhores resultados use uma imagem frontal, com personagem inteiro e fundo simples, e revise todos os recortes. As regiões dos braços e das pernas são divididas automaticamente entre os lados e segmentos.
5. Marque as regiões desejadas. **Aplicar projeção** reaplica a imagem; **Remover** desativa a projeção sem apagar a referência. As imagens são projetadas na frente das peças; laterais e costas mantêm cores sólidas. Ajuste a **intensidade da imagem** para misturar com a cor manual. A remoção de fundo opcional procura cores semelhantes aos cantos conectadas às bordas: ela pode apagar cabelo ou roupa escuros, especialmente em fundo escuro. Desative-a se isso ocorrer.
6. O operador inclui cabelo com cachos em relevo, regata com acabamento, nariz e pelos faciais, óculos com ponte e hastes, cinto, bolsos cargo, tiras e tênis com sola, cadarços e acentos. Em **Detalhes modulares**, ative/desative o cabelo, rosto, óculos e conjunto de acessórios, e ajuste tamanho e posição, inclusive posição e tamanho de rosto/óculos. Os controles de recorte têm precisão de 0,1%. Eles acompanham os ossos. A projeção facial e os detalhes geométricos podem não se alinhar em toda imagem: ajuste o recorte ou desative os detalhes que se sobrepõem.
7. Ajuste escala e proporções. Arraste no viewport para orbitar, use a roda para zoom e o botão direito para mover a câmera. **Frente** alinha a câmera com a projeção; **Mostrar rig** exibe ossos e articulações, inclusive um osso por dedo. O skin é rígido por peça; não há articulações nas falanges nem deformação contínua.
8. Escolha **Idle**, **Walk**, **Run** ou **Action** para pré-visualizar um clipe em loop. Use **Pausar / Reproduzir** e **Velocidade**. A velocidade afeta apenas a prévia, não a duração exportada. Alterar proporções, pose ou detalhes reinicia a prévia selecionada, preservando play/pause.
9. Clique em **Exportar GLB**. O arquivo incorpora texturas aplicadas, detalhes, malha, materiais, esqueleto e os quatro clipes nomeados; grade, luzes e indicadores do editor não são exportados. A pose visível é a do momento da exportação. O recorte é incorporado ao arquivo, não depende da imagem original após a exportação.

Os clipes são procedurais e não avançam continuamente pelo cenário: o jogo deve mover a entidade. Em Walk/Run, a raiz oscila horizontalmente em cada ciclo para reduzir o deslocamento do tornozelo de apoio, voltando ao início; sua altura é amostrada para manter o pé mais baixo próximo do chão. A troca de clipes usa crossfade com correção vertical de contato na prévia. Ainda pode haver deslizamento lateral nas transições, pequenas penetrações entre amostras e contato imperfeito: não há IK ou adaptação ao terreno. Ao integrar com controle de movimento próprio, considere a oscilação horizontal da raiz nos clipes. Resetar restaura o humanoide, parâmetros e câmera e desativa a projeção, mas mantém a imagem carregada.

## Reconstrução 3D por IA local (opcional)

Há duas saídas distintas: a **base procedural** tem 27 ossos, detalhes editáveis, projeção e quatro clipes; a **malha IA** é gerada pelo [TripoSR oficial](https://github.com/VAST-AI-Research/TripoSR), com geometria inferida da imagem e cor por vértice, mas **sem rig, clipes ou transferência automática dos ajustes**. A IA não garante fidelidade: partes ocultas são estimadas, imagens complexas e personagens de corpo inteiro podem apresentar erros e a qualidade depende do modelo. A prévia centraliza e dimensiona a malha, mas o download preserva o GLB original. Não é um substituto para rigging/modelagem manual quando esses recursos são necessários.

### Instalação

Requer Python >= 3.8, dependências de compilação, PyTorch e, para uso prático, GPU compatível (o projeto recomenda cerca de **6 GB de VRAM**). CPU é suportada pelo TripoSR, mas pode ser muito lenta ou exigir muita memória. Consulte o [guia oficial](https://github.com/VAST-AI-Research/TripoSR#installation), inclusive para compatibilidade CUDA/PyTorch e compilação de `torchmcubes`. Exemplo Linux/macOS, a partir da raiz do repositório, mantendo o modelo fora deste projeto:

```sh
git clone https://github.com/VAST-AI-Research/TripoSR.git ../TripoSR
git -C ../TripoSR checkout 107cefdc244c39106fa830359024f6a2f1c78871
python3 -m venv ../triposr-env
../triposr-env/bin/python -m pip install --upgrade pip setuptools
# Instale PyTorch adequado à sua GPU/CPU conforme https://pytorch.org/get-started/locally/
../triposr-env/bin/python -m pip install -r ../TripoSR/requirements.txt
python3 tools/img2glb-studio/server.py --triposr ../TripoSR --python ../triposr-env/bin/python
```

No Windows, use os caminhos equivalentes para o Python do ambiente (`Scripts/python.exe`) e siga as instruções de instalação oficiais. Abra `http://127.0.0.1:8000/`, carregue PNG/JPG de até 12 MiB e clique em **Gerar malha 3D por IA**. Aguarde; a primeira execução baixa pesos do Hugging Face e do removedor de fundo `rembg` (exige internet, espaço em disco e pode demorar). Use **Ver malha IA** / **Ver base animada** para alternar; **Exportar GLB** baixa a saída da visualização ativa. O processo inicia o TripoSR a cada solicitação e usa `--mc-resolution 192`, remoção de fundo padrão e saída GLB colorida; verifique o terminal se houver falha. O botão fica desabilitado se o backend não estiver configurado. A verificação de configuração apenas confirma a existência do script e do Python, não a instalação das dependências ou pesos.

**Privacidade e segurança:** a imagem é enviada ao servidor local somente ao clicar em gerar, gravada em diretório temporário e removida após a execução; não é enviada a uma API de terceiros pelo Studio. O TripoSR e suas dependências podem baixar arquivos de terceiros e manter seus próprios caches; confira as políticas e licenças. O servidor é destinado a uso pessoal local, sem autenticação: não o exponha em rede pública ou para usuários não confiáveis. Por padrão ele escuta somente `127.0.0.1`; `--allow-host`/`--host` são para proxies confiáveis, não uma solução de autenticação. A geração real requer uma instalação de TripoSR funcional; os testes automatizados da integração usam um executor falso e não comprovam qualidade ou funcionamento do modelo em cada máquina.

## Limitações da base procedural

A projeção da base **não é reconstrução automática 3D**: aplica recortes 2D à frente de peças predefinidas. As laterais e costas mantêm cores sólidas; há possíveis emendas e estiramento. Use o modo IA acima para uma malha estimada, com suas próprias limitações.

O navegador precisa suportar WebGL e módulos ES/import maps. Use um servidor HTTP, não `file://`. A ferramenta usa o Three.js r187 já presente em `js/vendor/` e os addons correspondentes em `vendor/`, sob a licença MIT em `js/vendor/THREE-LICENSE.txt`.

## Testes

Com Node.js 22, na raiz do repositório, execute:

```sh
node --experimental-loader ./tools/img2glb-studio/tests/three-loader.mjs --test tools/img2glb-studio/tests/studio.test.mjs
```

O backend também pode ser testado sem GPU, com executor falso: `python3 -m unittest discover -s tools/img2glb-studio/tests -p "test_*.py"`.
