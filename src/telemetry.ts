import mqtt from "mqtt";
import { JOINT_KEYS, type JointsPayload } from "../shared/protocol.ts";

export type LinkStatus = "connecting" | "online" | "offline";

export interface TelemetryOptions {
  url: string;
  topic: string;
  onJoints(angles: number[], ts: number): void;
  onStatus(status: LinkStatus): void;
}

/** Valida o payload: precisa de a1..a6 numéricos e finitos. Retorna null se inválido. */
export function parseJoints(raw: string): { angles: number[]; ts: number } | null {
  let data: Partial<JointsPayload>;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const angles = JOINT_KEYS.map((k) => data[k]);
  if (!angles.every((a): a is number => typeof a === "number" && Number.isFinite(a))) return null;
  return { angles, ts: typeof data.ts === "number" ? data.ts : Date.now() };
}

export function connectTelemetry(opts: TelemetryOptions): () => void {
  const client = mqtt.connect(opts.url, { reconnectPeriod: 2000 });
  opts.onStatus("connecting");
  client.on("connect", () => {
    opts.onStatus("online");
    client.subscribe(opts.topic, (err) => err && console.error("[mqtt] subscribe:", err));
  });
  client.on("reconnect", () => opts.onStatus("connecting"));
  client.on("close", () => opts.onStatus("offline"));
  client.on("error", (e) => console.error("[mqtt]", e.message));
  client.on("message", (_topic, payload) => {
    const msg = parseJoints(payload.toString());
    if (msg) opts.onJoints(msg.angles, msg.ts);
    else console.warn("[mqtt] payload inválido ignorado:", payload.toString().slice(0, 120));
  });
  return () => client.end();
}
