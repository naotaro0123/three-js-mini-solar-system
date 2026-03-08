import * as THREE from 'three';
import type { PlanetPositionsRes } from './get-planet-position';

type AddCurrentPositionMarkerParams = {
  parent: THREE.Object3D;
  planetPositionsRes: PlanetPositionsRes;
  radius?: number;
  color?: number;
};

export const addCurrentPositionMarker = ({
  parent,
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
  const position = pathPoints[todayRow - 1];
  currentPoint.position.copy(position);

  parent.add(currentPoint);
  return currentPoint;
};
