import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  createEarthMesh as createEarthGroup,
  EARTH_MOON_MESH_NAMES,
  earthMoons,
} from '../functions/earth';
import { initEnvironment, initGUI } from '../functions/environment';
import { getRotationPeriod, type PlanetPositionsRes } from '../functions/get-planet-position';
import { createJupiterGroup, JUPITER_MOON_MESH_NAMES, jupiterMoons } from '../functions/jupiter';
import { createCurrentIndexLabel, formatCurrentIndexDate } from '../functions/label';
import { createMarsGroup, MARS_MOON_MESH_NAMES, marsMoons } from '../functions/mars';
import { createMercuryGroup } from '../functions/mercury';
import { Names } from '../functions/planet-common';
import {
  createPlanetInteractionController,
  type PlanetInteractionController,
} from '../functions/rimLight';
import { createSaturnGroup, SATURN_MOON_MESH_NAMES, saturnMoons } from '../functions/saturn';
import { getStepDays, SATURN_TILT, settings, URANUS_TILT } from '../functions/settings';
import { createSunMesh } from '../functions/sun';
import { createUranusGroup, URANUS_MOON_MESH_NAMES, uranusMoons } from '../functions/uranus';
import { degToRad } from '../functions/utils';
import { createVenusGroup } from '../functions/venus';

const isDebug = true;

export class DrawScene {
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  zoomablePlanets: THREE.Mesh[] = [];
  planetInteractionController!: PlanetInteractionController;
  sunMesh!: THREE.Mesh; // 太陽のメッシュ
  earthGroup!: THREE.Group; // 地球と月のグループ
  mercuryGroup!: THREE.Group; // 水星のグループ
  venusGroup!: THREE.Group; // 金星のグループ
  marsGroup!: THREE.Group; // 火星のグループ
  jupiterGroup!: THREE.Group; // 木星のグループ
  saturnGroup!: THREE.Group; // 土星のグループ
  uranusGroup!: THREE.Group; // 天王星のグループ
  lerpFactor = 0; // 補間の進捗（0.0 から 1.0 まで）
  currentIndex = 0; // 現在のインデックス（0から364まで）
  labelElement!: HTMLDivElement;
  timer = new THREE.Timer();
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

