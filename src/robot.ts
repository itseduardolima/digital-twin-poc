import * as THREE from "three";
import { JOINTS, classify, type GroupId, type JointId } from "./jointConfig";

export interface Robot {
  root: THREE.Group;
  /** Grupo de cada nó de malha (o wrapper direto sob GLTF_SceneRootNode). */
  groupOf: Map<THREE.Object3D, GroupId>;
  /** Define o ângulo da junta em graus, limitado pelos limites da config. */
  setAngle(id: JointId, deg: number): void;
}

/**
 * O modelo é plano: monta a cadeia A1→A6 em runtime e move cada malha para o
 * grupo da sua junta com attach(), que preserva a transformação no mundo.
 */
export function buildRobot(model: THREE.Object3D): Robot {
  model.updateMatrixWorld(true);

  const root = new THREE.Group();
  const joints = new Map<JointId, THREE.Object3D>();
  let parent: THREE.Object3D = root;
  let parentPivot = new THREE.Vector3();
  for (const def of JOINTS) {
    const node = new THREE.Object3D();
    node.name = def.id;
    const pivot = new THREE.Vector3(...def.pivot);
    node.position.copy(pivot).sub(parentPivot);
    parent.add(node);
    joints.set(def.id, node);
    parent = node;
    parentPivot = pivot;
  }

  const sceneRoot = model.getObjectByName("GLTF_SceneRootNode");
  if (!sceneRoot) throw new Error("GLTF_SceneRootNode não encontrado no modelo");

  const groupOf = new Map<THREE.Object3D, GroupId>();
  for (const part of [...sceneRoot.children]) {
    const center = new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3());
    const group = classify(part.name, center);
    (group === "base" ? root : joints.get(group)!).attach(part);
    groupOf.set(part, group);
  }

  const axes = new Map(JOINTS.map((d) => [d.id, new THREE.Vector3(...d.axis).normalize()]));
  const defs = new Map(JOINTS.map((d) => [d.id, d]));

  return {
    root,
    groupOf,
    setAngle(id, deg) {
      const d = defs.get(id)!;
      const clamped = THREE.MathUtils.clamp(deg, d.min, d.max);
      joints.get(id)!.quaternion.setFromAxisAngle(axes.get(id)!, THREE.MathUtils.degToRad(clamped * d.sign));
    },
  };
}
