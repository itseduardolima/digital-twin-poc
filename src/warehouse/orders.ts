import mqtt from "mqtt";
import { ORDERS_TOPIC, parseOrder, statusTopic } from "../../shared/warehouse-protocol.ts";
import type { OrderMessage, OrderStatus } from "../../shared/warehouse-protocol.ts";
import type { LinkStatus } from "../telemetry.ts";

export function connectOrders(opts: {
  url: string;
  onOrder: (o: OrderMessage) => void;
  onLink: (s: LinkStatus) => void;
}) {
  const client = mqtt.connect(opts.url, { reconnectPeriod: 2000 });
  opts.onLink("connecting");
  client.on("connect", () => {
    opts.onLink("online");
    client.subscribe(ORDERS_TOPIC, { qos: 1 });
  });
  client.on("reconnect", () => opts.onLink("connecting"));
  client.on("close", () => opts.onLink("offline"));
  client.on("error", (e) => console.error("[orders]", e.message));
  client.on("message", (_t, payload) => {
    const o = parseOrder(payload.toString());
    if (o) opts.onOrder(o);
    else console.warn("[orders] pedido inválido ignorado:", payload.toString().slice(0, 120));
  });
  return {
    publish(id: string, status: OrderStatus, reason?: string) {
      client.publish(statusTopic(id), JSON.stringify({ id, status, reason, ts: Date.now() }), { qos: 1 });
    },
  };
}
