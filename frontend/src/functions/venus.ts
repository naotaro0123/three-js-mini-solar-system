import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet } from './planet-common';
import { VENUS_NAME, VENUS_ORBIT_COLOR, VENUS_SIZE, VENUS_TILT } from './settings';

export const createVenusGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('VENUS');
  const venusGroup = createPlanet(
    VENUS_NAME,
    VENUS_SIZE,
    VENUS_TILT,
    VENUS_ORBIT_COLOR,
    '/images/venusmap.jpg',
    '/images/venusbump.jpg',
    null,
    '/images/venus_atmosphere.png',
    [],
    planetPositionsRes,
  );

  if (isDebug) {
    // 金星の現在位置を表示
    addCurrentPositionMarker({ parent: venusGroup, planetPositionsRes: planetPositionsRes });
  }

  return venusGroup;
};
