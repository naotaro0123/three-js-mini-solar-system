import * as THREE from 'three';
import {
  EffectComposer,
  OutlinePass,
  RenderPass,
  UnrealBloomPass,
} from 'three/examples/jsm/Addons.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { applyResetView, applySideView } from './camera-view';
import type { PlanetPositionsRes } from './get-planet-position';
import { handleResize } from './resize';
import { settings } from './settings';
import {
  createCurrentIndexLabel,
  updateCurrentIndexLabel,
  updateCurrentIndexZoomLabel,
} from './current-index-label';
import { getAssetPath } from './utils';

type SettingsMenuRefs = {
  accelerationOrbit: HTMLInputElement;
  accelerationOrbitValue: HTMLOutputElement;
  accelerationRotation: HTMLInputElement;
  accelerationRotationValue: HTMLOutputElement;
  sunIntensity: HTMLInputElement;
  sunIntensityValue: HTMLOutputElement;
  isAnimating: HTMLButtonElement;
  showOrbits: HTMLInputElement;
  showLabels: HTMLInputElement;
};

const DEFAULT_SETTINGS = { ...settings };
let settingsMenuRefs: SettingsMenuRefs | null = null;
let settingsMenuPanel: HTMLElement | null = null;
let settingsMenuSections: HTMLElement | null = null;
let settingsMenuCollapseButton: HTMLButtonElement | null = null;
let settingsMenuAnimationButton: HTMLButtonElement | null = null;
let settingsMenuCurrentIndexLabel: HTMLDivElement | null = null;
let settingsMenuCamera: THREE.PerspectiveCamera | null = null;
let settingsMenuControls: OrbitControls | null = null;
let isSettingsMenuCollapsed = false;
let currentIndex = 0;
let isAnimationButtonDisabled = false;
const zoomDistanceOffset = new THREE.Vector3();

const formatZoomDistance = (value: number): string => value.toFixed(1);

const getCurrentZoomDistance = (): number => {
  if (!settingsMenuCamera || !settingsMenuControls) return 0;

  return settingsMenuCamera.position.distanceTo(settingsMenuControls.target);
};

const syncZoomDistanceValue = (): void => {
  const value = formatZoomDistance(getCurrentZoomDistance());
  if (!settingsMenuCurrentIndexLabel) return;
  updateCurrentIndexZoomLabel(settingsMenuCurrentIndexLabel, value);
};

const applyZoomDistanceLimits = (options?: { clampCamera?: boolean }): void => {
  if (!settingsMenuControls) return;

  settingsMenuControls.minDistance = settings.zoomMinDistance;
  settingsMenuControls.maxDistance = settings.zoomMaxDistance;

  if (!options?.clampCamera || !settingsMenuCamera) return;

  zoomDistanceOffset.subVectors(settingsMenuCamera.position, settingsMenuControls.target);

  if (zoomDistanceOffset.lengthSq() === 0) {
    zoomDistanceOffset.set(0, 0, settings.zoomMinDistance);
  }

  const currentDistance = zoomDistanceOffset.length();
  const clampedDistance = THREE.MathUtils.clamp(
    currentDistance,
    settings.zoomMinDistance,
    settings.zoomMaxDistance,
  );

  if (Math.abs(clampedDistance - currentDistance) < Number.EPSILON) {
    syncZoomDistanceValue();
    return;
  }

  zoomDistanceOffset.setLength(clampedDistance);
  settingsMenuCamera.position.copy(settingsMenuControls.target).add(zoomDistanceOffset);
  settingsMenuControls.update();
};

const syncSettingsMenuCollapseState = (): void => {
  if (!settingsMenuPanel || !settingsMenuSections || !settingsMenuCollapseButton) return;

  settingsMenuPanel.classList.toggle('is-collapsed', isSettingsMenuCollapsed);
  settingsMenuSections.hidden = isSettingsMenuCollapsed;
  settingsMenuCollapseButton.classList.toggle('is-collapsed', isSettingsMenuCollapsed);
  settingsMenuCollapseButton.textContent = isSettingsMenuCollapsed
    ? '設定を展開'
    : '設定を折りたたむ';
  settingsMenuCollapseButton.setAttribute('aria-expanded', String(!isSettingsMenuCollapsed));
};

