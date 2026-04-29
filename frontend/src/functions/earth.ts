import * as THREE from 'three';
import { getPlanetPositions } from './get-planet-position';
import { createPlanet, Names, type PlanetMoon } from './planet-common';
import {
  EARTH_MOON_SIZE,
  EARTH_NAME,
  EARTH_SIZE,
  EARTH_TILT,
  getOrbitColor,
  settings,
} from './settings';
import { getAssetPath } from './utils';

export const EARTH_MOON_MESH_NAMES = {
  MOON: `${Names.PLANET_MOONS_NAME}_Moon`,
} as const;

export const earthMoons: PlanetMoon[] = [
  {
    size: EARTH_MOON_SIZE,
    texture: '/images/moonmap.jpg',
    bump: '/images/moonbump.jpg',
    orbitSpeed: 0.001 * settings.accelerationOrbit,
    orbitRadius: 10, // 月の軌道半径
    orbitalPeriodDays: 27.322, // 恒星月
  },
];

export const createEarthMesh = async (
  sunPosition: THREE.Vector3,
  isDebug: boolean,
): Promise<THREE.Group> => {
  const loadTexture = new THREE.TextureLoader();
  // Earth day/night effect shader material
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: loadTexture.load(getAssetPath('/images/earth_daymap.jpg')) },
      nightTexture: { value: loadTexture.load(getAssetPath('/images/earth_nightmap.jpg')) },
      sunPosition: { value: sunPosition },
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vSunDirection;

        uniform vec3 sunPosition;

        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
          vSunDirection = normalize(sunPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
    fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D nightTexture;

        varying vec3 vNormal;
        varying vec2 vUv;
        varying vec3 vSunDirection;

        void main() {
          float intensity = max(dot(vNormal, vSunDirection), 0.0);
          vec4 dayColor = texture2D(dayTexture, vUv);
          vec4 nightColor = texture2D(nightTexture, vUv)* 0.2;
          gl_FragColor = mix(nightColor, dayColor, intensity);
        }
      `,
  });

  const planetPositionsRes = await getPlanetPositions('EARTH');

  const earthGroup = createPlanet(
    'EARTH',
    EARTH_NAME,
    EARTH_SIZE,
    EARTH_TILT,
    getOrbitColor('EARTH'),
    earthMaterial,
    null,
    null,
    '/images/earth_atmosphere.jpg',
    earthMoons,
    planetPositionsRes,
    isDebug,
  );
  const planetSystem = earthGroup.getObjectByName(Names.PLANET_SYSTEM_NAME) as THREE.Group;
  const moon = planetSystem.children.find((child) =>
    child.name.startsWith(Names.PLANET_MOONS_NAME),
  );
  if (moon) {
    moon.name = EARTH_MOON_MESH_NAMES.MOON;
  }

  return earthGroup;
};
