import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { createEarthMesh } from '../functions/earth';
import type { EarthPositionRes } from '../functions/get-planet-position';
import {
  earthMoon,
  PLANET_ATMO_SPHERE_NAME,
  PLANET_MOONS_NAME,
  PLANET_NAME,
} from '../functions/planet-common';
import { settings } from '../functions/settings';
import { createSunMesh } from '../functions/sun';

const isDebug = false;
const lerpSteps = 10; // 1日を10フレームで移動させる

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  sunMesh!: THREE.Mesh;
  earthGroup!: THREE.Group;
  isAnimating = settings.isAnimating;
  timerOrbit = 0; // 公転のタイマー
  lerpFactor = 0; // 補間の進捗（0.0 から 1.0 まで）
  currentIndex = 0; // 現在のインデックス（0から364まで）

  constructor() {
    this.initEnvironment();
    this.initPlanets();
  }

  get userDataEarthPositionRes(): EarthPositionRes {
    return this.earthGroup.userData.earthPositionRes as EarthPositionRes;
  }

  async initPlanets(): Promise<void> {
    // 太陽のメッシュを作成
    this.sunMesh = createSunMesh();
    this.scene.add(this.sunMesh);
    // 地球と月のメッシュを作成
    this.earthGroup = await createEarthMesh(this.sunMesh.position, isDebug);
    this.currentIndex = this.userDataEarthPositionRes.todayRow - 1;
    this.scene.add(this.earthGroup);

    window.addEventListener('resize', this.resizeCanvas);
    this.render();
  }

  get width(): number {
    return window.innerWidth;
  }

  get height(): number {
    return window.innerHeight;
  }

  initEnvironment(): void {
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x00000, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 5, 50);

    {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      // outline Pass
      const outLinePass = new OutlinePass(
        new THREE.Vector2(this.width, this.height),
        this.scene,
        this.camera,
      );
      outLinePass.edgeStrength = 3;
      outLinePass.edgeGlow = 1;
      outLinePass.visibleEdgeColor.set(0xffffff);
      outLinePass.hiddenEdgeColor.set(0x190a05);
      this.composer.addPass(outLinePass);
      // Bloom Pass
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(this.width, this.height),
        1,
        0.4,
        0.85,
      );
      bloomPass.threshold = 1;
      bloomPass.radius = 0.9;
      this.composer.addPass(bloomPass);
    }

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    {
      const gui = new GUI();
      gui.domElement.style.top = '6px';
      gui.domElement.style.right = '6px';
      gui.add(settings, 'accelerationOrbit', 0, 10);
      gui.add(settings, 'acceleration', 0, 10);
      gui.add(settings, 'sunIntensity', 1, 10).onChange((value) => {
        (this.sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
      });
      // アニメーションを再生/定時する
      gui
        .add(settings, 'isAnimating')
        .name('アニメーション再生')
        .onChange((value) => {
          this.isAnimating = value;
        });
    }

    const lightAmbient = new THREE.AmbientLight(0x222222, 6);
    this.scene.add(lightAmbient);
  }

  resizeCanvas = () => {
    this.renderer.setSize(this.width, this.height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(window.devicePixelRatio);
  };

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    this.composer.render();

    this.renderer.setAnimationLoop(() => this.render());
    if (this.isAnimating) {
      this.animate();
    }
  }

  animate(): void {
    this.sunMesh.rotateY(0.001 * settings.acceleration);

    {
      // planet3dがearth。コードコピーする時間違えないように
      const planet = this.earthGroup.getObjectByName(PLANET_NAME) as THREE.Mesh;
      const atmosphere = this.earthGroup.getObjectByName(PLANET_ATMO_SPHERE_NAME) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${PLANET_MOONS_NAME}_0`) as THREE.Mesh;

      // 地球の公転
      // this.earthGroup.rotateY(0.001 * settings.accelerationOrbit);

      // APIから取得した現在位置に惑星を配置
      const earthPosition = this.userDataEarthPositionRes;
      const currentPosition = earthPosition.pathPoints[this.currentIndex];
      // 次の日（nextDayIndex）の座標を取得
      const nextDayIndex = this.currentIndex + 1;
      const nextPosition = earthPosition.pathPoints[nextDayIndex];

      // TODO: https://gemini.google.com/app/a34a7df2f2983d4c
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);
      planet.position.set(interpolatedPos.x, 0, interpolatedPos.y);

      // 小数点の誤差を防ぐため、toFixedで丸める
      this.lerpFactor = Number((this.lerpFactor + 1 / lerpSteps).toFixed(1));
      // 次の日に到達したらインデックスを更新し、進捗をリセット
      if (this.lerpFactor >= 1) {
        this.currentIndex = nextDayIndex;
        this.lerpFactor = 0;
      }

      this.timerOrbit += (1 / lerpSteps) * settings.accelerationOrbit; // 加速分

      // 地球の自転
      // planet.rotateY(0.005 * settings.acceleration);
      // atmosphere.rotateY(0.001 * settings.acceleration);
      planet.rotateY((1 / lerpSteps) * settings.acceleration);
      atmosphere.rotateY((1 / lerpSteps) * settings.acceleration);

      const time = performance.now();
      const tiltAngle = (5 * Math.PI) / 180;

      const { orbitRadius, orbitSpeed } = earthMoon[0];
      const moonX = orbitRadius * Math.cos(time * orbitSpeed);
      const moonY = orbitRadius * Math.sin(time * orbitSpeed) * Math.sin(tiltAngle);
      const moonZ = orbitRadius * Math.sin(time * orbitSpeed) * Math.cos(tiltAngle);

      moon.position.set(moonX, moonY, moonZ);
      moon.rotateY(0.01);

      // ワールドマトリックスを更新
      this.earthGroup.updateWorldMatrix(true, false);
      // earthのワールド座標を取得
      const earthWorldPosition = new THREE.Vector3();
      planet.getWorldPosition(earthWorldPosition);
      // MEMO: earthGroupはposition(0, 0, 0)でplanetはxが90ずれてる。earthGroupを回転させることで公転させてる
      // xは90 〜 -90, yは0, zは-90 〜 90で奥行きが変わる
      // console.log('# earth position:', earthWorldPosition);
    }
  }
}
