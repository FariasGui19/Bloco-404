# Direção de desenvolvimento — Arquipélago das Rotas Perdidas

Este documento registra decisões e rascunhos; não indica que os sistemas futuros já estejam implementados.

## Princípios

- Um arquétipo escolhido pelo jogador; apenas um módulo de arquétipo ativo por vez. Uma futura ferramenta inspirada em um «morfador mestre» poderá conceder habilidades de outros personagens do multiverso, sem ser tratada como troca automática de arquétipo. Seu desbloqueio e regras ainda não foram definidos.
- Ataque básico no clique esquerdo: varia conforme arquétipo, forma de Eco e ferramenta equipada. Movimento por clique deve mudar para outro comando, ainda a definir; até o combate existir, preservar o controle atual.
- Cada arquétipo tem quatro habilidades e uma Ultimate. Todas evoluem individualmente; a Ultimate também começa no nível 1. Evolução adiciona possibilidades e efeitos, não apenas dano.
- Uma geografia compartilhada com experiências e acessos distintos. Superfície, céu, subsolo, mar e fundo do mar podem ser mapas conectados; percepção e interação também mudam conforme o contexto do jogador.

## Identidades

- **Núcleo 10X** (`nucleo_dez_forma`): bracelete e interface circular para selecionar Formas de Eco temporárias. Candidatas: Brasa Feral, Massa Nula, Olho Órbita, Casco Titânio e Pulso Veloz. A imagem verde é referência para a transformação de dash; instabilidade pode servir à narrativa e ao humor sem impedir progresso.
- **Domínio Ancião** (`lamina_dominio_anciao`): espada de frequência dourada, postura de guerreiro, força, defesa e ruptura. A imagem com espada é sua referência.
- **Motor Bio-Forja** (`motor_bio_forja`): tecnologia biomecânica viva, reconstrução, ferramentas modulares, propulsão e mobilidade.
- **Maré Astral** (`mare_astral`): água, fluxo, pressão, artes marciais fluidas e exploração submarina. A imagem com água é sua referência. Profundidades extremas podem exigir equipamento adicional.

Q é inicialmente mobilidade/força; R é percepção/scan. Os slots de utilidade, apoio e Ultimate serão definidos e prototipados depois. As ideias de formas e habilidades não são uma especificação final de controles ou balanceamento.

## Progressão e acessibilidade

A Praia Inicial atual possui caminhos com gates de módulos diferentes em sequência. Como cada jogador escolhe só um arquétipo, essas combinações não garantem acesso completo a D e F. Antes de apresentar o mapa como completo, projetar rotas alternativas, progressão ou equipamentos acessíveis a cada arquétipo; não presumir troca de módulo e não depender do futuro morfador mestre sem uma forma concreta de obtê-lo.

Gates futuros devem reagir a capacidades efetivamente usadas (por exemplo, ruptura, reconstrução, controle de corrente ou adaptação de forma), com requisitos de nível/equipamento quando necessário. Separar efeitos temporários de alterações permanentes e preservar flags e saves existentes.

## Bolt e Rival

Bolt é o cachorro do criador, reinterpretado como Companheiro de Eco. Pode reagir a rastros, fauna, máquinas ou correntes conforme o arquétipo. Sua personalidade e aparência dependem de referências e decisão criativa posterior.

O Rival dimensional (nomes provisórios Operador Nulo, Nexo-Null ou Arquivo 0) chega antes, altera condições e pode ajudar ou atrapalhar. Arco proposto: sombra/log; disputa por fragmento; módulo corrompido; domínio de dimensão quebrada; desfecho aberto a derrota, restauração ou absorção. Implementar primeiro encontros e consequências controlados, sem prometer comportamento procedural completo.

## Ordem de trabalho

1. Estabilizar gates, diagnóstico, persistência e testar acessos da praia.
2. Calibrar trem, costa e água; avaliar necessidade de novos assets.
3. Modelar capacidades, níveis e migração segura dos saves.
4. Prototipar Q e R dos demais arquétipos e experiências próprias de exploração.
5. Implementar ataque básico adaptativo e trocar movimento por clique para comando acordado.
6. Expandir demais slots, Ultimate, Bolt e Rival por etapas jogáveis.