  get userDataEarthPositionRes(): PlanetPositionsRes {
    return this.earthGroup.userData.planetPositionsRes as PlanetPositionsRes;
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
    this.mercuryGroup = await createMercuryGroup(isDebug);
    this.scene.add(this.mercuryGroup);
    // 金星のメッシュを作成
    this.venusGroup = await createVenusGroup(isDebug);
    this.scene.add(this.venusGroup);
    // 火星のメッシュを作成
    this.marsGroup = await createMarsGroup(isDebug);
    this.scene.add(this.marsGroup);
    // 木星のメッシュを作成
    this.jupiterGroup = await createJupiterGroup(isDebug);
    this.scene.add(this.jupiterGroup);
    // 土星のメッシュを作成
    this.saturnGroup = await createSaturnGroup(isDebug);
    this.scene.add(this.saturnGroup);
    // 天王星のメッシュを作成
    this.uranusGroup = await createUranusGroup(isDebug);
    this.scene.add(this.uranusGroup);

    this.initDoubleClickZoom();

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

  initDoubleClickZoom(): void {
    const earthPlanet = this.earthGroup.getObjectByName(Names.PLANET_NAME);
    const mercuryPlanet = this.mercuryGroup.getObjectByName(Names.PLANET_NAME);
    const venusPlanet = this.venusGroup.getObjectByName(Names.PLANET_NAME);
    const marsPlanet = this.marsGroup.getObjectByName(Names.PLANET_NAME);
    const jupiterPlanet = this.jupiterGroup.getObjectByName(Names.PLANET_NAME);
    const saturnPlanet = this.saturnGroup.getObjectByName(Names.PLANET_NAME);
    const uranusPlanet = this.uranusGroup.getObjectByName(Names.PLANET_NAME);

    this.zoomablePlanets = [
      earthPlanet,
      mercuryPlanet,
      venusPlanet,
      marsPlanet,
      jupiterPlanet,
      saturnPlanet,
      uranusPlanet,
    ].filter((planet): planet is THREE.Mesh => planet instanceof THREE.Mesh);

    this.planetInteractionController = createPlanetInteractionController({
      renderer: this.renderer,
      camera: this.camera,
      controls: this.controls,
      planets: this.zoomablePlanets,
    });

    this.renderer.domElement.addEventListener(
      'dblclick',
      this.planetInteractionController.handleDoubleClickPlanetZoom,
    );
    this.renderer.domElement.addEventListener(
      'pointermove',
      this.planetInteractionController.handlePlanetHover,
    );
    this.renderer.domElement.addEventListener(
      'pointerleave',
      this.planetInteractionController.clearPlanetHover,
    );
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

    this.labelElement.innerText = formatCurrentIndexDate(this.currentIndex);

    {
      // planet3dがearth。コードコピーする時間違えないように
      const earthPlanetSystem = this.earthGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;
      const earthPlanet = this.earthGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      const earthAtmosphere = this.earthGroup.getObjectByName(
        Names.PLANET_ATMO_SPHERE_NAME,
      ) as THREE.Mesh;
      const moon = this.earthGroup.getObjectByName(EARTH_MOON_MESH_NAMES.MOON) as THREE.Mesh;

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
        earthPlanetSystem.position.copy(interpolatedPos);

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
        const { orbitRadius } = earthMoons[0]; // orbitRadius: 10
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
        const mercuryPosition = this.mercuryGroup.userData.planetPositionsRes as PlanetPositionsRes;
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
        mercuryPlanetSystem.position.copy(interpolatedPos);

        const mercuryPlanet = this.mercuryGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
        // 水星の自転: 1フレームあたりの回転量を計算
        const mercuryRotation =
          (360 / (settings.lerpFrame * getRotationPeriod('MERCURY'))) *
          settings.accelerationRotation;
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
        const venusPosition = this.venusGroup.userData.planetPositionsRes as PlanetPositionsRes;
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
        venusPlanetSystem.position.copy(interpolatedPos);

        // 金星の自転: 1フレームあたりの回転量を計算（時計回りだがVENUS_TILTで回転させてる）
        const venusRotation =
          (360 / (settings.lerpFrame * getRotationPeriod('VENUS'))) * settings.accelerationRotation;
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
      const marsPosition = this.marsGroup.userData.planetPositionsRes as PlanetPositionsRes;
      const marsStepDays = getStepDays('MARS');
      const marsPathLength = marsPosition.pathPoints.length - 1;
      const earthDayProgress = this.currentIndex + this.lerpFactor;
      const marsCurrentIndex = Math.floor(earthDayProgress / marsStepDays) % marsPathLength;
      const currentPosition = marsPosition.pathPoints[marsCurrentIndex];

      // 火星は5日刻みの点を使うため、次の点へは5日かけて補間する
      const nextDayIndex = (marsCurrentIndex + 1) % marsPathLength;
      const nextPosition = marsPosition.pathPoints[nextDayIndex];
      const marsLerpFactor = (earthDayProgress % marsStepDays) / marsStepDays;
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), marsLerpFactor);
      /* 火星の公転（反時計回り）*/
      marsPlanetSystem.position.set(interpolatedPos.x, interpolatedPos.y, interpolatedPos.z);

      const marsPlanet = this.marsGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      // 火星の自転: 1フレームあたりの回転量を計算
      const marsRotation =
        (360 / (settings.lerpFrame * getRotationPeriod('MARS'))) * settings.accelerationRotation;
      const marsAngle = degToRad(marsRotation);
      marsPlanet.rotateY(marsAngle);
      // フォボスとダイモスの公転（反時計回り）
      const phobos = this.marsGroup.getObjectByName(MARS_MOON_MESH_NAMES.PHOBOS) as THREE.Mesh;
      const deimos = this.marsGroup.getObjectByName(MARS_MOON_MESH_NAMES.DEIMOS) as THREE.Mesh;
      const phobosOrbitRadius = marsMoons[0].orbitRadius;
      const deimosOrbitRadius = marsMoons[1].orbitRadius;
      const phobosCurrentAngle = this.frameCount * settings.accelerationOrbit * 4.0; // フォボスは速い
      const deimosCurrentAngle = this.frameCount * settings.accelerationOrbit * 1.0; // ダイモスは標準
      // フォボスの公転
      const phobosX = phobosOrbitRadius * Math.cos(phobosCurrentAngle);
      const phobosY = 0; // 火星の赤道面に沿って公転させるため、Y軸は0に固定
      const phobosZ = phobosOrbitRadius * Math.sin(phobosCurrentAngle);
      phobos.position.set(-phobosX, phobosY, phobosZ);
      // ダイモスの公転
      const deimosX = deimosOrbitRadius * Math.cos(deimosCurrentAngle);
      const deimosY = 0; // 火星の赤道面に沿って公転させるため、Y軸は0に固定
      const deimosZ = deimosOrbitRadius * Math.sin(deimosCurrentAngle);
      deimos.position.set(-deimosX, deimosY, deimosZ);
    }

