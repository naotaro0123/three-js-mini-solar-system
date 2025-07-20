import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class DrawScene {
  width = window.innerWidth;
  height = window.innerHeight;
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;

  constructor() {
    this.renderer.setSize(this.width, this.height);
    // this.renderer.setClearColor(0x00000, 1.0);
    this.renderer.setClearColor(0xf3f3f3, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 5, 8);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);

    const grid = new THREE.GridHelper(10, 5);
    this.scene.add(grid);

    this.render();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    console.log('#');

    this.renderer.setAnimationLoop(() => this.render());
  }
}
