import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { createEarthMesh as createEarthGroup, EARTH_MOON_MESH_NAMES } from '../planets/earth';
import { applyResetView } from '../utils/camera-view';
import {
  initEnvironment,
  initGUI,
  syncCurrentIndexLabel,
} from '../utils/environment';
import { type PlanetPositionsRes } from '../utils/get-planet-position';
import { createJupiterGroup, JUPITER_MOON_MESH_NAMES } from '../planets/jupiter';
import { createMarsGroup, MARS_MOON_MESH_NAMES } from '../planets/mars';
import { createMercuryGroup } from '../planets/mercury';
import { createNeptuneGroup, NEPTUNE_MOON_MESH_NAMES } from '../planets/neptune';
import { Names } from '../utils/planet-common';
import {
  createPlanetInteractionController,
  type PlanetInteractionController,
} from '../utils/rimLight';
import { createSaturnGroup, SATURN_MOON_MESH_NAMES } from '../planets/saturn';
import { settings, SUN_ROTATION_SPEED } from '../utils/settings';
import { createSunMesh } from '../utils/sun';
import { createUranusGroup, URANUS_MOON_MESH_NAMES } from '../planets/uranus';
import { createVenusGroup } from '../planets/venus';
import {
  animateEarth,
  animateJupiter,
  animateMars,
  animateMercury,
  animateNeptune,
  animateSaturn,
  animateUranus,
  animateVenus,
} from '../utils/animate-planets';
import type { AnimateContext, CachedMeshes } from '../utils/animate-planets';
import { AsteroidBelt } from './AsteroidBelt';

const isDebug = true;

export class DrawScene {
  private readonly loadingScreen = document.getElementById('loading-screen');
  private readonly loadingStatus = document.getElementById('loading-status');
  renderer = new THREE.WebGLRenderer();
  scene = new THREE.Scene();
  camera!: THREE.PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  labelRenderer!: CSS2DRenderer;
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
  neptuneGroup!: THREE.Group; // 海王星のグループ
  asteroidBelt!: AsteroidBelt; // 小惑星帯
  dayFraction = 0; // 補間の進捗（0.0 から 1.0 まで）
  dayIndex = 0; // アニメーション開始からの経過日数
  timer = new THREE.Timer();
  frameCount = 0;

  // 毎フレームの getObjectByName（tree走査）を排除するためのキャッシュ
  private _cachedMeshes!: CachedMeshes;

  // 毎フレームの Vector3 アロケーションを排除するための共有バッファ
  private readonly _interpolatedPos = new THREE.Vector3();

  // updateLayerVisibility の毎フレーム走査を抑制するための前回値キャッシュ
  private _prevShowOrbits = settings.showOrbits;
  private _prevShowLabels = settings.showLabels;
  private _prevShowPlanets = settings.showPlanets;
  private resetPlanetZoomView = (): void => {
    if (!this.planetInteractionController.exitPlanetZoom()) return;
    applyResetView(this.camera, this.controls);
  };

