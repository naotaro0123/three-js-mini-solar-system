import * as THREE from 'three';
import type { PlanetPositionRes } from './get-planet-position';
import { MOON_SIZE, settings } from './settings';
import { degToRad } from './utils';

export const PLANET_NAME = 'Planet';
const PLANET_ORBIT_NAME = 'PlanetOrbit';
const PLANET_RING_NAME = 'PlanetRing';
export const PLANET_SYSTEM_NAME = 'PlanetSystem';
export const PLANET_ATMO_SPHERE_NAME = 'PlanetAtmosphere';
export const PLANET_MOONS_NAME = 'PlanetMoons';

type Ring = {
  innerRadius: number;
  outerRadius: number;
  texture: string;
};
export type EarthMoon = {
  size: number;
  texture: string;
  bump: string;
  orbitSpeed: number;
  orbitRadius: number;
  mesh?: THREE.Mesh;
};
export const earthMoon: EarthMoon[] = [
  {
    size: MOON_SIZE,
    texture: '/images/moonmap.jpg',
    bump: '/images/moonbump.jpg',
    orbitSpeed: 0.001 * settings.accelerationOrbit,
    orbitRadius: 10, // 月の軌道半径
  },
];

export const createPlanet = (
  planetName: string,
  size: number,
  position: number,
  tilt: number, // 自転軸の傾き
  texture: THREE.Material | string,
  bump: string | null,
  ring: Ring | null,
  atmosphere: string | null,
  moons: EarthMoon[],
  planetPositionRes: PlanetPositionRes,
): THREE.Group => {
  const loadTexture = new THREE.TextureLoader();
  let material: THREE.Material | THREE.Texture;
  if (texture instanceof THREE.Material) {
    material = texture;
  } else if (bump) {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(texture),
      bumpMap: loadTexture.load(bump),
      bumpScale: 0.7,
    });
  } else {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(texture),
    });
  }

  const geometry = new THREE.SphereGeometry(size, 32, 20);
  const planet = new THREE.Mesh(geometry, material);
  planet.rotation.z = degToRad(tilt);
  planet.name = PLANET_NAME;

  const planetSystem = new THREE.Group();
  planetSystem.name = PLANET_SYSTEM_NAME;
  // APIから取得した現在位置に惑星を配置
  const earthPosition = planetPositionRes.pathPoints[planetPositionRes.todayRow - 1];
  planetSystem.position.copy(earthPosition);
  planetSystem.add(planet);

  // 自転軸を追加する
  {
    const axisRadius = 0.1;
    const axisHeight = 16;
    const axisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisHeight, 32);
    const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const earthAxis = new THREE.Mesh(axisGeometry, axisMaterial);
    earthAxis.rotation.z = degToRad(tilt); // 自転軸の傾き
    planetSystem.add(earthAxis);
  }

  if (ring) {
    const ringGeometry = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 30);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: loadTexture.load(ring.texture),
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.name = PLANET_RING_NAME;
    planetSystem.add(ringMesh);
    ringMesh.position.x = position;
    ringMesh.position.x = 0.5 * Math.PI;
    ringMesh.rotation.y = degToRad(-tilt);
  }

  if (atmosphere) {
    const atmosphereGeometry = new THREE.SphereGeometry(size + 0.1, 32, 20);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      map: loadTexture.load(atmosphere),
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.name = PLANET_ATMO_SPHERE_NAME;
    atmosphereMesh.rotation.z = 0.41;
    planet.add(atmosphereMesh);
  }

  let moonIndex = 0;
  for (const moon of moons) {
    let moonMaterial: THREE.MeshStandardMaterial;

    if (moon.bump) {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(moon.texture),
        bumpMap: loadTexture.load(moon.bump),
        bumpScale: 0.5,
      });
    } else {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(moon.texture),
      });
    }
    const moonGeometry = new THREE.SphereGeometry(moon.size, 32, 20);
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.name = `${PLANET_MOONS_NAME}_${moonIndex}`;
    moonIndex++;
    const moonOrbitDistance = size * 1.5;
    moonMesh.position.set(moonOrbitDistance, 0, 0);
    planetSystem.add(moonMesh);
    moon.mesh = moonMesh;
  }

  const planet3d = new THREE.Group();
  planet3d.add(planetSystem);
  planet3d.name = planetName;
  planet3d.userData = { earthPositionRes: planetPositionRes };

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(planetPositionRes.pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
  });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbit.name = PLANET_ORBIT_NAME;
  planet3d.add(orbit);

  return planet3d;
};
