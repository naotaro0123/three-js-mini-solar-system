import * as THREE from 'three';
import type { PlanetPositionsRes } from './get-planet-position';
import { degToRad } from './utils';

export const Names = {
  PLANET_NAME: 'Planet',
  PLANET_ORBIT_NAME: 'PlanetOrbit',
  PLANET_RING_NAME: 'PlanetRing',
  PLANET_AXIS_NAME: 'PlanetAxis',
  PLANET_SYSTEM_NAME: 'PlanetSystem',
  PLANET_ATMO_SPHERE_NAME: 'PlanetAtmosphere',
  PLANET_MOONS_NAME: 'PlanetMoons',
} as const;

type Ring = {
  innerRadius: number;
  outerRadius: number;
  texture: string;
};
export type PlanetMoon = {
  size: number;
  orbitSpeed: number;
  orbitRadius: number;
  texture?: string;
  bump?: string;
  mesh?: THREE.Mesh;
  modelPath?: string;
  xPosition?: number;
};

export const createPlanet = (
  planetName: string,
  size: number,
  tilt: number, // 自転軸の傾き
  orbitColor: number, // 軌道の色
  texture: THREE.Material | string,
  bump: string | null,
  ring: Ring | null,
  atmosphere: string | null,
  moons: PlanetMoon[],
  planetPositionsRes: PlanetPositionsRes,
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
  planet.name = Names.PLANET_NAME;

  const planetSystem = new THREE.Group();
  planetSystem.name = Names.PLANET_SYSTEM_NAME;
  // APIから取得した現在位置に惑星を配置
  const earthPosition = planetPositionsRes.pathPoints[planetPositionsRes.todayRow - 1];
  planetSystem.position.copy(earthPosition);
  planetSystem.add(planet);

  // 自転軸を追加する
  {
    const axisRadius = 0.1;
    const axisHeight = 2.8 * size; // 惑星の大きさに応じて軸の長さを調整
    const axisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisHeight, 32);
    const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const AxisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
    AxisMesh.name = Names.PLANET_AXIS_NAME;
    AxisMesh.rotation.z = degToRad(tilt); // 自転軸の傾き
    planetSystem.add(AxisMesh);
  }

  if (ring) {
    const ringGeometry = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 30);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: loadTexture.load(ring.texture),
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.name = Names.PLANET_RING_NAME;
    planetSystem.add(ringMesh);
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
    atmosphereMesh.name = Names.PLANET_ATMO_SPHERE_NAME;
    atmosphereMesh.rotation.z = 0.41;
    planet.add(atmosphereMesh);
  }

  // TODO: 地球の月のみで火星は使ってないので分離する
  let moonIndex = 0;
  for (const moon of moons) {
    let moonMaterial: THREE.MeshStandardMaterial;

    if (moon.texture === undefined) continue;
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
    moonMesh.name = `${Names.PLANET_MOONS_NAME}_${moonIndex}`;
    moonIndex++;
    const moonOrbitDistance = size * 1.5;
    moonMesh.position.set(moonOrbitDistance, 0, 0);
    planetSystem.add(moonMesh);
    moon.mesh = moonMesh;
  }

  const planet3d = new THREE.Group();
  planet3d.add(planetSystem);
  planet3d.name = planetName;
  planet3d.userData = { planetPositionsRes };

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(planetPositionsRes.pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: orbitColor,
    transparent: true,
    opacity: 0.2,
  });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbit.name = Names.PLANET_ORBIT_NAME;
  planet3d.add(orbit);

  return planet3d;
};