  constructor() {
    const { camera, controls, composer, labelRenderer } = initEnvironment(
      this.renderer,
      this.scene,
      this.width,
      this.height,
    );
    this.camera = camera;
    this.controls = controls;
    this.composer = composer;
    this.labelRenderer = labelRenderer;
    this.updateLoadingState('太陽系データを読み込み中...');
    void this.initPlanets().catch((error: unknown) => {
      void error;
      this.showLoadingError('読み込みに失敗しました。ページを再読み込みしてください。');
    });
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
    this.updateLoadingState('太陽と地球を読み込み中...');
    // 太陽のメッシュを作成
    this.sunMesh = createSunMesh();
    this.scene.add(this.sunMesh);
    // 地球と月のメッシュを作成（dayIndex取得のため先行）
    this.earthGroup = await createEarthGroup(this.sunMesh.position, isDebug);
    this.dayIndex = this.userDataEarthPositionRes.todayRow - 1;
    this.scene.add(this.earthGroup);
    // Render / JPL API が同時リクエストに弱いため、残りの惑星は順次初期化する
    this.updateLoadingState('水星を読み込み中...');
    const mercury = await createMercuryGroup(isDebug);
    this.updateLoadingState('金星を読み込み中...');
    const venus = await createVenusGroup(isDebug);
    this.updateLoadingState('火星を読み込み中...');
    const mars = await createMarsGroup(isDebug);
    this.updateLoadingState('木星を読み込み中...');
    const jupiter = await createJupiterGroup(isDebug);
    this.updateLoadingState('土星を読み込み中...');
    const saturn = await createSaturnGroup(isDebug);
    this.updateLoadingState('天王星を読み込み中...');
    const uranus = await createUranusGroup(isDebug);
    this.updateLoadingState('海王星を読み込み中...');
    const neptune = await createNeptuneGroup(isDebug);
    this.mercuryGroup = mercury;
    this.scene.add(mercury);
    this.venusGroup = venus;
    this.scene.add(venus);
    this.marsGroup = mars;
    this.scene.add(mars);
    this.jupiterGroup = jupiter;
    this.scene.add(jupiter);
    this.saturnGroup = saturn;
    this.scene.add(saturn);
    this.uranusGroup = uranus;
    this.scene.add(uranus);
    this.neptuneGroup = neptune;
    this.scene.add(neptune);
    // 小惑星帯を作成
    this.updateLoadingState('小惑星帯を生成中...');
    this.asteroidBelt = new AsteroidBelt();
    this.scene.add(this.asteroidBelt.getGroup());

    this.initPlanetTapZoom();

    initGUI({
      sunMesh: this.sunMesh,
      camera: this.camera,
      controls: this.controls,
      onExitPlanetZoom: () => {
        this.planetInteractionController.exitPlanetZoom();
      },
      setDayIndex: (value: number) => {
        this.dayIndex = value;
      },
      setDayFraction: (value: number) => {
        this.dayFraction = value;
      },
      setFrameCount: (value: number) => {
        this.frameCount = value;
      },
      userDataEarthPositionRes: this.userDataEarthPositionRes,
      currentIndex: this.dayIndex,
    });

    // 惑星の初期化完了後にレンダリングを開始する
    this._initMeshCache();
    this.updateLoadingState('描画を開始中...');
    this.renderer.setAnimationLoop(() => this.render());
    this.render();
    window.requestAnimationFrame(() => this.hideLoadingScreen());
  }

  private updateLoadingState(message: string): void {
    if (this.loadingStatus) {
      this.loadingStatus.textContent = message;
    }
  }

  private hideLoadingScreen(): void {
    if (!this.loadingScreen) return;
    this.loadingScreen.classList.add('is-hidden');
    window.setTimeout(() => this.loadingScreen?.remove(), 400);
  }

  private showLoadingError(message: string): void {
    if (!this.loadingScreen) return;
    this.loadingScreen.classList.add('is-error');
    this.updateLoadingState(message);
  }

