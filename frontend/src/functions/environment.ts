import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { PlanetPositionsRes } from './get-planet-position';
import { handleResize } from './resize';
import { settings } from './settings';

export const initEnvironment = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  width: number,
  height: number,
): {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  composer: EffectComposer;
  labelRenderer: CSS2DRenderer;
} => {
  renderer.setSize(width, height);
  renderer.setClearColor(0x00000, 1.0);
  document.body.appendChild(renderer.domElement);

  // 外側の銀河背景をキューブマップで設定
  const cubeTextureLoader = new THREE.CubeTextureLoader();
  scene.background = cubeTextureLoader.load([
    '/images/3.jpg',
    '/images/1.jpg',
    '/images/2.jpg',
    '/images/2.jpg',
    '/images/4.jpg',
    '/images/2.jpg',
  ]);

  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  labelRenderer.domElement.style.zIndex = '10';
  document.body.appendChild(labelRenderer.domElement);

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.set(0, 20, 122);

  handleResize(camera, renderer, labelRenderer);
  window.addEventListener('resize', () => handleResize(camera, renderer, labelRenderer));

  const controls = new OrbitControls(camera, renderer.domElement);

  const composer = initComposer(renderer, scene, camera, width, height);
  initLighting(scene);

  return { camera, controls, composer, labelRenderer };
};

const initLighting = (scene: THREE.Scene): void => {
  const lightAmbient = new THREE.AmbientLight(0x222222, 10);
  scene.add(lightAmbient);
};

const initComposer = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): EffectComposer => {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // outline Pass
  const outLinePass = new OutlinePass(new THREE.Vector2(width, height), scene, camera);
  outLinePass.edgeStrength = 3;
  outLinePass.edgeGlow = 1;
  outLinePass.visibleEdgeColor.set(0xffffff);
  outLinePass.hiddenEdgeColor.set(0x190a05);
  composer.addPass(outLinePass);
  // Bloom Pass
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1, 0.4, 0.85);
  bloomPass.threshold = 1;
  bloomPass.radius = 0.9;
  composer.addPass(bloomPass);
  return composer;
};

export const initGUI = (params: {
  sunMesh: THREE.Mesh;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  getCurrentIndex: () => number;
  setDayIndex: (value: number) => void;
  setDayFraction: (value: number) => void;
  setFrameCount: (value: number) => void;
  userDataEarthPositionRes: PlanetPositionsRes;
}): void => {
  const {
    sunMesh,
    camera,
    controls,
    setDayIndex,
    setDayFraction,
    setFrameCount,
    userDataEarthPositionRes,
  } = params;

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
      (sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
    });
  // アニメーションを再生/停止する
  gui
    .add(settings, 'isAnimating')
    .name('アニメーション再生')
    .onChange((value) => {
      settings.isAnimating = value;
    });
  // レイヤー表示/非表示
  gui.add(settings, 'showOrbits').name('公転軌道表示');
  gui.add(settings, 'showLabels').name('惑星名ラベル表示');
  gui.add(settings, 'showPlanets').name('惑星表示');
  // Top View
  gui
    .add(
      {
        topView: () => {
          camera.position.set(0, 190, 0.01);
          controls.target.set(0, 0, 0);
          controls.update();
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
          camera.position.set(190, 0, 0.01);
          controls.target.set(0, 0, 0);
          controls.update();
        },
      },
      'sideView',
    )
    .name('サイドビュー');
  gui.add({ resetView: () => controls.reset() }, 'resetView').name('視点リセット');
  gui
    .add(
      {
        resetValues: () => {
          setDayIndex(userDataEarthPositionRes.todayRow - 1);
          setDayFraction(0);
          setFrameCount(0);
          // 惑星の位置を最新化してからリセット
          setTimeout(() => gui.reset(), 100);
        },
      },
      'resetValues',
    )
    .name('GUI値リセット');
};
