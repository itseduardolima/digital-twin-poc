import mqtt from "mqtt";
import { DEFAULT_LAYOUT as L } from "../src/warehouse/layout.ts";
import { ORDERS_TOPIC, STATUS_FILTER, parseStatus, type OrderMessage } from "../shared/warehouse-protocol.ts";

const URL = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const INTERVAL_S = Number(process.env.ORDER_INTERVAL_S ?? 25);
const MAX_IN_FLIGHT = 3;

const pending = new Map<string, OrderMessage>();
const known = new Set<string>();
let seq = 0;

const pick = (n: number) => Math.floor(Math.random() * n) + 1;
const randomAddress = () =>
  `${Math.random() < 0.5 ? "A" : "B"}-${pick(L.modules)}-${pick(L.columns)}-${pick(L.levels)}-${pick(L.pocketRows * L.pocketCols)}`;

function nextOrder(): OrderMessage {
  const id = `o${Date.now().toString(36)}${seq++}`;
  if (known.size > 0 && Math.random() < 0.5) {
    const address = [...known][Math.floor(Math.random() * known.size)];
    return { id, type: "retrieve", address };
  }
  let address = randomAddress();
  while (known.has(address)) address = randomAddress();
  return { id, type: "store", address, sku: `SMD-${1000 + pick(50)}`, qty: 500 + pick(4500) };
}

const client = mqtt.connect(URL);
client.on("error", (e) => console.error("[wms] erro:", e.message));
client.on("connect", () => {
  console.log(`[wms] conectado a ${URL}, pedido a cada ${INTERVAL_S}s em ${ORDERS_TOPIC}`);
  client.subscribe(STATUS_FILTER, { qos: 1 });
});

client.on("message", (_topic, payload) => {
  const s = parseStatus(payload.toString());
  const order = s && pending.get(s.id);
  if (!s || !order) return;
  console.log(`[wms] ${order.type} ${order.address}: ${s.status}${s.reason ? ` (${s.reason})` : ""}`);
  if (s.status === "running" || s.status === "queued") return;
  pending.delete(s.id);
  const stored = (s.status === "done" && order.type === "store") || s.reason === "occupied";
  if (stored) known.add(order.address);
  else known.delete(order.address);
});

setInterval(() => {
  if (!client.connected || pending.size >= MAX_IN_FLIGHT) return;
  const order = nextOrder();
  pending.set(order.id, order);
  client.publish(ORDERS_TOPIC, JSON.stringify(order), { qos: 1 });
  console.log(`[wms] publicado ${order.type} ${order.address}`);
}, INTERVAL_S * 1000);
