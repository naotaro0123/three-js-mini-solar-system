import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const SUN_GLTF_PATH = '/gltf/sun/scene.gltf';

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;

  constructor() {
    this.renderer.setSize(this.width, this.height);
    // this.renderer.setClearColor(0x00000, 1.0);
    this.renderer.setClearColor(0xf3f3f3, 1.0);

    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.resizeCanvas);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 5, 8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);

    const grid = new THREE.GridHelper(10, 5);
    this.scene.add(grid);

    this.loadGltf(SUN_GLTF_PATH).then(() => {
      this.render();
    });
  }

  get width(): number {
    return window.innerWidth;
  }

  get height(): number {
    return window.innerHeight;
  }

  resizeCanvas = () => {
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
  };

  async loadGltf(gltfPath: string): Promise<void> {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(gltfPath);
    this.scene.add(gltf.scene);
    console.log('#', this.scene);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    this.renderer.setAnimationLoop(() => this.render());
  }
}
