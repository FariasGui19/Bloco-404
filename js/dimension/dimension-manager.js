// Transactional bridge. 2D coordinates/maps never become 3D coordinates.
// Shared vitals/progress/inventory keep their original object identities.
export const DIMENSION_MODE = Object.freeze({
  FLAT: "2d",
  LOADING: "loading",
  ENTERING: "entering",
  SPATIAL: "3d",
  EXITING: "exiting",
});
export class DimensionManager {
  constructor({
    state,
    createWorld,
    clearInput = () => {},
    changed = () => {},
    canEnter = () => true,
  }) {
    Object.assign(this, { state, createWorld, clearInput, changed, canEnter });
    this.mode = "2d";
    this.runtime = null;
    this.elapsed = 0;
    this.ticket = 0;
    this.error = "";
    this.saved = null;
    this.enteringDuration = 1.8;
  }
  get active() {
    return this.mode !== "2d";
  }
  setMode(mode) {
    this.mode = mode;
    this.elapsed = 0;
    this.changed(this);
  }
  async enter({ reason = "sandbox" } = {}) {
    if (this.active || !this.canEnter()) return false;
    this.error = "";
    const ticket = ++this.ticket;
    const p = this.state.player;
    this.saved = {
      x: p.x,
      y: p.y,
      facing: p.facing,
      target: p.target,
      moving: p.moving,
    };
    this.state.world.dimensionActive = true;
    this.clearInput();
    this.setMode("loading");
    // A missão da Maré conduz o próprio prólogo visual (estática, drone e
    // revelação do nevoeiro). O portão do manager pode abrir antes sem cortar
    // a cena: 0.9s poupa o loop em renderizadores de software lentos.
    this.enteringDuration = String(reason).startsWith("mare-cromatica:baia")
      ? 0.9
      : 1.8;
    let runtime;
    try {
      runtime = await this.createWorld({
        state: this.state,
        exit: () => this.exit(),
        fail: (e) => this.abort(e),
        reason,
      });
      if (ticket !== this.ticket) {
        runtime.dispose();
        return false;
      }
      this.runtime = runtime;
      this.setMode("entering");
      return true;
    } catch (e) {
      runtime?.dispose();
      if (ticket === this.ticket) this.abort(e);
      return false;
    }
  }
  exit() {
    if (!this.active) return;
    if (this.mode === "loading") {
      this.finish();
      return;
    }
    if (this.mode !== "exiting") {
      this.clearInput();
      this.setMode("exiting");
    }
  }
  tick(dt) {
    if (!this.active) return;
    this.elapsed += Math.max(0, Math.min(dt, 0.05));
    try {
      this.runtime?.frame(dt, {
        mode: this.mode,
        progress: Math.min(1, this.elapsed / 1.8),
      });
      if (this.mode === "entering" && this.elapsed >= this.enteringDuration) this.setMode("3d");
      else if (this.mode === "exiting" && this.elapsed >= 0.65) this.finish();
    } catch (e) {
      this.abort(e);
    }
  }
  abort(error) {
    this.error = error?.message ?? String(error);
    this.finish();
  }
  finish() {
    ++this.ticket;
    try {
      this.runtime?.dispose();
    } finally {
      this.runtime = null;
      if (this.saved) Object.assign(this.state.player, this.saved);
      this.saved = null;
      this.state.world.dimensionActive = false;
      this.clearInput();
      this.setMode("2d");
    }
  }
}
