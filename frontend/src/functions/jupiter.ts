import * as THREE from 'three';
import { getPlanetPosition } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import {
  JUPITER_NAME,
  JUPITER_ORBIT_COLOR,
  JUPITER_SIZE,
  JUPITER_TILT,
  settings,
} from './settings';
import { loadGlTFModel } from './utils';

export const jupiterMoons: PlanetMoon[] = [
  // イオ
  {
    size: 1.6,
    texture: '/images/jupiterIo.jpg',
    orbitRadius: 20,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
  },
  // エウロパ
  {
    size: 1.4,
    texture: '/images/jupiterEuropa.jpg',
    orbitRadius: 24,
    orbitSpeed: 0.00025 * settings.accelerationOrbit,
  },
  // ガニメデ
  {
    size: 2,
    texture: '/images/jupiterGanymede.jpg',
    orbitRadius: 28,
    orbitSpeed: 0.000125 * settings.accelerationOrbit,
  },
  // カリスト
  {
    size: 1.7,
    texture: '/images/jupiterCallisto.jpg',
    orbitRadius: 32,
    orbitSpeed: 0.00006 * settings.accelerationOrbit,
  },
];

export const createJupiterGroup = async (): Promise<THREE.Group> => {
  const position = await getPlanetPosition('JUPITER');
  const jupiterGroup = createPlanet(
    JUPITER_NAME,
    JUPITER_SIZE,
    JUPITER_TILT,
    JUPITER_ORBIT_COLOR,
    '/images/jupiter.jpg',
    null,
    null,
    null,
    // jupiterMoons,
    [],
    position,
  );
  const planetSystem = jupiterGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  for (const [index, moon] of jupiterMoons.entries()) {
    if (moon.modelPath === undefined) continue;
    const model = await loadGlTFModel(moon.modelPath);
    moon.mesh = model.children[0] as THREE.Mesh;
    moon.mesh.name = `${Names.PLANET_MOONS_NAME}_${index}`;
    moon.mesh.scale.set(moon.size, moon.size, moon.size);
    moon.mesh.position.set(moon.xPosition ?? 0, 0, 0);
    moon.mesh.castShadow = true;
    moon.mesh.receiveShadow = true;
    planetSystem.add(moon.mesh);
  }
  return jupiterGroup;
};
