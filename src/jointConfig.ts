import * as THREE from "three";

export type JointId = "A1" | "A2" | "A3" | "A4" | "A5" | "A6";
export type GroupId = "base" | JointId;

export interface JointDef {
  id: JointId;
  /** Pivô no espaço do mundo, com o robô na pose de zero (todos os ângulos = 0). */
  pivot: [number, number, number];
  /** Eixo de rotação no mundo. */
  axis: [number, number, number];
  /** Sentido positivo: 1 ou -1 (multiplica o ângulo). */
  sign: 1 | -1;
  /** Limites em graus, relativos à pose de zero. PROVISÓRIOS: validar contra o datasheet. */
  min: number;
  max: number;
}

// Pose do arquivo = zero mecânico KUKA: braço vertical, antebraço para -X, plano do braço ≈ XY.
// Ordem = ordem da cadeia cinemática (A1 é pai de A2, etc.).
export const JOINTS: JointDef[] = [
  { id: "A1", pivot: [-0.465, 0.4, 0], axis: [0, 1, 0], sign: 1, min: -185, max: 185 },
  { id: "A2", pivot: [-0.86, 2.29, 0.06], axis: [0, 0, 1], sign: 1, min: -45, max: 125 },
  { id: "A3", pivot: [-0.8, 5.98, 0.06], axis: [0, 0, 1], sign: -1, min: -120, max: 100 },
  { id: "A4", pivot: [-3.6, 6.375, 0.06], axis: [-1, 0, 0], sign: 1, min: -350, max: 350 },
  { id: "A5", pivot: [-4.85, 6.375, 0.06], axis: [0, 0, 1], sign: 1, min: -119, max: 119 },
  { id: "A6", pivot: [-5.4, 6.39, 0.07], axis: [-1, 0, 0], sign: 1, min: -350, max: 350 },
];

/**
 * Exceções à regra geométrica. Chave = nome do nó já sanitizado pelo GLTFLoader
 * (pontos removidos: "Cylinder.019_30" vira "Cylinder019_30").
 * Ajustar aqui depois da revisão visual no modo debug.
 */
export const OVERRIDES: Record<string, GroupId> = {
  Cylinder_2: "base",
  Cylinder019_30: "base",
  // ombro, lado do braço (gira com A2)
  Cylinder002_4: "A2",
  Cube004_26: "A2",
  Cube005_27: "A2",
  Cylinder004_28: "A2",
  // cotovelo, gira com o antebraço (A3)
  Cube_22: "A3",
  Cube001_23: "A3",
};

/**
 * Regra inicial por posição do centro da bounding box (mundo, pose de zero).
 * O modelo é plano, então isso é uma proposta a ser revisada visualmente.
 */
export function classify(name: string, c: THREE.Vector3): GroupId {
  const o = OVERRIDES[name];
  if (o) return o;
  // Anéis de parafusos ("Cylinder0NN_*") centrados nos pivôs: seguem a junta que os hospeda.
  const ring = /^Cylinder(\d+)_/.exec(name);
  if (ring) {
    const n = Number(ring[1]);
    if (n >= 60 && n <= 91) return "A2"; // ombro
    if (n >= 92 && n <= 127) return "A3"; // cotovelo
  }
  if (c.y < 3.2 && c.x > -1.3) return "A1"; // coluna, motores e caixa no carrossel
  if (c.x > -1.3) return "A2"; // braço (link 2), cabos, motor do cotovelo
  if (c.x > -3.7) return "A3"; // antebraço e flange do punho
  if (c.x > -4.6) return "A4"; // carcaça de rolagem do punho
  if (c.x > -5.26) return "A5"; // cabeça do punho
  return "A6"; // flange
}
