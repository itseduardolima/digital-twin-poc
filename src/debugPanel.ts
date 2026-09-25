import * as THREE from "three";
import { JOINTS, type GroupId } from "./jointConfig";
import type { Robot } from "./robot";

const GROUP_COLORS: Record<GroupId, number> = {
  base: 0x888888,
  A1: 0xe6194b,
  A2: 0x3cb44b,
  A3: 0x4363d8,
  A4: 0xf58231,
  A5: 0xf032e6,
  A6: 0xffe119,
};

/** Painel de debug (?debug): sliders das juntas, cores por grupo e clique para identificar malhas. */
export function setupDebugPanel(
  robot: Robot,
  camera: THREE.Camera,
  dom: HTMLElement,
): void {
  const panel = document.createElement("div");
  panel.style.cssText =
    "position:fixed;right:12px;top:12px;width:250px;padding:10px;background:#000a;color:#dde;font:12px system-ui;border-radius:6px";
  panel.innerHTML = `<b>Debug das juntas</b><div id="dbg-sliders"></div>
    <label><input type="checkbox" id="dbg-colors"> colorir por grupo</label>
    <button id="dbg-reset" style="margin-left:8px">zerar</button>
    <div id="dbg-pick" style="margin-top:8px;min-height:32px;color:#9cf">clique numa malha</div>
    <div style="margin-top:6px;line-height:1.5">${Object.entries(GROUP_COLORS)
      .map(([g, c]) => `<span style="color:#${c.toString(16).padStart(6, "0")}">■ ${g}</span>`)
      .join(" ")}</div>`;
  document.body.appendChild(panel);

  const sliders = panel.querySelector("#dbg-sliders")!;
  const inputs: HTMLInputElement[] = [];
  for (const d of JOINTS) {
    const row = document.createElement("div");
    row.innerHTML = `${d.id} <input type="range" min="${Math.max(d.min, -180)}" max="${Math.min(d.max, 180)}" step="1" value="0" style="width:140px"> <span>0</span>°`;
    const input = row.querySelector("input")!;
    const label = row.querySelector("span")!;
    input.oninput = () => {
      label.textContent = input.value;
      robot.setAngle(d.id, Number(input.value));
    };
    inputs.push(input);
    sliders.appendChild(row);
  }
  panel.querySelector<HTMLButtonElement>("#dbg-reset")!.onclick = () =>
    inputs.forEach((i) => {
      i.value = "0";
      i.dispatchEvent(new Event("input"));
    });

  const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const colored = new Map<GroupId, THREE.Material>();
  const colorToggle = panel.querySelector<HTMLInputElement>("#dbg-colors")!;
  colorToggle.onchange = () => {
    for (const [part, group] of robot.groupOf) {
      part.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        if (!original.has(m)) original.set(m, m.material);
        if (!colored.has(group)) colored.set(group, new THREE.MeshStandardMaterial({ color: GROUP_COLORS[group] }));
        m.material = colorToggle.checked ? colored.get(group)! : original.get(m)!;
      });
    }
  };

  const ray = new THREE.Raycaster();
  const pick = panel.querySelector("#dbg-pick")!;
  let down: [number, number] | null = null;
  dom.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
  dom.addEventListener("pointerup", (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return; // era arrasto da câmera
    const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(robot.root, true)[0];
    let part: THREE.Object3D | null = hit?.object ?? null;
    while (part && !robot.groupOf.has(part)) part = part.parent;
    pick.textContent = part ? `${part.name}  →  ${robot.groupOf.get(part)}` : "nada sob o cursor";
  });
}
