import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const MODEL_URL = "/models/scene.gltf";

const container = document.getElementById("app")!;
const status = document.getElementById("status")!;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1b1f24);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Iluminação: céu/chão difuso + luz direcional com sombra
scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3f45, 1.0));
const sun = new THREE.DirectionalLight(0xffffff, 2.0);
sun.position.set(8, 14, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 50 });
scene.add(sun);

const grid = new THREE.GridHelper(40, 40, 0x555c64, 0x33383e);
scene.add(grid);

const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.35 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function frameObject(obj: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const dist = (Math.max(size.x, size.y, size.z) / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.6;
  camera.position.copy(center).add(new THREE.Vector3(0.6, 0.35, 1).normalize().multiplyScalar(dist));
  controls.target.copy(center);
  controls.update();
  grid.position.y = floor.position.y = box.min.y;
}

new GLTFLoader().load(
  MODEL_URL,
  (gltf) => {
    const robot = gltf.scene;
    robot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    scene.add(robot);
    frameObject(robot);
    status.textContent = "Modelo carregado";
  },
  (e) => {
    if (e.total) status.textContent = `Carregando modelo... ${Math.round((e.loaded / e.total) * 100)}%`;
  },
  (err) => {
    console.error(err);
    status.textContent = "Erro ao carregar o modelo (veja o console)";
  },
);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
