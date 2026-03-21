import * as THREE from 'three';
import { settings, SUN_SIZE } from './settings';

const SUN_NAME = 'Sun';

const sunMaterial = new THREE.MeshStandardMaterial({
  emissive: 0xfff88f,
  emissiveMap: new THREE.TextureLoader().load('./images/sun.jpg'),
  emissiveIntensity: settings.sunIntensity,
});

export const createSunMesh = (): THREE.Mesh => {
  const sunGeometry = new THREE.SphereGeometry(SUN_SIZE, 32, 20);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = SUN_NAME;

  // 近距離の惑星向けの主光源
  const pointLight = new THREE.PointLight(0xfdffd3, 100, 0, 1.4);
  // 外惑星向けの補助光源
  const outerFillLight = new THREE.PointLight(0xe8efff, 20, 80000, 0.5);

  sunMesh.add(pointLight);
  sunMesh.add(outerFillLight);
  return sunMesh;
};
