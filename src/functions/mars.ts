import * as THREE from 'three';
import { getPlanetPosition } from './get-planet-position';
import { createPlanet } from './planet-common';
import { MARS_NAME, MARS_ORBIT_COLOR, MARS_SIZE, MARS_TILT } from './settings';

export const createMarsGroup = async (): Promise<THREE.Group> => {
  const position = await getPlanetPosition('MARS');
  return createPlanet(
    MARS_NAME,
    MARS_SIZE,
    MARS_TILT,
    MARS_ORBIT_COLOR,
    '/images/marsmap.jpg',
    '/images/marsbump.jpg',
    null,
    null,
    [],
    position,
  );
};
