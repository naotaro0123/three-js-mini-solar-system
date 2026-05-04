import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet, Names, type PlanetMoon } from '../utils/planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  settings,
  URANUS_NAME,
  URANUS_SIZE,
  URANUS_TILT,
} from '../utils/settings';

export const URANUS_MOON_MESH_NAMES = {
  MIRANDA: `${Names.PLANET_MOONS_NAME}_Miranda`,
  ARIEL: `${Names.PLANET_MOONS_NAME}_Ariel`,
  UMBRIEL: `${Names.PLANET_MOONS_NAME}_Umbriel`,
  TITANIA: `${Names.PLANET_MOONS_NAME}_Titania`,
  OBERON: `${Names.PLANET_MOONS_NAME}_Oberon`,
} as const;

export const uranusMoons: PlanetMoon[] = [
  // Miranda: 地球の約0.037倍。天王星に近い内側を公転
  {
    size: EARTH_SIZE * 0.037,
    texture: '/images/Miranda-0.webp',
    orbitRadius: 10,
    orbitSpeed: 0.0007 * settings.accelerationOrbit,
    orbitalPeriodDays: 1.41, // ミランダの公転周期
    xPosition: 58,
  },
  // Ariel: 地球の約0.084倍。天王星の第2衛星
  {
    size: EARTH_SIZE * 0.084,
    texture: '/images/Ariel-0.webp',
    orbitRadius: 10,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    orbitalPeriodDays: 2.52, // アリエルの公転周期
    xPosition: 90,
  },
  // Umbriel: 地球の約0.070倍。天王星の第3衛星
  {
    size: EARTH_SIZE * 0.07,
    texture: '/images/Uranus-0.webp',
    orbitRadius: 10,
    orbitSpeed: 0.0004 * settings.accelerationOrbit,
    orbitalPeriodDays: 4.14, // ウンブリエルの公転周期
    xPosition: 120,
  },
  // Titania: 地球の約0.110倍。天王星の第4衛星
  {
    size: EARTH_SIZE * 0.11,
    texture: '/images/Titaniamap.webp',
    orbitRadius: 10,
    orbitSpeed: 0.0003 * settings.accelerationOrbit,
    orbitalPeriodDays: 8.71, // チタニアの公転周期
    xPosition: 150,
  },
  // Oberon: 地球の約0.105倍。天王星の第5衛星
  {
    size: EARTH_SIZE * 0.105,
    texture: '/images/Oberonmap1.webp',
    orbitRadius: 10,
    orbitSpeed: 0.0002 * settings.accelerationOrbit,
    orbitalPeriodDays: 13.46, // オベロンの公転周期
    xPosition: 180,
  },
];

export const createUranusGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('URANUS');
  const uranusGroup = createPlanet(
    'URANUS',
    URANUS_NAME,
    URANUS_SIZE,
    URANUS_TILT,
    getOrbitColor('URANUS'),
    '/images/uranus.jpg',
    null,
    {
      innerRadius: 8,
      outerRadius: 10,
      texture: '/images/uranus_ring.png',
    },
    null,
    uranusMoons,
    planetPositionsRes,
    isDebug,
  );
  const planetSystem = uranusGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const _uranusMoons = planetSystem.children.filter((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  for (const [index, moon] of _uranusMoons.entries()) {
    if (index === 0) moon.name = URANUS_MOON_MESH_NAMES.MIRANDA;
    if (index === 1) moon.name = URANUS_MOON_MESH_NAMES.ARIEL;
    if (index === 2) moon.name = URANUS_MOON_MESH_NAMES.UMBRIEL;
    if (index === 3) moon.name = URANUS_MOON_MESH_NAMES.TITANIA;
    if (index === 4) moon.name = URANUS_MOON_MESH_NAMES.OBERON;
    moon.position.set(uranusMoons[index].xPosition ?? 0, 0, 0);
  }

  return uranusGroup;
};