const syncAnimationButtonState = (): void => {
  if (!settingsMenuAnimationButton) return;

  settingsMenuAnimationButton.textContent = settings.isAnimating ? 'アニメーション停止' : 'アニメーション再生';
  settingsMenuAnimationButton.classList.toggle('is-active', settings.isAnimating);
  settingsMenuAnimationButton.setAttribute('aria-pressed', String(settings.isAnimating));
  settingsMenuAnimationButton.title = isAnimationButtonDisabled
    ? '惑星ズーム中は操作できません'
    : settings.isAnimating
      ? 'アニメーション停止'
      : 'アニメーション再生';
  settingsMenuCurrentIndexLabel?.classList.toggle('is-animating', settings.isAnimating);
};

export const syncCurrentIndexLabel = (index: number): void => {
  currentIndex = index;
  if (!settingsMenuCurrentIndexLabel) return;

  updateCurrentIndexLabel(settingsMenuCurrentIndexLabel, index);
};

export const syncAnimationButtonDisabledState = (disabled: boolean): void => {
  isAnimationButtonDisabled = disabled;
  if (!settingsMenuAnimationButton) return;

  settingsMenuAnimationButton.disabled = disabled;
  settingsMenuAnimationButton.classList.toggle('is-disabled', disabled);
  settingsMenuAnimationButton.setAttribute('aria-disabled', String(disabled));
  syncAnimationButtonState();
};

export const syncSettingsMenu = (): void => {
  if (!settingsMenuRefs) return;

  settingsMenuRefs.accelerationOrbit.value = String(settings.accelerationOrbit);
  settingsMenuRefs.accelerationOrbitValue.value = String(settings.accelerationOrbit);
  settingsMenuRefs.accelerationOrbitValue.textContent = String(settings.accelerationOrbit);

  settingsMenuRefs.accelerationRotation.value = String(settings.accelerationRotation);
  settingsMenuRefs.accelerationRotationValue.value = String(settings.accelerationRotation);
  settingsMenuRefs.accelerationRotationValue.textContent = String(settings.accelerationRotation);

  settingsMenuRefs.sunIntensity.value = String(settings.sunIntensity);
  settingsMenuRefs.sunIntensityValue.value = String(settings.sunIntensity);
  settingsMenuRefs.sunIntensityValue.textContent = String(settings.sunIntensity);
  applyZoomDistanceLimits({ clampCamera: true });
  syncZoomDistanceValue();

  syncAnimationButtonState();
  settingsMenuRefs.showOrbits.checked = settings.showOrbits;
  settingsMenuRefs.showLabels.checked = settings.showLabels;
  syncCurrentIndexLabel(currentIndex);
  syncSettingsMenuCollapseState();
};

const createRangeControl = (params: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}): {
  row: HTMLLabelElement;
  input: HTMLInputElement;
  output: HTMLOutputElement;
} => {
  const { label, min, max, step, value, onChange } = params;
  const row = document.createElement('label');
  row.className = 'settings-menu__row settings-menu__row--range';

  const text = document.createElement('span');
  text.className = 'settings-menu__label';
  text.textContent = label;

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.className = 'settings-menu__range';

  const output = document.createElement('output');
  output.className = 'settings-menu__value';
  output.value = String(value);
  output.textContent = String(value);

  input.addEventListener('input', () => {
    const nextValue = Number(input.value);
    output.value = input.value;
    output.textContent = input.value;
    onChange(nextValue);
  });

  row.append(text, input, output);
  return { row, input, output };
};

const createToggleControl = (params: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}): {
  row: HTMLLabelElement;
  input: HTMLInputElement;
} => {
  const { label, checked, onChange } = params;
  const row = document.createElement('label');
  row.className = 'settings-menu__row settings-menu__row--toggle';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.className = 'settings-menu__checkbox';
  input.addEventListener('change', () => onChange(input.checked));

  const text = document.createElement('span');
  text.className = 'settings-menu__label';
  text.textContent = label;

  row.append(input, text);
  return { row, input };
};

