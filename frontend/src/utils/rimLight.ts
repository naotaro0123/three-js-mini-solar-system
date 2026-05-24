import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MOBILE_MAX_WIDTH } from './camera-view';
import { syncAnimationButtonDisabledState, syncSettingsMenu } from './environment';
import { settings } from './settings';
import { degToRad } from './utils';

export type PlanetInteractionController = {
  handlePlanetPointerDown: (event: PointerEvent) => void;
  handlePlanetPointerUp: (event: PointerEvent) => void;
  clearPlanetTapState: () => void;
  handlePlanetHover: (event: PointerEvent) => void;
  clearPlanetHover: () => void;
  exitPlanetZoom: () => boolean;
};

const DEFAULT_PLANET_ZOOM_DISTANCE_MULTIPLIER = 1.65;
const MOBILE_PLANET_ZOOM_DISTANCE_MULTIPLIER = 2.85;

const getViewportWidth = (): number => {
  return typeof window === 'undefined' ? MOBILE_MAX_WIDTH + 1 : window.innerWidth;
};

export const getPlanetZoomDistanceMultiplier = (viewportWidth = getViewportWidth()): number => {
  return viewportWidth <= MOBILE_MAX_WIDTH
    ? MOBILE_PLANET_ZOOM_DISTANCE_MULTIPLIER
    : DEFAULT_PLANET_ZOOM_DISTANCE_MULTIPLIER;
};

