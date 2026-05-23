import * as THREE from 'three';

type CameraViewControls = {
  target: THREE.Vector3;
  update: () => void;
};

export const DEFAULT_CAMERA_POSITION = [0, 24, 150] as const;

const applyCameraView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
  position: readonly [number, number, number],
): void => {
  camera.position.set(...position);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0, 0);
  controls.update();
};

export const applySideView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
): void => {
  applyCameraView(camera, controls, [190, 0, 0.01]);
};

export const applyResetView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
): void => {
  applyCameraView(camera, controls, DEFAULT_CAMERA_POSITION);
};
