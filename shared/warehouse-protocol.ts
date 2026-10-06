export const ORDERS_TOPIC = "conecthus/logix/wh1/orders";
export const STATUS_FILTER = `${ORDERS_TOPIC}/+/status`;
export const statusTopic = (id: string) => `${ORDERS_TOPIC}/${id}/status`;

export type OrderMessage = {
  id: string;
  type: "store" | "retrieve";
  address: string;
  sku?: string;
  qty?: number;
};

export type OrderStatus = "queued" | "running" | "done" | "rejected";

export type StatusMessage = { id: string; status: OrderStatus; reason?: string; ts: number };

export function parseOrder(raw: string): OrderMessage | null {
  try {
    const d = JSON.parse(raw);
    if (typeof d.id !== "string" || typeof d.address !== "string") return null;
    if (d.type !== "store" && d.type !== "retrieve") return null;
    return {
      id: d.id,
      type: d.type,
      address: d.address,
      sku: typeof d.sku === "string" ? d.sku : undefined,
      qty: typeof d.qty === "number" && Number.isFinite(d.qty) ? d.qty : undefined,
    };
  } catch {
    return null;
  }
}

export function parseStatus(raw: string): StatusMessage | null {
  try {
    const d = JSON.parse(raw);
    if (typeof d.id !== "string" || typeof d.status !== "string") return null;
    return d;
  } catch {
    return null;
  }
}
