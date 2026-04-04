import * as THREE from 'three';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  NEPTUNE_NAME,
  NEPTUNE_SIZE,
  NEPTUNE_TILT,
  settings,
} from './settings';

export const NEPTUNE_MOON_MESH_NAMES = {
  TRITON: `${Names.PLANET_MOONS_NAME}_Triton`,
  PROTEUS: `${Names.PLANET_MOONS_NAME}_Proteus`,
  NEREID: `${Names.PLANET_MOONS_NAME}_Nereid`,
} as const;

export const neptuneMoons: PlanetMoon[] = [
  // Triton: 地球の約0.21倍。海王星の主衛星
  {
    size: EARTH_SIZE * 0.21,
    texture: '/images/Triton-tok.webp',
    orbitRadius: 14,
    orbitSpeed: 0.0007 * settings.accelerationOrbit,
    xPosition: 120,
  },
  // Proteus: 地球の約0.033倍。海王星に比較的近い不規則衛星
  {
    size: EARTH_SIZE * 0.033,
    texture: '/images/Proteus.webp',
    orbitRadius: 10,
    orbitSpeed: 0.00035 * settings.accelerationOrbit,
    xPosition: 150,
  },
  // Nereid: 地球の約0.053倍。遠方を大きく公転する衛星
  {
    size: EARTH_SIZE * 0.053,
    texture: '/images/Nereidimproved.webp',
    orbitRadius: 18,
    orbitSpeed: 0.00008 * settings.accelerationOrbit,
    xPosition: 210,
  },
];

export const createNeptuneGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('NEPTUNE');
  const neptuneGroup = createPlanet(
    'NEPTUNE',
    NEPTUNE_NAME,
    NEPTUNE_SIZE,
    NEPTUNE_TILT,
    getOrbitColor('NEPTUNE'),
    '/images/neptune.jpg',
    null,
    null,
    null,
    neptuneMoons,
    planetPositionsRes,
    isDebug,
  );
  const planetSystem = neptuneGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const _neptuneMoons = planetSystem.children.filter((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  for (const [index, moon] of _neptuneMoons.entries()) {
    if (index === 0) moon.name = NEPTUNE_MOON_MESH_NAMES.TRITON;
    if (index === 1) moon.name = NEPTUNE_MOON_MESH_NAMES.PROTEUS;
    if (index === 2) moon.name = NEPTUNE_MOON_MESH_NAMES.NEREID;
    moon.position.set(neptuneMoons[index].xPosition ?? 0, 0, 0);
  }

  return neptuneGroup;
};