const createActionButton = (params: { label: string; onClick: () => void }): HTMLButtonElement => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'settings-menu__button';
  button.textContent = params.label;
  button.addEventListener('click', params.onClick);
  return button;
};

const createSectionSubtitle = (label: string): HTMLParagraphElement => {
  const subtitle = document.createElement('p');
  subtitle.className = 'settings-menu__subtitle';
  subtitle.textContent = label;
  return subtitle;
};

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
    getAssetPath('/images/3.jpg'),
    getAssetPath('/images/1.jpg'),
    getAssetPath('/images/2.jpg'),
    getAssetPath('/images/2.jpg'),
    getAssetPath('/images/4.jpg'),
    getAssetPath('/images/2.jpg'),
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
  controls.minDistance = settings.zoomMinDistance;
  controls.maxDistance = settings.zoomMaxDistance;

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
  onExitPlanetZoom: () => void;
  setDayIndex: (value: number) => void;
  setDayFraction: (value: number) => void;
  setFrameCount: (value: number) => void;
  userDataEarthPositionRes: PlanetPositionsRes;
  currentIndex: number;
}): void => {
  const {
    sunMesh,
    camera,
    controls,
    onExitPlanetZoom,
    setDayIndex,
    setDayFraction,
    setFrameCount,
    userDataEarthPositionRes,
    currentIndex: initialCurrentIndex,
  } = params;

  const panel = document.createElement('section');
  panel.className = 'settings-menu';
  panel.setAttribute('aria-label', '表示設定メニュー');

  const header = document.createElement('header');
  header.className = 'settings-menu__header';

  const heading = document.createElement('div');
  heading.className = 'settings-menu__heading';

  const title = document.createElement('p');
  title.className = 'settings-menu__title';
  title.textContent = '表示設定';

  heading.append(title);

  const currentIndexLabel = createCurrentIndexLabel(
    initialCurrentIndex,
    formatZoomDistance(camera.position.distanceTo(controls.target)),
  );

  const collapseButton = document.createElement('button');
  collapseButton.type = 'button';
  collapseButton.className = 'settings-menu__collapse-button';
  collapseButton.addEventListener('click', () => {
    isSettingsMenuCollapsed = !isSettingsMenuCollapsed;
    syncSettingsMenuCollapseState();
  });

  header.append(heading, currentIndexLabel);

  const sections = document.createElement('div');
  sections.className = 'settings-menu__sections';

  const motionSection = document.createElement('section');
  motionSection.className = 'settings-menu__section';
  const motionSubtitle = createSectionSubtitle('アニメーション');
  const accelerationOrbitControl = createRangeControl({
    label: '公転スピード',
    min: 0,
    max: 10,
    step: 0.1,
    value: settings.accelerationOrbit,
    onChange: (value) => {
      settings.accelerationOrbit = value;
    },
  });
  const accelerationRotationControl = createRangeControl({
    label: '自転スピード',
    min: 0,
    max: 10,
    step: 0.1,
    value: settings.accelerationRotation,
    onChange: (value) => {
      settings.accelerationRotation = value;
    },
  });
  const sunIntensityControl = createRangeControl({
    label: '太陽光強度',
    min: 0,
    max: 10,
    step: 0.1,
    value: settings.sunIntensity,
    onChange: (value) => {
      settings.sunIntensity = value;
      (sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = value;
    },
  });
  const isAnimatingButton = createActionButton({
    label: settings.isAnimating ? 'アニメーション停止' : 'アニメーション再生',
    onClick: () => {
      settings.isAnimating = !settings.isAnimating;
      syncAnimationButtonState();
    },
  });
  isAnimatingButton.classList.add('settings-menu__button--primary');
  isAnimatingButton.setAttribute('aria-pressed', String(settings.isAnimating));

  motionSection.append(
    motionSubtitle,
    accelerationOrbitControl.row,
    accelerationRotationControl.row,
    sunIntensityControl.row,
    isAnimatingButton,
  );

  const displaySection = document.createElement('section');
  displaySection.className = 'settings-menu__section';
  const displaySubtitle = createSectionSubtitle('表示');
  const displayToggleGroup = document.createElement('div');
  displayToggleGroup.className = 'settings-menu__toggle-group';
  const showOrbitsControl = createToggleControl({
    label: '公転軌道',
    checked: settings.showOrbits,
    onChange: (checked) => {
      settings.showOrbits = checked;
    },
  });
  const showLabelsControl = createToggleControl({
    label: '惑星名',
    checked: settings.showLabels,
    onChange: (checked) => {
      settings.showLabels = checked;
    },
  });

  displayToggleGroup.append(showOrbitsControl.row, showLabelsControl.row);
  displaySection.append(displaySubtitle, displayToggleGroup);

  const viewSection = document.createElement('section');
  viewSection.className = 'settings-menu__section settings-menu__section--actions';
  const viewSubtitle = createSectionSubtitle('視点');
  viewSection.append(
    viewSubtitle,
    createActionButton({
      label: 'トップ',
      onClick: () => {
        onExitPlanetZoom();
        camera.position.set(0, 190, 0.01);
        controls.target.set(0, 0, 0);
        controls.update();
      },
    }),
    createActionButton({
      label: 'サイド',
      onClick: () => {
        onExitPlanetZoom();
        applySideView(camera, controls);
      },
    }),
    createActionButton({
      label: 'リセット',
      onClick: () => {
        onExitPlanetZoom();
        applyResetView(camera, controls);
      },
    }),
    createActionButton({
      label: '設定を初期化',
      onClick: () => {
        settings.lerpFrame = DEFAULT_SETTINGS.lerpFrame;
        settings.accelerationOrbit = DEFAULT_SETTINGS.accelerationOrbit;
        settings.accelerationRotation = DEFAULT_SETTINGS.accelerationRotation;
        settings.sunIntensity = DEFAULT_SETTINGS.sunIntensity;
        settings.zoomMinDistance = DEFAULT_SETTINGS.zoomMinDistance;
        settings.zoomMaxDistance = DEFAULT_SETTINGS.zoomMaxDistance;
        settings.isAnimating = DEFAULT_SETTINGS.isAnimating;
        settings.showOrbits = DEFAULT_SETTINGS.showOrbits;
        settings.showLabels = DEFAULT_SETTINGS.showLabels;
        settings.showPlanets = DEFAULT_SETTINGS.showPlanets;
        (sunMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = settings.sunIntensity;
        onExitPlanetZoom();
        applyResetView(camera, controls);
        const resetIndex = userDataEarthPositionRes.todayRow - 1;
        setDayIndex(resetIndex);
        setDayFraction(0);
        setFrameCount(0);
        syncCurrentIndexLabel(resetIndex);
        syncSettingsMenu();
      },
    }),
  );

  panel.append(header, sections, collapseButton);
  sections.append(motionSection, viewSection, displaySection);
  document.body.appendChild(panel);

  settingsMenuPanel = panel;
  settingsMenuSections = sections;
  settingsMenuCollapseButton = collapseButton;
  settingsMenuAnimationButton = isAnimatingButton;
  settingsMenuCurrentIndexLabel = currentIndexLabel;
  settingsMenuCamera = camera;
  settingsMenuControls = controls;
  syncCurrentIndexLabel(initialCurrentIndex);
  syncAnimationButtonDisabledState(false);
  settingsMenuRefs = {
    accelerationOrbit: accelerationOrbitControl.input,
    accelerationOrbitValue: accelerationOrbitControl.output,
    accelerationRotation: accelerationRotationControl.input,
    accelerationRotationValue: accelerationRotationControl.output,
    sunIntensity: sunIntensityControl.input,
    sunIntensityValue: sunIntensityControl.output,
    isAnimating: isAnimatingButton,
    showOrbits: showOrbitsControl.input,
    showLabels: showLabelsControl.input,
  };

  controls.addEventListener('change', syncZoomDistanceValue);
  syncSettingsMenu();
};
