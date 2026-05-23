import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { degToRad } from './utils';
import { settings } from './settings';
import { syncAnimationButtonDisabledState, syncSettingsMenu } from './environment';

export type PlanetInteractionController = {
  handleDoubleClickPlanetZoom: (event: MouseEvent) => void;
  handlePlanetHover: (event: PointerEvent) => void;
  clearPlanetHover: () => void;
  exitPlanetZoom: () => boolean;
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
  let hoveredPlanet: THREE.Mesh | null = null;
  let isPlanetZoomed = false;
  const zoomCloseButton = document.createElement('button');

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

  const exitPlanetZoom = (): boolean => {
    if (!isPlanetZoomed) return false;

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
    const center = new THREE.Vector3();
    planet.getWorldPosition(center);

    const planetMesh = planet as THREE.Mesh;
    const sphereGeometry = planetMesh.geometry as THREE.SphereGeometry;
    sphereGeometry.computeBoundingSphere();
    const localRadius = sphereGeometry.boundingSphere?.radius ?? 1;

    const worldScale = new THREE.Vector3();
    planet.getWorldScale(worldScale);
    const worldRadius = localRadius * Math.max(worldScale.x, worldScale.y, worldScale.z);

    const distance = (worldRadius / Math.tan(degToRad(camera.fov) / 2)) * 1.35;
    const viewDirection = new THREE.Vector3().subVectors(camera.position, controls.target);
    if (viewDirection.lengthSq() === 0) {
      viewDirection.set(0, 0, 1);
    }
    viewDirection.normalize();

    camera.position.copy(center).add(viewDirection.multiplyScalar(distance));
    controls.target.copy(center);
    controls.update();
  };

  const handleDoubleClickPlanetZoom = (event: MouseEvent): void => {
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
    handleDoubleClickPlanetZoom,
    handlePlanetHover,
    clearPlanetHover,
    exitPlanetZoom,
  };
};
