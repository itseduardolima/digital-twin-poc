import type { Layout, Slot } from "./layout";
import type { Item } from "./store";

const FIELDS: [keyof Layout, string][] = [
  ["modules", "Módulos por lado"],
  ["columns", "Colunas por módulo"],
  ["levels", "Níveis"],
  ["pocketCols", "Bolsos (comprimento)"],
  ["pocketRows", "Bolsos (largura)"],
];

type Handlers = {
  layout: Layout;
  onApply: (l: Layout) => void;
  onSave: (sku: string, qty: number) => void;
  onRemove: () => void;
  onStore: (sku: string, qty: number) => void;
  onRetrieve: () => void;
};

export function createPanel(h: Handlers) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;right:12px;top:12px;width:240px;padding:12px;background:#242a31;color:#cfd6dd;font:13px/1.5 system-ui,sans-serif;border-radius:6px";
  el.innerHTML = `
    <div data-link style="margin-bottom:8px;color:#8a949e"></div>
    <b>Layout</b>
    ${FIELDS.map(([k, label]) => `<label style="display:flex;justify-content:space-between;margin-top:4px">${label}<input data-k="${k}" type="number" min="1" value="${h.layout[k]}" style="width:60px"></label>`).join("")}
    <button data-apply style="margin-top:8px;width:100%">Aplicar layout</button>
    <hr style="border-color:#3a4047;margin:12px 0">
    <b>Bolso</b>
    <div data-slot style="margin-top:4px;color:#8a949e">Clique em um bolso</div>
    <div data-form style="display:none">
      <label style="display:flex;justify-content:space-between;margin-top:4px">SKU<input data-sku style="width:130px"></label>
      <label style="display:flex;justify-content:space-between;margin-top:4px">Qtd<input data-qty type="number" min="0" style="width:130px"></label>
      <div style="display:flex;gap:6px;margin-top:8px">
        <button data-save style="flex:1">Salvar</button>
        <button data-remove style="flex:1">Esvaziar</button>
      </div>
      <div style="display:flex;gap:6px;margin-top:6px">
        <button data-store style="flex:1">Guardar (robô)</button>
        <button data-retrieve style="flex:1">Retirar (robô)</button>
      </div>
      <div data-msg style="margin-top:6px;color:#ff8a80"></div>
    </div>`;
  document.body.appendChild(el);

  const q = <T extends HTMLElement>(s: string) => el.querySelector<T>(s)!;
  const sku = q<HTMLInputElement>("[data-sku]");
  const qty = q<HTMLInputElement>("[data-qty]");

  q("[data-apply]").onclick = () => {
    const next = { ...h.layout };
    el.querySelectorAll<HTMLInputElement>("[data-k]").forEach((i) => {
      (next as Record<string, number>)[i.dataset.k!] = Math.max(1, Math.floor(Number(i.value)) || 1);
    });
    h.onApply(next);
  };
  q("[data-save]").onclick = () => h.onSave(sku.value.trim(), Math.max(0, Number(qty.value) || 0));
  q("[data-remove]").onclick = h.onRemove;
  q("[data-store]").onclick = () => h.onStore(sku.value.trim(), Math.max(0, Number(qty.value) || 0));
  q("[data-retrieve]").onclick = h.onRetrieve;

  return {
    setLink(text: string) {
      q("[data-link]").textContent = text;
    },
    notify(text: string) {
      q("[data-msg]").textContent = text;
    },
    setBusy(busy: boolean) {
      el.querySelectorAll("button").forEach((b) => (b.disabled = busy));
    },
    select(slot: Slot | null, item?: Item) {
      q("[data-slot]").textContent = slot ? `${slot.address} — ${item ? "ocupado" : "vazio"}` : "Clique em um bolso";
      q("[data-msg]").textContent = "";
      q("[data-form]").style.display = slot ? "block" : "none";
      sku.value = item?.sku ?? "";
      qty.value = String(item?.qty ?? 0);
    },
  };
}
