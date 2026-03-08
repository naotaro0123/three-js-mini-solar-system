import * as THREE from 'three';
import { addCurrentPositionMarker } from './debug';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import { getOrbitColor, MARS_NAME, MARS_SIZE, MARS_TILT, settings } from './settings';
import { loadGlTFModel } from './utils';

export const marsMoons: PlanetMoon[] = [
  // フォボス
  {
    size: 0.1, // GLTFなのでサイズは目視で調整する
    orbitRadius: 5,
    orbitSpeed: 0.002 * settings.accelerationOrbit,
    modelPath: '/images/mars/phobos.glb',
    xPosition: 6, // 火星から9,378kmだが目視で設定
  },
  // ダイモス
  {
    size: 0.1, // GLTFなのでサイズは目視で調整する
    orbitRadius: 12.5,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    modelPath: '/images/mars/deimos.glb',
    xPosition: 14, // 火星から23,460kmだが目視で設定
  },
];

export const createMarsGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('MARS');
  const marsGroup = createPlanet(
    'MARS',
    MARS_NAME,
    MARS_SIZE,
    MARS_TILT,
    getOrbitColor('MARS'),
    '/images/marsmap.jpg',
    '/images/marsbump.jpg',
    null,
    null,
    // marsMoons,
    [],
    planetPositionsRes,
  );
  const planetSystem = marsGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  for (const [index, moon] of marsMoons.entries()) {
    if (moon.modelPath === undefined) continue;
    const model = await loadGlTFModel(moon.modelPath);
    moon.mesh = model.children[0] as THREE.Mesh;
    moon.mesh.name = `${Names.PLANET_MOONS_NAME}_${index}`;
    moon.mesh.scale.set(moon.size, moon.size, moon.size);
    moon.mesh.position.set(moon.xPosition ?? 0, 0, 0);
    moon.mesh.castShadow = true;
    moon.mesh.receiveShadow = true;
    planetSystem.add(moon.mesh);
  }
  if (isDebug) {
    // 火星の現在位置を表示
    addCurrentPositionMarker({
      parent: marsGroup,
      commandKey: 'MARS',
      planetPositionsRes: planetPositionsRes,
    });
  }

  return marsGroup;
};
