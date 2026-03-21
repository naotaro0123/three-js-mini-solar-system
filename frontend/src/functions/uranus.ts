import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  settings,
  URANUS_NAME,
  URANUS_SIZE,
  URANUS_TILT,
} from './settings';

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
    xPosition: 58,
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

  if (isDebug) {
    // 現在位置を表示
    addCurrentPositionMarker({
      parent: uranusGroup,
      commandKey: 'URANUS',
      planetPositionsRes: planetPositionsRes,
    });
  }

  return uranusGroup;
};
