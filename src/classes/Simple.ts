import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getCurrentPosition } from '../functions/current-position';

// 新しい座標範囲を設定
const newRangeX = 90;
const newRangeY = 0; // Y座標は0に固定
const newRangeZ = 90;

export class Simple {
  private width: number;
  private height: number;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  constructor() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0xf3f3f3, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 100, 160);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enablePan = true;
    this.controls.enableZoom = true;
    this.controls.keyPanSpeed = 0.0;
    this.controls.maxDistance = 5000.0;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.autoRotateSpeed = 1.0;
    const light = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(light);

    const grid = new THREE.GridHelper(100, 50);
    this.scene.add(grid);

    this.init();
  }

  async init() {
    const { pathPoints } = await getCurrentPosition();
    const dataList = pathPoints.map((p) => ({ x: p.x, y: 0, z: p.y }));
    // 最大絶対値を計算
    const maxAbsX = Math.max(...dataList.map((p) => Math.abs(p.x)));
    const maxAbsY = Math.max(...dataList.map((p) => Math.abs(p.y)));
    const maxAbsZ = Math.max(...dataList.map((p) => Math.abs(p.z)));
    console.log('maxAbsX, maxAbsY, maxAbsZ:', maxAbsX, maxAbsY, maxAbsZ);

    {
      const lineGeometry = new THREE.BufferGeometry();
      const transformedData = dataList.map((point) => {
        return {
          // X軸は-90から90の範囲に変換
          x: (point.x / maxAbsX) * newRangeX,
          // Y軸は0に固定
          y: newRangeY,
          // y: (point.y / maxAbsY) * newRangeY,
          // Z軸は-90から90の範囲に変換
          // Three.jsはY軸が上方向なので、Z軸とY軸を入れ替える
          // z: (point.z / maxAbsZ) * newRangeZ,
          z: (point.y / maxAbsY) * newRangeZ,
        };
      });
      const positions = new Float32Array([
        ...transformedData.flatMap((d) => [d.x, d.y, d.z]),
        transformedData[0].x,
        transformedData[0].y,
        transformedData[0].z,
      ]);
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);
    }

    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    requestAnimationFrame(() => this.render());
  }
}
