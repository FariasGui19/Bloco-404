// Controlador independente de DOM: o mapa é congelado enquanto uma transição
// ou diorama está ativo. Não altera a posição nem o save da câmera/jogador.
export const IMMERSIVE_MODE = Object.freeze({
  ISOMETRIC: 'ISOMETRIC', ENTERING: 'ENTERING', FIRST_PERSON_DIORAMA: 'FIRST_PERSON_DIORAMA', EXITING: 'EXITING', QUICK: 'QUICK',
});
export const DIORAMAS = Object.freeze({
  piscina_mare_viva_enseada: 'fonte', gruta_concha_enseada: 'gruta',
});
export const QUICK_INTERACTIONS = new Set([
  'totem_eco_enseada', 'estela_navegadores_enseada', 'jardim_pedras_enseada',
  'acampamento_vigilia_enseada', 'enseada_banco_tronco_camp', 'espelho_arquetipos_enseada',
  'rede_treino_praia_enseada', 'carrilhao_vento_enseada',
]);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const pressed = (input, ...names) => names.some(name => input?.pressed?.has(name));

export class ImmersiveViewManager {
  constructor({ state, camera, clearInput = () => {}, visit = () => {}, sound = () => {}, changed = () => {} }) {
    this.state = state; this.camera = camera; this.clearInput = clearInput;
    this.visit = visit; this.sound = sound; this.changed = changed;
    this.mode = IMMERSIVE_MODE.ISOMETRIC; this.scene = null; this.object = null;
    this.time = 0; this.alpha = 0; this.lookX = 0; this.lookY = 0;
    this.targetX = 0; this.targetY = 0; this.relaxing = false; this.petTime = 0;
    this.message = ''; this.saved = null; this.pending = null; this.visited = false;
    this.chimeCooldown = 0; this.nearChime = false;
  }
  get active() { return this.mode !== IMMERSIVE_MODE.ISOMETRIC; }
  begin(object, callback = null) {
    if (this.active || this.state.world?.currentMapId !== 'ilha_enseada_ecos' || !object) return false;
    const scene = DIORAMAS[object.id];
    if (!scene && !QUICK_INTERACTIONS.has(object.id)) return false;
    const p = this.state.player, c = this.camera;
    this.saved = { camera: { x: c.x, y: c.y, zoom: c.zoom, targetZoom: c.targetZoom, follow: c.follow },
      player: { x: p.x, y: p.y, facing: p.facing } };
    this.object = object; this.scene = scene ?? null; this.pending = callback; this.visited = false;
    this.mode = scene ? IMMERSIVE_MODE.ENTERING : IMMERSIVE_MODE.QUICK;
    this.state.world.immersiveActive = true;
    this.time = 0; this.alpha = 0; this.lookX = this.lookY = this.targetX = this.targetY = 0;
    this.relaxing = false; this.petTime = 0; this.message = '';
    p.target = null; p.moving = true;
    p.immersivePose = { id: object.id, amount: 0, side: object.x - object.y >= p.x - p.y ? 1 : -1 };
    // Direção da preparação; sem mover o corpo nem atravessar colisões.
    const dx = object.x - p.x, dy = object.y - p.y;
    p.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    this.clearInput(); this.changed(this);
    if (object.id === 'carrilhao_vento_enseada') this.ringChime(object);
    return true;
  }
  ringChime(object) {
    if (!object) return;
    object.immersiveChimeUntil = (globalThis.performance?.now?.() ?? 0) / 1000 + 2;
    this.sound('chime'); this.chimeCooldown = 3;
  }
  updateProximity(dt, objects, player) {
    this.chimeCooldown = Math.max(0, this.chimeCooldown - dt);
    const chime = objects?.find(o => o.id === 'carrilhao_vento_enseada' && o.renderizar !== false);
    const near = !!chime && Math.hypot(chime.x - player.x, chime.y - player.y) < 1.05;
    if (near && !this.nearChime && this.chimeCooldown <= 0) this.ringChime(chime);
    this.nearChime = near;
  }
  look(clientX, clientY, width, height) {
    if (this.mode !== IMMERSIVE_MODE.FIRST_PERSON_DIORAMA || width <= 0 || height <= 0) return;
    this.targetX = clamp((clientX / width - .5) * 2, -1, 1);
    this.targetY = clamp((clientY / height - .5) * 2, -1, 1);
  }
  action(which) {
    if (this.mode !== IMMERSIVE_MODE.FIRST_PERSON_DIORAMA) return;
    if (which === 1 && this.scene === 'fonte') {
      this.petTime = 2.4; this.relaxing = false; this.message = 'A capivara se aproxima, tranquila.'; this.sound('pet');
    } else if (which === 1) {
      this.relaxing = false; this.message = 'Sob a concha, a praia e o clima ficam à vista.';
    } else if (which === 2) {
      this.relaxing = !this.relaxing;
      this.message = this.relaxing ? (this.scene === 'fonte' ? 'Relaxando na água • vida e energia se recuperam.' : 'Descansando no abrigo • energia se recupera.') : 'Descanso interrompido.';
      if (this.scene === 'fonte' && this.relaxing) this.sound('water');
    }
    this.changed(this);
  }
  exit() {
    if (!this.active || this.mode === IMMERSIVE_MODE.EXITING) return;
    if (this.mode === IMMERSIVE_MODE.QUICK) { this.finish(false); return; }
    this.mode = IMMERSIVE_MODE.EXITING; this.time = 0; this.exitAlpha = this.alpha; this.exitZoom = this.camera.zoom;
    this.relaxing = false; this.clearInput(); this.changed(this);
  }
  finish(runPending = false) {
    const saved = this.saved, pending = this.pending;
    if (saved) {
      Object.assign(this.camera, saved.camera);
      const p = this.state.player;
      p.x = saved.player.x; p.y = saved.player.y; p.facing = saved.player.facing;
      p.target = null; p.moving = false; delete p.immersivePose;
    }
    this.mode = IMMERSIVE_MODE.ISOMETRIC; this.state.world.immersiveActive = false;
    this.scene = null; this.object = null; this.alpha = 0; this.pending = null; this.saved = null;
    this.relaxing = false; this.clearInput(); this.changed(this);
    if (runPending) pending?.();
  }
  update(dt, input) {
    if (!this.active) return;
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, .1);
    if (pressed(input, 'escape')) { this.exit(); return; }
    if (this.mode === IMMERSIVE_MODE.FIRST_PERSON_DIORAMA && pressed(input, 'e', 'keye')) { this.exit(); return; }
    if (this.mode === IMMERSIVE_MODE.FIRST_PERSON_DIORAMA) {
      if (pressed(input, '1', 'digit1', 'numpad1')) this.action(1);
      if (pressed(input, '2', 'digit2', 'numpad2')) this.action(2);
    }
    this.time += dt;
    if (this.state.player.immersivePose) {
      const duration = this.mode === IMMERSIVE_MODE.QUICK ? .48 : .7;
      this.state.player.immersivePose.amount = this.mode === IMMERSIVE_MODE.QUICK || this.mode === IMMERSIVE_MODE.ENTERING ? Math.sin(Math.PI * clamp(this.time / duration, 0, 1)) : 0;
    }
    this.petTime = Math.max(0, this.petTime - dt);
    const factor = 1 - Math.exp(-dt * 5);
    this.lookX += (this.targetX - this.lookX) * factor; this.lookY += (this.targetY - this.lookY) * factor;
    const c = this.camera, base = this.saved?.camera;
    if (this.mode === IMMERSIVE_MODE.QUICK) {
      this.state.player.moving = this.time < .35;
      if (this.time >= .48) this.finish(true);
    } else if (this.mode === IMMERSIVE_MODE.ENTERING) {
      const k = smooth(this.time / .7); this.alpha = smooth((this.time - .3) / .4);
      this.state.player.moving = this.time < .35;
      if (base) { c.zoom = base.zoom * (1 + .22 * k); c.targetZoom = c.zoom; c.follow = false; }
      if (this.time >= .7) {
        this.mode = IMMERSIVE_MODE.FIRST_PERSON_DIORAMA; this.time = 0; this.alpha = 1;
        this.state.player.moving = false;
        if (!this.visited) { this.visited = true; this.visit(this.object); }
        this.changed(this);
      }
    } else if (this.mode === IMMERSIVE_MODE.FIRST_PERSON_DIORAMA) {
      if (this.relaxing) {
        const p = this.state.player;
        if (p.health > 0 && Number.isFinite(p.maxHealth)) p.health = Math.min(p.maxHealth, p.health + (this.scene === 'fonte' ? 2 : .5) * dt);
        if (Number.isFinite(p.energy) && Number.isFinite(p.maxEnergy)) p.energy = Math.min(p.maxEnergy, p.energy + 4 * dt);
      }
    } else if (this.mode === IMMERSIVE_MODE.EXITING) {
      const k = smooth(this.time / .45); this.alpha = this.exitAlpha * (1 - k);
      if (base) { c.zoom = this.exitZoom + (base.zoom - this.exitZoom) * k; c.targetZoom = c.zoom; }
      if (this.time >= .45) this.finish();
    }
  }
}
