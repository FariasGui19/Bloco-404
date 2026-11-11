#!/usr/bin/env python3
"""Prepara as folhas da TRANSFORMAÇÃO (tecla T).

Quatro sequências, uma por arquétipo, todas com 4 quadros de 320 px. A ordem é
sempre a mesma: preparo → energia envolvendo o corpo → armadura quase fechada →
forma final. Na retirada, o jogo desenha a MESMA folha ao contrário (a arte é
simétrica o bastante para isso: o último quadro é a forma vestida).

    t-mare.png     → player-t-mare.png     h2o sobe pelas pernas e substitui o traje
    t-dominio.png  → player-t-dominio.png  anéis de frequência + placas de ouro
    t-bio.png      → player-t-bio.png      exo se monta com vapor e pistões
    t-nucleo.png   → player-t-nucleo.png   bracelete no braço humano projetando a forma

O Núcleo é o caso especial: a identidade dele é o BRACELETE, então a sequência
mostra o operador (de macacão cinza, forma base) usando o bracelete para
acionar a Forma de Eco. A criatura entra depois, com as folhas de forma.

Apoio e altura: `compose` usa as mesmas regras do resto (320 px, pés em 276).
`body_height` fixa o CORPO em 249 px de arte = 142 px em jogo a .57, que é o
tamanho do operador civil (folha de 457 px em .31).

Uso: python3 tools/preparar-transformacao.py
"""
from bio_arte import SOURCE_TRANSFORMA, compose, edge_fade, load_frames

CORPO = 249

FOLHAS = [
    {'file': 't-mare.png', 'prefix': 'player-t-mare'},
    # O Domínio veio com cinco figuras (as duas últimas quase iguais):
    # usamos base → anéis → armadura → final.
    {'file': 't-dominio.png', 'prefix': 'player-t-dominio', 'pick': [0, 1, 2, 4]},
    {'file': 't-bio.png', 'prefix': 'player-t-bio'},
    # O terceiro quadro do Núcleo vem com um cilindro holográfico de borda dura:
    # `fade` desvanece a moldura para ele não virar um retângulo verde no mapa.
    {'file': 't-nucleo.png', 'prefix': 'player-t-nucleo', 'fade': [2]},
]


def main():
    for cfg in FOLHAS:
        frames = load_frames(cfg['file'], 4, source=SOURCE_TRANSFORMA, pick=cfg.get('pick'))
        for index in cfg.get('fade', []):
            frames[index] = edge_fade(frames[index], .12)
        compose(frames, cfg['prefix'], body_height=CORPO)


if __name__ == '__main__':
    main()
