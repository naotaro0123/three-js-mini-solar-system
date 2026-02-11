import * as THREE from 'three';
import { getPlanetPosition } from './get-planet-position';
import { createPlanet } from './planet-common';
import { MERCURY_NAME, MERCURY_SIZE, MERCURY_TILT } from './settings';

export const createMercuryGroup = async (): Promise<THREE.Group> => {
  const position = await getPlanetPosition('MERCURY');
  return createPlanet(
    MERCURY_NAME,
    MERCURY_SIZE,
    MERCURY_TILT,
    '/images/mercurymap.jpg',
    '/images/mercurybump.jpg',
    null,
    null,
    [],
    position,
  );
};
