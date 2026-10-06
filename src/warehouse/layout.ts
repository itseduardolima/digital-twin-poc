export type Layout = {
  modules: number;
  columns: number;
  levels: number;
  pocketCols: number;
  pocketRows: number;
  pocketPitch: number;
  reelDiameter: number;
  reelHeight: number;
  trayThickness: number;
  levelPitch: number;
  baseHeight: number;
  aisle: number;
  columnGap: number;
  fill: number;
};

export const DEFAULT_LAYOUT: Layout = {
  modules: 5,
  columns: 3,
  levels: 30,
  pocketCols: 5,
  pocketRows: 2,
  pocketPitch: 0.2,
  reelDiameter: 0.18,
  reelHeight: 0.03,
  trayThickness: 0.01,
  levelPitch: 0.07,
  baseHeight: 0.3,
  aisle: 1.5,
  columnGap: 0.03,
  fill: 0.6,
};

export type Slot = {
  address: string;
  side: number;
  module: number;
  column: number;
  level: number;
  pocket: number;
  position: [number, number, number];
};

export function dims(l: Layout) {
  const trayWidth = l.pocketRows * l.pocketPitch;
  const trayLength = l.pocketCols * l.pocketPitch;
  const columnPitch = trayWidth + l.columnGap;
  const moduleWidth = l.columns * columnPitch;
  const depth = trayLength + 0.05;
  const height = l.baseHeight + l.levels * l.levelPitch + 0.1;
  return { trayWidth, trayLength, columnPitch, moduleWidth, depth, height, length: l.modules * moduleWidth };
}

export function buildSlots(l: Layout): Slot[] {
  const d = dims(l);
  const slots: Slot[] = [];
  for (let side = 0; side < 2; side++)
    for (let module = 0; module < l.modules; module++)
      for (let column = 0; column < l.columns; column++)
        for (let level = 0; level < l.levels; level++)
          for (let pocket = 0; pocket < l.pocketRows * l.pocketCols; pocket++) {
            const px = pocket % l.pocketRows;
            const pz = Math.floor(pocket / l.pocketRows);
            const x =
              -d.length / 2 + module * d.moduleWidth + (column + 0.5) * d.columnPitch +
              (px - (l.pocketRows - 1) / 2) * l.pocketPitch;
            const y = l.baseHeight + level * l.levelPitch + l.trayThickness + l.reelHeight / 2;
            const zc = (side === 0 ? -1 : 1) * (l.aisle / 2 + d.depth / 2);
            const z = zc + (pz - (l.pocketCols - 1) / 2) * l.pocketPitch;
            slots.push({
              address: `${side ? "B" : "A"}-${module + 1}-${column + 1}-${level + 1}-${pocket + 1}`,
              side, module, column, level, pocket,
              position: [x, y, z],
            });
          }
  return slots;
}

export function trayCenter(l: Layout, s: Slot): [number, number, number] {
  const px = s.pocket % l.pocketRows;
  const pz = Math.floor(s.pocket / l.pocketRows);
  return [
    s.position[0] - (px - (l.pocketRows - 1) / 2) * l.pocketPitch,
    s.position[1] - l.reelHeight / 2 - l.trayThickness / 2,
    s.position[2] - (pz - (l.pocketCols - 1) / 2) * l.pocketPitch,
  ];
}
