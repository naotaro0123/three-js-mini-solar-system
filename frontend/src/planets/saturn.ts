import * as THREE from 'three';
import { getPlanetPositions } from '../utils/get-planet-position';
import { createPlanet, Names, type PlanetMoon } from '../utils/planet-common';
import {
  EARTH_SIZE,
  getOrbitColor,
  SATURN_NAME,
  SATURN_SIZE,
  SATURN_TILT,
  settings,
} from '../utils/settings';

export const SATURN_MOON_MESH_NAMES = {
  TITAN: `${Names.PLANET_MOONS_NAME}_Titan`,
  RHEA: `${Names.PLANET_MOONS_NAME}_Rhea`,
  IAPETUS: `${Names.PLANET_MOONS_NAME}_Iapetus`,
  MIMAS: `${Names.PLANET_MOONS_NAME}_Mimas`,
  ENCELADUS: `${Names.PLANET_MOONS_NAME}_Enceladus`,
} as const;

export const saturnMoons: PlanetMoon[] = [
  // タイタン: 地球の約0.4倍。土星からの距離は目視で調整
  {
    size: EARTH_SIZE * 0.4,
    texture: '/images/RS3_Titan.webp',
    orbitRadius: 16,
    orbitSpeed: 0.00009 * settings.accelerationOrbit,
    orbitalPeriodDays: 15.95, // タイタンの公転周期
    xPosition: 137,
  },
  // レア: 地球の約0.12倍。タイタンより内側を公転
  {
    size: EARTH_SIZE * 0.12,
    texture: '/images/RS3_Rhea.webp',
    orbitRadius: 12,
    orbitSpeed: 0.00018 * settings.accelerationOrbit,
    orbitalPeriodDays: 4.52, // レアの公転周期
    xPosition: 116,
  },
  // イアペトゥス: 地球の約0.11倍。タイタンより外側をゆっくり公転
  {
    size: EARTH_SIZE * 0.115,
    texture: '/images/LapetusNew.webp',
    orbitRadius: 22,
    orbitSpeed: 0.00001 * settings.accelerationOrbit,
    orbitalPeriodDays: 79.3, // イアペトゥスの公転周期
    xPosition: 180,
  },
  // ミマス: 地球の約0.03倍。土星に近い内側を高速公転
  {
    size: EARTH_SIZE * 0.031,
    texture: '/images/RS3_Mimas.webp',
    orbitRadius: 8,
    orbitSpeed: 0.0007 * settings.accelerationOrbit,
    orbitalPeriodDays: 0.942, // ミマスの公転周期
    xPosition: 102,
  },
  // エンケラドゥス: 地球の約0.04倍。ミマスの外側、レアの内側を公転
  {
    size: EARTH_SIZE * 0.04,
    texture: '/images/Enceladus.webp',
    orbitRadius: 10,
    orbitSpeed: 0.00045 * settings.accelerationOrbit,
    orbitalPeriodDays: 1.37, // エンケラドゥスの公転周期
    xPosition: 110,
  },
];

export const createSaturnGroup = async (isDebug: boolean): Promise<THREE.Group> => {
  const planetPositionsRes = await getPlanetPositions('SATURN');
  const saturnGroup = createPlanet(
    'SATURN',
    SATURN_NAME,
    SATURN_SIZE,
    SATURN_TILT,
    getOrbitColor('SATURN'),
    '/images/saturnmap.jpg',
    null,
    {
      innerRadius: 18,
      outerRadius: 29,
      texture: '/images/saturn_ring.png',
    },
    null,
    saturnMoons,
    planetPositionsRes,
    isDebug,
  );
  const planetSystem = saturnGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const _saturnMoons = planetSystem.children.filter((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  for (const [index, moon] of _saturnMoons.entries()) {
    if (index === 0) moon.name = SATURN_MOON_MESH_NAMES.TITAN;
    if (index === 1) moon.name = SATURN_MOON_MESH_NAMES.RHEA;
    if (index === 2) moon.name = SATURN_MOON_MESH_NAMES.IAPETUS;
    if (index === 3) moon.name = SATURN_MOON_MESH_NAMES.MIMAS;
    if (index === 4) moon.name = SATURN_MOON_MESH_NAMES.ENCELADUS;
    moon.position.set(saturnMoons[index].xPosition ?? 0, 0, 0);
  }

  return saturnGroup;
};
