import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  SATURN_NAME,
  SATURN_SIZE,
  SATURN_TILT,
  settings,
} from './settings';

export const saturnMoons: PlanetMoon[] = [
  // タイタン: 地球の約0.4倍。土星からの距離は目視で調整。
  {
    size: EARTH_SIZE * 0.4,
    texture: '/images/RS3_Titan.webp',
    orbitRadius: 16,
    orbitSpeed: 0.00009 * settings.accelerationOrbit,
    xPosition: 95,
  },
];

export const createSaturnGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('SATURN');
  const saturnGroup = createPlanet(
    'SATURN',
    SATURN_NAME,
    SATURN_SIZE,
    SATURN_TILT,
    getOrbitColor('SATURN'),
    '/images/saturnmap.jpg',
    null,
    {
      innerRadius: 18,
      outerRadius: 29,
      texture: '/images/saturn_ring.png',
    },
    null,
    saturnMoons,
    planetPositionsRes,
  );
  const planetSystem = saturnGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const _saturnMoons = planetSystem.children.filter((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  for (const [index, moon] of _saturnMoons.entries()) {
    moon.position.set(saturnMoons[index].xPosition ?? 0, 0, 0);
  }

  if (isDebug) {
    // 木星の現在位置を表示
    addCurrentPositionMarker({
      parent: saturnGroup,
      commandKey: 'SATURN',
      planetPositionsRes: planetPositionsRes,
    });
  }

  return saturnGroup;
};
