import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet } from './planet-common';
import { MERCURY_NAME, MERCURY_SIZE, MERCURY_TILT, getOrbitColor } from './settings';

export const createMercuryGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('MERCURY');
  const mercuryGroup = createPlanet(
    'MERCURY',
    MERCURY_NAME,
    MERCURY_SIZE,
    MERCURY_TILT,
    getOrbitColor('MERCURY'),
    '/images/mercurymap.jpg',
    '/images/mercurybump.jpg',
    null,
    null,
    [],
    planetPositionsRes,
  );

  if (isDebug) {
    // 現在位置を表示
    addCurrentPositionMarker({
      parent: mercuryGroup,
      commandKey: 'MERCURY',
      planetPositionsRes: planetPositionsRes,
    });
  }

  return mercuryGroup;
};
