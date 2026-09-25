import mqtt from "mqtt";
import { DEFAULT_TOPIC, JOINT_KEYS, type JointsPayload } from "../shared/protocol.ts";

const URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const TOPIC = process.env.MQTT_TOPIC ?? DEFAULT_TOPIC;
const RATE_HZ = Number(process.env.RATE_HZ ?? 20);
const SEGMENT_S = 2.5; // duração de cada movimento entre poses
const NOISE_DEG = 0.05; // ruído de leitura de encoder

type Pose = number[]; // [a1..a6] em graus, dentro dos limites de src/jointConfig.ts
const ROUTE: Pose[] = [
  [0, 0, 0, 0, 0, 0],
  [50, 30, -20, 0, 40, 0],
  [50, 45, -40, 90, 60, 120],
  [-40, 45, -40, -90, 60, -120],
  [-40, 20, 10, 0, 0, 0],
];

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const noise = () => (Math.random() * 2 - 1) * NOISE_DEG;

function poseAt(elapsedS: number): Pose {
  const seg = elapsedS / SEGMENT_S;
  const i = Math.floor(seg) % ROUTE.length;
  const from = ROUTE[i];
  const to = ROUTE[(i + 1) % ROUTE.length];
  const k = smoothstep(seg - Math.floor(seg));
  return from.map((a, j) => a + (to[j] - a) * k);
}

const client = mqtt.connect(URL);
client.on("connect", () => console.log(`[plc] conectado a ${URL}, publicando em ${TOPIC} a ${RATE_HZ} Hz`));
client.on("error", (e) => console.error("[plc] erro:", e.message));

const t0 = Date.now();
setInterval(() => {
  if (!client.connected) return;
  const pose = poseAt((Date.now() - t0) / 1000);
  const payload = { ts: Date.now() } as JointsPayload;
  JOINT_KEYS.forEach((k, j) => (payload[k] = Math.round((pose[j] + noise()) * 100) / 100));
  client.publish(TOPIC, JSON.stringify(payload), { retain: true }); // retain: cliente novo já recebe a última pose
}, 1000 / RATE_HZ);