    /* 木星の公転と自転（反時計回り） */
    {
      const jupiterPlanetSystem = this.jupiterGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;

      // APIから取得した現在位置に惑星を配置
      const jupiterPosition = this.jupiterGroup.userData.planetPositionsRes as PlanetPositionsRes;
      const jupiterStepDays = getStepDays('JUPITER');
      const jupiterPathLength = jupiterPosition.pathPoints.length - 1;
      const earthDayProgress = this.currentIndex + this.lerpFactor;
      const jupiterCurrentIndex =
        Math.floor(earthDayProgress / jupiterStepDays) % jupiterPathLength;
      const currentPosition = jupiterPosition.pathPoints[jupiterCurrentIndex];

      // 木星は30日刻みの点を使うため、次の点へは30日かけて補間する
      const nextDayIndex = (jupiterCurrentIndex + 1) % jupiterPathLength;
      const nextPosition = jupiterPosition.pathPoints[nextDayIndex];
      const jupiterLerpFactor = (earthDayProgress % jupiterStepDays) / jupiterStepDays;
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), jupiterLerpFactor);
      /* 木星の公転（反時計回り）*/
      jupiterPlanetSystem.position.copy(interpolatedPos);

      const jupiterPlanet = this.jupiterGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      // 木星の自転: 1フレームあたりの回転量を計算
      const jupiterRotation =
        (360 / (settings.lerpFrame * getRotationPeriod('JUPITER'))) * settings.accelerationRotation;
      const jupiterAngle = degToRad(jupiterRotation);
      jupiterPlanet.rotateY(jupiterAngle);
      // 木星の衛星の公転
      {
        // イオは約1.8日、エウロパは約3.5日、ガニメデは約7.1日、カリストは約16.7日で木星を公転するので、それぞれの周期に応じた速度で公転させる
        const io = this.jupiterGroup.getObjectByName(JUPITER_MOON_MESH_NAMES.IO) as THREE.Mesh;
        const europa = this.jupiterGroup.getObjectByName(
          JUPITER_MOON_MESH_NAMES.EUROPA,
        ) as THREE.Mesh;
        const ganymede = this.jupiterGroup.getObjectByName(
          JUPITER_MOON_MESH_NAMES.GANYMEDE,
        ) as THREE.Mesh;
        const callisto = this.jupiterGroup.getObjectByName(
          JUPITER_MOON_MESH_NAMES.CALLISTO,
        ) as THREE.Mesh;
        const ioOrbitRadius = jupiterMoons[0].orbitRadius + (jupiterMoons[0].xPosition ?? 0);
        const europaOrbitRadius = jupiterMoons[1].orbitRadius + (jupiterMoons[1].xPosition ?? 0);
        const ganymedeOrbitRadius = jupiterMoons[2].orbitRadius + (jupiterMoons[2].xPosition ?? 0);
        const callistoOrbitRadius = jupiterMoons[3].orbitRadius + (jupiterMoons[3].xPosition ?? 0);
        const ioCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 1.8);
        const europaCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 3.5);
        const ganymedeCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 7.1);
        const callistoCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 16.7);
        // イオの公転
        const ioX = ioOrbitRadius * Math.cos(ioCurrentAngle);
        const ioY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
        const ioZ = ioOrbitRadius * Math.sin(ioCurrentAngle);
        io.position.set(-ioX, ioY, ioZ);
        // エウロパの公転
        const europaX = europaOrbitRadius * Math.cos(europaCurrentAngle);
        const europaY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
        const europaZ = europaOrbitRadius * Math.sin(europaCurrentAngle);
        europa.position.set(-europaX, europaY, europaZ);
        // ガニメデの公転
        const ganymedeX = ganymedeOrbitRadius * Math.cos(ganymedeCurrentAngle);
        const ganymedeY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
        const ganymedeZ = ganymedeOrbitRadius * Math.sin(ganymedeCurrentAngle);
        ganymede.position.set(-ganymedeX, ganymedeY, ganymedeZ);
        // カリストの公転
        const callistoX = callistoOrbitRadius * Math.cos(callistoCurrentAngle);
        const callistoY = 0; // 木星の赤道面に沿って公転させるため、Y軸は0に固定
        const callistoZ = callistoOrbitRadius * Math.sin(callistoCurrentAngle);
        callisto.position.set(-callistoX, callistoY, callistoZ);
      }
    }

    /* 土星の公転と自転（反時計回り） */
    {
      const saturnPlanetSystem = this.saturnGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;

      // APIから取得した現在位置に惑星を配置
      const saturnPosition = this.saturnGroup.userData.planetPositionsRes as PlanetPositionsRes;
      const saturnStepDays = getStepDays('SATURN');
      const saturnPathLength = saturnPosition.pathPoints.length - 1;
      const earthDayProgress = this.currentIndex + this.lerpFactor;
      const saturnCurrentIndex = Math.floor(earthDayProgress / saturnStepDays) % saturnPathLength;
      const currentPosition = saturnPosition.pathPoints[saturnCurrentIndex];

      // 土星は90日刻みの点を使うため、次の点へは90日かけて補間する
      const nextDayIndex = (saturnCurrentIndex + 1) % saturnPathLength;
      const nextPosition = saturnPosition.pathPoints[nextDayIndex];
      const saturnLerpFactor = (earthDayProgress % saturnStepDays) / saturnStepDays;
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), saturnLerpFactor);
      saturnPlanetSystem.position.copy(interpolatedPos);

      const saturnPlanet = this.saturnGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      // 土星の自転: 1フレームあたりの回転量を計算
      const saturnRotation =
        (360 / (settings.lerpFrame * getRotationPeriod('SATURN'))) * settings.accelerationRotation;
      const saturnAngle = degToRad(saturnRotation);
      saturnPlanet.rotateY(saturnAngle);

      // 土星の衛星の公転
      {
        const saturnTiltAngle = degToRad(SATURN_TILT);

        // タイタンの公転（約15.95日）
        const titan = this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.TITAN) as THREE.Mesh;
        const titanOrbitRadius = saturnMoons[0].orbitRadius + (saturnMoons[0].xPosition ?? 0);
        const titanCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 15.95);
        const titanBaseX = -titanOrbitRadius * Math.cos(titanCurrentAngle);
        const titanBaseZ = titanOrbitRadius * Math.sin(titanCurrentAngle);
        const titanX = titanBaseX * Math.cos(saturnTiltAngle);
        const titanY = titanBaseX * Math.sin(saturnTiltAngle);
        titan.position.set(titanX, titanY, titanBaseZ);

        // レアの公転（約4.52日）
        const rhea = this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.RHEA) as THREE.Mesh;
        const rheaOrbitRadius = saturnMoons[1].orbitRadius + (saturnMoons[1].xPosition ?? 0);
        const rheaCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 4.52);
        const rheaBaseX = -rheaOrbitRadius * Math.cos(rheaCurrentAngle);
        const rheaBaseZ = rheaOrbitRadius * Math.sin(rheaCurrentAngle);
        const rheaX = rheaBaseX * Math.cos(saturnTiltAngle);
        const rheaY = rheaBaseX * Math.sin(saturnTiltAngle);
        rhea.position.set(rheaX, rheaY, rheaBaseZ);

        // イアペトゥスの公転（約79.3日）
        const iapetus = this.saturnGroup.getObjectByName(
          SATURN_MOON_MESH_NAMES.IAPETUS,
        ) as THREE.Mesh;
        const iapetusOrbitRadius = saturnMoons[2].orbitRadius + (saturnMoons[2].xPosition ?? 0);
        const iapetusCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 79.3);
        const iapetusBaseX = -iapetusOrbitRadius * Math.cos(iapetusCurrentAngle);
        const iapetusBaseZ = iapetusOrbitRadius * Math.sin(iapetusCurrentAngle);
        const iapetusX = iapetusBaseX * Math.cos(saturnTiltAngle);
        const iapetusY = iapetusBaseX * Math.sin(saturnTiltAngle);
        iapetus.position.set(iapetusX, iapetusY, iapetusBaseZ);

        // ミマスの公転（約0.942日）
        const mimas = this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.MIMAS) as THREE.Mesh;
        const mimasOrbitRadius = saturnMoons[3].orbitRadius + (saturnMoons[3].xPosition ?? 0);
        const mimasCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 0.942);
        const mimasBaseX = -mimasOrbitRadius * Math.cos(mimasCurrentAngle);
        const mimasBaseZ = mimasOrbitRadius * Math.sin(mimasCurrentAngle);
        const mimasX = mimasBaseX * Math.cos(saturnTiltAngle);
        const mimasY = mimasBaseX * Math.sin(saturnTiltAngle);
        mimas.position.set(mimasX, mimasY, mimasBaseZ);

        // エンケラドゥスの公転（約1.37日）
        const enceladus = this.saturnGroup.getObjectByName(
          SATURN_MOON_MESH_NAMES.ENCELADUS,
        ) as THREE.Mesh;
        const enceladusOrbitRadius = saturnMoons[4].orbitRadius + (saturnMoons[4].xPosition ?? 0);
        const enceladusCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 1.37);
        const enceladusBaseX = -enceladusOrbitRadius * Math.cos(enceladusCurrentAngle);
        const enceladusBaseZ = enceladusOrbitRadius * Math.sin(enceladusCurrentAngle);
        const enceladusX = enceladusBaseX * Math.cos(saturnTiltAngle);
        const enceladusY = enceladusBaseX * Math.sin(saturnTiltAngle);
        enceladus.position.set(enceladusX, enceladusY, enceladusBaseZ);
      }
    }

    /* 天王星の公転と自転（反時計回り） */
    {
      const uranusPlanetSystem = this.uranusGroup.getObjectByName(
        Names.PLANET_SYSTEM_NAME,
      ) as THREE.Group;

      // APIから取得した現在位置に惑星を配置
      const uranusPosition = this.uranusGroup.userData.planetPositionsRes as PlanetPositionsRes;
      const uranusStepDays = getStepDays('URANUS');
      const uranusPathLength = uranusPosition.pathPoints.length - 1;
      const earthDayProgress = this.currentIndex + this.lerpFactor;
      const uranusCurrentIndex = Math.floor(earthDayProgress / uranusStepDays) % uranusPathLength;
      const currentPosition = uranusPosition.pathPoints[uranusCurrentIndex];

      // 天王星は120日刻みの点を使うため、次の点へは120日かけて補間する
      const nextDayIndex = (uranusCurrentIndex + 1) % uranusPathLength;
      const nextPosition = uranusPosition.pathPoints[nextDayIndex];
      const uranusLerpFactor = (earthDayProgress % uranusStepDays) / uranusStepDays;
      const interpolatedPos = new THREE.Vector3()
        .fromArray(currentPosition.toArray())
        .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), uranusLerpFactor);
      uranusPlanetSystem.position.copy(interpolatedPos);

      const uranusPlanet = this.uranusGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh;
      // 天王星の自転: 1フレームあたりの回転量を計算
      const uranusRotation =
        (360 / (settings.lerpFrame * getRotationPeriod('URANUS'))) * settings.accelerationRotation;
      const uranusAngle = degToRad(uranusRotation);
      uranusPlanet.rotateY(uranusAngle);

      // 天王星の衛星の公転
      {
        const uranusTiltAngle = degToRad(URANUS_TILT);

        // Mirandaの公転（約1.41日）
        const miranda = this.uranusGroup.getObjectByName(
          URANUS_MOON_MESH_NAMES.MIRANDA,
        ) as THREE.Mesh;
        const mirandaOrbitRadius = uranusMoons[0].orbitRadius + (uranusMoons[0].xPosition ?? 0);
        const mirandaCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 1.41);
        const mirandaBaseX = -mirandaOrbitRadius * Math.cos(mirandaCurrentAngle);
        const mirandaBaseZ = mirandaOrbitRadius * Math.sin(mirandaCurrentAngle);
        const mirandaX = mirandaBaseX * Math.cos(uranusTiltAngle);
        const mirandaY = mirandaBaseX * Math.sin(uranusTiltAngle);
        miranda.position.set(mirandaX, mirandaY, mirandaBaseZ);

        // Arielの公転（約2.52日）
        const ariel = this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.ARIEL) as THREE.Mesh;
        const arielOrbitRadius = uranusMoons[1].orbitRadius + (uranusMoons[1].xPosition ?? 0);
        const arielCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 2.52);
        const arielBaseX = -arielOrbitRadius * Math.cos(arielCurrentAngle);
        const arielBaseZ = arielOrbitRadius * Math.sin(arielCurrentAngle);
        const arielX = arielBaseX * Math.cos(uranusTiltAngle);
        const arielY = arielBaseX * Math.sin(uranusTiltAngle);
        ariel.position.set(arielX, arielY, arielBaseZ);

        // Umbrielの公転（約4.14日）
        const umbriel = this.uranusGroup.getObjectByName(
          URANUS_MOON_MESH_NAMES.UMBRIEL,
        ) as THREE.Mesh;
        const umbrielOrbitRadius = uranusMoons[2].orbitRadius + (uranusMoons[2].xPosition ?? 0);
        const umbrielCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 4.14);
        const umbrielBaseX = -umbrielOrbitRadius * Math.cos(umbrielCurrentAngle);
        const umbrielBaseZ = umbrielOrbitRadius * Math.sin(umbrielCurrentAngle);
        const umbrielX = umbrielBaseX * Math.cos(uranusTiltAngle);
        const umbrielY = umbrielBaseX * Math.sin(uranusTiltAngle);
        umbriel.position.set(umbrielX, umbrielY, umbrielBaseZ);

        // Titaniaの公転（約8.71日）
        const titania = this.uranusGroup.getObjectByName(
          URANUS_MOON_MESH_NAMES.TITANIA,
        ) as THREE.Mesh;
        const titaniaOrbitRadius = uranusMoons[3].orbitRadius + (uranusMoons[3].xPosition ?? 0);
        const titaniaCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 8.71);
        const titaniaBaseX = -titaniaOrbitRadius * Math.cos(titaniaCurrentAngle);
        const titaniaBaseZ = titaniaOrbitRadius * Math.sin(titaniaCurrentAngle);
        const titaniaX = titaniaBaseX * Math.cos(uranusTiltAngle);
        const titaniaY = titaniaBaseX * Math.sin(uranusTiltAngle);
        titania.position.set(titaniaX, titaniaY, titaniaBaseZ);

        // Oberonの公転（約13.46日）
        const oberon = this.uranusGroup.getObjectByName(
          URANUS_MOON_MESH_NAMES.OBERON,
        ) as THREE.Mesh;
        const oberonOrbitRadius = uranusMoons[4].orbitRadius + (uranusMoons[4].xPosition ?? 0);
        const oberonCurrentAngle = this.frameCount * settings.accelerationOrbit * (1 / 13.46);
        const oberonBaseX = -oberonOrbitRadius * Math.cos(oberonCurrentAngle);
        const oberonBaseZ = oberonOrbitRadius * Math.sin(oberonCurrentAngle);
        const oberonX = oberonBaseX * Math.cos(uranusTiltAngle);
        const oberonY = oberonBaseX * Math.sin(uranusTiltAngle);
        oberon.position.set(oberonX, oberonY, oberonBaseZ);
      }
    }
  }
}
