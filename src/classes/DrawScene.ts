import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createEarthMesh as createEarthGroup } from '../functions/earth';
import { initEnvironment, initGUI } from '../functions/environment';
import { type PlanetPositionRes } from '../functions/get-planet-position';
import { createCurrentIndexLabel, currentIndexLabelSuffix } from '../functions/label';
import { createMarsGroup } from '../functions/mars';
import { createMercuryGroup } from '../functions/mercury';
import { earthMoon, Names } from '../functions/planet-common';
import { settings } from '../functions/settings';
import { createSunMesh } from '../functions/sun';
import { degToRad } from '../functions/utils';
import { createVenusGroup } from '../functions/venus';

const isDebug = false;

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  sunMesh!: THREE.Mesh; // 太陽のメッシュ
  earthGroup!: THREE.Group; // 地球と月のグループ
  mercuryGroup!: THREE.Group; // 水星のグループ
  venusGroup!: THREE.Group; // 金星のグループ
  marsGroup!: THREE.Group; // 火星のグループ
  lerpFactor = 0; // 補間の進捗（0.0 から 1.0 まで）
  currentIndex = 0; // 現在のインデックス（0から364まで）
  labelElement!: HTMLDivElement;
  clock = new THREE.Clock();
  frameCount = 0;

  constructor() {
    const { camera, controls, composer } = initEnvironment(
      this.renderer,
      this.scene,
      this.width,
      this.height,
    );
    this.camera = camera;
    this.controls = controls;
    this.composer = composer;
    this.initPlanets();
    this.render();
  }

  get userDataEarthPositionRes(): PlanetPositionRes {
    return this.earthGroup.userData.planetPositionRes as PlanetPositionRes;
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
    this.earthGroup = await createEarthGroup(this.sunMesh.position, isDebug);
    this.currentIndex = this.userDataEarthPositionRes.todayRow - 1;
    this.scene.add(this.earthGroup);
    // 水星のメッシュを作成
    this.mercuryGroup = await createMercuryGroup();
    this.scene.add(this.mercuryGroup);
    // 金星のメッシュを作成
    this.venusGroup = await createVenusGroup();
    this.scene.add(this.venusGroup);
    // 火星のメッシュを作成
    this.marsGroup = await createMarsGroup();
    this.scene.add(this.marsGroup);

    // 現在のインデックスを表示するラベルを作成
    this.labelElement = createCurrentIndexLabel(this.currentIndex);
    document.body.appendChild(this.labelElement);

    initGUI({
      sunMesh: this.sunMesh,
      camera: this.camera,
      controls: this.controls,
      getCurrentIndex: () => this.currentIndex,
      setCurrentIndex: (value: number) => {
        this.currentIndex = value;
      },
      setLerpFactor: (value: number) => {
        this.lerpFactor = value;
      },
      setFrameCount: (value: number) => {
        this.frameCount = value;
      },
      userDataEarthPositionRes: this.userDataEarthPositionRes,
    });
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
      const earthPlanetSystem = this.earthGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;
      const earthPlanet = this.earthGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      const earthAtmosphere = this.earthGroup.getObjectByName(
        Names.PLANET_ATMO_SPHERE_NAME,
      ) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${Names.PLANET_MOONS_NAME}_0`) as THREE.Mesh;

      /* 地球の公転と自転（反時計回り） */
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
        earthPlanetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

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
        earthPlanet.rotateY(earthAngle);
        // 大気は少し早めに回転させる
        earthAtmosphere.rotateY(earthAngle + 0.00002);
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

      /* 水星の公転と自転（反時計回り） */
      {
        const mercuryPlanetSystem = this.mercuryGroup.getObjectByName(
          Names.PLANET_SYSTEM_NAME,
        ) as THREE.Group;

        // APIから取得した現在位置に惑星を配置
        const mercuryPosition = this.mercuryGroup.userData.planetPositionRes as PlanetPositionRes;
        const mercuryCurrentIndex =
          this.currentIndex < mercuryPosition.pathPoints.length - 1
            ? this.currentIndex
            : this.currentIndex % (mercuryPosition.pathPoints.length - 1);
        const currentPosition = mercuryPosition.pathPoints[mercuryCurrentIndex];

        // 次の日（nextDayIndex）の座標を取得
        const nextDayIndex = mercuryCurrentIndex + 1;
        const nextPosition = mercuryPosition.pathPoints[nextDayIndex];
        const interpolatedPos = new THREE.Vector3()
          .fromArray(currentPosition.toArray())
          .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);
        /* 水星の公転（反時計回り）*/
        mercuryPlanetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

        const mercuryPlanet = this.mercuryGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
        // 水星は88日で360度するので1フレームあたりの回転量を計算
        const mercuryRotation = (360 / (settings.lerpFrame * 88)) * settings.accelerationRotation;
        const mercuryAngle = degToRad(mercuryRotation);
        mercuryPlanet.rotateY(mercuryAngle);
      }

      /* 金星の公転と自転（反時計回り） */
      {
        const venusPlanetSystem = this.venusGroup.getObjectByName(
          Names.PLANET_SYSTEM_NAME,
        ) as THREE.Group;
        const venusPlanet = this.venusGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
        const venusAtmosphere = this.venusGroup.getObjectByName(
          Names.PLANET_ATMO_SPHERE_NAME,
        ) as THREE.Mesh;

        // APIから取得した現在位置に惑星を配置
        const venusPosition = this.venusGroup.userData.planetPositionRes as PlanetPositionRes;
        const venusCurrentIndex =
          this.currentIndex < venusPosition.pathPoints.length - 1
            ? this.currentIndex
            : this.currentIndex % (venusPosition.pathPoints.length - 1);
        const currentPosition = venusPosition.pathPoints[venusCurrentIndex];

        // 次の日（nextDayIndex）の座標を取得
        const nextDayIndex = venusCurrentIndex + 1;
        const nextPosition = venusPosition.pathPoints[nextDayIndex];
        const interpolatedPos = new THREE.Vector3()
          .fromArray(currentPosition.toArray())
          .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);
        /* 金星の公転（反時計回り）*/
        venusPlanetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

        // 金星は243日で360度するので1フレームあたりの回転量を計算
        const venusRotation = (360 / (settings.lerpFrame * 243)) * settings.accelerationRotation;
        const venusAngle = degToRad(venusRotation);
        venusPlanet.rotateY(venusAngle);
        // 大気はスーパーローテーションさせる（自転速度の約60倍で回転させる）
        venusAtmosphere.rotateY(venusAngle * 60);
      }
    }

    /* 火星の公転と自転（反時計回り） */
    {
      const marsPlanetSystem = this.marsGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;

      // APIから取得した現在位置に惑星を配置
      const marsPosition = this.marsGroup.userData.planetPositionRes as PlanetPositionRes;
      const marsCurrentIndex =
        this.currentIndex < marsPosition.pathPoints.length - 1
          ? this.currentIndex
          : this.currentIndex % (marsPosition.pathPoints.length - 1);
      const currentPosition = marsPosition.pathPoints[marsCurrentIndex];

      // 次の日（nextDayIndex）の座標を取得
      const nextDayIndex = marsCurrentIndex + 1;
      const nextPosition = marsPosition.pathPoints[nextDayIndex];
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), this.lerpFactor);
      /* 火星の公転（反時計回り）*/
      marsPlanetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

      const marsPlanet = this.marsGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      // 火星は687日で360度するので1フレームあたりの回転量を計算
      const marsRotation = (360 / (settings.lerpFrame * 687)) * settings.accelerationRotation;
      const marsAngle = degToRad(marsRotation);
      marsPlanet.rotateY(marsAngle);
    }
  }
}
