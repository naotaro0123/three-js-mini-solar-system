import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
import type { PlanetPositionRes } from './get-planet-position';
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
} => {
  renderer.setSize(width, height);
  renderer.setClearColor(0x00000, 1.0);
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(50, width / height, 1, 5000);
  camera.position.set(0, 20, 122);

  handleResize(camera, renderer);
  window.addEventListener('resize', () => handleResize(camera, renderer));

  const controls = new OrbitControls(camera, renderer.domElement);

  const composer = initComposer(renderer, scene, camera, width, height);
  initLighting(scene);

  return { camera, controls, composer };
};

const initLighting = (scene: THREE.Scene): void => {
  const lightAmbient = new THREE.AmbientLight(0x222222, 6);
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
  setCurrentIndex: (value: number) => void;
  setLerpFactor: (value: number) => void;
  setFrameCount: (value: number) => void;
  userDataEarthPositionRes: PlanetPositionRes;
}): void => {
  const {
    sunMesh,
    camera,
    controls,
    setCurrentIndex,
    setLerpFactor,
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
          setCurrentIndex(userDataEarthPositionRes.todayRow - 1);
          setLerpFactor(0);
          setFrameCount(0);
          // 惑星の位置を最新化してからリセット
          setTimeout(() => gui.reset(), 100);
        },
      },
      'resetValues',
    )
    .name('GUI値リセット');
};
