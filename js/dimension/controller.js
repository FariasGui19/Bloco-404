import { NUCLEO_FORMS, getFormSpeedMultiplier } from "../data/nucleo-forms.js";
import {
  SECTOR,
  clamp,
  terrainHeight,
  groundAt,
  blocked,
  profileFor,
} from "./sector-data.js";
export class SpatialController {
  constructor(state) {
    this.state = state;
    this.x = SECTOR.spawn.x;
    this.z = SECTOR.spawn.z;
    this.y = groundAt(this.x, this.z);
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.yaw = 0;
    this.grounded = true;
    this.flying = false;
    this.boating = false;
    this.speed = 0;
    this.mode = "TERRA";
    this.dash = 0;
    this.dashCooldown = 0;
    this.actionBoost = 0;
    this.time = 0;
  }
  step(dt, input, yaw = 0) {
    dt = clamp(dt, 0, 0.05);
    const n = Math.ceil(dt / 0.008) || 1;
    if (
      input.pressed.has("KeyF") &&
      profileFor(this.state.progress).fly &&
      !this.boating
    ) {
      this.flying = !this.flying;
      if (this.flying) {
        this.y += 0.3;
        this.vy = 0;
      }
    }
    if (
      input.pressed.has("ShiftLeft") &&
      this.grounded &&
      this.dashCooldown <= 0 &&
      !this.boating
    ) {
      this.dash = 0.22;
      this.dashCooldown = 0.8;
    }
    if (
      input.pressed.has("Space") &&
      this.grounded &&
      !this.flying &&
      !this.boating
    ) {
      this.vy = 9;
      this.grounded = false;
    }
    for (let i = 0; i < n; i++) this.integrate(dt / n, input.keys, yaw);
  }
  integrate(dt, keys, yaw) {
    this.time += dt;
    this.actionBoost = Math.max(0, this.actionBoost - dt);
    this.dash = Math.max(0, this.dash - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    const profile = profileFor(this.state.progress),
      water = this.y < -0.15 && terrainHeight(this.x, this.z) < -0.7;
    const swimming = water && !this.flying && !this.boating;
    let forward = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0),
      side = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const len = Math.hypot(forward, side) || 1;
    forward /= len;
    side /= len;
    const turbo = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const energy = this.state.player.energy ?? 100;
    const boosting =
      turbo && energy > 0 && (this.flying || swimming || this.boating);
    let speed = this.boating
      ? boosting
        ? 19
        : 11
      : this.flying
        ? boosting
          ? 25
          : 12
        : swimming
          ? (profile.dive ? 8 : 4) * (boosting ? 1.7 : 1)
          : this.dash > 0
            ? 17
            : profile.heavy
              ? 5.8
              : 7.5;
    if (boosting) this.state.player.energy = Math.max(0, energy - dt * 11);
    else
      this.state.player.energy = Math.min(
        this.state.player.maxEnergy ?? 100,
        energy + dt * 7,
      );
    if (
      !this.flying &&
      !swimming &&
      !this.boating &&
      this.state.progress.archetype === "nucleo_dez_forma"
    )
      speed *= getFormSpeedMultiplier(
        NUCLEO_FORMS[this.state.player.nucleoForm],
      );
    if (this.actionBoost > 0) speed *= 1.55;
    let dx = -Math.sin(yaw) * forward + Math.cos(yaw) * side,
      dz = -Math.cos(yaw) * forward - Math.sin(yaw) * side;
    if (this.actionBoost > 0 && !forward && !side) {
      dx = Math.sin(this.yaw);
      dz = Math.cos(this.yaw);
    }
    const blend = 1 - Math.exp(-dt * (this.flying ? 5 : 12));
    this.vx += (dx * speed - this.vx) * blend;
    this.vz += (dz * speed - this.vz) * blend;
    this.mode = this.boating
      ? "EMBARCAÇÃO"
      : this.flying
        ? "VOO LIVRE"
        : swimming
          ? this.y < -1.5
            ? "SUBMERSO"
            : "NADO"
          : "TERRA";
    if (this.boating) {
      this.y = 0.65;
      this.vy = 0;
    } else if (this.flying || swimming) {
      let vertical =
        (keys.has("Space") ? 1 : 0) -
        (keys.has("ControlLeft") || keys.has("ControlRight") ? 1 : 0);
      if (swimming && !profile.dive) vertical = Math.max(0, vertical);
      const target =
        vertical * (this.flying ? speed * 0.65 : 6) +
        (swimming && this.y < -0.65 && !vertical ? 1.2 : 0);
      this.vy += (target - this.vy) * (1 - Math.exp(-dt * 5));
      if (swimming && this.y > -0.5 && this.vy > 0) {
        this.vy = 4;
      }
      this.grounded = false;
    } else this.vy -= 24 * dt;
    // Axis-separated capsule approximation, small substeps, slopes and solid walls.
    for (const axis of ["x", "z"]) {
      const old = this[axis],
        next = clamp(old + (axis === "x" ? this.vx : this.vz) * dt, -124, 124);
      const x = axis === "x" ? next : this.x,
        z = axis === "z" ? next : this.z,
        h = groundAt(x, z, this.y + 0.65);
      const climb =
        keys.has("KeyE") && !this.flying && !swimming && !this.boating;
      const step = h - this.y;
      if (this.boating) {
        if (terrainHeight(x, z) < -0.8 && !blocked(x, 0.65, z))
          this[axis] = next;
        continue;
      }
      const maxStep = Math.max(0.025, Math.abs(next - old) * 1.15);
      const canStep = this.grounded && step > 0 && step <= maxStep;
      const y = canStep ? h : this.y;
      if (!blocked(x, y, z) && (!this.grounded || step <= maxStep)) {
        this[axis] = next;
        if (canStep) this.y = y;
      } else if (climb && step > 0 && step < 2) {
        const fraction = Math.min(1, (dt * 5) / step),
          value = old + (next - old) * fraction;
        const cx = axis === "x" ? value : this.x,
          cz = axis === "z" ? value : this.z,
          cy = groundAt(cx, cz, this.y + dt * 5);
        if (cy - this.y <= dt * 5 + 0.02 && !blocked(cx, cy, cz)) {
          this.y = cy;
          this.mode = "ESCALADA";
          this[axis] = value;
        }
      }
    }
    const oldY = this.y;
    this.y = clamp(this.y + this.vy * dt, -13, SECTOR.ceiling);
    if (blocked(this.x, this.y, this.z) && this.y > oldY) {
      this.y = oldY;
      this.vy = 0;
    }
    const ground = groundAt(this.x, this.z, Math.max(oldY, this.y) + 0.26);
    if (!this.boating && this.y <= ground) {
      this.y = ground;
      this.vy = 0;
      this.grounded = true;
      if (this.flying) this.flying = false;
    } else if (!this.boating && this.y > ground + 0.08) this.grounded = false;
    if (
      !this.flying &&
      !this.boating &&
      terrainHeight(this.x, this.z) < -0.7 &&
      !profile.dive &&
      this.y < -0.65
    ) {
      this.y = -0.65;
      this.vy = Math.max(0, this.vy);
    }
    if (this.y >= SECTOR.ceiling) this.vy = Math.min(0, this.vy);
    this.speed = Math.hypot(this.vx, this.vz, this.vy);
    if (Math.hypot(this.vx, this.vz) > 0.2) {
      const target = Math.atan2(this.vx, this.vz);
      this.yaw +=
        Math.atan2(Math.sin(target - this.yaw), Math.cos(target - this.yaw)) *
        (1 - Math.exp(-dt * 12));
    }
  }
}
