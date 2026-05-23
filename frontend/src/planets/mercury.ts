import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet } from '../utils/planet-common';
import { MERCURY_NAME, MERCURY_SIZE, MERCURY_TILT, getOrbitColor } from '../utils/settings';

export const createMercuryGroup = async (
  shouldAddCurrentPositionMarker: boolean,
): Promise<THREE.Group> => {
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
    shouldAddCurrentPositionMarker,
  );

  return mercuryGroup;
};
