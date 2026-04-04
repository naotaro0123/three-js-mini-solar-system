import * as THREE from 'three';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet } from './planet-common';
import { VENUS_NAME, VENUS_SIZE, VENUS_TILT, getOrbitColor } from './settings';

export const createVenusGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('VENUS');
  const venusGroup = createPlanet(
    'VENUS',
    VENUS_NAME,
    VENUS_SIZE,
    VENUS_TILT,
    getOrbitColor('VENUS'),
    '/images/venusmap.jpg',
    '/images/venusbump.jpg',
    null,
    '/images/venus_atmosphere.png',
    [],
    planetPositionsRes,
    isDebug,
  );

  return venusGroup;
};
