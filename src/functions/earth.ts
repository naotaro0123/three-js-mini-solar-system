import * as THREE from 'three';
import { getPlanetPosition } from './get-planet-position';
import { createPlanet, earthMoon } from './planet-common';
import { EARTH_SIZE, EARTH_TILT } from './settings';

const EARTH_NAME = 'Earth';

export const createEarthMesh = async (
  sunPosition: THREE.Vector3,
  isDebug: boolean,
): Promise<THREE.Group> => {
  const loadTexture = new THREE.TextureLoader();
  // Earth day/night effect shader material
  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: loadTexture.load('/images/earth_daymap.jpg') },
      nightTexture: { value: loadTexture.load('/images/earth_nightmap.jpg') },
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

  const earthPosition = await getPlanetPosition('EARTH');

  const earthMesh = createPlanet(
    EARTH_NAME,
    EARTH_SIZE,
    90,
    EARTH_TILT,
    earthMaterial,
    null,
    null,
    '/images/earth_atmosphere.jpg',
    earthMoon,
    earthPosition,
  );

  if (isDebug) {
    // 地球の現在位置を表示
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const currentEarthPoint = new THREE.Mesh(sphereGeometry, sphereMaterial);
    const { pathPoints, todayRow } = earthPosition;
    const position = pathPoints[todayRow - 1];
    currentEarthPoint.position.set(position.x, 0, position.y);
    earthMesh.add(currentEarthPoint);
  }

  return earthMesh;
};
