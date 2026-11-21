// Mission-to-dimension adapter. Independent of DOM, renderers and future lore.
export const RUPTURE_ID = "mare-cromatica:nulo:limiar-v1";
export const RUPTURE_HOOKS = Object.freeze([
  "interference",
  "entering",
  "arrived",
  "returned",
  "unavailable",
]);
export function canRequestRupture(state) {
  const d = state.progress?.mareCromatica;
  return (
    state.world?.currentMapId === "mare_cromatica_fenda" &&
    d?.ancoraEstavel === true &&
    ["total", "parcial"].includes(d.desfecho)
  );
}
export function requestRupture(state) {
  if (!canRequestRupture(state)) return false;
  const previous = state.progress.dimensionalRupture;
  if (
    previous?.id === RUPTURE_ID &&
    ["pending", "arrived"].includes(previous.status)
  )
    return false;
  state.progress.dimensionalRupture = {
    id: RUPTURE_ID,
    status: "pending",
    source: "operador_nulo",
    destination: "setor_limiar",
  };
  return true;
}
export function createRuptureBridge({
  state,
  manager,
  save = () => {},
  emit = () => {},
}) {
  let busy = false,
    tracking = false,
    arrived = false;
  const notify = (phase) =>
    emit(
      Object.freeze({
        id: RUPTURE_ID,
        phase,
        source: "operador_nulo",
        destination: "setor_limiar",
      }),
    );
  function mark(status) {
    state.progress.dimensionalRupture = {
      ...state.progress.dimensionalRupture,
      status,
    };
    save();
  }
  return {
    tick() {
      if (tracking) {
        if (manager.mode === "3d" && !arrived) {
          arrived = true;
          mark("arrived");
          notify("arrived");
        }
        if (manager.mode === "2d" && !busy) {
          tracking = false;
          if (arrived) notify("returned");
          else {
            mark("unavailable");
            notify("unavailable");
          }
        }
        return;
      }
      if (
        busy ||
        manager.active ||
        !manager.canEnter() ||
        !canRequestRupture(state) ||
        state.progress.dimensionalRupture?.id !== RUPTURE_ID ||
        state.progress.dimensionalRupture?.status !== "pending"
      )
        return;
      busy = true;
      tracking = true;
      arrived = false;
      notify("interference");
      // enter owns snapshots, rollback and context loss. No duplicate world or save reset.
      Promise.resolve()
        .then(() => manager.enter({ reason: RUPTURE_ID }))
        .then((ok) => {
          if (ok) notify("entering");
        })
        .catch(() => {
          /* Manager normally handles errors; rejected adapters also roll back. */
          manager.abort?.(
            new Error("Ruptura indisponível. O retorno 2D foi preservado."),
          );
        })
        .finally(() => {
          busy = false;
        });
    },
  };
}
