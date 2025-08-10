import * as THREE from 'three';
import { settings } from './settings';

const SUN_NAME = 'Sun';

const sunMaterial = new THREE.MeshStandardMaterial({
  emissive: 0xfff88f,
  emissiveMap: new THREE.TextureLoader().load('./images/sun.jpg'),
  emissiveIntensity: settings.sunIntensity,
});

export const createSunMesh = (): THREE.Mesh => {
  const sunSize = 697 / 40; // 40 times smaller scale than earth
  const sunGeometry = new THREE.SphereGeometry(sunSize, 32, 20);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.name = SUN_NAME;

  //point light in the sun
  const pointLight = new THREE.PointLight(0xfdffd3, 1200, 400, 1.4);
  sunMesh.add(pointLight);
  return sunMesh;
};
