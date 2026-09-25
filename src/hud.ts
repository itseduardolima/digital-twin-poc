import { JOINT_KEYS } from "../shared/protocol.ts";
import type { LinkStatus } from "./telemetry.ts";

const STALE_MS = 2000;
const COLORS: Record<LinkStatus | "stale", string> = {
  online: "#3cb44b",
  connecting: "#ffe119",
  offline: "#e6194b",
  stale: "#f58231",
};

/** HUD de telemetria: estado do link, idade da última mensagem e ângulos atuais. */
export function createHud(info: { url: string; topic: string }) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:12px;bottom:12px;padding:10px 12px;background:#000a;color:#dde;font:12px/1.5 ui-monospace,monospace;border-radius:6px;min-width:230px";
  document.body.appendChild(el);

  let status: LinkStatus = "connecting";
  let lastMsgAt = 0;

  return {
    setStatus(s: LinkStatus) {
      status = s;
    },
    markMessage() {
      lastMsgAt = performance.now();
    },
    render(angles: number[]) {
      const age = lastMsgAt ? performance.now() - lastMsgAt : Infinity;
      const state = status === "online" && age > STALE_MS ? "stale" : status;
      const label = state === "stale" ? "sem dados" : state;
      el.innerHTML =
        `<span style="color:${COLORS[state]}">●</span> <b>${label}</b>` +
        `<span style="color:#889"> ${lastMsgAt ? `${Math.round(age)} ms` : "-"}</span><br>` +
        `<span style="color:#889">${info.url}<br>${info.topic}</span><br>` +
        JOINT_KEYS.map((k, i) => `${k.toUpperCase()} ${angles[i].toFixed(1).padStart(7)}°`).join("<br>");
    },
  };
}
