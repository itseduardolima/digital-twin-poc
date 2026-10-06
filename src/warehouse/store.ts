import { DEFAULT_LAYOUT } from "./layout";
import type { Layout, Slot } from "./layout";

export type Item = { sku: string; qty: number };

const LAYOUT_KEY = "warehouse.layout";
const ITEMS_KEY = "warehouse.items";

export function loadLayout(): Layout {
  try {
    return { ...DEFAULT_LAYOUT, ...JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? "{}") };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(l: Layout) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(l));
}

export function loadItems(): Map<string, Item> | null {
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    return raw ? new Map(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function saveItems(items: Map<string, Item>) {
  localStorage.setItem(ITEMS_KEY, JSON.stringify([...items]));
}

export function seedItems(slots: Slot[], fill: number): Map<string, Item> {
  let s = 1;
  const rand = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const items = new Map<string, Item>();
  for (const slot of slots)
    if (rand() < fill) items.set(slot.address, { sku: `SMD-${1000 + Math.floor(rand() * 50)}`, qty: 500 + Math.floor(rand() * 4500) });
  return items;
}
