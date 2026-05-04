import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet } from '../utils/planet-common';
import { VENUS_NAME, VENUS_SIZE, VENUS_TILT, getOrbitColor } from '../utils/settings';

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
    '/images/venus_atmosphere.jpg',
    [],
    planetPositionsRes,
    isDebug,
  );

  return venusGroup;
};
