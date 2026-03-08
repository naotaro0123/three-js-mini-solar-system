import * as THREE from 'three';
import type { RequestQueryBody } from '../../../common';
import type { PlanetPositionsRes } from './get-planet-position';
import { getStepDays } from './settings';

type AddCurrentPositionMarkerParams = {
  parent: THREE.Object3D;
  commandKey: RequestQueryBody['COMMAND'];
  planetPositionsRes: PlanetPositionsRes;
  radius?: number;
  color?: number;
};

export const addCurrentPositionMarker = ({
  parent,
  commandKey,
  planetPositionsRes,
  radius = 1,
  color = 0xff0000,
}: AddCurrentPositionMarkerParams): THREE.Mesh => {
  const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color,
    depthTest: false,
    depthWrite: false,
  });
  const currentPoint = new THREE.Mesh(sphereGeometry, sphereMaterial);
  currentPoint.renderOrder = 999;

  const { pathPoints, todayRow } = planetPositionsRes;
  const pathLength = pathPoints.length - 1;
  const earthDayProgress = todayRow - 1;
  const stepDays = getStepDays(commandKey);
  const currentIndex = Math.floor(earthDayProgress / stepDays) % pathLength;
  const nextIndex = (currentIndex + 1) % pathLength;
  const lerpFactor = (earthDayProgress % stepDays) / stepDays;
  const currentPosition = pathPoints[currentIndex];
  const nextPosition = pathPoints[nextIndex];
  const interpolatedPos = new THREE.Vector3()
    .fromArray(currentPosition.toArray())
    .lerp(new THREE.Vector3().fromArray(nextPosition.toArray()), lerpFactor);
  currentPoint.position.copy(interpolatedPos);

  parent.add(currentPoint);
  return currentPoint;
};
