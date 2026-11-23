// Real menu/save/RAF test for the legacy Maré Astral save stranded at the Docas.
// It proves the v1 -> v2 retrofit in the actual load path and that the new echo
// portal opens the stable fenda without rerunning the Docas mission.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = process.env.PREVIEW_ORIGIN ?? "http://127.0.0.1:8000";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? "playwright-core");
const browser = await chromium.launch({
  executablePath: process.env.BROWSER_EXECUTABLE,
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
  env: { ...process.env, LD_LIBRARY_PATH: process.env.BROWSER_LIBRARY_PATH ?? process.env.LD_LIBRARY_PATH ?? "" },
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${origin}/index.html`);
  await page.waitForFunction(() => typeof window.__morfador === "function", null, { timeout: 120000 });
  await page.evaluate(async () => {
    const { createNewSave } = await import("/js/game/save.js");
    const save = createNewSave(1, "OPERADOR MARÉ");
    save.version = 1;
    save.world = { lastMapId: "mare_cromatica_docas", lastSpawnId: "inicio" };
    save.progress.archetype = "mare_astral";
    save.progress.onboardingCompleted = true;
    save.progress.inventory = ["fragmento", "chave_docas"];
    save.progress.flags = { docas_neblina_alcancada: true, docas_sinal_interceptado: true };
    delete save.progress.mareCromatica;
    localStorage.setItem("BLOCO404_SAVE_SLOT_1", JSON.stringify(save));
  });
  await page.click("#startBtn");
  await page.click(".continue-btn");
  await page.waitForFunction(() => !document.querySelector("#cromaticaHud").hidden, null, { timeout: 120000 });
  const migrated = await page.evaluate(async () => {
    const { state } = await import("/js/game/state.js");
    // Keep the main-world state for synchronous waitForFunction checks (dynamic
    // imports inside async predicates can outlive the actual map transition).
    window.__st = state;
    const { lerMareCromatica } = await import("/js/game/mare-cromatica.js");
    return {
      map: state.world.currentMapId,
      data: lerMareCromatica(state.progress),
      flags: state.progress.flags,
      inventory: state.progress.inventory.slice(),
      health: state.player.health,
      portals: state.portals.map((p) => ({ id: p.id, label: p.label, dest: p.destino?.mapId })),
    };
  });
  assert.equal(migrated.map, "mare_cromatica_docas");
  assert.equal(migrated.data.desfecho, "total");
  assert.equal(migrated.data.ancoraEstavel, true);
  assert.equal(migrated.flags.docas_incursao_concluida_v2, true);
  assert.equal(migrated.flags.cromatica_ancora_estavel, true);
  assert.deepEqual(migrated.inventory, ["fragmento", "chave_docas"]);
  assert.ok(migrated.health > 0);
  const portal = migrated.portals.find((p) => p.id === "docas_portal_fenda");
  assert.ok(portal, "echo portal exists in the real Docas map");
  assert.equal(portal.dest, "mare_cromatica_fenda");
  await page.evaluate(async () => {
    const { state } = await import("/js/game/state.js");
    const p = state.portals.find((p) => p.id === "docas_portal_fenda");
    state.player.x = p.x + 1.1; state.player.y = p.y + 0.2; state.player.vx = state.player.vy = 0;
  });
  await page.waitForTimeout(800);
  const near = await page.evaluate(async () => {
    const { state } = await import("/js/game/state.js");
    const { getInteractionPrompt } = await import("/js/game/interactions.js");
    return { id: state.interaction?.active?.data?.id, kind: state.interaction?.active?.kind, label: getInteractionPrompt(state.interaction?.active) };
  });
  assert.equal(near.id, "docas_portal_fenda");
  assert.equal(near.kind, "portal");
  assert.match(near.label, /PORTAL DE ECO|FENDA/);
  mkdirSync("qa", { recursive: true });
  const shot = await page.evaluate(() => document.querySelector("canvas")?.toDataURL?.("image/png"));
  if (shot) writeFileSync("qa/docas-portal-eco.png", Buffer.from(shot.split(",")[1], "base64"));
  await page.keyboard.press("e");
  await page.waitForFunction(() => window.__st?.world.currentMapId === "mare_cromatica_fenda"
    && !window.__st.world.isLoading
    && window.__st.portals.some((p) => p.id === "cromatica_voltar_contencao")
    && window.__st.objects.some((o) => o.id === "cromatica_limiar_final"), null, { timeout: 30000 });
  const fenda = await page.evaluate(async () => {
    const { state } = await import("/js/game/state.js");
    return {
      map: state.world.currentMapId,
      portals: state.portals.map((p) => p.id),
      limiar: state.objects.some((o) => o.id === "cromatica_limiar_final"),
      anchors: state.progress.mareCromatica.ancoraEstavel,
      inventory: state.progress.inventory.slice(),
    };
  });
  assert.equal(fenda.map, "mare_cromatica_fenda");
  assert.ok(fenda.portals.includes("cromatica_voltar_contencao"));
  assert.equal(fenda.limiar, true);
  assert.equal(fenda.anchors, true);
  assert.deepEqual(fenda.inventory, ["fragmento", "chave_docas"]);
  // The limiar is the unchanged one-gesture entry into the mission/dimension;
  // use the real main-world state so the 3D mode is the game's, not a test copy.
  await page.evaluate(() => {
    window.__st.player.x = 5;
    window.__st.player.y = 4.2;
    window.__st.player.vx = window.__st.player.vy = 0;
  });
  await page.waitForFunction(() => window.__st.interaction?.active?.data?.id === "cromatica_limiar_final", null, { timeout: 10000 });
  await page.keyboard.press("e");
  await page.waitForTimeout(450);
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press("e");
    await page.waitForTimeout(350);
  }
  await page.waitForFunction(() => window.__dimension404?.mode === "3d", null, { timeout: 120000 });
  assert.equal(await page.evaluate(() => window.__dimension404.mode), "3d");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  assert.deepEqual(errors, []);
  console.log("Legado Docas real: menu/save v1, missão concluída, inventário intacto, portal de eco visível, fenda estável e dimensão iniciada pelo limiar OK");
} finally {
  await browser.close();
}
