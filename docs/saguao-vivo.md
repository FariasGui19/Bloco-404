# Saguão vivo — integração das folhas

As quatro referências foram arquivadas em `assets/source-art/saguao`. São JPEGs RGB: o quadriculado é parte da imagem, não transparência. `tools/preparar-saguao.py` isola fundos neutros conectados às bordas, remove ruído e normaliza células; usa Pillow, NumPy e SciPy. A extração é aproximada e precisa de revisão quando houver PNG RGBA original.

- **Mobiliário:** vaso, lixeira, carrinho e bebedouro ocupam posições periféricas, com hitboxes pequenas nas bases. Não mudam os objetos de missão. Os demais quadros não foram usados para evitar preencher corredores com móveis sem função.
- **NEXO-04:** caminhada e gestos adicionais temporariamente desativados para evitar trocar sua aparência. Usa a folha original para as direções e poses, com movimento provisório; a IA e os diálogos permanecem. As referências retiradas continuam arquivadas.
- **Viajante:** NPC ambiental com mala, rota curta e espera perto do jogador; não bloqueia o jogador, possui diálogo breve opcional e não cria progresso. As imagens apresentam variação de orientação, por isso foram escolhidas e repetidas apenas poses coerentes, com inversão lateral quando necessário. Não é um sistema de multidão ou de missões.
- **Painel de destinos e portal:** estruturas fixas da folha original, com varredura e fluxo procedurais recortados à tela e ao interior. O fluxo do portal é ambiental e aparece mesmo com a linha bloqueada; não muda o gate ou a progressão. Os quadros alternativos das folhas geradas tinham deslocamentos de moldura e base e não são usados.
- **Projetor:** a folha recebida mistura efeito semitransparente com quadriculado opaco, impossibilitando recuperar o alpha verdadeiro sem resíduos visíveis. Foi mantido o holograma procedural do saguão, em vez de colocar uma placa quadriculada ou anunciar uma integração perfeita.

O spawn, os três portais, suas regras e a missão não foram substituídos. A ambientação não é salva; ao recarregar, a viajante reinicia sua rota. Próxima melhoria de qualidade: exportar os mesmos quadros em PNG com transparência real, tamanhos e linha de pés constantes e movimentos por direção sem variação da identidade do personagem.

## Lapidação posterior

O painel próximo à porta foi desespelhado e seu texto ajustado à perspectiva. Vaso e bebedouro ganharam escala, âncoras e sombras de contato, com hitboxes proporcionais; rotas e spawns continuam acessíveis. A viajante permanece com a arte anterior enquanto aguardamos a nova folha.

As folhas de Maré e Domínio permanecem em `assets/source-art/proximas-animacoes/`, mas suas armaduras divergem dos trajes em jogo. As folhas da forma veloz servem para corrida lateral e ataque básico provisórios, com as limitações indicadas em `docs/prompts-sprites-precisao.md`. A caminhada RGBA do NEXO foi retirada por inconsistência visual.
