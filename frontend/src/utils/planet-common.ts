import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { RequestQueryBody } from '../../../common';
import { addCurrentPositionMarker } from './debug';
import type { PlanetPositionsRes } from './get-planet-position';
import { getStepDays } from './settings';
import { degToRad, getAssetPath } from './utils';

export const Names = {
  PLANET_NAME: 'Planet',
  PLANET_ORBIT_NAME: 'PlanetOrbit',
  PLANET_RING_NAME: 'PlanetRing',
  PLANET_AXIS_NAME: 'PlanetAxis',
  PLANET_SYSTEM_NAME: 'PlanetSystem',
  PLANET_ATMO_SPHERE_NAME: 'PlanetAtmosphere',
  PLANET_MOONS_NAME: 'PlanetMoons',
  PLANET_LABEL_NAME: 'PlanetLabel',
} as const;

const planetLabelDisplayMap: Record<RequestQueryBody['COMMAND'], string> = {
  MERCURY: 'Mercury（水星）',
  VENUS: 'Venus（金星）',
  EARTH: 'Earth（地球）',
  MARS: 'Mars（火星）',
  JUPITER: 'Jupiter（木星）',
  SATURN: 'Saturn（土星）',
  URANUS: 'Uranus（天王星）',
  NEPTUNE: 'Neptune（海王星）',
  PLUTO: 'Pluto（冥王星）',
};

type Ring = {
  innerRadius: number;
  outerRadius: number;
  texture: string;
};
export type PlanetMoon = {
  size: number;
  orbitSpeed: number;
  orbitRadius: number;
  orbitalPeriodDays: number; // 衛星の公転周期（日）
  texture?: string;
  bump?: string;
  mesh?: THREE.Mesh;
  modelPath?: string;
  xPosition?: number;
  retrograde?: boolean; // 逆行衛星かどうか
};

