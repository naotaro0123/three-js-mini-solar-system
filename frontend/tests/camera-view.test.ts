import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { applyResetView, applySideView } from '../src/utils/camera-view';

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

    applySideView(camera, controls);

    expect(camera.position.toArray()).toEqual([190, 0, 0.01]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });

  it('リセット視点の位置とupベクトルを固定し、targetを原点へ戻す', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(190, 0, 0.01);
    camera.up.set(0, 0, 1);

    const controls = createControls();

    applyResetView(camera, controls);

    expect(camera.position.toArray()).toEqual([0, 20, 122]);
    expect(camera.up.toArray()).toEqual([0, 1, 0]);
    expect(controls.target.toArray()).toEqual([0, 0, 0]);
    expect(controls.update).toHaveBeenCalledOnce();
  });
});
