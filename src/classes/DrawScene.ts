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
import type { PlanetPositionRes } from '../functions/get-planet-position';
import { createCurrentIndexLabel, currentIndexLabelSuffix } from '../functions/label';
import {
  earthMoon,
  PLANET_ATMO_SPHERE_NAME,
  PLANET_MOONS_NAME,
  PLANET_NAME,
  PLANET_SYSTEM_NAME,
} from '../functions/planet-common';
import { handleResize } from '../functions/resize';
import { settings } from '../functions/settings';
import { createSunMesh } from '../functions/sun';
import { degToRad } from '../functions/utils';

const isDebug = false;

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  sunMesh!: THREE.Mesh;
  earthGroup!: THREE.Group;
  lerpFactor = 0; // 補間の進捗（0.0 から 1.0 まで）
  currentIndex = 0; // 現在のインデックス（0から364まで）
  labelElement!: HTMLDivElement;
  clock = new THREE.Clock();
  frameCount = 0;

  constructor() {
    this.initEnvironment();
    this.initPlanets();
  }

  get userDataEarthPositionRes(): PlanetPositionRes {
    return this.earthGroup.userData.earthPositionRes as PlanetPositionRes;
  }
  get width(): number {
    return window.innerWidth;
  }
  get height(): number {
    return window.innerHeight;
  }

  async initPlanets(): Promise<void> {
    // 太陽のメッシュを作成
    this.sunMesh = createSunMesh();
    this.scene.add(this.sunMesh);
    // 地球と月のメッシュを作成
    this.earthGroup = await createEarthMesh(this.sunMesh.position, isDebug);
    this.currentIndex = this.userDataEarthPositionRes.todayRow - 1;
    this.scene.add(this.earthGroup);

    this.labelElement = createCurrentIndexLabel(this.currentIndex);
    document.body.appendChild(this.labelElement);

    this.render();
  }

  initEnvironment(): void {
    this.renderer.setSize(this.width, this.height);
    this.renderer.setClearColor(0x00000, 1.0);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(50, this.width / this.height, 1, 1000);
    this.camera.position.set(0, 20, 122);

    handleResize(this.camera, this.renderer);
    window.addEventListener('resize', () => handleResize(this.camera, this.renderer));

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.initComposer();
    this.initGUI();
    this.initLighting();
  }

  initLighting(): void {
    const lightAmbient = new THREE.AmbientLight(0x222222, 6);
    this.scene.add(lightAmbient);
  }

  initComposer(): void {
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
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(this.width, this.height), 1, 0.4, 0.85);
    bloomPass.threshold = 1;
    bloomPass.radius = 0.9;
    this.composer.addPass(bloomPass);
  }

  initGUI(): void {
    const gui = new GUI();
    gui.domElement.style.top = '6px';
    gui.domElement.style.right = '6px';
    gui.add(settings, 'lerpFrame', 30, 600, settings.lerpFrame).name('1日のフレーム数').step(30);
    gui.add(settings, 'accelerationOrbit', 0, 10).name('公転スピード');
    gui.add(settings, 'accelerationRotation', 0, 10).name('自転スピード');
    gui
      .add(settings, 'sunIntensity', 0, 10)
      .name('太陽光強度')
      .onChange((value) => {
        (this.sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
      });
    // アニメーションを再生/停止する
    gui
      .add(settings, 'isAnimating')
      .name('アニメーション再生')
      .onChange((value) => {
        settings.isAnimating = value;
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
    gui.add({ resetView: () => this.controls.reset() }, 'resetView').name('視点リセット');
    gui
      .add(
        {
          resetValues: () => {
            this.currentIndex = this.userDataEarthPositionRes.todayRow - 1;
            this.lerpFactor = 0;
            this.frameCount = 0;
            // 惑星の位置を最新化してからリセット
            setTimeout(() => gui.reset(), 100);
          },
        },
        'resetValues',
      )
      .name('GUI値リセット');
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
    this.composer.render();

    this.renderer.setAnimationLoop(() => this.render());
    if (settings.isAnimating) {
      this.animate();
    }
  }

  animate(): void {
    this.frameCount++;
    this.sunMesh.rotateY(0.001 * settings.accelerationRotation);

    this.labelElement.innerText = `${this.currentIndex}/${currentIndexLabelSuffix}`;

    {
      // planet3dがearth。コードコピーする時間違えないように
      const planetSystem = this.earthGroup.getObjectByName(PLANET_SYSTEM_NAME) as THREE.Group;
      const planet = this.earthGroup.getObjectByName(PLANET_NAME) as THREE.Mesh;
      const atmosphere = this.earthGroup.getObjectByName(PLANET_ATMO_SPHERE_NAME) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${PLANET_MOONS_NAME}_0`) as THREE.Mesh;

      /* 地球の自転（反時計回り） */
      {
        // APIから取得した現在位置に惑星を配置
        const earthPosition = this.userDataEarthPositionRes;
        const currentPosition = earthPosition.pathPoints[this.currentIndex];

        // 次の日（nextDayIndex）の座標を取得
        const nextDayIndex = this.currentIndex + 1;
        const nextPosition = earthPosition.pathPoints[nextDayIndex];

        const interpolatedPos = new THREE.Vector3()
          .fromArray(currentPosition.toArray())
          .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);

        /* 地球の公転（反時計回り）*/
        planetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

        // 小数点の誤差を防ぐため、toFixedで丸める
        this.lerpFactor = Number(
          ((this.lerpFactor + 1 / settings.lerpFrame) * settings.accelerationOrbit).toFixed(3),
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

        // 地球は1日で360度するので1フレームあたりの回転量を計算
        const earthRotation = (360 / settings.lerpFrame) * settings.accelerationRotation;
        const earthAngle = degToRad(earthRotation);
        planet.rotateY(earthAngle);
        atmosphere.rotateY(earthAngle / 5); // 大気はゆっくり回転させる
      }

      /* 月の公転と自転 */
      {
        // TODO: リファクタ。settings.tsに移せるものは移す。orbitSpeedも削除
        const tiltAngle = degToRad(5);
        const periodDays = 27.322; // 月の公転周期は約27.3日 (27.322日 = 恒星月)
        // 公転周期をフレーム数に変換
        const periodFrames = periodDays * settings.lerpFrame;
        // 月は27.3日で360度公転するので1フレームあたりの回転量を計算
        const orbitSpeedFrame = degToRad((360 / periodFrames) * settings.accelerationOrbit);
        const currentAngle = this.frameCount * orbitSpeedFrame;
        // 月の公転（反時計回り）
        const { orbitRadius } = earthMoon[0]; // orbitRadius: 10
        const moonX = orbitRadius * Math.cos(currentAngle);
        const moonY = orbitRadius * Math.sin(currentAngle) * Math.sin(tiltAngle);
        const moonZ = orbitRadius * Math.sin(currentAngle) * Math.cos(tiltAngle);
        moon.position.set(-moonX, moonY, moonZ);
        // 月の自転は公転と同じ角速度で回転させる（地球から常に同じ面が見える同期自転のため）
        const rotationSpeedFrame = orbitSpeedFrame;
        moon.rotateY(rotationSpeedFrame);
      }

      if (isDebug) {
        // ワールドマトリックスを更新
        this.earthGroup.updateWorldMatrix(true, false);
        // earthのワールド座標を取得
        const earthWorldPosition = new THREE.Vector3();
        planet.getWorldPosition(earthWorldPosition);
        // MEMO: earthGroupはposition(0, 0, 0)でplanetはxが90ずれてる。earthGroupを回転させることで公転させてる
        // xは90 〜 -90, yは0, zは-90 〜 90で奥行きが変わる
        console.log('# earth position:', earthWorldPosition);
      }
    }
  }
}
