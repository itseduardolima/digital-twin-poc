/** Contrato MQTT entre o simulador de CLP e o gêmeo digital. */
export const DEFAULT_TOPIC = "conecthus/logix/cell1/kr120/joints";

export const JOINT_KEYS = ["a1", "a2", "a3", "a4", "a5", "a6"] as const;

/** Ângulos em graus, relativos à pose de zero do modelo (zero mecânico KUKA). ts em ms epoch. */
export type JointsPayload = Record<(typeof JOINT_KEYS)[number], number> & { ts: number };
