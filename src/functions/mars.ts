import * as THREE from 'three';
import { getPlanetPosition } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import { MARS_NAME, MARS_ORBIT_COLOR, MARS_SIZE, MARS_TILT, settings } from './settings';
import { loadGlTFModel } from './utils';

export const marsMoons: PlanetMoon[] = [
  // TODO: 月と地球は384,400 km => EARTH_SIZE(6.4) * 1.5にしてた。
  // フォボス
  {
    size: 0.1,
    orbitRadius: 5,
    orbitSpeed: 0.002 * settings.accelerationOrbit,
    modelPath: '/images/mars/phobos.glb',
    xPosition: 6, // 火星から9,378kmだが目視で設定
  },
  // ダイモス
  {
    size: 0.1,
    orbitRadius: 9,
    orbitSpeed: 0.0005 * settings.accelerationOrbit,
    modelPath: '/images/mars/deimos.glb',
    xPosition: 14, // 火星から23,460kmだが目視で設定
  },
];

export const createMarsGroup = async (): Promise<THREE.Group> => {
  const position = await getPlanetPosition('MARS');
  const marsGroup = createPlanet(
    MARS_NAME,
    MARS_SIZE,
    MARS_TILT,
    MARS_ORBIT_COLOR,
    '/images/marsmap.jpg',
    '/images/marsbump.jpg',
    null,
    null,
    // marsMoons,
    [],
    position,
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
  return marsGroup;
};
