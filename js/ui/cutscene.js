// Sequências de quadros com avanço deliberado: sem áudio embutido nem timers
// obrigatórios. O mesmo modal serve à abertura e ao primeiro sinal na enseada.
import { input } from '../engine/input.js';

export const BOOT_SCENES = [
  { kind: 'boot', image: 'assets/cutscenes/boot-sistema.png', eyebrow: 'INICIALIZAÇÃO // BLOCO 404', title: 'SISTEMA EM ESCUTA', text: 'Um chiado atravessa o escuro. Alguma coisa tenta estabelecer uma conexão.' },
  { kind: 'error', image: 'assets/cutscenes/boot-falha.png', eyebrow: 'FALHA DE INDEXAÇÃO', title: 'CRITICAL_ERROR', text: 'REALITY_INDEX_404_NOT_FOUND', note: 'O registro de origem não pôde ser recuperado.' },
  { image: 'assets/cutscenes/boot-aeroporto.png', eyebrow: 'PONTO 0 // AEROPORTO CENTRAL', title: 'BLOCO 404', text: 'Entre rotas que já não concordam entre si, uma estação continua de pé.' },
  { image: 'assets/cutscenes/boot-operador.png', eyebrow: 'TRANSMISSÃO DESCONHECIDA', title: 'OPERADOR NULO', text: '“Toda linha de código tem um fim... menos a sua exclusão.”', note: 'A transmissão é interrompida. O portal responde à sua presença.' },
];

export const SIGNAL_SCENES = [
  { kind: 'boot', image: 'assets/cutscenes/sinal-receptor.png', eyebrow: 'TERMINAL DE MANUTENÇÃO // ENSEADA', title: '66.6 MHz', text: 'A estática deixa de ser ruído. Uma segunda transmissão responde antes da sua.' },
  { image: 'assets/cutscenes/frequencia-ruptura.png', eyebrow: 'VISÃO ATRAVÉS DO SINAL', title: 'CIDADELA DO CÓDIGO QUEIMADO', text: 'Por um instante, a tela mostra um corredor que não pertence à praia.', note: 'A imagem se desfaz antes que uma passagem se forme.' },
  { kind: 'error', image: 'assets/cutscenes/sinal-nexo.png', eyebrow: 'NEXO-04 // CANAL DE EMERGÊNCIA', title: 'FREQUÊNCIA 66.6 MHz', text: '“Não atravesse ainda. Registrei o sinal; a rota para a origem permanece instável.”', note: 'Uma porta de manutenção na enseada conduz à estação que recebia o sinal.' },
];

// A última imagem é um limiar, não um mapa jogável nem uma viagem simulada.
export const THRESHOLD_SCENES = [
  { image: 'assets/cutscenes/limiar-666.png', eyebrow: 'ESTAÇÃO 66.6 // JANELA ESTÁVEL', title: 'DO OUTRO LADO', text: 'A água na plataforma treme. No anel, um corredor de metal substitui o reflexo da enseada.', note: 'A âncora de retorno continua acesa atrás de você.' },
  { image: 'assets/cutscenes/frequencia-ruptura.png', eyebrow: 'NEXO-04 // CANAL ABERTO', title: 'A RESPOSTA', text: '“A pessoa que pediu ajuda não necessariamente está do outro lado. Mas alguém manteve esta linha viva. Descubra por quê.”', note: 'Três pulsos. Uma resposta antes da pergunta.' },
  { kind: 'error', image: 'assets/cutscenes/frequencia-ruptura.png', eyebrow: 'PASSAGEM // 66.6 MHz', title: 'TRAVESSIA PREPARADA', text: 'Você dá o primeiro passo através do anel. A imagem se fecha sobre o corredor; a linha de retorno permanece ancorada.', note: 'Fim do trecho disponível. A próxima etapa começa quando a Cidadela estiver pronta.' },
];

let open = false;
export function isCutsceneOpen() { return open; }

export function playCutscene(scenes) {
  if (open || !scenes?.length || !document.body) return Promise.resolve();
  open = true;
  return new Promise(resolve => {
    const previousFocus = document.activeElement;
    const root = document.createElement('section');
    root.className = 'cutscene';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Sequência narrativa');
    root.innerHTML = '<div class="cutscene-art"></div><div class="cutscene-scanlines"></div><div class="cutscene-content"><div class="cutscene-eyebrow"></div><h1 class="cutscene-title"></h1><p class="cutscene-text"></p><p class="cutscene-note"></p></div><div class="cutscene-controls"><span class="cutscene-count"></span><button type="button" class="cutscene-skip">PULAR [ESC]</button><button type="button" class="cutscene-next">CONTINUAR [ENTER]</button></div>';
    document.body.appendChild(root);
    const art = root.querySelector('.cutscene-art');
    const eyebrow = root.querySelector('.cutscene-eyebrow');
    const title = root.querySelector('.cutscene-title');
    const text = root.querySelector('.cutscene-text');
    const note = root.querySelector('.cutscene-note');
    const count = root.querySelector('.cutscene-count');
    const next = root.querySelector('.cutscene-next');
    const skip = root.querySelector('.cutscene-skip');
    let index = 0;
    const render = () => {
      const scene = scenes[index];
      root.dataset.kind = scene.kind || 'art';
      root.dataset.hasImage = scene.image ? 'true' : 'false';
      art.getAnimations?.().forEach(animation => animation.cancel());
      art.style.backgroundImage = scene.image ? `url("${scene.image}")` : '';
      if (scene.image && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        art.animate?.([{ transform: 'scale(1.035)', opacity: .8 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1800, easing: 'ease-out' });
      }
      eyebrow.textContent = scene.eyebrow;
      title.textContent = scene.title;
      text.textContent = scene.text;
      note.textContent = scene.note || '';
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
      next.textContent = index === scenes.length - 1 ? 'CONCLUIR [ENTER]' : 'CONTINUAR [ENTER]';
    };
    const finish = () => {
      window.removeEventListener('keydown', onKey, true);
      root.remove(); open = false;
      // Não deixar a tecla usada na cena acionar movimento/ataque no jogo.
      for (const key in input.keys) input.keys[key] = false;
      input.pressed.clear(); input.click = null; input.attackClick = null;
      previousFocus?.focus?.({ preventScroll: true });
      resolve();
    };
    const advance = () => { if (index + 1 >= scenes.length) finish(); else { index++; render(); } };
    const onKey = event => {
      if (event.repeat) return;
      if (['Escape', 'Enter', ' ', 'e', 'E'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        if (event.key === 'Escape' || (event.key === 'Enter' && event.target === skip)) finish(); else advance();
      }
    };
    next.addEventListener('click', advance);
    skip.addEventListener('click', finish);
    window.addEventListener('keydown', onKey, true);
    render(); next.focus({ preventScroll: true });
  });
}
