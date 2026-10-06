import * as THREE from "three";
import { dims, trayCenter } from "./layout";
import type { Layout } from "./layout";
import type { Item } from "./store";
import type { Warehouse } from "./warehouse";

export type Order = { type: "store" | "retrieve"; index: number };

const L1 = 0.9;
const L2 = 0.9;
const HOLD = 0.1;
const HOVER = 0.3;
const WORK_PLAT_Y = 0.88;
const SHUTTLE_SPEED = 1.5;
const LIFT_SPEED = 0.8;
const ARM_SPEED = 1.0;
const SLIDE_SPEED = 0.5;
const CART_Z = 1.2;

type Active = { t: number; dur: number; fn: (k: number) => void; done: () => void };
const active: Active[] = [];
const ease = (k: number) => k * k * (3 - 2 * k);
const clamp1 = (v: number) => Math.min(1, Math.max(-1, v));

function tween(dur: number, fn: (k: number) => void) {
  return new Promise<void>((done) => active.push({ t: 0, dur, fn, done }));
}

export function tick(dt: number, st: Station) {
  for (const a of [...active]) {
    a.t += dt;
    const k = Math.min(1, a.t / a.dur);
    a.fn(ease(k));
    if (k >= 1) {
      active.splice(active.indexOf(a), 1);
      a.done();
    }
  }
  st.follow();
}

export type Station = ReturnType<typeof buildStation>;

export function buildStation(l: Layout) {
  const d = dims(l);
  const stationX = -d.length / 2 - 0.6;
  const base = new THREE.Vector3(stationX - 1.1, 0.9, 0);
  const root = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({ color: 0x8a949e, roughness: 0.6 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a00, roughness: 0.5 });
  const trayMat = new THREE.MeshStandardMaterial({ color: 0xdfe3f0, roughness: 0.8 });
  const reelMat = new THREE.MeshStandardMaterial({ color: 0x3b4cff, roughness: 0.5 });
  const trayGeo = new THREE.BoxGeometry(d.trayWidth, l.trayThickness, d.trayLength);
  const reelGeo = new THREE.CylinderGeometry(l.reelDiameter / 2, l.reelDiameter / 2, l.reelHeight, 24);

  const box = (parent: THREE.Object3D, w: number, h: number, dp: number, mat: THREE.Material, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, dp), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  box(root, 0.4, 0.9, 0.4, steel, base.x, 0.45, 0);
  box(root, 0.7, 0.8, 0.5, steel, base.x, 0.4, CART_Z);
  box(root, 0.7, 0.8, 0.5, steel, base.x, 0.4, -CART_Z);

  const yaw = new THREE.Group();
  yaw.position.copy(base);
  const shoulder = new THREE.Group();
  const elbow = new THREE.Group();
  elbow.position.x = L1;
  const link = (len: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, 0.1).translate(len / 2, 0, 0), orange);
    return m;
  };
  shoulder.add(link(L1), elbow);
  elbow.add(link(L2));
  yaw.add(shoulder);
  root.add(yaw);

  const railLength = d.length + 0.9;
  box(root, railLength, 0.04, 0.2, steel, stationX - 0.3 + railLength / 2, 0.02, 0);

  const shuttle = new THREE.Group();
  const mastHeight = d.height;
  box(shuttle, 0.5, 0.1, 1.4, steel, 0, 0.09, 0);
  box(shuttle, 0.08, mastHeight, 0.08, steel, 0, mastHeight / 2, 0.66);
  const platform = new THREE.Group();
  box(platform, 0.5, 0.03, 1.1, orange, 0, 0, 0);
  box(platform, 0.08, 0.08, 0.1, steel, 0, 0, 0.6);
  shuttle.add(platform);
  shuttle.position.x = stationX;
  platform.position.y = WORK_PLAT_Y;
  root.add(shuttle);

  const inCart = new THREE.Vector3(base.x, 0.8 + l.reelHeight / 2, CART_Z);
  const outCart = new THREE.Vector3(base.x, 0.8 + l.reelHeight / 2, -CART_Z);
  const home = new THREE.Vector3(base.x + 0.8, 1.6, 0);
  const cur = home.clone();

  function reach(p: THREE.Vector3) {
    const dx = p.x - base.x;
    const dz = p.z - base.z;
    const dy = p.y - base.y;
    const r = Math.hypot(dx, dz);
    const dist = Math.max(0.2, Math.min(Math.hypot(r, dy), L1 + L2 - 1e-3));
    yaw.rotation.y = Math.atan2(-dz, dx);
    shoulder.rotation.z = Math.atan2(dy, r) + Math.acos(clamp1((L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)));
    elbow.rotation.z = Math.acos(clamp1((L1 * L1 + L2 * L2 - dist * dist) / (2 * L1 * L2))) - Math.PI;
  }
  reach(cur);

  const st = {
    root,
    stationX,
    platform,
    trayGeo,
    trayMat,
    inCart,
    outCart,
    home,
    held: null as THREE.Mesh | null,
    makeReel: () => new THREE.Mesh(reelGeo, reelMat),
    follow() {
      if (st.held) st.held.position.set(cur.x, cur.y - HOLD, cur.z);
    },
    moveTip(p: THREE.Vector3) {
      const from = cur.clone();
      return tween(Math.max(0.3, from.distanceTo(p) / ARM_SPEED), (k) => {
        cur.lerpVectors(from, p, k);
        reach(cur);
      });
    },
    goTo(x: number, y: number) {
      const x0 = shuttle.position.x;
      const y0 = platform.position.y;
      const dur = Math.max(0.3, Math.abs(x - x0) / SHUTTLE_SPEED, Math.abs(y - y0) / LIFT_SPEED);
      return tween(dur, (k) => {
        shuttle.position.x = x0 + (x - x0) * k;
        platform.position.y = y0 + (y - y0) * k;
      });
    },
  };
  return st;
}

