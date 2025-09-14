import * as THREE from 'three';
import { getCurrentPosition } from './current-position';
import { createPlanet, earthMoon } from './planet-common';
import { EARTH_SIZE } from './settings';

const EARTH_NAME = 'Earth';

export const createEarthMesh = async (sunPosition: THREE.Vector3): Promise<THREE.Group> => {
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

  const currentPosition = await getCurrentPosition();

  const earthMesh = createPlanet(
    EARTH_NAME,
    EARTH_SIZE,
    90,
    23,
    earthMaterial,
    null,
    null,
    '/images/earth_atmosphere.jpg',
    earthMoon,
    currentPosition,
  );
  return earthMesh;
};
