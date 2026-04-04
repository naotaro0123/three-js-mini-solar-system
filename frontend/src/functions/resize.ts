import * as THREE from 'three';
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export const handleResize = (
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  labelRenderer?: CSS2DRenderer,
) => {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // レンダラーの更新
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  labelRenderer?.setSize(width, height);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};
