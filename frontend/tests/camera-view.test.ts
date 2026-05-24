import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import {
  applyTopView,
  applyResetView,
  applySideView,
  DEFAULT_CAMERA_POSITION,
  MOBILE_DEFAULT_CAMERA_POSITION,
  getDefaultCameraPosition,
  getTopCameraPosition,
  getSideCameraPosition,
} from '../src/utils/camera-view';

const createControls = () => {
  const update = vi.fn();
  return {
    target: new THREE.Vector3(3, 5, 7),
    update,
  };
};

describe('camera-view', () => {
  it('サイド視点の位置とupベクトルを固定し、targetを原点へ戻す', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(12, -4, 8);
    camera.up.set(0, 0, 1);

    const controls = createControls();

    applySideView(camera, controls, 1024);

    expect(camera.position.toArray()).toEqual([...getSideCameraPosition(1024)]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it('トップ視点の位置とupベクトルを固定し、targetを原点へ戻す', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(12, -4, 8);
    camera.up.set(0, 0, 1);

    const controls = createControls();

    applyTopView(camera, controls, 1024);

    expect(camera.position.toArray()).toEqual([...getTopCameraPosition(1024)]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it('リセット視点の位置とupベクトルを固定し、targetを原点へ戻す', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(190, 0, 0.01);
    camera.up.set(0, 0, 1);

    const controls = createControls();

    applyResetView(camera, controls, 1024);

    expect(camera.position.toArray()).toEqual([...DEFAULT_CAMERA_POSITION]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it('スマホ幅では初期視点を少し離した位置に切り替える', () => {
    expect(getDefaultCameraPosition(767)).toEqual([...MOBILE_DEFAULT_CAMERA_POSITION]);

    const camera = new THREE.PerspectiveCamera();
    const controls = createControls();

    applyResetView(camera, controls, 375);

    expect(camera.position.toArray()).toEqual([...MOBILE_DEFAULT_CAMERA_POSITION]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it('スマホ幅ではトップとサイドも初期視点と同じ距離に揃える', () => {
    const mobileDistance = Math.hypot(...MOBILE_DEFAULT_CAMERA_POSITION);

    expect(getTopCameraPosition(375)[1]).toBe(mobileDistance);
    expect(getSideCameraPosition(375)[0]).toBe(mobileDistance);
  });
});
