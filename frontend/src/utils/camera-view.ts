import * as THREE from 'three';

type CameraViewControls = {
  target: THREE.Vector3;
  update: () => void;
};

export const DEFAULT_CAMERA_POSITION = [0, 24, 150] as const;
export const MOBILE_DEFAULT_CAMERA_POSITION = [0, 36, 220] as const;
export const MOBILE_MAX_WIDTH = 767;
const CAMERA_VIEW_AXIS_OFFSET = 0.01;

const getViewportWidth = (): number => {
  return typeof window === 'undefined' ? MOBILE_MAX_WIDTH + 1 : window.innerWidth;
};

export const getDefaultCameraPosition = (
  viewportWidth = getViewportWidth(),
): readonly [number, number, number] => {
  return viewportWidth <= MOBILE_MAX_WIDTH ? MOBILE_DEFAULT_CAMERA_POSITION : DEFAULT_CAMERA_POSITION;
};

const getDefaultCameraDistance = (viewportWidth = getViewportWidth()): number => {
  const [x, y, z] = getDefaultCameraPosition(viewportWidth);
  return Math.hypot(x, y, z);
};

export const getTopCameraPosition = (
  viewportWidth = getViewportWidth(),
): readonly [number, number, number] => {
  return [0, getDefaultCameraDistance(viewportWidth), CAMERA_VIEW_AXIS_OFFSET];
};

export const getSideCameraPosition = (
  viewportWidth = getViewportWidth(),
): readonly [number, number, number] => {
  return [getDefaultCameraDistance(viewportWidth), 0, CAMERA_VIEW_AXIS_OFFSET];
};

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

export const applyTopView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
  viewportWidth = getViewportWidth(),
): void => {
  applyCameraView(camera, controls, getTopCameraPosition(viewportWidth));
};

export const applySideView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
  viewportWidth = getViewportWidth(),
): void => {
  applyCameraView(camera, controls, getSideCameraPosition(viewportWidth));
};

export const applyResetView = (
  camera: THREE.PerspectiveCamera,
  controls: CameraViewControls,
  viewportWidth = getViewportWidth(),
): void => {
  applyCameraView(camera, controls, getDefaultCameraPosition(viewportWidth));
};
