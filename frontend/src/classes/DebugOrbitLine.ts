import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RequestQueryBody } from '../../../common';
import { getPlanetPositions } from '../functions/get-planet-position';
import { handleResize } from '../functions/resize';

export class DebugOrbitLine {
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
    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 10000);
    this.camera.position.set(0, 100, 160);

    handleResize(this.camera, this.renderer);
    window.addEventListener('resize', () => handleResize(this.camera, this.renderer));

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

    const planetList: {
      commandKey: RequestQueryBody['COMMAND'];
      color: number;
    }[] = [
      { commandKey: 'EARTH', color: 0x0000ff },
      { commandKey: 'MERCURY', color: 0x0099ff },
      { commandKey: 'VENUS', color: 0xffd700 },
      { commandKey: 'MARS', color: 0xff0000 },
      { commandKey: 'JUPITER', color: 0xffa500 },
    ];

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    (async () => {
      for (const planet of planetList) {
        const color = new THREE.Color().setHex(planet.color);
        this.drawOrbitLine(planet.commandKey, color);
        // 3つ以上同時にAPIを叩くと503エラーになるので少し待機する
        await sleep(100);
      }
      this.render();
    })();
  }

  async drawOrbitLine(commandKey: RequestQueryBody['COMMAND'], color: THREE.Color) {
    const planetPositionsRes = await getPlanetPositions(commandKey);
    console.log('planetPositionsRes', commandKey, planetPositionsRes);
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(planetPositionsRes.pathPoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.LineLoop(lineGeometry, lineMaterial);
    line.name = commandKey;
    this.scene.add(line);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    requestAnimationFrame(() => this.render());
  }
}