  private _initMeshCache(): void {
    this._cachedMeshes = {
      // 地球
      earthPlanetSystem: this.earthGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      earthPlanet: this.earthGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      earthAtmosphere: this.earthGroup.getObjectByName(Names.PLANET_ATMO_SPHERE_NAME) as THREE.Mesh,
      moon: this.earthGroup.getObjectByName(EARTH_MOON_MESH_NAMES.MOON) as THREE.Mesh,
      // 水星
      mercuryPlanetSystem: this.mercuryGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      mercuryPlanet: this.mercuryGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      // 金星
      venusPlanetSystem: this.venusGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      venusPlanet: this.venusGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      venusAtmosphere: this.venusGroup.getObjectByName(Names.PLANET_ATMO_SPHERE_NAME) as THREE.Mesh,
      // 火星
      marsPlanetSystem: this.marsGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      marsPlanet: this.marsGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      phobos: this.marsGroup.getObjectByName(MARS_MOON_MESH_NAMES.PHOBOS) as THREE.Mesh,
      deimos: this.marsGroup.getObjectByName(MARS_MOON_MESH_NAMES.DEIMOS) as THREE.Mesh,
      // 木星
      jupiterPlanetSystem: this.jupiterGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      jupiterPlanet: this.jupiterGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      io: this.jupiterGroup.getObjectByName(JUPITER_MOON_MESH_NAMES.IO) as THREE.Mesh,
      europa: this.jupiterGroup.getObjectByName(JUPITER_MOON_MESH_NAMES.EUROPA) as THREE.Mesh,
      ganymede: this.jupiterGroup.getObjectByName(JUPITER_MOON_MESH_NAMES.GANYMEDE) as THREE.Mesh,
      callisto: this.jupiterGroup.getObjectByName(JUPITER_MOON_MESH_NAMES.CALLISTO) as THREE.Mesh,
      // 土星
      saturnPlanetSystem: this.saturnGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      saturnPlanet: this.saturnGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      titan: this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.TITAN) as THREE.Mesh,
      rhea: this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.RHEA) as THREE.Mesh,
      iapetus: this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.IAPETUS) as THREE.Mesh,
      mimas: this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.MIMAS) as THREE.Mesh,
      enceladus: this.saturnGroup.getObjectByName(SATURN_MOON_MESH_NAMES.ENCELADUS) as THREE.Mesh,
      // 天王星
      uranusPlanetSystem: this.uranusGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      uranusPlanet: this.uranusGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      miranda: this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.MIRANDA) as THREE.Mesh,
      ariel: this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.ARIEL) as THREE.Mesh,
      umbriel: this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.UMBRIEL) as THREE.Mesh,
      titania: this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.TITANIA) as THREE.Mesh,
      oberon: this.uranusGroup.getObjectByName(URANUS_MOON_MESH_NAMES.OBERON) as THREE.Mesh,
      // 海王星
      neptunePlanetSystem: this.neptuneGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group,
      neptunePlanet: this.neptuneGroup.getObjectByName(Names.PLANET_NAME) as THREE.Mesh,
      triton: this.neptuneGroup.getObjectByName(NEPTUNE_MOON_MESH_NAMES.TRITON) as THREE.Mesh,
      proteus: this.neptuneGroup.getObjectByName(NEPTUNE_MOON_MESH_NAMES.PROTEUS) as THREE.Mesh,
      nereid: this.neptuneGroup.getObjectByName(NEPTUNE_MOON_MESH_NAMES.NEREID) as THREE.Mesh,
    };
  }

  initPlanetTapZoom(): void {
    const earthPlanet = this.earthGroup.getObjectByName(Names.PLANET_NAME);
    const mercuryPlanet = this.mercuryGroup.getObjectByName(Names.PLANET_NAME);
    const venusPlanet = this.venusGroup.getObjectByName(Names.PLANET_NAME);
    const marsPlanet = this.marsGroup.getObjectByName(Names.PLANET_NAME);
    const jupiterPlanet = this.jupiterGroup.getObjectByName(Names.PLANET_NAME);
    const saturnPlanet = this.saturnGroup.getObjectByName(Names.PLANET_NAME);
    const uranusPlanet = this.uranusGroup.getObjectByName(Names.PLANET_NAME);
    const neptunePlanet = this.neptuneGroup.getObjectByName(Names.PLANET_NAME);

    this.zoomablePlanets = [
      earthPlanet,
      mercuryPlanet,
      venusPlanet,
      marsPlanet,
      jupiterPlanet,
      saturnPlanet,
      uranusPlanet,
      neptunePlanet,
    ].filter((planet): planet is THREE.Mesh => planet instanceof THREE.Mesh);

    this.planetInteractionController = createPlanetInteractionController({
      renderer: this.renderer,
      camera: this.camera,
      controls: this.controls,
      planets: this.zoomablePlanets,
      onResetView: this.resetPlanetZoomView,
    });

    this.renderer.domElement.addEventListener('pointerdown', this.planetInteractionController.handlePlanetPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.planetInteractionController.handlePlanetPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.planetInteractionController.clearPlanetTapState);
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
    this.controls.update();
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);

    if (settings.isAnimating) {
      this.animate();
    }

    // レイヤー表示フラグを毎フレーム反映
    this.#updateLayerVisibility();
  }

  #updateLayerVisibility(): void {
    // settings が変わっていない場合はスキップ（毎フレームの traverse を排除）
    const changed =
      settings.showOrbits !== this._prevShowOrbits ||
      settings.showLabels !== this._prevShowLabels ||
      settings.showPlanets !== this._prevShowPlanets;

    if (!changed) return;

    this._prevShowOrbits = settings.showOrbits;
    this._prevShowLabels = settings.showLabels;
    this._prevShowPlanets = settings.showPlanets;

    // 各惑星グループについてレイヤー表示を制御
    const planetGroups = [
      this.earthGroup,
      this.mercuryGroup,
      this.venusGroup,
      this.marsGroup,
      this.jupiterGroup,
      this.saturnGroup,
      this.uranusGroup,
      this.neptuneGroup,
    ];

    planetGroups.forEach((group) => {
      const orbit = group.getObjectByName(Names.PLANET_ORBIT_NAME);

      // 軌道の表示/非表示
      if (orbit) {
        orbit.visible = settings.showOrbits;
      }

      // 惑星とラベルの表示/非表示
      group.traverse((child) => {
        if (
          child.name === Names.PLANET_NAME ||
          child.name === Names.PLANET_RING_NAME ||
          child.name === Names.PLANET_AXIS_NAME ||
          child.name === Names.PLANET_ATMO_SPHERE_NAME ||
          child.name.startsWith(Names.PLANET_MOONS_NAME) ||
          child.name.endsWith('-current-position')
        ) {
          child.visible = settings.showPlanets;
        }
        if (child.name === Names.PLANET_LABEL_NAME) {
          child.visible = settings.showLabels;
        }
      });
    });
  }

  animate(): void {
    const isOrbitAnimating = !settings.isOrbitPausedByZoom;

    this.frameCount++;
    syncCurrentIndexLabel(this.dayIndex);
    this.sunMesh.rotateY(SUN_ROTATION_SPEED * settings.accelerationRotation);

    if (isOrbitAnimating) {
      // グローバル時計の更新（dayFraction: 0→1 で1日分進む）
      // 小数点の誤差を防ぐため、toFixedで丸める
      this.dayFraction = Number(
        ((this.dayFraction + 1 / settings.lerpFrame) * settings.accelerationOrbit).toFixed(3),
      );
      // 次の日に到達したらインデックスを更新し、進捗をリセット
      if (this.dayFraction >= 1) {
        this.dayIndex += 1;
        this.dayFraction = 0;
      }
    }

    const ctx: AnimateContext = {
      dayIndex: this.dayIndex,
      dayFraction: this.dayFraction,
      frameCount: this.frameCount,
      buf: this._interpolatedPos,
    };

    animateEarth(ctx, this._cachedMeshes, this.userDataEarthPositionRes);
    animateMercury(ctx, this._cachedMeshes, this.mercuryGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateVenus(ctx, this._cachedMeshes, this.venusGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateMars(ctx, this._cachedMeshes, this.marsGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateJupiter(ctx, this._cachedMeshes, this.jupiterGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateSaturn(ctx, this._cachedMeshes, this.saturnGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateUranus(ctx, this._cachedMeshes, this.uranusGroup.userData.planetPositionsRes as PlanetPositionsRes);
    animateNeptune(ctx, this._cachedMeshes, this.neptuneGroup.userData.planetPositionsRes as PlanetPositionsRes);

    if (isOrbitAnimating) {
      /* 小惑星帯のアニメーション */
      this.asteroidBelt.animate(0.016);
    }
  }
}
