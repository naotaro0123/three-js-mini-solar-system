import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createEarthMesh } from '../functions/earth';
import { initEnvironment, initGUI } from '../functions/environment';
import type { PlanetPositionRes } from '../functions/get-planet-position';
import { createCurrentIndexLabel, currentIndexLabelSuffix } from '../functions/label';
import { earthMoon, Names } from '../functions/planet-common';
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

    this.render();
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
      const planetSystem = this.earthGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
      const planet = this.earthGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      const atmosphere = this.earthGroup.getObjectByName(
        Names.PLANET_ATMO_SPHERE_NAME,
      ) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(`${Names.PLANET_MOONS_NAME}_0`) as THREE.Mesh;

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