export const createPlanet = (
  commandKey: RequestQueryBody['COMMAND'],
  planetName: string,
  size: number,
  tilt: number, // 自転軸の傾き
  orbitColor: number, // 軌道の色
  texture: THREE.Material | string,
  bump: string | null,
  ring: Ring | null,
  atmosphere: string | null,
  moons: PlanetMoon[],
  planetPositionsRes: PlanetPositionsRes,
  shouldAddCurrentPositionMarker = false,
): THREE.Group => {
  const loadTexture = new THREE.TextureLoader();
  let material: THREE.Material | THREE.Texture;
  if (texture instanceof THREE.Material) {
    material = texture;
  } else if (bump) {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(getAssetPath(texture)),
      bumpMap: loadTexture.load(getAssetPath(bump)),
      bumpScale: 0.7,
    });
  } else {
    material = new THREE.MeshPhongMaterial({
      map: loadTexture.load(getAssetPath(texture)),
    });
  }

  const geometry = new THREE.SphereGeometry(size, 32, 20);
  const planet = new THREE.Mesh(geometry, material);
  planet.rotation.z = degToRad(tilt);
  planet.castShadow = true;
  planet.receiveShadow = true;
  planet.name = Names.PLANET_NAME;

  const planetSystem = new THREE.Group();
  planetSystem.name = Names.PLANET_SYSTEM_NAME;
  // APIから取得した現在位置に惑星を配置
  const pathLength = planetPositionsRes.pathPoints.length - 1;
  const earthDayProgress = planetPositionsRes.todayRow - 1;
  const stepDays = getStepDays(commandKey);
  const currentIndex = Math.floor(earthDayProgress / stepDays) % pathLength;
  const nextIndex = (currentIndex + 1) % pathLength;
  const lerpFactor = (earthDayProgress % stepDays) / stepDays;
  const currentPosition = planetPositionsRes.pathPoints[currentIndex];
  const nextPosition = planetPositionsRes.pathPoints[nextIndex];
  const interpolatedPos = new THREE.Vector3()
    .fromArray(currentPosition.toArray())
    .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), lerpFactor);
  planetSystem.position.copy(interpolatedPos);
  planetSystem.add(planet);

  // 惑星名ラベルを惑星の上に表示
  const labelElement = document.createElement('div');
  labelElement.className = 'planet-name-label';
  labelElement.textContent = planetLabelDisplayMap[commandKey] ?? planetName;
  const labelObject = new CSS2DObject(labelElement);
  labelObject.name = Names.PLANET_LABEL_NAME;
  labelObject.position.set(0, size + 3, 0);
  planetSystem.add(labelObject);

  // 傾き角度ラベルを惑星の下に表示
  const tiltLabelElement = document.createElement('div');
  tiltLabelElement.className = 'planet-tilt-label';
  tiltLabelElement.textContent = `傾き: ${tilt}°`;
  const tiltLabelObject = new CSS2DObject(tiltLabelElement);
  tiltLabelObject.name = Names.PLANET_LABEL_NAME;
  tiltLabelObject.position.set(0, -(size + 3), 0);
  planetSystem.add(tiltLabelObject);

  // 自転軸を追加する
  {
    const axisRadius = 0.1;
    const axisHeight = 2.8 * size; // 惑星の大きさに応じて軸の長さを調整
    const axisGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisHeight, 32);
    const axisMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const axisMesh = new THREE.Mesh(axisGeometry, axisMaterial);
    axisMesh.name = Names.PLANET_AXIS_NAME;
    axisMesh.rotation.z = degToRad(tilt); // 自転軸の傾き
    planetSystem.add(axisMesh);
  }

  if (ring) {
    const ringGeometry = new THREE.RingGeometry(ring.innerRadius, ring.outerRadius, 30);
    const ringMaterial = new THREE.MeshStandardMaterial({
      map: loadTexture.load(getAssetPath(ring.texture)),
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.name = Names.PLANET_RING_NAME;
    ringMesh.rotation.x = degToRad(90);
    ringMesh.rotation.y = degToRad(tilt);
    planetSystem.add(ringMesh);
    const scaleSize = 3.6;
    ringMesh.scale.set(scaleSize, scaleSize, scaleSize);
  }

  if (atmosphere) {
    const atmosphereGeometry = new THREE.SphereGeometry(size + 0.1, 32, 20);
    const atmosphereMaterial = new THREE.MeshPhongMaterial({
      map: loadTexture.load(getAssetPath(atmosphere)),
      transparent: true,
      opacity: 0.4,
      depthTest: true,
      depthWrite: false,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    atmosphereMesh.name = Names.PLANET_ATMO_SPHERE_NAME;
    atmosphereMesh.rotation.z = 0.41;
    planet.add(atmosphereMesh);
  }

  // 火星の衛星では未使用（3Dモデルのため）
  let moonIndex = 0;
  for (const moon of moons) {
    let moonMaterial: THREE.MeshStandardMaterial;

    if (moon.texture === undefined) continue;
    if (moon.bump) {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(getAssetPath(moon.texture)),
        bumpMap: loadTexture.load(getAssetPath(moon.bump)),
        bumpScale: 0.5,
      });
    } else {
      moonMaterial = new THREE.MeshStandardMaterial({
        map: loadTexture.load(getAssetPath(moon.texture)),
      });
    }
    const moonGeometry = new THREE.SphereGeometry(moon.size, 32, 20);
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.name = `${Names.PLANET_MOONS_NAME}_${moonIndex}`;
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonIndex++;
    const moonOrbitDistance = size * 1.5;
    moonMesh.position.set(moonOrbitDistance, 0, 0);
    planetSystem.add(moonMesh);
    moon.mesh = moonMesh;
  }

  const planet3d = new THREE.Group();
  planet3d.add(planetSystem);
  planet3d.name = planetName;
  planet3d.userData = { planetPositionsRes, commandKey };

  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(planetPositionsRes.pathPoints);
  const orbitMaterial = new THREE.LineBasicMaterial({
    color: orbitColor,
    transparent: true,
    opacity: 0.2,
  });
  const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
  orbit.name = Names.PLANET_ORBIT_NAME;
  planet3d.add(orbit);

  if (shouldAddCurrentPositionMarker) {
    // 現在位置を表示
    addCurrentPositionMarker({
      parent: planet3d,
      commandKey,
      planetPositionsRes,
    });
  }

  return planet3d;
};
