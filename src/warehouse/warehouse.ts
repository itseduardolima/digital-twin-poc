import * as THREE from "three";
import { buildSlots, dims } from "./layout";
import type { Layout, Slot } from "./layout";

const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

export type Warehouse = {
  root: THREE.Group;
  slots: Slot[];
  pick: THREE.InstancedMesh;
  setOccupied: (index: number, occupied: boolean) => void;
  setTrayVisible: (tray: number, visible: boolean) => void;
};

function frame(l: Layout) {
  const d = dims(l);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f3fd0, roughness: 0.6 });
  const group = new THREE.Group();
  const post = new THREE.BoxGeometry(0.05, d.height, 0.05);
  const beamX = new THREE.BoxGeometry(d.length, 0.05, 0.05);
  const beamZ = new THREE.BoxGeometry(0.05, 0.05, d.depth);
  for (let side = 0; side < 2; side++) {
    const zc = (side === 0 ? -1 : 1) * (l.aisle / 2 + d.depth / 2);
    const zs = [zc - d.depth / 2, zc + d.depth / 2];
    const posts = new THREE.InstancedMesh(post, mat, (l.modules + 1) * 2);
    let i = 0;
    for (let m = 0; m <= l.modules; m++)
      for (const z of zs)
        posts.setMatrixAt(i++, new THREE.Matrix4().makeTranslation(-d.length / 2 + m * d.moduleWidth, d.height / 2, z));
    group.add(posts);
    for (const y of [l.baseHeight - 0.05, d.height]) {
      for (const z of zs) {
        const b = new THREE.Mesh(beamX, mat);
        b.position.set(0, y, z);
        group.add(b);
      }
      const rails = new THREE.InstancedMesh(beamZ, mat, l.modules + 1);
      for (let m = 0; m <= l.modules; m++)
        rails.setMatrixAt(m, new THREE.Matrix4().makeTranslation(-d.length / 2 + m * d.moduleWidth, y, zc));
      group.add(rails);
    }
  }
  return group;
}

function trays(l: Layout) {
  const d = dims(l);
  const count = 2 * l.modules * l.columns * l.levels;
  const mesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(d.trayWidth, l.trayThickness, d.trayLength),
    new THREE.MeshStandardMaterial({ color: 0xdfe3f0, roughness: 0.8 }),
    count,
  );
  let i = 0;
  for (let side = 0; side < 2; side++)
    for (let m = 0; m < l.modules; m++)
      for (let c = 0; c < l.columns; c++)
        for (let lv = 0; lv < l.levels; lv++) {
          const x = -d.length / 2 + m * d.moduleWidth + (c + 0.5) * d.columnPitch;
          const y = l.baseHeight + lv * l.levelPitch + l.trayThickness / 2;
          const z = (side === 0 ? -1 : 1) * (l.aisle / 2 + d.depth / 2);
          mesh.setMatrixAt(i++, new THREE.Matrix4().makeTranslation(x, y, z));
        }
  return mesh;
}

export function buildWarehouse(l: Layout, occupied: Set<string>): Warehouse {
  const slots = buildSlots(l);
  const root = new THREE.Group();
  const trayMesh = trays(l);
  const trayMatrices = Array.from({ length: trayMesh.count }, (_, i) => {
    const m = new THREE.Matrix4();
    trayMesh.getMatrixAt(i, m);
    return m;
  });
  root.add(frame(l), trayMesh);

  const reels = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(l.reelDiameter / 2, l.reelDiameter / 2, l.reelHeight, 24),
    new THREE.MeshStandardMaterial({ color: 0x3b4cff, roughness: 0.5 }),
    slots.length,
  );
  const matrices = slots.map((s) => new THREE.Matrix4().makeTranslation(...s.position));
  const perTray = l.pocketRows * l.pocketCols;
  const occ = slots.map((s) => occupied.has(s.address));
  const hiddenTrays = new Set<number>();
  const refresh = (i: number) =>
    reels.setMatrixAt(i, occ[i] && !hiddenTrays.has(Math.floor(i / perTray)) ? matrices[i] : HIDDEN);
  slots.forEach((_, i) => refresh(i));
  root.add(reels);

  const pick = new THREE.InstancedMesh(reels.geometry, new THREE.MeshBasicMaterial(), slots.length);
  matrices.forEach((m, i) => pick.setMatrixAt(i, m));
  pick.visible = false;
  root.add(pick);

  return {
    root,
    slots,
    pick,
    setOccupied(index, occupied) {
      occ[index] = occupied;
      refresh(index);
      reels.instanceMatrix.needsUpdate = true;
    },
    setTrayVisible(tray, visible) {
      if (visible) hiddenTrays.delete(tray);
      else hiddenTrays.add(tray);
      trayMesh.setMatrixAt(tray, visible ? trayMatrices[tray] : HIDDEN);
      trayMesh.instanceMatrix.needsUpdate = true;
      for (let p = 0; p < perTray; p++) refresh(tray * perTray + p);
      reels.instanceMatrix.needsUpdate = true;
    },
  };
}