function slideZ(obj: THREE.Object3D, z: number) {
  const z0 = obj.position.z;
  return tween(Math.max(0.3, Math.abs(z - z0) / SLIDE_SPEED), (k) => (obj.position.z = z0 + (z - z0) * k));
}

export async function runOrder(st: Station, wh: Warehouse, l: Layout, items: Map<string, Item>, o: Order) {
  const perTray = l.pocketRows * l.pocketCols;
  const slot = wh.slots[o.index];
  const tray = Math.floor(o.index / perTray);
  const tc = new THREE.Vector3(...trayCenter(l, slot));
  const platY = tc.y - 0.02;

  const carried = new THREE.Group();
  carried.add(new THREE.Mesh(st.trayGeo, st.trayMat));
  const local: THREE.Vector3[] = [];
  const reels: (THREE.Mesh | undefined)[] = [];
  for (let p = 0; p < perTray; p++) {
    const s = wh.slots[tray * perTray + p];
    local.push(new THREE.Vector3(s.position[0] - tc.x, s.position[1] - tc.y, s.position[2] - tc.z));
    if (items.has(s.address)) {
      const r = st.makeReel();
      r.position.copy(local[p]);
      carried.add(r);
      reels[p] = r;
    }
  }

  const hover = new THREE.Vector3(0, HOVER, 0);
  const at = (p: THREE.Vector3) => p.clone().add(new THREE.Vector3(0, HOLD, 0));
  const pick = async (p: THREE.Vector3, reel: THREE.Mesh) => {
    await st.moveTip(at(p).add(hover));
    await st.moveTip(at(p));
    st.root.attach(reel);
    st.held = reel;
    await st.moveTip(at(p).add(hover));
  };
  const put = async (p: THREE.Vector3) => {
    await st.moveTip(at(p).add(hover));
    await st.moveTip(at(p));
    const r = st.held!;
    st.held = null;
    await st.moveTip(at(p).add(hover));
    return r;
  };
  const pocketWorld = () => {
    st.root.updateMatrixWorld(true);
    return carried.localToWorld(local[slot.pocket].clone());
  };

  st.root.add(carried);
  carried.position.copy(tc);
  wh.setTrayVisible(tray, false);
  await st.goTo(tc.x, platY);
  await slideZ(carried, 0);
  st.platform.attach(carried);
  await st.goTo(st.stationX, WORK_PLAT_Y);

  let leaving: THREE.Mesh | undefined;
  if (o.type === "store") {
    const reel = st.makeReel();
    reel.position.copy(st.inCart);
    st.root.add(reel);
    await pick(st.inCart, reel);
    await put(pocketWorld());
    carried.attach(reel);
  } else {
    leaving = reels[slot.pocket]!;
    await pick(pocketWorld(), leaving);
    await put(st.outCart);
  }
  await st.moveTip(st.home);

  await st.goTo(tc.x, platY);
  st.root.attach(carried);
  await slideZ(carried, tc.z);
  wh.setOccupied(o.index, o.type === "store");
  wh.setTrayVisible(tray, true);
  st.root.remove(carried);
  if (leaving) st.root.remove(leaving);
  await st.goTo(st.stationX, WORK_PLAT_Y);
}
