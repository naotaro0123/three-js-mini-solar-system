import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet } from './planet-common';
import { NEPTUNE_NAME, NEPTUNE_SIZE, NEPTUNE_TILT, getOrbitColor } from './settings';

export const createNeptuneGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('NEPTUNE');
  const neptuneGroup = createPlanet(
    'NEPTUNE',
    NEPTUNE_NAME,
    NEPTUNE_SIZE,
    NEPTUNE_TILT,
    getOrbitColor('NEPTUNE'),
    '/images/neptune.jpg',
    null,
    null,
    null,
    [],
    planetPositionsRes,
  );

  if (isDebug) {
    // 現在位置を表示
    addCurrentPositionMarker({
      parent: neptuneGroup,
      commandKey: 'NEPTUNE',
      planetPositionsRes: planetPositionsRes,
    });
  }

  return neptuneGroup;
};
