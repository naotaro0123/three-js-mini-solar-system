import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet, Names, type PlanetMoon } from '../utils/planet-common';
import { getOrbitColor, MARS_NAME, MARS_SIZE, MARS_TILT, settings } from '../utils/settings';
import { loadGlTFModel } from '../utils/utils';

export const MARS_MOON_MESH_NAMES = {
  PHOBOS: `${Names.PLANET_MOONS_NAME}_Phobos`,
  DEIMOS: `${Names.PLANET_MOONS_NAME}_Deimos`,
} as const;

export const marsMoons: PlanetMoon[] = [
  // フォボス
  {
    size: 0.1, // GLTFなのでサイズは目視で調整する
    orbitRadius: 5,
    orbitSpeed: 0.002 * settings.accelerationOrbit,
    orbitalPeriodDays: 0.319, // フォボスの公転周期（約7.66時間）
    modelPath: '/images/mars/phobos.glb',
    xPosition: 6, // 火星から9,378kmだが目視で設定
  },
  // ダイモス
  {
    size: 0.1, // GLTFなのでサイズは目視で調整する
    orbitRadius: 12.5,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    orbitalPeriodDays: 1.263, // ダイモスの公転周期（約30.3時間）
    modelPath: '/images/mars/deimos.glb',
    xPosition: 14, // 火星から23,460kmだが目視で設定
  },
];

export const createMarsGroup = async (
  shouldAddCurrentPositionMarker: boolean,
): Promise<THREE.Group> => {
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
    shouldAddCurrentPositionMarker,
  );
  const planetSystem = marsGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  for (const [index, moon] of marsMoons.entries()) {
    if (moon.modelPath === undefined) continue;
    const model = await loadGlTFModel(moon.modelPath);
    moon.mesh = model.children[0] as THREE.Mesh;
    if (index === 0) moon.mesh.name = MARS_MOON_MESH_NAMES.PHOBOS;
    if (index === 1) moon.mesh.name = MARS_MOON_MESH_NAMES.DEIMOS;
    moon.mesh.scale.set(moon.size, moon.size, moon.size);
    moon.mesh.position.set(moon.xPosition ?? 0, 0, 0);
    moon.mesh.castShadow = true;
    moon.mesh.receiveShadow = true;
    planetSystem.add(moon.mesh);
  }
  return marsGroup;
};
