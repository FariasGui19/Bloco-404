import { NUCLEO_FORMS, getFormDuration, getFormRecharge, getSelectedNucleoForm } from '../data/nucleo-forms.js';
import { getDerivedStats } from '../game/rpg.js';

// Read-only projection of native selection and timers, shared by game and lab.
export function createNucleoHUD(mount, state, actions) {
  const panel = document.createElement('section');
  panel.className = 'dimension-nucleo';
  panel.setAttribute('aria-label', 'Bracelete X10');
  panel.innerHTML = `<header><span>B404 / NÚCLEO</span><b>X10</b></header><div class="nucleo-cards"></div><p class="nucleo-state" role="status" aria-live="polite"></p><progress max="1" value="1" aria-label="Duração ou recarga da forma"></progress><footer><button type="button" data-spatial-key="KeyR">R · SELECIONAR</button><button type="button" data-spatial-key="KeyT">T · TRANSFORMAR</button></footer>`;
  const cards = panel.querySelector('.nucleo-cards');
  const entries = Object.values(NUCLEO_FORMS).map(form => {
    const card = document.createElement('div');
    card.className = 'nucleo-card';
    const img = document.createElement('img');
    img.src = new URL(`../../assets/sprites/ui/${form.id === 'forma_bruta' ? 'nucleo-quebra-sistemas' : 'nucleo-forma-veloz'}.png`, import.meta.url).href;
    img.alt = ''; card.append(img);
    const label = document.createElement('span'); label.textContent = form.name; card.append(label);
    const badge = document.createElement('small'); card.append(badge); cards.append(card);
    return { form, card, badge };
  });
  mount.append(panel);
  let lastStatus = '';
  return {
    update() {
      panel.hidden = state.progress.archetype !== 'nucleo_dez_forma';
      mount.classList.toggle('has-nucleo', !panel.hidden);
      if (panel.hidden) return;
      const player = state.player, runtime = player.nucleoRuntime ?? {};
      const available = actions.available();
      const selected = actions.selected ?? getSelectedNucleoForm(state.progress)?.id;
      entries.forEach(({ form, card, badge }) => {
        const unlocked = available.some(f => (typeof f === 'string' ? f : f.id) === form.id);
        card.classList.toggle('selected', selected === form.id);
        card.classList.toggle('active', player.nucleoForm === form.id);
        card.classList.toggle('locked', !unlocked);
        badge.textContent = !unlocked ? 'BLOQUEADA' : player.nucleoForm === form.id ? 'ATIVA' : selected === form.id ? 'SELECIONADA' : 'DISPONÍVEL';
      });
      const active = NUCLEO_FORMS[player.nucleoForm];
      const recharging = !active && (runtime.recharge ?? 0) > 0;
      const status = active ? `${active.name} · ATIVA` : recharging ? 'BRACELETE · RECARREGANDO' : 'OPERADOR · PRONTO';
      if (status !== lastStatus) { panel.querySelector('.nucleo-state').textContent = status; lastStatus = status; }
      const total = active ? getFormDuration(active, getDerivedStats(state.progress, player)?.formDuration ?? 0) : getFormRecharge(NUCLEO_FORMS[runtime.form]);
      const value = active ? runtime.remaining ?? 0 : recharging ? runtime.recharge : total;
      const bar = panel.querySelector('progress'); bar.max = Math.max(1, total); bar.value = Math.max(0, value);
      bar.setAttribute('aria-valuetext', `${Math.ceil(value)} segundos`);
      panel.dataset.timer = active || recharging ? `${Math.ceil(value)}s` : 'PRONTO';
      const button = panel.querySelector('[data-spatial-key="KeyT"]');
      const assembling = player.ability?.effect?.id === 'transformacao_10x';
      button.disabled = assembling || recharging;
      button.textContent = assembling ? 'SINCRONIZANDO…' : active ? 'T · RETORNAR' : recharging ? 'T · AGUARDE' : 'T · TRANSFORMAR';
    },
    dispose() { panel.remove(); mount.classList.remove('has-nucleo'); },
  };
}