export const createPlanetInteractionController = (params: {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  planets: THREE.Mesh[];
  onResetView: () => void;
}): PlanetInteractionController => {
  const { renderer, camera, controls, planets, onResetView } = params;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const tapStartPointer = new THREE.Vector2();
  const zoomTargetCenter = new THREE.Vector3();
  const zoomWorldScale = new THREE.Vector3();
  const zoomViewDirection = new THREE.Vector3();
  const animationStartPosition = new THREE.Vector3();
  const animationEndPosition = new THREE.Vector3();
  const animationStartTarget = new THREE.Vector3();
  const animationEndTarget = new THREE.Vector3();
  let hoveredPlanet: THREE.Mesh | null = null;
  let isPlanetZoomed = false;
  let activePointerId: number | null = null;
  let cameraAnimationFrameId: number | null = null;
  const zoomCloseButton = document.createElement('button');
  const TAP_MOVE_THRESHOLD = 10;
  const CAMERA_ZOOM_DURATION_MS = 650;

  const rimLightMeshName = 'PlanetHoverRimLight';
  const rimLightMaterial = new THREE.ShaderMaterial({
    uniforms: {
      rimColor: { value: new THREE.Color(0x99d1ff) },
      rimPower: { value: 2.6 },
    },
    vertexShader: `
      uniform float rimPower;
      varying float vRim;
      void main() {
        vec3 worldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 viewDir = normalize(cameraPosition - worldPosition.xyz);
        vRim = pow(1.0 - max(dot(viewDir, worldNormal), 0.0), rimPower);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 rimColor;
      varying float vRim;
      void main() {
        gl_FragColor = vec4(rimColor * vRim, vRim);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.BackSide,
  });

  const setPointerFromEvent = (event: MouseEvent | PointerEvent): void => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  zoomCloseButton.type = 'button';
  zoomCloseButton.className = 'planet-zoom-close-button';
  zoomCloseButton.textContent = '視点をリセット';
  zoomCloseButton.title = '視点をリセット';
  zoomCloseButton.setAttribute('aria-label', '視点をリセット');
  zoomCloseButton.hidden = true;
  zoomCloseButton.addEventListener('click', () => {
    onResetView();
  });
  document.body.appendChild(zoomCloseButton);

  const setPlanetRimLight = (planet: THREE.Mesh, isEnabled: boolean): void => {
    const existingRimLight = planet.getObjectByName(rimLightMeshName);

    if (isEnabled) {
      if (existingRimLight) return;
      const rimMesh = new THREE.Mesh(planet.geometry, rimLightMaterial);
      rimMesh.name = rimLightMeshName;
      rimMesh.scale.setScalar(1.04);
      planet.add(rimMesh);
      return;
    }

    if (existingRimLight) {
      planet.remove(existingRimLight);
    }
  };

  const clearPlanetHover = (): void => {
    if (!hoveredPlanet) return;
    setPlanetRimLight(hoveredPlanet, false);
    hoveredPlanet = null;
  };

  const easeInOutCubic = (value: number): number => {
    if (value < 0.5) return 4 * value * value * value;
    return 1 - Math.pow(-2 * value + 2, 3) / 2;
  };

  const stopCameraAnimation = (): void => {
    if (cameraAnimationFrameId !== null) {
      cancelAnimationFrame(cameraAnimationFrameId);
      cameraAnimationFrameId = null;
    }
    controls.enabled = true;
  };

  const animateCameraTo = (
    nextPosition: THREE.Vector3,
    nextTarget: THREE.Vector3,
  ): void => {
    stopCameraAnimation();
    controls.enabled = false;
    animationStartPosition.copy(camera.position);
    animationEndPosition.copy(nextPosition);
    animationStartTarget.copy(controls.target);
    animationEndTarget.copy(nextTarget);
    const startedAt = performance.now();

    const step = (now: number): void => {
      const progress = Math.min((now - startedAt) / CAMERA_ZOOM_DURATION_MS, 1);
      const easedProgress = easeInOutCubic(progress);

      camera.position.lerpVectors(
        animationStartPosition,
        animationEndPosition,
        easedProgress,
      );
      controls.target.lerpVectors(
        animationStartTarget,
        animationEndTarget,
        easedProgress,
      );
      controls.update();

      if (progress < 1) {
        cameraAnimationFrameId = requestAnimationFrame(step);
        return;
      }

      cameraAnimationFrameId = null;
      controls.enabled = true;
    };

    cameraAnimationFrameId = requestAnimationFrame(step);
  };

  const exitPlanetZoom = (): boolean => {
    if (!isPlanetZoomed) return false;

    stopCameraAnimation();
    clearPlanetHover();
    isPlanetZoomed = false;
    settings.isOrbitPausedByZoom = false;
    syncSettingsMenu();
    syncAnimationButtonDisabledState(false);
    zoomCloseButton.hidden = true;
    return true;
  };

  const showZoomCloseButton = (): void => {
    zoomCloseButton.hidden = false;
  };

  const zoomToPlanet = (planet: THREE.Object3D): void => {
    planet.getWorldPosition(zoomTargetCenter);

    const planetMesh = planet as THREE.Mesh;
    const sphereGeometry = planetMesh.geometry as THREE.SphereGeometry;
    sphereGeometry.computeBoundingSphere();
    const localRadius = sphereGeometry.boundingSphere?.radius ?? 1;

    planet.getWorldScale(zoomWorldScale);
    const worldRadius = localRadius * Math.max(zoomWorldScale.x, zoomWorldScale.y, zoomWorldScale.z);

    const distance =
      (worldRadius / Math.tan(degToRad(camera.fov) / 2)) *
      getPlanetZoomDistanceMultiplier();
    zoomViewDirection.subVectors(camera.position, controls.target);
    if (zoomViewDirection.lengthSq() === 0) {
      zoomViewDirection.set(0, 0, 1);
    }
    zoomViewDirection.normalize();

    animationEndPosition
      .copy(zoomTargetCenter)
      .add(zoomViewDirection.multiplyScalar(distance));
    animateCameraTo(animationEndPosition, zoomTargetCenter);
  };

  const handlePlanetPointerDown = (event: PointerEvent): void => {
    if (!event.isPrimary) return;

    activePointerId = event.pointerId;
    tapStartPointer.set(event.clientX, event.clientY);
  };

  const clearPlanetTapState = (): void => {
    activePointerId = null;
  };

  const handlePlanetPointerUp = (event: PointerEvent): void => {
    if (!event.isPrimary || activePointerId !== event.pointerId) return;

    const moveDistance = tapStartPointer.distanceTo(
      new THREE.Vector2(event.clientX, event.clientY),
    );
    clearPlanetTapState();

    if (moveDistance > TAP_MOVE_THRESHOLD) return;

    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(planets, false);
    if (intersects.length === 0) return;

    const targetPlanet = intersects[0].object;
    if (!isPlanetZoomed) {
      settings.isOrbitPausedByZoom = true;
      syncSettingsMenu();
      isPlanetZoomed = true;
      syncAnimationButtonDisabledState(true);
    }
    showZoomCloseButton();
    zoomToPlanet(targetPlanet);
  };

  const handlePlanetHover = (event: PointerEvent): void => {
    setPointerFromEvent(event);
    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(planets, false);
    const targetPlanet = intersects[0]?.object;

    if (!(targetPlanet instanceof THREE.Mesh)) {
      clearPlanetHover();
      return;
    }

    if (hoveredPlanet === targetPlanet) return;

    clearPlanetHover();
    hoveredPlanet = targetPlanet;
    setPlanetRimLight(targetPlanet, true);
  };

  return {
    handlePlanetPointerDown,
    handlePlanetPointerUp,
    clearPlanetTapState,
    handlePlanetHover,
    clearPlanetHover,
    exitPlanetZoom,
  };
};
