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
  PLANET_SYSTEM_NAME,
} from '../functions/planet-common';
import { settings } from '../functions/settings';
import { createSunMesh } from '../functions/sun';

const lerpFrame = 60; // 1日を何フレームで補間するか
const isDebug = false;
const currentIndexLabelSuffix = '365日目';

const createCurrentIndexLabel = (index: number): HTMLDivElement => {
  const div = document.createElement('div');
  div.style.position = 'absolute';
  div.style.top = '10px';
  div.style.left = '10px';
  div.style.padding = '2px 8px';
  div.style.borderRadius = '4px';
  div.style.backgroundColor = 'white';
  div.style.color = 'black';
  div.innerText = `${index}/${currentIndexLabelSuffix}`;
  return div;
};

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  sunMesh!: THREE.Mesh;
  earthGroup!: THREE.Group;
  isAnimating = settings.isAnimating;
  lerpFactor = 0; // 補間の進捗（0.0 から 1.0 まで）
  currentIndex = 0; // 現在のインデックス（0から364まで）
  labelElement!: HTMLDivElement;

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
    console.log('# earthGroup:', this.earthGroup);
    this.currentIndex = this.userDataEarthPositionRes.todayRow - 1;
    this.scene.add(this.earthGroup);

    this.labelElement = createCurrentIndexLabel(this.currentIndex);
    document.body.appendChild(this.labelElement);

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
    this.camera.position.set(0, 20, 122);

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
      gui
        .add(settings, 'frameLabel')
        .name('1日のフレーム数')
        .disable()
        .setValue(`${lerpFrame}フレーム`);
      gui.add(settings, 'accelerationOrbit', 1, 10).name('公転スピード');
      gui.add(settings, 'acceleration', 1, 10).name('自転スピード');
      gui
        .add(settings, 'sunIntensity', 1, 10)
        .name('太陽光強度')
        .onChange((value) => {
          (this.sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
        });
      // アニメーションを再生/停止する
      gui
        .add(settings, 'isAnimating')
        .name('アニメーション再生')
        .onChange((value) => {
          this.isAnimating = value;
        });
      // Top View
      gui
        .add(
          {
            topView: () => {
              this.camera.position.set(0, 190, 0.01);
              this.controls.target.set(0, 0, 0);
              this.controls.update();
            },
          },
          'topView',
        )
        .name('トップビュー');
      // Side View
      gui
        .add(
          {
            sideView: () => {
              this.camera.position.set(190, 0, 0.01);
              this.controls.target.set(0, 0, 0);
              this.controls.update();
            },
          },
          'sideView',
        )
        .name('サイドビュー');
      // 視点をリセット
      gui.add({ resetView: () => this.controls.reset() }, 'resetView').name('視点リセット');
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
      const planetSystem = this.earthGroup.getObjectByName(PLANET_SYSTEM_NAME) as THREE.Group;
      const planet = this.earthGroup.getObjectByName(PLANET_NAME) as THREE.Mesh;
      const atmosphere = this.earthGroup.getObjectByName(PLANET_ATMO_SPHERE_NAME) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${PLANET_MOONS_NAME}_0`) as THREE.Mesh;

      // 地球の公転（反時計回り）
      // this.earthGroup.rotateY(0.001 * settings.accelerationOrbit);

      // APIから取得した現在位置に惑星を配置
      const earthPosition = this.userDataEarthPositionRes;
      const currentPosition = earthPosition.pathPoints[this.currentIndex];

      this.labelElement.innerText = `${this.currentIndex}/${currentIndexLabelSuffix}`;

      // 次の日（nextDayIndex）の座標を取得
      const nextDayIndex = this.currentIndex + 1;
      const nextPosition = earthPosition.pathPoints[nextDayIndex];

      // ref: https://gemini.google.com/app/a34a7df2f2983d4c
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);

      planetSystem.position.set(interpolatedPos.x, 0, interpolatedPos.y);

      // 小数点の誤差を防ぐため、toFixedで丸める
      this.lerpFactor = Number(
        ((this.lerpFactor + 1 / lerpFrame) * settings.accelerationOrbit).toFixed(3),
      );
      // 次の日に到達したらインデックスを更新し、進捗をリセット
      if (this.lerpFactor >= 1) {
        if (nextDayIndex < earthPosition.pathPoints.length - 1) {
          this.currentIndex = nextDayIndex;
        } else {
          this.currentIndex = 0;
        }
        this.lerpFactor = 0;
      }

      // 地球の自転（反時計回り）
      // planet.rotateY(0.005 * settings.acceleration);
      // atmosphere.rotateY(0.001 * settings.acceleration);

      // 地球は1日で360度するので1フレームあたりの回転量を計算
      const earthRotation = (360 / lerpFrame) * settings.acceleration;
      const earthAngle = (earthRotation * Math.PI) / 180;
      planet.rotateY(earthAngle);
      atmosphere.rotateY(earthAngle);

      // TODO: リファクタ。settings.tsに移せるものは移す。orbitSpeedも削除
      const time = performance.now();
      const tiltAngle = (5 * Math.PI) / 180;

      const periodDays = 27.322; // 月の公転周期は約27.3日 (27.322日 = 恒星月)
      // 公転周期をフレーム数に変換
      const periodFrames = periodDays * lerpFrame;
      // 1フレームあたりに進む公転の角度 (ラジアン) を計算
      const orbitSpeedFrame = ((2 * Math.PI) / periodFrames) * settings.accelerationOrbit;

      // 月の公転（反時計回り）
      const { orbitRadius, orbitSpeed } = earthMoon[0]; // orbitRadius: 10, orbitSpeed: 0.001
      // const moonX = orbitRadius * Math.cos(time * orbitSpeed);
      // const moonY = orbitRadius * Math.sin(time * orbitSpeed) * Math.sin(tiltAngle);
      // const moonZ = orbitRadius * Math.sin(time * orbitSpeed) * Math.cos(tiltAngle);
      const moonX = orbitRadius * Math.cos(time * orbitSpeedFrame);
      const moonY = orbitRadius * Math.sin(time * orbitSpeedFrame) * Math.sin(tiltAngle);
      const moonZ = orbitRadius * Math.sin(time * orbitSpeedFrame) * Math.cos(tiltAngle);
      moon.position.set(-moonX, moonY, moonZ);
      // 月の自転は公転と同じ角速度で回転させる（地球から常に同じ面が見える同期自転のため）
      const rotationSpeedFrame = orbitSpeedFrame;
      moon.rotateY(rotationSpeedFrame);

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
