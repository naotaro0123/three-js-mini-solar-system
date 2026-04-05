import * as THREE from 'three';
import {
  settings,
  SUN_EMISSIVE_COLOR,
  SUN_FILL_LIGHT_COLOR,
  SUN_FILL_LIGHT_DECAY,
  SUN_FILL_LIGHT_DISTANCE,
  SUN_FILL_LIGHT_INTENSITY,
  SUN_POINT_LIGHT_COLOR,
  SUN_POINT_LIGHT_DECAY,
  SUN_POINT_LIGHT_INTENSITY,
  SUN_SIZE,
} from './settings';

const SUN_NAME = 'Sun';

const sunMaterial = new THREE.MeshStandardMaterial({
  emissive: SUN_EMISSIVE_COLOR,
  emissiveMap: new THREE.TextureLoader().load('./images/sun.jpg'),
  emissiveIntensity: settings.sunIntensity,
});

export const createSunMesh = (): THREE.Mesh => {
  const sunGeometry = new THREE.SphereGeometry(SUN_SIZE, 32, 20);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = SUN_NAME;

  // 近距離の惑星向けの主光源
  const pointLight = new THREE.PointLight(
    SUN_POINT_LIGHT_COLOR,
    SUN_POINT_LIGHT_INTENSITY,
    0,
    SUN_POINT_LIGHT_DECAY,
  );
  // 外惑星向けの補助光源
  const outerFillLight = new THREE.PointLight(
    SUN_FILL_LIGHT_COLOR,
    SUN_FILL_LIGHT_INTENSITY,
    SUN_FILL_LIGHT_DISTANCE,
    SUN_FILL_LIGHT_DECAY,
  );

  sunMesh.add(pointLight);
  sunMesh.add(outerFillLight);
  return sunMesh;
};
