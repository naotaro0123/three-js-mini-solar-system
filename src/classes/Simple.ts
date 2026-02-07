import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { RequestQueryBody } from '../functions/common';
import { getPlanetPosition } from '../functions/get-planet-position';

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

    const planetList: {
      commandKey: RequestQueryBody['COMMAND'];
      color: number;
      position: number;
    }[] = [
      { commandKey: 'EARTH', color: 0x0000ff, position: 90 },
      // { commandKey: 'MERCURY', color: 0x0099ff },
      // { commandKey: 'VENUS', color: 0xffd700 },
      { commandKey: 'MARS', color: 0xff0000, position: 115 },
    ];

    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));
    (async () => {
      for (const planet of planetList) {
        const color = new THREE.Color().setHex(planet.color);
        // TODO: 各惑星の軌道が近い。直径の指定などあったっけ？
        this.drawOrbitLine(planet.commandKey, planet.position, color);
        // 3つ以上同時にAPIを叩くと503エラーになるので少し待機する
        await sleep(100);
      }
      this.render();
    })();
  }

  async drawOrbitLine(
    commandKey: RequestQueryBody['COMMAND'],
    position: number,
    color: THREE.Color,
  ) {
    const planetPositionRes = await getPlanetPosition(commandKey);
    const orbitPath = new THREE.EllipseCurve(
      0,
      0, // ax, aY
      position,
      position, // xRadius, yRadius
      0,
      2 * Math.PI, // aStartAngle, aEndAngle
      false, // aClockwise
      0, // aRotation
    );
    const _pathPoints = orbitPath.getPoints(100);
    console.log('planetPositionRes.pathPoints:', planetPositionRes.pathPoints);
    console.log('_pathPoints', _pathPoints);

    // TODO: APIから取得したpathPointsだと直径が近すぎる
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(planetPositionRes.pathPoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color });
    const line = new THREE.LineLoop(lineGeometry, lineMaterial);
    line.rotation.x = Math.PI / 2;
    line.name = commandKey;
    this.scene.add(line);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();

    requestAnimationFrame(() => this.render());
  }
}
