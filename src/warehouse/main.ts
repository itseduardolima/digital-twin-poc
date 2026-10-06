import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildSlots, dims } from "./layout";
import { buildWarehouse } from "./warehouse";
import type { Warehouse } from "./warehouse";
import { buildStation, runOrder, tick } from "./automation";
import type { Station } from "./automation";
import { createPanel } from "./panel";
import { loadItems, loadLayout, saveItems, saveLayout, seedItems } from "./store";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("app")!.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f24);
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f45, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(6, 10, 8);
scene.add(sun);
scene.add(new THREE.GridHelper(30, 30, 0x555c64, 0x33383e));

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

let layout = loadLayout();
let items = loadItems() ?? seedItems(buildSlots(layout), layout.fill);
saveItems(items);

let warehouse: Warehouse;
let station: Station;
let selected = -1;
let busy = false;

async function order(type: "store" | "retrieve", sku = "", qty = 0) {
  if (busy || selected < 0) return;
  const slot = warehouse.slots[selected];
  const occupied = items.has(slot.address);
  if (type === "store" && (occupied || !sku)) return panel.notify(occupied ? "Bolso já ocupado" : "Informe o SKU");
  if (type === "retrieve" && !occupied) return panel.notify("Bolso vazio");
  busy = true;
  panel.setBusy(true);
  const index = selected;
  await runOrder(station, warehouse, layout, items, { type, index });
  if (type === "store") items.set(slot.address, { sku, qty });
  else items.delete(slot.address);
  saveItems(items);
  updateStatus();
  busy = false;
  panel.setBusy(false);
  if (selected === index) panel.select(slot, items.get(slot.address));
}

const marker = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: 0xffd400 }),
);
marker.visible = false;
scene.add(marker);

const panel = createPanel({
  layout,
  onApply(next) {
    if (busy) return;
    layout = next;
    saveLayout(layout);
    build(true);
  },
  onSave(sku, qty) {
    if (selected < 0 || !sku) return;
    const slot = warehouse.slots[selected];
    items.set(slot.address, { sku, qty });
    saveItems(items);
    warehouse.setOccupied(selected, true);
    updateStatus();
    panel.select(slot, items.get(slot.address));
  },
  onStore: (sku, qty) => void order("store", sku, qty),
  onRetrieve: () => void order("retrieve"),
  onRemove() {
    if (selected < 0) return;
    const slot = warehouse.slots[selected];
    items.delete(slot.address);
    saveItems(items);
    warehouse.setOccupied(selected, false);
    updateStatus();
    panel.select(slot);
  },
});

function updateStatus() {
  document.getElementById("status")!.textContent = `${warehouse.slots.length} bolsos · ${items.size} ocupados`;
}

function disposeTree(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    m.geometry?.dispose();
    (m.material as THREE.Material | undefined)?.dispose();
  });
}

function build(keepCamera: boolean) {
  if (warehouse) {
    scene.remove(warehouse.root);
    disposeTree(warehouse.root);
  }
  warehouse = buildWarehouse(layout, new Set(items.keys()));
  scene.add(warehouse.root);
  if (station) scene.remove(station.root);
  station = buildStation(layout);
  scene.add(station.root);
  selected = -1;
  marker.visible = false;
  panel.select(null);
  updateStatus();
  if (keepCamera) return;
  const d = dims(layout);
  camera.position.set(d.length * 0.6, d.height * 1.1, d.length * 0.9 + 4);
  controls.target.set(0, d.height / 2, 0);
}
build(false);

const ray = new THREE.Raycaster();
let down: [number, number] | null = null;
renderer.domElement.addEventListener("pointerdown", (e) => (down = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(warehouse.pick)[0];
  if (!hit || hit.instanceId === undefined) return;
  selected = hit.instanceId;
  const slot = warehouse.slots[selected];
  marker.position.set(...slot.position);
  marker.scale.set(layout.reelDiameter, layout.reelHeight + 0.02, layout.reelDiameter);
  marker.visible = true;
  panel.select(slot, items.get(slot.address));
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  tick(Math.min(clock.getDelta(), 0.1), station);
  controls.update();
  renderer.render(scene, camera);
});
