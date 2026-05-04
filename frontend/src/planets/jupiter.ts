import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet, Names, type PlanetMoon } from '../utils/planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  JUPITER_NAME,
  JUPITER_SIZE,
  JUPITER_TILT,
  settings,
} from '../utils/settings';

export const JUPITER_MOON_MESH_NAMES = {
  IO: `${Names.PLANET_MOONS_NAME}_Io`,
  EUROPA: `${Names.PLANET_MOONS_NAME}_Europa`,
  GANYMEDE: `${Names.PLANET_MOONS_NAME}_Ganymede`,
  CALLISTO: `${Names.PLANET_MOONS_NAME}_Callisto`,
} as const;

export const jupiterMoons: PlanetMoon[] = [
  // sizeは地球と比べてイオは約0.29倍、エウロパは約0.24倍、ガニメデは約0.41倍、カリストは約0.34倍
  // イオ
  {
    size: EARTH_SIZE * 0.29,
    texture: '/images/jupiterIo.jpg',
    orbitRadius: 20,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    orbitalPeriodDays: 1.8, // イオの公転周期
    xPosition: 80, // 木星から42万kmだが目視で設定
  },
  // エウロパ
  {
    size: EARTH_SIZE * 0.24,
    texture: '/images/jupiterEuropa.jpg',
    orbitRadius: 24,
    orbitSpeed: 0.00025 * settings.accelerationOrbit,
    orbitalPeriodDays: 3.5, // エウロパの公転周期
    xPosition: 90, // 木星から約67万kmだが目視で設定
  },
  // ガニメデ
  {
    size: EARTH_SIZE * 0.41,
    texture: '/images/jupiterGanymede.jpg',
    orbitRadius: 28,
    orbitSpeed: 0.000125 * settings.accelerationOrbit,
    orbitalPeriodDays: 7.1, // ガニメデの公転周期
    xPosition: 110, // 木星から約107万kmだが目視で設定
  },
  // カリスト
  {
    size: EARTH_SIZE * 0.34,
    texture: '/images/jupiterCallisto.jpg',
    orbitRadius: 32,
    orbitSpeed: 0.00006 * settings.accelerationOrbit,
    orbitalPeriodDays: 16.7, // カリストの公転周期
    xPosition: 140, // 木星から約188万kmだが目視で設定
  },
];

export const createJupiterGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('JUPITER');
  const jupiterGroup = createPlanet(
    'JUPITER',
    JUPITER_NAME,
    JUPITER_SIZE,
    JUPITER_TILT,
    getOrbitColor('JUPITER'),
    '/images/jupiter.jpg',
    null,
    null,
    null,
    jupiterMoons,
    planetPositionsRes,
    isDebug,
  );
  const planetSystem = jupiterGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const _jupiterMoons = planetSystem.children.filter((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  for (const [index, moon] of _jupiterMoons.entries()) {
    if (index === 0) moon.name = JUPITER_MOON_MESH_NAMES.IO;
    if (index === 1) moon.name = JUPITER_MOON_MESH_NAMES.EUROPA;
    if (index === 2) moon.name = JUPITER_MOON_MESH_NAMES.GANYMEDE;
    if (index === 3) moon.name = JUPITER_MOON_MESH_NAMES.CALLISTO;
    moon.position.set(jupiterMoons[index].xPosition ?? 0, 0, 0);
  }

  return jupiterGroup;
};
