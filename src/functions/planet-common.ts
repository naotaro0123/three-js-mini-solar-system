import * as THREE from 'three';
import { MOON_SIZE, settings } from './settings';

export const PLANET_NAME = 'Planet';
const PLANET_ORBIT_NAME = 'PlanetOrbit';
const PLANET_RING_NAME = 'PlanetRing';
const PLANET_SYSTEM_NAME = 'PlanetSystem';
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
    orbitRadius: 10,
  },
];

export const createPlanet = (
  planetName: string,
  size: number,
  position: number,
  tilt: number,
  texture: THREE.Material | string,
  bump: string | null,
  ring: Ring | null,
  atmosphere: string | null,
  moons: EarthMoon[],
  pathPoints: THREE.Vector2[] = [],
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
  planet.name = PLANET_NAME;
  planet.position.x = position;
  planet.position.z = (tilt * Math.PI) / 180;

  const planetSystem = new THREE.Group();
  planetSystem.name = PLANET_SYSTEM_NAME;
  planetSystem.add(planet);

  // TODO: 他の惑星を追加時に外部から渡すように修正する
  const orbitPath = new THREE.EllipseCurve(
    0,
    0, // ax, aY
    position,
    position, // xRadius, yRadius
    0,
    2 * Math.PI, // aStartAngle, aEndAngle
    false, // aClockwise
    0, // aRotation
  );
  const _pathPoints = orbitPath.getPoints(100);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints ?? _pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
  });
  const orbit = new THREE.LineLoop(orbitGeometry, orbitMaterial);
  orbit.name = PLANET_ORBIT_NAME;
  orbit.rotation.x = Math.PI / 2;
  planetSystem.add(orbit);

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
    ringMesh.rotation.y = (-tilt * Math.PI) / 180;
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
  return planet3d;
};
