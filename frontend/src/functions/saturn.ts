import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import { getOrbitColor, SATURN_NAME, SATURN_SIZE, SATURN_TILT } from './settings';

export const saturnMoons: PlanetMoon[] = [
  // sizeは地球と比べてイオは約0.29倍、エウロパは約0.24倍、ガニメデは約0.41倍、カリストは約0.34倍
  // イオ
  // {
  //   size: EARTH_SIZE * 0.29,
  //   texture: '/images/jupiterIo.jpg',
  //   orbitRadius: 20,
  //   orbitSpeed: 0.0005 * settings.accelerationOrbit,
  //   xPosition: 80, // 木星から42万kmだが目視で設定
  // },
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
